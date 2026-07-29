import { DEFAULT_DAY_CONFIG, type Category, type DayConfig, type EntriesMap } from "./calendar-utils";

const CATS_KEY = "cal.categories.v1";
const ENTRIES_KEY = "cal.entries.v1";
const DAYCFG_KEY = "cal.dayconfig.v1";

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATS_KEY);
    if (!raw) return defaultCategories();
    return JSON.parse(raw) as Category[];
  } catch {
    return defaultCategories();
  }
}
export function saveCategories(cats: Category[]) {
  localStorage.setItem(CATS_KEY, JSON.stringify(cats));
}
export function loadEntries(): EntriesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as EntriesMap;
  } catch {
    return {};
  }
}
export function saveEntries(e: EntriesMap) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(e));
}
export function loadDayConfig(): DayConfig {
  if (typeof window === "undefined") return DEFAULT_DAY_CONFIG;
  try {
    const raw = localStorage.getItem(DAYCFG_KEY);
    if (!raw) return DEFAULT_DAY_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DayConfig>;
    return {
      hoursHoliday: parsed.hoursHoliday ?? DEFAULT_DAY_CONFIG.hoursHoliday,
      hoursPre: parsed.hoursPre ?? DEFAULT_DAY_CONFIG.hoursPre,
      hoursWork: parsed.hoursWork ?? DEFAULT_DAY_CONFIG.hoursWork,
      dateExceptions: parsed.dateExceptions ?? [],
      weekdayExceptions: parsed.weekdayExceptions ?? DEFAULT_DAY_CONFIG.weekdayExceptions,
    };
  } catch {
    return DEFAULT_DAY_CONFIG;
  }
}
export function saveDayConfig(cfg: DayConfig) {
  localStorage.setItem(DAYCFG_KEY, JSON.stringify(cfg));
}

function defaultCategories(): Category[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Ferie",
      symbol: "FE",
      color: "#0ea5e9",
      recurrence: "annual",
      entryMode: "daily",
      budgetDays: 22,
    },
    {
      id: crypto.randomUUID(),
      name: "Permesso",
      symbol: "PE",
      color: "#f59e0b",
      recurrence: "annual",
      entryMode: "hourly",
      budgetHours: 36,
    },
    {
      id: crypto.randomUUID(),
      name: "Smart Working",
      symbol: "SW",
      color: "#10b981",
      recurrence: "monthly",
      entryMode: "both",
      budgetDays: 8,
    },
    {
      id: crypto.randomUUID(),
      name: "Ufficio",
      symbol: "UF",
      color: "#64748b",
      recurrence: "eternal",
      entryMode: "daily",
    },
  ];
}

export const PALETTE = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];
