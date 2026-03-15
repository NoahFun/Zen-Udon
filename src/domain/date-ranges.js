import { formatDate, getWeekStart } from "./calculations.js";

function endOfWeekFromDate(dateStr) {
  const start = getWeekStart(dateStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDate(end);
}

function endOfMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const d = new Date(year, month, 0);
  return formatDate(d);
}

export function getWeeklyExportRange(selectedDate, today) {
  const startDate = formatDate(getWeekStart(selectedDate));
  const rawEndDate = endOfWeekFromDate(selectedDate);
  const endDate = rawEndDate > today ? today : rawEndDate;
  return { startDate, endDate };
}

export function getMonthlyExportRange(selectedMonth, today) {
  const startDate = `${selectedMonth}-01`;
  const rawEndDate = endOfMonth(selectedMonth);
  const endDate = rawEndDate > today ? today : rawEndDate;
  return { startDate, endDate };
}
