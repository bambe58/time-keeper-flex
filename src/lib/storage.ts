import type { Category, EntriesMap } from "./calendar-utils";

const CATS_KEY = "cal.categories.v1";
const ENTRIES_KEY = "cal.entries.v1";

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
