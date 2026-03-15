import * as XLSX from "xlsx";
import { buildCsvRows } from "./export-csv.js";

function inRange(date, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

export function buildWorkbook(data, options = {}) {
  const { startDate, endDate } = options;
  const filteredRecords = Object.values(data.dailyRecords).filter((rec) =>
    inRange(rec.date, startDate, endDate)
  );
  const filteredData = {
    ...data,
    dailyRecords: Object.fromEntries(filteredRecords.map((rec) => [rec.date, rec]))
  };

  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(buildCsvRows(filteredData));
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const expenseRows = [["Date", "Category", "Item", "UnitCost", "Quantity", "Amount"]];
  filteredRecords.forEach((rec) => {
    rec.rows.forEach((row) => {
      expenseRows.push([rec.date, row.category, row.itemName, row.unitCost, row.quantity, row.amount]);
    });
  });
  const expenseSheet = XLSX.utils.aoa_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");
  return wb;
}
