import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/lib/calendar-utils";

export type GroupDayItem = {
  id: string;
  userId: string;
  username: string;
  categoryName: string;
  symbol: string;
  color: string;
  kind: "daily" | "hourly";
  hours: number;
};

export type GroupEntriesMap = Record<string, GroupDayItem[]>;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function useGroupEntries(
  groupId: string | null,
  year: number,
  month0: number,
  enabled: boolean,
) {
  const [data, setData] = useState<GroupEntriesMap>({});
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !groupId) {
      setData({});
      setMembers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const from = `${year}-${pad(month0 + 1)}-01`;
      const last = new Date(year, month0 + 1, 0).getDate();
      const to = `${year}-${pad(month0 + 1)}-${pad(last)}`;

      const { data: people, error: pErr } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("group_id", groupId);
      if (pErr) throw pErr;
      const ids = (people ?? []).map((p) => p.id);
      const nameById = new Map(
        (people ?? []).map((p) => [p.id, (p.username ?? "").trim() || "Utente"]),
      );
      setMembers(ids.map((id) => ({ id, username: nameById.get(id) ?? "Utente" })));
      if (ids.length === 0) {
        setData({});
        return;
      }

      const [rowsRes, settingsRes] = await Promise.all([
        supabase
          .from("calendar_entries")
          .select("id, user_id, date, category_id, entry_type, hours")
          .in("user_id", ids)
          .gte("date", from)
          .lte("date", to),
        supabase.from("user_settings").select("user_id, categories").in("user_id", ids),
      ]);
      if (rowsRes.error) throw rowsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      const catsByUser = new Map<string, Map<string, Category>>();
      for (const s of settingsRes.data ?? []) {
        const list = Array.isArray(s.categories) ? (s.categories as unknown as Category[]) : [];
        catsByUser.set(s.user_id, new Map(list.map((c) => [c.id, c])));
      }

      const map: GroupEntriesMap = {};
      for (const r of rowsRes.data ?? []) {
        const cat = catsByUser.get(r.user_id)?.get(r.category_id);
        const item: GroupDayItem = {
          id: r.id,
          userId: r.user_id,
          username: nameById.get(r.user_id) ?? "Utente",
          categoryName: cat?.name ?? "Giustificativo",
          symbol: cat?.symbol ?? "··",
          color: cat?.color ?? "#94a3b8",
          kind: r.entry_type === "hourly" ? "hourly" : "daily",
          hours: Number(r.hours ?? 0),
        };
        (map[r.date] ??= []).push(item);
      }
      for (const list of Object.values(map)) {
        list.sort((a, b) => a.username.localeCompare(b.username));
      }
      setData(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento del gruppo");
      setData({});
    } finally {
      setLoading(false);
    }
  }, [enabled, groupId, year, month0]);

  useEffect(() => {
    void load();
  }, [load]);

  return { groupEntries: data, members, loading, error, reload: load };
}
