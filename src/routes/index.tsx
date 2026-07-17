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
} from "lucide-react";
import {
  getItalianHolidays,
  getDayInfo,
  keyFromDate,
  monthMatrix,
  remainingBudget,
  type Category,
  type EntriesMap,
  type DayEntry,
} from "@/lib/calendar-utils";
import {
  loadCategories,
  saveCategories,
  loadEntries,
  saveEntries,
  PALETTE,
} from "@/lib/storage";

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
  const [showCats, setShowCats] = useState(false);
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState("");


  useEffect(() => {
    if (!hydrated) return;
    setCategories(loadCategories());
    setEntries(loadEntries());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCategories(categories);
  }, [categories, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveEntries(entries);
  }, [entries, hydrated]);

  const holidays = useMemo(() => getItalianHolidays(year), [year]);
  const days = useMemo(() => monthMatrix(year, month), [year, month]);

  // Month status
  const monthStatus = useMemo(() => {
    let total = 0;
    let full = 0;
    let empty = 0;
    for (const d of days) {
      if (d.getMonth() !== month) continue;
      const info = getDayInfo(d, holidays);
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

  return (
    <main className="min-h-screen pb-24 no-tap-highlight">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Il tuo tempo
            </p>
            <h1 className="font-display text-2xl font-semibold uppercase tracking-wide leading-none mt-1.5">
              Calendario
            </h1>
          </div>
          <button
            onClick={() => setShowCats(true)}
            className="rounded-full border border-border bg-card p-3 hover:bg-secondary transition"
            aria-label="Gestisci categorie"
          >
            <Settings2 className="w-4 h-4" />
          </button>
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
            {days.map((d) => (
              <DayCell
                key={d.toISOString()}
                date={d}
                currentMonth={month}
                holidays={holidays}
                entries={entries[keyFromDate(d)] ?? []}
                categories={categories}
                onClick={() => {
                  const info = getDayInfo(d, holidays);
                  if (info.capacity === 0) return;
                  if (d.getMonth() !== month) return;
                  setOpenDay(d);
                }}
              />
            ))}
          </div>
        </div>

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
    </main>
  );
}

function DayCell({
  date,
  currentMonth,
  holidays,
  entries,
  categories,
  onClick,
}: {
  date: Date;
  currentMonth: number;
  holidays: Set<string>;
  entries: DayEntry[];
  categories: Category[];
  onClick: () => void;
}) {
  const info = getDayInfo(date, holidays);
  const inMonth = date.getMonth() === currentMonth;
  const used = entries.reduce((s, e) => s + e.hours, 0);
  const remaining = Math.max(0, info.capacity - used);
  const full = info.capacity > 0 && remaining <= 0.001;

  const numColor =
    info.type === "holiday"
      ? "text-holiday"
      : info.type === "special"
        ? "text-special"
        : "text-foreground";

  return (
    <button
      onClick={onClick}
      disabled={info.capacity === 0 || !inMonth}
      className={`relative min-h-[3.5rem] sm:min-h-[4.25rem] rounded-lg text-left p-1.5 sm:p-2.5 flex flex-col overflow-hidden transition ${
        inMonth ? "bg-background hover:bg-secondary/70" : "bg-transparent opacity-40"
      } ${info.capacity === 0 ? "cursor-default" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-sm font-medium tabular-nums ${numColor}`}>{date.getDate()}</span>
        {info.capacity > 0 && (
          <span
            className={`text-[9px] tabular-nums leading-none ${
              full ? "text-foreground font-bold" : "text-muted-foreground/60"
            }`}
          >
            {used}/{info.capacity}
          </span>
        )}

      </div>
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
  categories,
  entries,
  onClose,
  onChange,
}: {
  date: Date;
  holidays: Set<string>;
  categories: Category[];
  entries: EntriesMap;
  onClose: () => void;
  onChange: (e: EntriesMap) => void;
}) {
  const info = getDayInfo(date, holidays);
  const key = info.key;
  const dayEntries = entries[key] ?? [];
  const used = dayEntries.reduce((s, e) => s + e.hours, 0);
  const remaining = info.capacity - used;
  const hasDaily = dayEntries.some((e) => e.kind === "daily");
  const hasHourly = dayEntries.some((e) => e.kind === "hourly");

  const [catId, setCatId] = useState<string>(categories[0]?.id ?? "");
  const [kind, setKind] = useState<"daily" | "hourly">("daily");
  const [hours, setHours] = useState<number>(1);
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
    if (chosenKind === "daily") {
      if (hasHourly || hasDaily) return setError("categorie incompatibili");
      if (info.capacity > remaining + 0.001) {
        // capacity is what a daily takes
      }
      const entry: DayEntry = {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        kind: "daily",
        hours: info.capacity,
      };
      onChange({ ...entries, [key]: [...dayEntries, entry] });
    } else {
      if (hasDaily) return setError("categorie incompatibili");
      if (hours <= 0) return setError("Inserisci un valore maggiore di zero");
      if (used + hours > info.capacity + 0.001) return setError("capienza oraria superata");
      const entry: DayEntry = {
        id: crypto.randomUUID(),
        categoryId: cat.id,
        kind: "hourly",
        hours,
      };
      onChange({ ...entries, [key]: [...dayEntries, entry] });
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
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
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
                          : "Eterna"}{" "}
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
    // auto-compute hours from days if entryMode is "both" and only days set
    if (c.entryMode === "both" && c.budgetDays !== undefined && c.budgetHours === undefined) {
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
              {r === "annual" ? "Annuale" : r === "monthly" ? "Mensile" : "Eterna"}
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
              onChange={(e) => setBudgetDays(e.target.value)}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
            />
          </div>
        )}
        {(entryMode === "hourly" || entryMode === "both") && (
          <div>
            <label className="text-xs text-muted-foreground">Ore disponibili</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={budgetHours}
              onChange={(e) => setBudgetHours(e.target.value)}
              placeholder={entryMode === "both" && budgetDays ? `${parseFloat(budgetDays) * 7.5}` : ""}
              className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums"
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
