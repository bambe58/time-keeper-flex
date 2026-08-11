import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  X,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  Download,
  Upload,
  CheckSquare,
  BookOpen,
  CalendarCog,
  Tags,
  UserCircle2,
  Users,
} from "lucide-react";

import {
  getItalianHolidays,
  getDayInfo,
  keyFromDate,
  monthMatrix,
  remainingBudget,
  DEFAULT_DAY_CONFIG,
  type Category,
  type EntriesMap,
  type DayEntry,
  type DayConfig,
  type DateException,
  type WeekdayException,
} from "@/lib/calendar-utils";
import {
  loadCategories,
  saveCategories,
  loadEntries,
  saveEntries,
  loadDayConfig,
  saveDayConfig,
  PALETTE,
} from "@/lib/storage";

import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useGroupEntries, type GroupDayItem } from "@/hooks/useGroupEntries";


import { LoginScreen, OnboardingModal, ProfileModal } from "@/components/auth-ui";
import { GroupsModal } from "@/components/groups-ui";


export const Route = createFileRoute("/")({
  component: Index,
});

const MONTH_NAMES = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
const DOW_SHORT = ["L", "M", "M", "G", "V", "S", "D"];

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function Index() {
  const hydrated = useHydrated();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<EntriesMap>({});
  const [dayConfig, setDayConfig] = useState<DayConfig>(DEFAULT_DAY_CONFIG);
  const [showCats, setShowCats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDayConfig, setShowDayConfig] = useState(false);
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const {
    user,
    profile,
    loading: authLoading,
    saveUsername,
    signOut,
    refreshProfile,
  } = useAuth();



  useEffect(() => {
    if (!hydrated) return;
    setCategories(loadCategories());
    setEntries(loadEntries());
    setDayConfig(loadDayConfig());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCategories(categories);
  }, [categories, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveEntries(entries);
  }, [entries, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveDayConfig(dayConfig);
  }, [dayConfig, hydrated]);

  const sync = useCloudSync({
    userId: user?.id ?? null,
    entries,
    categories,
    dayConfig,
    setEntries,
    setCategories,
    setDayConfig,
  });

  const needsOnboarding = !!user && !!profile && !profile.username?.trim();


  const holidays = useMemo(() => getItalianHolidays(year), [year]);
  const days = useMemo(() => monthMatrix(year, month), [year, month]);

  // Month status
  const monthStatus = useMemo(() => {
    let total = 0;
    let full = 0;
    let empty = 0;
    for (const d of days) {
      if (d.getMonth() !== month) continue;
      const info = getDayInfo(d, holidays, dayConfig);
      if (info.capacity === 0) continue;
      total++;
      const list = entries[info.key] ?? [];
      const used = list.reduce((s, e) => s + e.hours, 0);
      if (used >= info.capacity - 0.001) full++;
      if (used <= 0.001) empty++;
    }
    let color: "green" | "yellow" | "red" = "yellow";
    if (total === 0) color = "green";
    else if (full === total) color = "green";
    else if (empty === total) color = "red";
    const nonFull = total - full;
    return { total, full, empty, nonFull, color };
  }, [days, month, holidays, entries]);

  // swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) nextMonth();
      else prevMonth();
    }
    touchStart.current = null;
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const dot =
    monthStatus.color === "green"
      ? "bg-emerald-500"
      : monthStatus.color === "red"
        ? "bg-red-500"
        : "bg-amber-400";

  if (!hydrated || authLoading) {
    return <main className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <main className="min-h-screen pb-24 no-tap-highlight">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowProfile(true)}
              className="shrink-0 rounded-full border border-border overflow-hidden w-10 h-10 flex items-center justify-center bg-secondary hover:bg-muted transition"
              aria-label="Profilo"
              title="Profilo"
            >
              {profile?.avatar_url || (user?.user_metadata?.avatar_url as string) ? (
                <img
                  src={profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string)}
                  alt={profile?.username ?? "Avatar utente"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-semibold uppercase">
                  {(profile?.username ?? user?.email ?? "?").slice(0, 2)}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate flex items-center gap-1.5">
                <span className="truncate">{profile?.username?.trim() || "Il tuo tempo"}</span>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    sync.status === "error"
                      ? "bg-red-500"
                      : sync.status === "synced"
                        ? "bg-emerald-500"
                        : "bg-amber-400"
                  }`}
                  title={
                    sync.status === "error"
                      ? `Sincronizzazione non riuscita: ${sync.error ?? ""}`
                      : sync.status === "synced"
                        ? "Sincronizzato con il cloud"
                        : "Sincronizzazione in corso…"
                  }
                />
              </p>

              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide leading-none mt-1.5">
                CALENDARIO
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const payload = JSON.stringify({ categories, entries, dayConfig, version: 2 }, null, 2);
                const blob = new Blob([payload], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `calendario-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-full border border-border bg-card p-3 hover:bg-secondary transition"
              aria-label="Esporta backup"
              title="Esporta backup (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>
            <label
              className="rounded-full border border-border bg-card p-3 hover:bg-secondary transition cursor-pointer"
              aria-label="Importa backup"
              title="Importa backup (JSON)"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const data = JSON.parse(await f.text());
                    if (Array.isArray(data.categories)) setCategories(data.categories);
                    if (data.entries && typeof data.entries === "object") setEntries(data.entries);
                    if (data.dayConfig && typeof data.dayConfig === "object") setDayConfig(data.dayConfig);
                  } catch {
                    alert("File non valido");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-full border border-border bg-card p-3 hover:bg-secondary transition"
              aria-label="Impostazioni"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <section className="max-w-2xl mx-auto px-5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-secondary transition"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-center">
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            {monthStatus.color !== "green" && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {monthStatus.color === "red"
                  ? `${monthStatus.total}/${monthStatus.total}`
                  : `${monthStatus.nonFull}/${monthStatus.total}`}
              </span>
            )}
            <h2 className="font-display text-xl font-semibold uppercase tracking-wide">
              {MONTH_NAMES[month].toUpperCase()}{" "}
              {editingYear ? (
                <input
                  autoFocus
                  type="number"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  onBlur={() => {
                    const y = parseInt(yearInput, 10);
                    if (!isNaN(y) && y >= 1900 && y <= 2999) setYear(y);
                    setEditingYear(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingYear(false);
                  }}
                  className="w-20 text-base font-sans text-muted-foreground bg-transparent border-b border-border focus:outline-none focus:border-foreground tabular-nums"
                />
              ) : (
                <button
                  onClick={() => {
                    setYearInput(String(year));
                    setEditingYear(true);
                  }}
                  className="text-muted-foreground text-base font-sans hover:text-foreground transition tabular-nums"
                  aria-label="Modifica anno"
                >
                  {year}
                </button>
              )}
            </h2>

          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-secondary transition"
            aria-label="Mese successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="rounded-2xl bg-card border border-border p-2 sm:p-3 shadow-sm"
        >
          <div className="grid grid-cols-7 mb-1.5">
            {DOW_SHORT.map((d, i) => (
              <div
                key={i}
                className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const k = keyFromDate(d);
              return (
                <DayCell
                  key={d.toISOString()}
                  date={d}
                  currentMonth={month}
                  holidays={holidays}
                  dayConfig={dayConfig}
                  entries={entries[k] ?? []}
                  categories={categories}
                  selectionMode={selectionMode}
                  selected={selectedKeys.has(k)}
                  onActivate={() => {
                    const info = getDayInfo(d, holidays, dayConfig);
                    if (info.capacity === 0) return;
                    if (d.getMonth() !== month) return;
                    if (selectionMode) {
                      setSelectedKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      });
                    } else {
                      setOpenDay(d);
                    }
                  }}
                  onLongPress={() => {
                    const info = getDayInfo(d, holidays, dayConfig);
                    if (info.capacity === 0) return;
                    if (d.getMonth() !== month) return;
                    if (!selectionMode) {
                      setSelectionMode(true);
                      setSelectedKeys(new Set([k]));
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {selectionMode && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-card border border-border rounded-full shadow-lg pl-4 pr-2 py-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
              {selectedKeys.size} selezionat{selectedKeys.size === 1 ? "o" : "i"}
            </span>
            <button
              onClick={() => setShowBulk(true)}
              disabled={selectedKeys.size === 0}
              className="rounded-full bg-primary text-primary-foreground p-2 disabled:opacity-40"
              aria-label="Applica categoria"
              title="Applica categoria"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedKeys(new Set());
              }}
              className="rounded-full hover:bg-secondary p-2"
              aria-label="Esci dalla selezione"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <BudgetFooter
          categories={categories}
          entries={entries}
          year={year}
          month0={month}
        />
      </section>

      {openDay && (
        <DayModal
          date={openDay}
          holidays={holidays}
          dayConfig={dayConfig}
          categories={categories}
          entries={entries}
          onClose={() => setOpenDay(null)}
          onChange={setEntries}
        />
      )}
      {showCats && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCats(false)}
          onChange={setCategories}
        />
      )}
      {showBulk && (
        <BulkAssignModal
          categories={categories}
          entries={entries}
          selectedKeys={Array.from(selectedKeys).sort()}
          holidays={holidays}
          dayConfig={dayConfig}
          year={year}
          month0={month}
          onClose={() => setShowBulk(false)}
          onApply={(next) => {
            setEntries(next);
            setShowBulk(false);
            setSelectionMode(false);
            setSelectedKeys(new Set());
          }}
        />
      )}
      {needsOnboarding && (
        <OnboardingModal
          defaultName={(user?.user_metadata?.full_name as string) ?? ""}
          onSave={async (n) => (await saveUsername(n)).error}
        />
      )}
      {showProfile && (
        <ProfileModal
          email={user?.email ?? ""}
          username={profile?.username ?? ""}
          onSave={async (n) => (await saveUsername(n)).error}
          onSignOut={async () => {
            setShowProfile(false);
            await signOut();
          }}
          onClose={() => setShowProfile(false)}
        />
      )}
      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onOpenProfile={() => {
            setShowSettings(false);
            setShowProfile(true);
          }}
          onOpenGroups={() => {
            setShowSettings(false);
            setShowGroups(true);
          }}

          onOpenCategories={() => {
            setShowSettings(false);
            setShowCats(true);
          }}
          onOpenGuide={() => {
            setShowSettings(false);
            setShowGuide(true);
          }}
          onOpenDayConfig={() => {
            setShowSettings(false);
            setShowDayConfig(true);
          }}
        />
      )}
      {showGroups && (
        <GroupsModal
          userId={user?.id ?? null}
          groupId={profile?.group_id ?? null}
          username={profile?.username ?? ""}
          onSaveUsername={async (n) => (await saveUsername(n)).error}
          onProfileChanged={() => void refreshProfile()}
          onClose={() => setShowGroups(false)}
        />
      )}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {showDayConfig && (
        <DayConfigModal
          config={dayConfig}
          onChange={setDayConfig}
          onClose={() => setShowDayConfig(false)}
        />
      )}
    </main>
  );
}


