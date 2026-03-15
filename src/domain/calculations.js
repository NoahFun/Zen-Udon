export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calcRowAmount(unitCost, quantity) {
  return round2(Number(unitCost || 0) * Number(quantity || 0));
}

export function calcTotalExpenses(rows) {
  return round2(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0));
}

export function calcProfit(revenue, totalExpenses) {
  return round2(Number(revenue || 0) - Number(totalExpenses || 0));
}

export function getWeekStart(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function aggregateWeekly(recordsByDate, referenceDate) {
  const start = getWeekStart(referenceDate);
  const totals = { revenue: 0, expenses: 0, profit: 0 };
  for (let i = 0; i < 7; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = formatDate(current);
    const rec = recordsByDate[key];
    if (rec) {
      totals.revenue += Number(rec.revenue || 0);
      totals.expenses += Number(rec.totalExpenses || 0);
      totals.profit += Number(rec.profit || 0);
    }
  }
  return {
    revenue: round2(totals.revenue),
    expenses: round2(totals.expenses),
    profit: round2(totals.profit)
  };
}

export function aggregateMonthly(recordsByDate, referenceDate) {
  const ref = new Date(`${referenceDate}T00:00:00`);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const totals = { revenue: 0, expenses: 0, profit: 0 };
  Object.values(recordsByDate).forEach((rec) => {
    const d = new Date(`${rec.date}T00:00:00`);
    if (d.getFullYear() === year && d.getMonth() === month) {
      totals.revenue += Number(rec.revenue || 0);
      totals.expenses += Number(rec.totalExpenses || 0);
      totals.profit += Number(rec.profit || 0);
    }
  });
  return {
    revenue: round2(totals.revenue),
    expenses: round2(totals.expenses),
    profit: round2(totals.profit)
  };
}
