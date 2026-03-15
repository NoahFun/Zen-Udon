import { describe, expect, it } from "vitest";
import { aggregateMonthly, aggregateWeekly, calcProfit, calcRowAmount, calcTotalExpenses } from "../../src/domain/calculations.js";

describe("calculations", () => {
  it("calculates row amount", () => {
    expect(calcRowAmount(12.5, 2)).toBe(25);
  });

  it("calculates totals and profit", () => {
    const total = calcTotalExpenses([{ amount: 10.25 }, { amount: 4.75 }]);
    expect(total).toBe(15);
    expect(calcProfit(50, total)).toBe(35);
  });

  it("aggregates weekly and monthly", () => {
    const records = {
      "2026-03-09": { date: "2026-03-09", revenue: 100, totalExpenses: 40, profit: 60 },
      "2026-03-10": { date: "2026-03-10", revenue: 80, totalExpenses: 30, profit: 50 },
      "2026-03-15": { date: "2026-03-15", revenue: 70, totalExpenses: 20, profit: 50 }
    };
    expect(aggregateWeekly(records, "2026-03-10")).toEqual({ revenue: 250, expenses: 90, profit: 160 });
    expect(aggregateMonthly(records, "2026-03-10")).toEqual({ revenue: 250, expenses: 90, profit: 160 });
  });
});
