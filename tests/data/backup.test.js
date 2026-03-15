import { describe, expect, it } from "vitest";
import { createJsonBackup, restoreFromJson } from "../../src/data/backup.js";
import { loadAppData, saveMasterItems } from "../../src/data/storage.js";

describe("backup", () => {
  it("exports and restores json", () => {
    saveMasterItems([{ id: "a", category: "food", itemName: "beef", unitCost: 8 }]);
    const text = createJsonBackup();
    saveMasterItems([{ id: "b", category: "food", itemName: "egg", unitCost: 3 }]);
    restoreFromJson(text);
    expect(loadAppData().masterItems[0].itemName).toBe("beef");
  });
});
