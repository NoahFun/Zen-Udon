import * as XLSX from "xlsx";
import { buildCsvRows } from "./export-csv.js";

export function buildWorkbook(data) {
  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(buildCsvRows(data));
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const expenseRows = [["Date", "Category", "Item", "UnitCost", "Quantity", "Amount"]];
  Object.values(data.dailyRecords).forEach((rec) => {
    rec.rows.forEach((row) => {
      expenseRows.push([rec.date, row.category, row.itemName, row.unitCost, row.quantity, row.amount]);
    });
  });
  const expenseSheet = XLSX.utils.aoa_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");
  return wb;
}
