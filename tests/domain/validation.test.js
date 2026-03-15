import { describe, expect, it } from "vitest";
import { validateDailyForm, validateMasterItem, validateQuantity } from "../../src/domain/validation.js";

describe("validation", () => {
  it("validates daily form", () => {
    expect(validateDailyForm("", "")).toMatchObject({ valid: false });
    expect(validateDailyForm("2026-03-15", 100)).toMatchObject({ valid: true });
  });

  it("validates master item and duplicate", () => {
    const items = [{ id: "1", category: "food", itemName: "rice", unitCost: 2 }];
    expect(validateMasterItem({ category: "food", itemName: "rice", unitCost: 3 }, items).valid).toBe(false);
    expect(validateMasterItem({ category: "food", itemName: "egg", unitCost: 3 }, items).valid).toBe(true);
  });

  it("allows decimal quantity", () => {
    expect(validateQuantity("1.25")).toBe(true);
    expect(validateQuantity("-1")).toBe(false);
  });
});
