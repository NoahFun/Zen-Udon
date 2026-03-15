import { describe, expect, it } from "vitest";
import { buildCsvRows, toCsvString } from "../../src/reports/export-csv.js";
import { buildWorkbook } from "../../src/reports/export-xlsx.js";
import * as XLSX from "xlsx";

describe("report exporters", () => {
  const data = {
    dailyRecords: {
      "2026-03-14": {
        date: "2026-03-14",
        revenue: 90,
        totalExpenses: 30,
        profit: 60,
        rows: [{ category: "food", itemName: "rice", unitCost: 3, quantity: 10, amount: 30 }]
      },
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

  it("builds workbook for date range only", () => {
    const wb = buildWorkbook(data, { startDate: "2026-03-15", endDate: "2026-03-15" });
    const summary = XLSX.utils.sheet_to_json(wb.Sheets.Summary, { header: 1 });
    expect(summary).toHaveLength(2);
    expect(String(summary[1][0])).toContain("2026-03-15");
  });
});
