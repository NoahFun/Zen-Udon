import { describe, expect, it } from "vitest";
import { loadDailyRecord, saveMasterItems } from "../../src/data/storage.js";
import { initApp } from "../../src/main.js";

describe("daily entry category filter", () => {
  it("filters rows and calculates/saves using only the selected category", () => {
    saveMasterItems([
      { id: "food-1", category: "food", itemName: "Noodles", unitCost: 10 },
      { id: "util-1", category: "utility", itemName: "Gas", unitCost: 5 }
    ]);

    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    const categoryFilter = document.querySelector("#daily-category-filter");
    categoryFilter.value = "food";
    categoryFilter.dispatchEvent(new Event("change", { bubbles: true }));

    const visibleRows = document.querySelectorAll("[data-view='daily-entry'] tbody tr");
    expect(visibleRows.length).toBe(1);
    expect(visibleRows[0].textContent).toContain("Noodles");

    const revenue = document.querySelector("#daily-revenue");
    revenue.value = "100";
    revenue.dispatchEvent(new Event("input", { bubbles: true }));

    const qtyInput = document.querySelector("[data-action='qty']");
    qtyInput.value = "2";
    qtyInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.querySelector("#total-expenses").textContent).toBe("20.00");
    expect(document.querySelector("#daily-profit").textContent).toBe("80.00");

    const selectedDate = document.querySelector("#daily-date").value;
    document.querySelector("#save-day").click();

    const record = loadDailyRecord(selectedDate);
    expect(record.rows.length).toBe(1);
    expect(record.rows[0].category).toBe("food");
    expect(record.totalExpenses).toBe(20);
    expect(record.profit).toBe(80);
  });
});
