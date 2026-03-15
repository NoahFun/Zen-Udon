const STORAGE_KEY = "restaurant-expense-app-v1";
const DRAFT_KEY = "restaurant-expense-app-v1-draft";

const DEFAULT_DATA = {
  masterItems: [
    { id: "seed-food", category: "food", itemName: "rice", unitCost: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "seed-utility", category: "utility", itemName: "electricity", unitCost: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "seed-salary", category: "salary", itemName: "staff wage", unitCost: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  dailyRecords: {}
};

function safeParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function loadAppData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(DEFAULT_DATA);
  const parsed = safeParse(raw, null);
  if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_DATA);
  return {
    masterItems: Array.isArray(parsed.masterItems) ? parsed.masterItems : [],
    dailyRecords: parsed.dailyRecords && typeof parsed.dailyRecords === "object" ? parsed.dailyRecords : {}
  };
}

export function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveMasterItems(items) {
  const data = loadAppData();
  data.masterItems = items;
  saveAppData(data);
}

export function saveDailyRecord(record) {
  const data = loadAppData();
  data.dailyRecords[record.date] = record;
  saveAppData(data);
}

export function loadDailyRecord(date) {
  const data = loadAppData();
  return data.dailyRecords[date] || null;
}

export function saveDraft(draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return safeParse(raw, null);
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
