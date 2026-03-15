import { describe, expect, it } from "vitest";
import { buildCsvRows, toCsvString } from "../../src/reports/export-csv.js";
import { buildWorkbook } from "../../src/reports/export-xlsx.js";

describe("report exporters", () => {
  const data = {
    dailyRecords: {
      "2026-03-15": {
        date: "2026-03-15",
        revenue: 100,
        totalExpenses: 60,
        profit: 40,
        rows: [{ category: "food", itemName: "fish", unitCost: 10, quantity: 2, amount: 20 }]
      }
    }
  };

  it("builds csv", () => {
    const rows = buildCsvRows(data);
    const text = toCsvString(rows);
    expect(text).toContain("2026-03-15");
  });

  it("builds workbook", () => {
    const wb = buildWorkbook(data);
    expect(wb.SheetNames).toContain("Summary");
    expect(wb.SheetNames).toContain("Expenses");
  });
});
