import { loadAppData, saveAppData } from "./storage.js";

export function createJsonBackup() {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: loadAppData() }, null, 2);
}

export function restoreFromJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file.");
  }
  if (!parsed || parsed.version !== 1 || !parsed.data) {
    throw new Error("Unsupported backup format.");
  }
  saveAppData(parsed.data);
}
