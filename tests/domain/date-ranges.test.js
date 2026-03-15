import { describe, expect, it } from "vitest";
import { getMonthlyExportRange, getWeeklyExportRange } from "../../src/domain/date-ranges.js";

describe("date ranges", () => {
  it("caps current week to today", () => {
    const range = getWeeklyExportRange("2026-03-18", "2026-03-20");
    expect(range).toEqual({ startDate: "2026-03-16", endDate: "2026-03-20" });
  });

  it("keeps full week for completed week", () => {
    const range = getWeeklyExportRange("2026-03-10", "2026-03-20");
    expect(range).toEqual({ startDate: "2026-03-09", endDate: "2026-03-15" });
  });

  it("keeps full week for future week (no cap to today)", () => {
    const range = getWeeklyExportRange("2026-03-20", "2026-03-15");
    expect(range).toEqual({ startDate: "2026-03-16", endDate: "2026-03-22" });
  });

  it("caps current month to today", () => {
    const range = getMonthlyExportRange("2026-03", "2026-03-20");
    expect(range).toEqual({ startDate: "2026-03-01", endDate: "2026-03-20" });
  });

  it("keeps full month for completed month", () => {
    const range = getMonthlyExportRange("2026-02", "2026-03-20");
    expect(range).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
  });

  it("keeps full month for future month (no cap to today)", () => {
    const range = getMonthlyExportRange("2026-04", "2026-03-20");
    expect(range).toEqual({ startDate: "2026-04-01", endDate: "2026-04-30" });
  });
});
