import { describe, expect, it } from "vitest";
import { loadAppData, loadDailyRecord, saveDailyRecord, saveMasterItems } from "../../src/data/storage.js";

describe("storage", () => {
  it("loads defaults", () => {
    const data = loadAppData();
    expect(Array.isArray(data.masterItems)).toBe(true);
  });

  it("saves and loads master items and records", () => {
    saveMasterItems([{ id: "x", category: "food", itemName: "fish", unitCost: 9.5 }]);
    const data = loadAppData();
    expect(data.masterItems).toHaveLength(1);
    saveDailyRecord({ date: "2026-03-15", revenue: 100, rows: [], totalExpenses: 0, profit: 100 });
    expect(loadDailyRecord("2026-03-15")?.profit).toBe(100);
  });
});
