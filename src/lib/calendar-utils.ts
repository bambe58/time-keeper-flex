export type RecurrenceType = "annual" | "monthly" | "eternal";
export type EntryMode = "daily" | "hourly" | "both";

export interface Category {
  id: string;
  name: string;
  symbol: string; // max 2 chars
  color: string; // hex
  recurrence: RecurrenceType;
  entryMode: EntryMode;
  budgetDays?: number; // total allowance in days
  budgetHours?: number; // total allowance in hours
}

export interface DayEntry {
  id: string;
  categoryId: string;
  kind: "daily" | "hourly";
  hours: number; // for daily entries this equals day capacity
}

// dayKey format: YYYY-MM-DD
export type EntriesMap = Record<string, DayEntry[]>;

// --- Italian holidays ---
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getItalianHolidays(year: number): Set<string> {
  const fixed = [
    [1, 1],
    [1, 6],
    [4, 25],
    [5, 1],
    [6, 2],
    [8, 15],
    [11, 1],
    [12, 8],
    [12, 25],
    [12, 26],
  ];
  const s = new Set<string>();
  for (const [m, d] of fixed) s.add(fmtKey(year, m, d));
  const easter = easterSunday(year);
  const monday = new Date(easter);
  monday.setDate(easter.getDate() + 1);
  s.add(fmtKey(monday.getFullYear(), monday.getMonth() + 1, monday.getDate()));
  return s;
}

const SPECIAL_PREHOLIDAYS: Array<[number, number]> = [
  [7, 2],
  [8, 14],
  [8, 16],
  [12, 1],
  [12, 24],
  [12, 31],
];

export function fmtKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function keyFromDate(d: Date) {
  return fmtKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export type DayType = "holiday" | "special" | "friday" | "weekday";

export function getDayInfo(date: Date, holidays: Set<string>) {
  const key = keyFromDate(date);
  if (holidays.has(key)) {
    // Sundays also 0 capacity
    return { type: "holiday" as DayType, capacity: 0, key };
  }
  const dow = date.getDay(); // 0 Sun 6 Sat
  if (dow === 0) return { type: "holiday" as DayType, capacity: 0, key };

  const m = date.getMonth() + 1;
  const d = date.getDate();
  const isSpecial = SPECIAL_PREHOLIDAYS.some(([sm, sd]) => sm === m && sd === d);
  if (isSpecial) return { type: "special" as DayType, capacity: 5, key };

  if (dow === 6) return { type: "holiday" as DayType, capacity: 0, key }; // Saturday treat as holiday? spec doesn't say. Let's treat as weekend holiday visual? Spec says holidays = 0. Sabato non è festivo. Treat as weekday 7.5? Standard italiano: sabato non lavorativo. Ambiguo. Let's treat sabato as holiday (0h).
  if (dow === 5) return { type: "friday" as DayType, capacity: 7, key };
  return { type: "weekday" as DayType, capacity: 7.5, key };
}

export function monthMatrix(year: number, month0: number): Date[] {
  // Monday-start grid
  const first = new Date(year, month0, 1);
  const startDow = (first.getDay() + 6) % 7; // 0=Mon
  const days: Date[] = [];
  const gridStart = new Date(year, month0, 1 - startDow);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

// Compute remaining budget for a category given all entries (across relevant scope)
export function computeUsage(
  cat: Category,
  entries: EntriesMap,
  scopeYear: number,
  scopeMonth0: number,
) {
  let usedHours = 0;
  const usedDayKeys = new Set<string>();
  for (const [key, list] of Object.entries(entries)) {
    const [yStr, mStr] = key.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    if (cat.recurrence === "annual" && y !== scopeYear) continue;
    if (cat.recurrence === "monthly" && (y !== scopeYear || m !== scopeMonth0)) continue;
    for (const e of list) {
      if (e.categoryId !== cat.id) continue;
      usedHours += e.hours;
      if (e.kind === "daily") usedDayKeys.add(key);
    }
  }
  const usedDays = usedDayKeys.size + Math.max(0, 0); // hourly entries don't count as full days
  return { usedHours, usedDays };
}

export function remainingBudget(
  cat: Category,
  entries: EntriesMap,
  scopeYear: number,
  scopeMonth0: number,
) {
  const { usedHours, usedDays } = computeUsage(cat, entries, scopeYear, scopeMonth0);
  // if only days provided, compute hours = days * 7.5
  const totalHours =
    cat.budgetHours ?? (cat.budgetDays !== undefined ? cat.budgetDays * 7.5 : undefined);
  const totalDays = cat.budgetDays;
  return {
    hoursLeft: totalHours !== undefined ? Math.max(0, totalHours - usedHours) : undefined,
    daysLeft: totalDays !== undefined ? Math.max(0, totalDays - usedDays) : undefined,
    hoursTotal: totalHours,
    daysTotal: totalDays,
    usedHours,
    usedDays,
  };
}
