import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_DAY_CONFIG,
  type Category,
  type DayConfig,
  type DayEntry,
  type EntriesMap,
} from "@/lib/calendar-utils";

type Args = {
  userId: string | null;
  entries: EntriesMap;
  categories: Category[];
  dayConfig: DayConfig;
  setEntries: (e: EntriesMap) => void;
  setCategories: (c: Category[]) => void;
  setDayConfig: (c: DayConfig) => void;
};

type FlatEntry = DayEntry & { date: string };

function flatten(map: EntriesMap): Map<string, FlatEntry> {
  const out = new Map<string, FlatEntry>();
  for (const [date, list] of Object.entries(map)) {
    for (const e of list ?? []) out.set(e.id, { ...e, date });
  }
  return out;
}

function sameEntry(a: FlatEntry, b: FlatEntry) {
  return (
    a.date === b.date &&
    a.categoryId === b.categoryId &&
    a.kind === b.kind &&
    Number(a.hours) === Number(b.hours)
  );
}

export type SyncStatus = "idle" | "loading" | "syncing" | "synced" | "error";

export function useCloudSync({
  userId,
  entries,
  categories,
  dayConfig,
  setEntries,
  setCategories,
  setDayConfig,
}: Args) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // last state known to be in the cloud
  const remoteEntries = useRef<Map<string, FlatEntry>>(new Map());
  const remoteSettings = useRef<string>("");
  const latest = useRef({ entries, categories, dayConfig });
  latest.current = { entries, categories, dayConfig };

  const pushSettings = useCallback(
    async (uid: string, cats: Category[], cfg: DayConfig) => {
      const payload = JSON.stringify({ cats, cfg });
      if (payload === remoteSettings.current) return;
      const { error: err } = await supabase.from("user_settings").upsert(
        {
          user_id: uid,
          categories: cats as unknown as never,
          day_capacities: cfg as unknown as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (err) throw err;
      remoteSettings.current = payload;
    },
    [],
  );

  const pushEntries = useCallback(async (uid: string, map: EntriesMap) => {
    const local = flatten(map);
    const prev = remoteEntries.current;
    const toUpsert: FlatEntry[] = [];
    const toDelete: string[] = [];
    for (const [id, e] of local) {
      const old = prev.get(id);
      if (!old || !sameEntry(old, e)) toUpsert.push(e);
    }
    for (const id of prev.keys()) if (!local.has(id)) toDelete.push(id);
    if (!toUpsert.length && !toDelete.length) return;

    if (toUpsert.length) {
      const { error: err } = await supabase.from("calendar_entries").upsert(
        toUpsert.map((e) => ({
          id: e.id,
          user_id: uid,
          date: e.date,
          category_id: e.categoryId,
          entry_type: e.kind,
          hours: e.hours,
        })),
        { onConflict: "id" },
      );
      if (err) throw err;
    }
    if (toDelete.length) {
      const { error: err } = await supabase
        .from("calendar_entries")
        .delete()
        .eq("user_id", uid)
        .in("id", toDelete);
      if (err) throw err;
    }
    remoteEntries.current = local;
  }, []);

  // Initial load after login
  useEffect(() => {
    if (!userId) {
      setReady(false);
      setStatus("idle");
      remoteEntries.current = new Map();
      remoteSettings.current = "";
      return;
    }
    let active = true;
    setReady(false);
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const [rowsRes, settingsRes] = await Promise.all([
          supabase
            .from("calendar_entries")
            .select("id, date, category_id, entry_type, hours")
            .eq("user_id", userId),
          supabase
            .from("user_settings")
            .select("categories, day_capacities")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);
        if (!active) return;
        if (rowsRes.error) throw rowsRes.error;
        if (settingsRes.error) throw settingsRes.error;

        // --- entries ---
        const rows = rowsRes.data ?? [];
        if (rows.length > 0) {
          const map: EntriesMap = {};
          for (const r of rows) {
            const e: DayEntry = {
              id: r.id,
              categoryId: r.category_id,
              kind: (r.entry_type === "hourly" ? "hourly" : "daily") as DayEntry["kind"],
              hours: Number(r.hours ?? 0),
            };
            (map[r.date] ??= []).push(e);
          }
          remoteEntries.current = flatten(map);
          setEntries(map);
        } else {
          remoteEntries.current = new Map();
          await pushEntries(userId, latest.current.entries);
        }

        // --- settings ---
        const s = settingsRes.data as
          | { categories: unknown; day_capacities: unknown }
          | null;
        const remoteCats = Array.isArray(s?.categories) ? (s!.categories as Category[]) : null;
        const remoteCfg =
          s?.day_capacities && typeof s.day_capacities === "object"
            ? ({ ...DEFAULT_DAY_CONFIG, ...(s.day_capacities as DayConfig) } as DayConfig)
            : null;
        if (remoteCats?.length || remoteCfg) {
          if (remoteCats?.length) setCategories(remoteCats);
          if (remoteCfg) setDayConfig(remoteCfg);
          remoteSettings.current = JSON.stringify({
            cats: remoteCats?.length ? remoteCats : latest.current.categories,
            cfg: remoteCfg ?? latest.current.dayConfig,
          });
        } else {
          await pushSettings(userId, latest.current.categories, latest.current.dayConfig);
        }

        if (!active) return;
        setStatus("synced");
        setReady(true);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Errore di sincronizzazione");
        setStatus("error");
        setReady(true); // allow local usage / later retries
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, pushEntries, pushSettings, setCategories, setDayConfig, setEntries]);

  // Push entry changes (debounced)
  useEffect(() => {
    if (!userId || !ready) return;
    const t = setTimeout(() => {
      setStatus("syncing");
      pushEntries(userId, entries)
        .then(() => {
          setStatus("synced");
          setError(null);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Errore di sincronizzazione");
          setStatus("error");
        });
    }, 400);
    return () => clearTimeout(t);
  }, [entries, userId, ready, pushEntries]);

  // Push settings changes (debounced)
  useEffect(() => {
    if (!userId || !ready) return;
    const t = setTimeout(() => {
      setStatus("syncing");
      pushSettings(userId, categories, dayConfig)
        .then(() => {
          setStatus("synced");
          setError(null);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Errore di sincronizzazione");
          setStatus("error");
        });
    }, 600);
    return () => clearTimeout(t);
  }, [categories, dayConfig, userId, ready, pushSettings]);

  return { status, error, ready };
}
