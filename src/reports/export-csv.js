export function buildCsvRows(data) {
  const rows = [["Date", "Revenue", "TotalExpenses", "Profit"]];
  const dates = Object.keys(data.dailyRecords).sort();
  dates.forEach((date) => {
    const rec = data.dailyRecords[date];
    rows.push([date, rec.revenue, rec.totalExpenses, rec.profit]);
  });
  return rows;
}

export function toCsvString(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}
