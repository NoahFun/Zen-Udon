import { describe, expect, it } from "vitest";
import { buildAppDataFromRows, buildDailyRecordRowPayload } from "../../src/data/cloud-storage.js";

describe("cloud storage data mapping", () => {
  it("maps supabase rows into app data shape", () => {
    const appData = buildAppDataFromRows(
      [
        { id: "m1", category: "food", item_name: "rice", unit_cost: 3, created_at: "2026-03-15T00:00:00Z", updated_at: "2026-03-15T00:00:00Z" }
      ],
      [
        { id: "d1", date: "2026-03-15", revenue: 100, total_expenses: 30, profit: 70, notes: "ok", updated_at: "2026-03-15T00:00:00Z" }
      ],
      [
        { daily_record_id: "d1", item_id: "m1", category: "food", item_name: "rice", unit_cost: 3, quantity: 10, amount: 30 }
      ]
    );

    expect(appData.masterItems).toHaveLength(1);
    expect(appData.masterItems[0]).toEqual({
      id: "m1",
      category: "food",
      itemName: "rice",
      unitCost: 3,
      createdAt: "2026-03-15T00:00:00Z",
      updatedAt: "2026-03-15T00:00:00Z"
    });
    expect(appData.dailyRecords["2026-03-15"]).toBeTruthy();
    expect(appData.dailyRecords["2026-03-15"].rows).toHaveLength(1);
  });

  it("builds payload rows for daily record row inserts", () => {
    const payload = buildDailyRecordRowPayload("u1", "d1", [
      { itemId: "m1", category: "food", itemName: "rice", unitCost: 3, quantity: 10, amount: 30 }
    ]);

    expect(payload).toEqual([
      {
        user_id: "u1",
        daily_record_id: "d1",
        item_id: "m1",
        category: "food",
        item_name: "rice",
        unit_cost: 3,
        quantity: 10,
        amount: 30
      }
    ]);
  });
});
