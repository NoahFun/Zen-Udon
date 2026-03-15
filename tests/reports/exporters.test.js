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
        totalExpenses: 39,
        profit: 61,
        rows: [
          { category: "food", itemName: "fish", unitCost: 10, quantity: 2, amount: 20 },
          { category: "food", itemName: "rice", unitCost: 3, quantity: 5, amount: 15 },
          { category: "food", itemName: "rice", unitCost: 4, quantity: 1, amount: 4 }
        ]
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
    expect(wb.SheetNames).toEqual(["Report"]);
    const report = XLSX.utils.sheet_to_json(wb.Sheets.Report, { header: 1 });
    expect(report[0]).toEqual(["Category", "Item", "Unit Cost", "Quantity", "Amount"]);

    const rice3 = report.find((row) => row[1] === "rice" && row[2] === 3);
    const rice4 = report.find((row) => row[1] === "rice" && row[2] === 4);
    expect(rice3).toEqual(["food", "rice", 3, 15, 45]);
    expect(rice4).toEqual(["food", "rice", 4, 1, 4]);

    expect(report).toContainEqual(["Revenue", 190]);
    expect(report).toContainEqual(["Total Expenses", 69]);
    expect(report).toContainEqual(["Profit", 121]);
  });

  it("builds workbook for date range only", () => {
    const wb = buildWorkbook(data, { startDate: "2026-03-15", endDate: "2026-03-15" });
    const report = XLSX.utils.sheet_to_json(wb.Sheets.Report, { header: 1 });
    expect(report.find((row) => row[1] === "fish")).toEqual(["food", "fish", 10, 2, 20]);
    expect(report.find((row) => row[1] === "rice" && row[2] === 3)).toEqual(["food", "rice", 3, 5, 15]);
    expect(report.find((row) => row[1] === "rice" && row[2] === 4)).toEqual(["food", "rice", 4, 1, 4]);
    expect(report).toContainEqual(["Revenue", 100]);
    expect(report).toContainEqual(["Total Expenses", 39]);
    expect(report).toContainEqual(["Profit", 61]);
  });
});