function DayCell({
  date,
  currentMonth,
  holidays,
  dayConfig,
  entries,
  categories,
  selectionMode,
  selected,
  onActivate,
  onLongPress,
  readOnly = false,
  groupItems,
}: {
  date: Date;
  currentMonth: number;
  holidays: Set<string>;
  dayConfig: DayConfig;
  entries: DayEntry[];
  categories: Category[];
  selectionMode: boolean;
  selected: boolean;
  onActivate: () => void;
  onLongPress: () => void;
  readOnly?: boolean;
  groupItems?: GroupDayItem[];
}) {
  const info = getDayInfo(date, holidays, dayConfig);
  const inMonth = date.getMonth() === currentMonth;
  const used = entries.reduce((s, e) => s + e.hours, 0);
  const remaining = Math.max(0, info.capacity - used);
  const full = info.capacity > 0 && remaining <= 0.001;
  const disabled = readOnly || info.capacity === 0 || !inMonth;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const start = () => {
    if (disabled) return;
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress();
    }, 450);
  };
  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const click = () => {
    if (longFired.current) return;
    onActivate();
  };

  const numColor =
    info.type === "holiday"
      ? "text-holiday"
      : info.type === "special"
        ? "text-special"
        : "text-foreground";

  const items = groupItems ?? [];
  const groupTitle = readOnly
    ? items.map((i) => `${i.username} · ${i.categoryName}${i.kind === "hourly" ? ` ${i.hours}h` : ""}`).join("\n")
    : undefined;

  return (
    <button
      onClick={click}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      title={readOnly ? groupTitle || info.note : info.note}
      className={`relative min-h-[3.5rem] sm:min-h-[4.25rem] rounded-lg text-left p-1.5 sm:p-2.5 flex flex-col overflow-hidden transition select-none ${
        inMonth ? "bg-background hover:bg-secondary/70" : "bg-transparent opacity-40"
      } ${disabled ? "cursor-default" : "cursor-pointer"} ${
        selectionMode && selected ? "ring-2 ring-primary bg-primary/10" : ""
      } ${selectionMode && !selected && inMonth && info.capacity > 0 ? "ring-1 ring-border" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-sm font-medium tabular-nums ${numColor}`}>{date.getDate()}</span>
        {!readOnly && info.capacity > 0 && (
          <span
            className={`text-[9px] tabular-nums leading-none ${
              full ? "text-foreground font-bold" : "text-muted-foreground/60"
            }`}
          >
            {used}/{info.capacity}
          </span>
        )}
        {readOnly && items.length > 0 && (
          <span className="text-[9px] tabular-nums leading-none text-muted-foreground/60">
            {items.length}
          </span>
        )}
      </div>

      {readOnly ? (
        <div className="flex flex-col gap-0.5 mt-auto">
          {items.slice(0, 3).map((i) => (
            <span
              key={i.id}
              className="flex items-center gap-1 text-[9px] font-semibold rounded px-1 py-[1px] text-white overflow-hidden"
              style={{ backgroundColor: i.color }}
            >
              <span className="shrink-0 bg-black/25 rounded px-[3px] leading-[1.4]">{i.symbol}</span>
              <span className="truncate">{i.username}</span>
            </span>
          ))}
          {items.length > 3 && (
            <span className="text-[8px] text-muted-foreground">+{items.length - 3}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 mt-auto">
          {entries.slice(0, 3).map((e) => {
            const cat = categories.find((c) => c.id === e.categoryId);
            if (!cat) return null;
            return (
              <span
                key={e.id}
                className="text-[9px] font-semibold rounded px-1 py-[1px] text-white truncate"
                style={{ backgroundColor: cat.color }}
              >
                {cat.symbol}
                {e.kind === "hourly" ? ` ${e.hours}h` : ""}
              </span>
            );
          })}
          {entries.length > 3 && (
            <span className="text-[8px] text-muted-foreground">+{entries.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}



function BudgetFooter({
  categories,
  entries,
  year,
  month0,
}: {
  categories: Category[];
  entries: EntriesMap;
  year: number;
  month0: number;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Budget</p>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const r = remainingBudget(c, entries, year, month0);
          const hasDays = r.daysTotal !== undefined;
          const hasHours = r.hoursTotal !== undefined;
          let label = "";
          if (hasDays && hasHours) label = `${r.daysLeft}g / ${r.hoursLeft}h`;
          else if (hasDays) label = `${r.daysLeft}g`;
          else if (hasHours) label = `${r.hoursLeft}h`;
          else label = "∞";
          return (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white rounded-md pl-1.5 pr-2 py-1"
              style={{ backgroundColor: c.color }}
            >
              <span className="bg-black/25 rounded px-1 py-0.5 text-[10px] font-bold">
                {c.symbol}
              </span>
              <span className="tabular-nums">{label}</span>
            </span>
          );
        })}
        {categories.length === 0 && (
          <span className="text-sm text-muted-foreground">Nessuna categoria.</span>
        )}
      </div>
    </div>
  );
}

// -------------- Day Modal --------------
function DayModal({
  date,
  holidays,
  dayConfig,
  categories,
  entries,
  onClose,
  onChange,
}: {
  date: Date;
  holidays: Set<string>;
  dayConfig: DayConfig;
  categories: Category[];
  entries: EntriesMap;
  onClose: () => void;
  onChange: (e: EntriesMap) => void;
}) {
  const info = getDayInfo(date, holidays, dayConfig);
  const key = info.key;
  const dayEntries = entries[key] ?? [];
  const used = dayEntries.reduce((s, e) => s + e.hours, 0);
  const remaining = info.capacity - used;
  const hasDaily = dayEntries.some((e) => e.kind === "daily");
  const hasHourly = dayEntries.some((e) => e.kind === "hourly");

  const [catId, setCatId] = useState<string>(categories[0]?.id ?? "");
  const [kind, setKind] = useState<"daily" | "hourly">("daily");
  const [hoursStr, setHoursStr] = useState<string>("");
  const [error, setError] = useState<string | null>(null);


  const cat = categories.find((c) => c.id === catId);

  useEffect(() => {
    if (!cat) return;
    if (cat.entryMode === "daily") setKind("daily");
    else if (cat.entryMode === "hourly") setKind("hourly");
  }, [catId, cat]);

  function add() {
    setError(null);
    if (!cat) return;
    const chosenKind = cat.entryMode === "both" ? kind : cat.entryMode;
    // Budget check
    const r = remainingBudget(cat, entries, date.getFullYear(), date.getMonth());
    if (chosenKind === "daily") {
      if (hasHourly || hasDaily) return setError("categorie incompatibili");
      if (r.daysLeft !== undefined && r.daysLeft < 1)
        return setError(`Budget esaurito per ${cat.name}`);
      if (r.hoursLeft !== undefined && r.hoursLeft < info.capacity)
        return setError(`Budget esaurito per ${cat.name}`);
      const entry: DayEntry = {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        kind: "daily",
        hours: info.capacity,
      };
      onChange({ ...entries, [key]: [...dayEntries, entry] });
    } else {
      if (hasDaily) return setError("categorie incompatibili");
      const hours = parseFloat(hoursStr);
      if (!hours || hours <= 0) return setError("Inserisci un valore maggiore di zero");
      if (used + hours > info.capacity + 0.001) return setError("capienza oraria superata");
      if (r.hoursLeft !== undefined && hours > r.hoursLeft + 0.001)
        return setError(`Budget esaurito per ${cat.name}`);
      const entry: DayEntry = {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        kind: "hourly",
        hours,
      };
      onChange({ ...entries, [key]: [...dayEntries, entry] });
      setHoursStr("");
    }
  }


  function remove(id: string) {
    const next = dayEntries.filter((e) => e.id !== id);
    const copy = { ...entries };
    if (next.length === 0) delete copy[key];
    else copy[key] = next;
    onChange(copy);
  }

  const dowNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {dowNames[date.getDay()].toUpperCase()}
          </p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            {date.getDate()} {MONTH_NAMES[date.getMonth()].toUpperCase()}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            Capienza {info.capacity}h — occupate {used}h — residue {Math.max(0, remaining)}h
          </p>
          {info.note && (
            <p className="text-[11px] italic text-muted-foreground/80 mt-0.5 normal-case">
              {info.note}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {dayEntries.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {dayEntries.map((e) => {
            const c = categories.find((x) => x.id === e.categoryId);
            if (!c) return null;
            return (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg bg-secondary/60 px-2 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-white text-xs font-bold rounded px-1.5 py-0.5"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.symbol}
                  </span>
                  <span className="text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.kind === "daily" ? "Giornata" : `${e.hours}h`}
                  </span>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="p-1 rounded hover:bg-background text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crea prima una categoria dalle impostazioni.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {cat?.entryMode === "both" && (
            <div className="flex gap-1 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setKind("daily")}
                className={`flex-1 text-xs py-1.5 rounded-md transition ${kind === "daily" ? "bg-card shadow-sm" : ""}`}
              >
                Giornata intera
              </button>
              <button
                onClick={() => setKind("hourly")}
                className={`flex-1 text-xs py-1.5 rounded-md transition ${kind === "hourly" ? "bg-card shadow-sm" : ""}`}
              >
                A ore
              </button>
            </div>
          )}

          {(kind === "hourly" || cat?.entryMode === "hourly") && cat?.entryMode !== "daily" && (
            <div>
              <label className="text-xs text-muted-foreground">Ore</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                inputMode="decimal"
                placeholder="es. 2"
                value={hoursStr}
                onChange={(e) => {
                  let v = e.target.value;
                  // strip leading zeros (but keep "0.x")
                  v = v.replace(/^0+(?=\d)/, "");
                  setHoursStr(v);
                }}
                className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
              />

            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          <button
            onClick={add}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
          >
            Aggiungi
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4">
        {children}
      </div>
    </div>
  );
}

// -------------- Category Manager --------------
function CategoryManager({
  categories,
  onClose,
  onChange,
}: {
  categories: Category[];
  onClose: () => void;
  onChange: (c: Category[]) => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Impostazioni</p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Categorie
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {editing || creating ? (
        <CategoryForm
          initial={editing ?? undefined}
          categories={categories}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(c) => {
            if (editing) onChange(categories.map((x) => (x.id === c.id ? c : x)));
            else onChange([...categories, c]);
            setEditing(null);
            setCreating(false);
          }}
        />
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-white text-xs font-bold rounded-md w-8 h-8 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.symbol}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.recurrence === "annual"
                        ? "Annuale"
                        : c.recurrence === "monthly"
                          ? "Mensile"
                          : "∞"}{" "}
                      ·{" "}
                      {c.entryMode === "daily"
                        ? "Giornaliera"
                        : c.entryMode === "hourly"
                          ? "A ore"
                          : "Entrambe"}

                      {c.budgetDays !== undefined ? ` · ${c.budgetDays}g` : ""}
                      {c.budgetHours !== undefined ? ` · ${c.budgetHours}h` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(c)}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Eliminare "${c.name}"?`))
                        onChange(categories.filter((x) => x.id !== c.id));
                    }}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm hover:bg-secondary/60"
          >
            <Plus className="w-4 h-4" /> Nuova categoria
          </button>
        </>
      )}
    </Sheet>
  );
}

function CategoryForm({
  initial,
  categories,
  onCancel,
  onSave,
}: {
  initial?: Category;
  categories: Category[];
  onCancel: () => void;
  onSave: (c: Category) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "annual");
  const [entryMode, setEntryMode] = useState(initial?.entryMode ?? "daily");
  const [budgetDays, setBudgetDays] = useState<string>(
    initial?.budgetDays !== undefined ? String(initial.budgetDays) : "",
  );
  const [budgetHours, setBudgetHours] = useState<string>(
    initial?.budgetHours !== undefined ? String(initial.budgetHours) : "",
  );
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!name.trim()) return setError("Il nome è obbligatorio");
    if (!symbol.trim()) return setError("Il simbolo è obbligatorio");
    const sym = symbol.trim().toUpperCase().slice(0, 2);
    const nm = name.trim();
    const dupName = categories.find(
      (c) => c.id !== initial?.id && c.name.toLowerCase() === nm.toLowerCase(),
    );
    if (dupName)
      return setError(`Errore: Il nome '${nm}' è già utilizzato nella categoria '${dupName.name}'`);
    const dupSym = categories.find(
      (c) => c.id !== initial?.id && c.symbol.toUpperCase() === sym,
    );
    if (dupSym)
      return setError(
        `Errore: Il simbolo '${sym}' è già utilizzato nella categoria '${dupSym.name}'`,
      );

    const c: Category = {
      id: initial?.id ?? crypto.randomUUID(),
      name: nm,
      symbol: sym,
      color,
      recurrence,
      entryMode,
      budgetDays: budgetDays === "" ? undefined : parseFloat(budgetDays),
      budgetHours: budgetHours === "" ? undefined : parseFloat(budgetHours),
    };
    // For "both" mode, hours are always derived from days (days * 7.5)
    if (c.entryMode === "both" && c.budgetDays !== undefined) {
      c.budgetHours = c.budgetDays * 7.5;
    }

    onSave(c);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Simbolo</label>
          <input
            value={symbol}
            maxLength={2}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm uppercase tabular-nums text-center"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Colore</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PALETTE.map((p) => (
            <button
              key={p}
              onClick={() => setColor(p)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ backgroundColor: p, outline: color === p ? "2px solid var(--foreground)" : "none", outlineOffset: 2 }}
            >
              {color === p && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Ricorrenza</label>
        <div className="grid grid-cols-3 gap-1 mt-1 p-1 rounded-lg bg-secondary">
          {(["annual", "monthly", "eternal"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRecurrence(r)}
              className={`text-xs py-1.5 rounded-md transition ${recurrence === r ? "bg-card shadow-sm" : ""}`}
            >
              {r === "annual" ? "Annuale" : r === "monthly" ? "Mensile" : "∞"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Tipo di inserimento</label>
        <div className="grid grid-cols-3 gap-1 mt-1 p-1 rounded-lg bg-secondary">
          {(["daily", "hourly", "both"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setEntryMode(r)}
              className={`text-xs py-1.5 rounded-md transition ${entryMode === r ? "bg-card shadow-sm" : ""}`}
            >
              {r === "daily" ? "Giornata" : r === "hourly" ? "Ore" : "Entrambe"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(entryMode === "daily" || entryMode === "both") && (
          <div>
            <label className="text-xs text-muted-foreground">Giorni disponibili</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={budgetDays}
              onChange={(e) => {
                const v = e.target.value;
                setBudgetDays(v);
                if (entryMode === "both") {
                  const n = parseFloat(v);
                  setBudgetHours(isNaN(n) ? "" : String(n * 7.5));
                }
              }}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
            />
          </div>
        )}
        {(entryMode === "hourly" || entryMode === "both") && (
          <div>
            <label className="text-xs text-muted-foreground">
              Ore disponibili
              {entryMode === "both" && (
                <span className="text-[10px] opacity-70"> (auto)</span>
              )}
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={budgetHours}
              onChange={(e) => setBudgetHours(e.target.value)}
              disabled={entryMode === "both"}
              placeholder={entryMode === "both" && budgetDays ? `${parseFloat(budgetDays) * 7.5}` : ""}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums disabled:opacity-60"
            />
          </div>
        )}
      </div>


      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary"
        >
          Annulla
        </button>
        <button
          onClick={submit}
          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
        >
          Salva
        </button>
      </div>
    </div>
  );
}

// -------------- Bulk Assign Modal --------------
function BulkAssignModal({
  categories,
  entries,
  selectedKeys,
  holidays,
  dayConfig,
  year,
  month0,
  onClose,
  onApply,
}: {
  categories: Category[];
  entries: EntriesMap;
  selectedKeys: string[];
  holidays: Set<string>;
  dayConfig: DayConfig;
  year: number;
  month0: number;
  onClose: () => void;
  onApply: (next: EntriesMap) => void;
}) {
  const [catId, setCatId] = useState<string>(categories[0]?.id ?? "");
  const [kind, setKind] = useState<"daily" | "hourly">("daily");
  const [hoursStr, setHoursStr] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const cat = categories.find((c) => c.id === catId);

  useEffect(() => {
    if (!cat) return;
    if (cat.entryMode === "daily") setKind("daily");
    else if (cat.entryMode === "hourly") setKind("hourly");
  }, [catId, cat]);

  function dateFromKey(key: string) {
    const [y, m, d] = key.split("-").map((s) => parseInt(s, 10));
    return new Date(y, m - 1, d);
  }

  function apply() {
    setError(null);
    if (!cat) return setError("Seleziona una categoria");
    if (selectedKeys.length === 0) return setError("Nessun giorno selezionato");
    const chosenKind: "daily" | "hourly" =
      cat.entryMode === "both" ? kind : cat.entryMode;

    let hoursPerDay = 0;
    if (chosenKind === "hourly") {
      const h = parseFloat(hoursStr);
      if (!h || h <= 0) return setError("Inserisci un valore di ore maggiore di zero");
      hoursPerDay = h;
    }

    // Atomic pre-check: validate all days first
    const r = remainingBudget(cat, entries, year, month0);
    let totalHoursNeeded = 0;
    let totalDaysNeeded = 0;

    for (const k of selectedKeys) {
      const d = dateFromKey(k);
      const info = getDayInfo(d, holidays, dayConfig);
      const existing = entries[k] ?? [];
      if (info.capacity === 0)
        return setError(`Errore: ${k} è un giorno non lavorativo`);
      if (existing.length > 0)
        return setError(`Errore: il giorno ${k} ha già una categoria assegnata`);

      const need = chosenKind === "daily" ? info.capacity : hoursPerDay;
      if (need > info.capacity + 0.001)
        return setError(`Errore: capienza superata per ${k} (${need}h > ${info.capacity}h)`);

      totalHoursNeeded += need;
      if (chosenKind === "daily") totalDaysNeeded += 1;
    }

    if (r.daysLeft !== undefined && totalDaysNeeded > r.daysLeft)
      return setError(
        `Errore: budget insufficiente per ${cat.name} (servono ${totalDaysNeeded}g, disponibili ${r.daysLeft}g)`,
      );
    if (r.hoursLeft !== undefined && totalHoursNeeded > r.hoursLeft + 0.001)
      return setError(
        `Errore: budget insufficiente per ${cat.name} (servono ${totalHoursNeeded}h, disponibili ${r.hoursLeft}h)`,
      );

    // Apply
    const next: EntriesMap = { ...entries };
    for (const k of selectedKeys) {
      const d = dateFromKey(k);
      const info = getDayInfo(d, holidays, dayConfig);
      const need = chosenKind === "daily" ? info.capacity : hoursPerDay;
      const entry: DayEntry = {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        kind: chosenKind,
        hours: need,
      };
      next[k] = [...(next[k] ?? []), entry];
    }
    onApply(next);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Selezione multipla
          </p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            {selectedKeys.length} giorn{selectedKeys.length === 1 ? "o" : "i"}
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crea prima una categoria.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {cat?.entryMode === "both" && (
            <div className="flex gap-1 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setKind("daily")}
                className={`flex-1 text-xs py-1.5 rounded-md transition ${kind === "daily" ? "bg-card shadow-sm" : ""}`}
              >
                Giornata intera
              </button>
              <button
                onClick={() => setKind("hourly")}
                className={`flex-1 text-xs py-1.5 rounded-md transition ${kind === "hourly" ? "bg-card shadow-sm" : ""}`}
              >
                A ore
              </button>
            </div>
          )}

          {(kind === "hourly" || cat?.entryMode === "hourly") &&
            cat?.entryMode !== "daily" && (
              <div>
                <label className="text-xs text-muted-foreground">Ore (per ogni giorno)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  inputMode="decimal"
                  placeholder="es. 2"
                  value={hoursStr}
                  onChange={(e) => {
                    let v = e.target.value;
                    v = v.replace(/^0+(?=\d)/, "");
                    setHoursStr(v);
                  }}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
                />
              </div>
            )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={apply}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
          >
            Applica a {selectedKeys.length} giorn{selectedKeys.length === 1 ? "o" : "i"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

// -------------- Settings Menu --------------
function SettingsMenu({
  onClose,
  onOpenProfile,
  onOpenGroups,
  onOpenCategories,
  onOpenGuide,
  onOpenDayConfig,
}: {
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenGroups: () => void;
  onOpenCategories: () => void;
  onOpenGuide: () => void;
  onOpenDayConfig: () => void;
}) {
  const items = [
    { label: "Profilo", icon: UserCircle2, onClick: onOpenProfile },
    { label: "Gruppi", icon: Users, onClick: onOpenGroups },
    { label: "Gestione Categorie", icon: Tags, onClick: onOpenCategories },
    { label: "Guida Utilizzo", icon: BookOpen, onClick: onOpenGuide },
    { label: "Configurazione Giorni", icon: CalendarCog, onClick: onOpenDayConfig },
  ];

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Menu</p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Impostazioni
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={it.onClick}
              className="w-full flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-secondary transition text-left"
            >
              <span className="rounded-lg bg-secondary p-2">
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex-1 text-sm font-medium uppercase tracking-wide">
                {it.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// -------------- Guide Modal (Carousel) --------------
function GuideModal({ onClose }: { onClose: () => void }) {
  const slides = [
    {
      title: "Benvenuto",
      body:
        "Questa è una scheda segnaposto. Qui potrai descrivere la panoramica generale dell'app, il suo scopo e i concetti principali.",
    },
    {
      title: "Inserire giorni",
      body:
        "Testo segnaposto per spiegare come toccare una cella per aggiungere una categoria, oppure tenere premuto per attivare la selezione multipla.",
    },
    {
      title: "Categorie e budget",
      body:
        "Testo segnaposto sulla gestione delle categorie, i budget annuali/mensili e la differenza tra inserimento giornaliero e a ore.",
    },
  ];
  const [idx, setIdx] = useState(0);
  const s = slides[idx];
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Scheda {idx + 1} / {slides.length}
          </p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Guida
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-secondary/40 p-5 min-h-[180px] flex flex-col">
        <h4 className="font-display text-lg font-semibold uppercase tracking-wide mb-2">
          {s.title}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="p-2 rounded-full hover:bg-secondary disabled:opacity-30"
          aria-label="Precedente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition ${
                i === idx ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
          disabled={idx === slides.length - 1}
          className="p-2 rounded-full hover:bg-secondary disabled:opacity-30"
          aria-label="Successiva"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </Sheet>
  );
}

// -------------- Day Config Modal --------------
const DOW_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function DayConfigModal({
  config,
  onChange,
  onClose,
}: {
  config: DayConfig;
  onChange: (c: DayConfig) => void;
  onClose: () => void;
}) {
  const [hoursHoliday, setHoursHoliday] = useState(String(config.hoursHoliday));
  const [hoursPre, setHoursPre] = useState(String(config.hoursPre));
  const [hoursWork, setHoursWork] = useState(String(config.hoursWork));
  const [dateExceptions, setDateExceptions] = useState<DateException[]>(config.dateExceptions);
  const [weekdayExceptions, setWeekdayExceptions] = useState<WeekdayException[]>(
    config.weekdayExceptions,
  );

  function save() {
    const next: DayConfig = {
      hoursHoliday: parseFloat(hoursHoliday) || 0,
      hoursPre: parseFloat(hoursPre) || 0,
      hoursWork: parseFloat(hoursWork) || 0,
      dateExceptions: dateExceptions.filter((e) => e.date),
      weekdayExceptions,
    };
    onChange(next);
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Impostazioni
          </p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Capienze &amp; Eccezioni
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Sezione 1: Capienze Base */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Capienze base
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Festivi", v: hoursHoliday, s: setHoursHoliday },
              { label: "Prefestivi", v: hoursPre, s: setHoursPre },
              { label: "Feriali", v: hoursWork, s: setHoursWork },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[11px] text-muted-foreground">{f.label}</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  value={f.v}
                  onChange={(e) => f.s(e.target.value.replace(/^0+(?=\d)/, ""))}
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            Priorità di calcolo: Festivo/Prefestivo → Data specifica → Giorno della settimana →
            Feriale standard.
          </p>
        </section>

        {/* Sezione 2a: Eccezioni su data specifica */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Eccezioni · Date
            </p>
            <button
              onClick={() =>
                setDateExceptions((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), date: "", label: "", hours: 5 },
                ])
              }
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-wide hover:bg-secondary"
            >
              <Plus className="w-3 h-3" /> Aggiungi
            </button>
          </div>
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {dateExceptions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">
                Nessuna eccezione su data specifica.
              </p>
            ) : (
              dateExceptions.map((ex) => (
                <div key={ex.id} className="flex flex-wrap items-center gap-2 p-2.5">
                  <input
                    type="date"
                    value={ex.date}
                    onChange={(e) =>
                      setDateExceptions((prev) =>
                        prev.map((x) => (x.id === ex.id ? { ...x, date: e.target.value } : x)),
                      )
                    }
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs tabular-nums"
                  />
                  <input
                    type="text"
                    placeholder="Descrizione"
                    value={ex.label}
                    onChange={(e) =>
                      setDateExceptions((prev) =>
                        prev.map((x) => (x.id === ex.id ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    className="flex-1 min-w-[100px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    value={ex.hours}
                    onChange={(e) =>
                      setDateExceptions((prev) =>
                        prev.map((x) =>
                          x.id === ex.id ? { ...x, hours: parseFloat(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                    className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs tabular-nums"
                    aria-label="Ore"
                  />
                  <span className="text-[11px] text-muted-foreground">h</span>
                  <button
                    onClick={() =>
                      setDateExceptions((prev) => prev.filter((x) => x.id !== ex.id))
                    }
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                    aria-label="Rimuovi eccezione"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Sezione 2b: Eccezioni ricorrenti per giorno della settimana */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Eccezioni · Giorno settimana
            </p>
            <button
              onClick={() =>
                setWeekdayExceptions((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), dow: 5, hours: 7 },
                ])
              }
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-wide hover:bg-secondary"
            >
              <Plus className="w-3 h-3" /> Aggiungi
            </button>
          </div>
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {weekdayExceptions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">
                Nessuna eccezione ricorrente.
              </p>
            ) : (
              weekdayExceptions.map((ex) => (
                <div key={ex.id} className="flex flex-wrap items-center gap-2 p-2.5">
                  <select
                    value={ex.dow}
                    onChange={(e) =>
                      setWeekdayExceptions((prev) =>
                        prev.map((x) =>
                          x.id === ex.id ? { ...x, dow: parseInt(e.target.value, 10) } : x,
                        ),
                      )
                    }
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <option key={d} value={d}>
                        {DOW_LONG[d]}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-muted-foreground">solo feriali</span>
                  <div className="flex-1" />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    value={ex.hours}
                    onChange={(e) =>
                      setWeekdayExceptions((prev) =>
                        prev.map((x) =>
                          x.id === ex.id ? { ...x, hours: parseFloat(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                    className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs tabular-nums"
                    aria-label="Ore"
                  />
                  <span className="text-[11px] text-muted-foreground">h</span>
                  <button
                    onClick={() =>
                      setWeekdayExceptions((prev) => prev.filter((x) => x.id !== ex.id))
                    }
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                    aria-label="Rimuovi eccezione"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary"
          >
            Annulla
          </button>
          <button
            onClick={save}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
          >
            Salva
          </button>
        </div>
      </div>
    </Sheet>
  );
}
