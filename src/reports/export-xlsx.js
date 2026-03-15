import * as XLSX from "xlsx";

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

  const grouped = new Map();
  let totalRevenue = 0;
  filteredRecords.forEach((rec) => {
    totalRevenue += Number(rec.revenue || 0);
    rec.rows.forEach((row) => {
      const category = String(row.category || "");
      const itemName = String(row.itemName || "");
      const unitCost = Number(row.unitCost || 0);
      const key = `${category}||${itemName}||${unitCost}`;
      const current = grouped.get(key) || {
        category,
        itemName,
        unitCost,
        quantity: 0,
        amount: 0
      };
      current.quantity += Number(row.quantity || 0);
      current.amount += Number(row.amount || 0);
      grouped.set(key, current);
    });
  });

  const detailRows = Array.from(grouped.values())
    .sort((a, b) =>
      a.category.localeCompare(b.category) ||
      a.itemName.localeCompare(b.itemName) ||
      a.unitCost - b.unitCost
    )
    .map((row) => [row.category, row.itemName, row.unitCost, row.quantity, row.amount]);

  const totalExpenses = detailRows.reduce((sum, row) => sum + Number(row[4] || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const reportRows = [
    ["Category", "Item", "Unit Cost", "Quantity", "Amount"],
    ...detailRows,
    [],
    ["Revenue", totalRevenue],
    ["Total Expenses", totalExpenses],
    ["Profit", profit]
  ];

  const wb = XLSX.utils.book_new();
  const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(wb, reportSheet, "Report");
  return wb;
}
