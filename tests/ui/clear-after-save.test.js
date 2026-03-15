import { describe, expect, it } from "vitest";
import { saveMasterItems } from "../../src/data/storage.js";
import { initApp } from "../../src/main.js";

describe("daily entry save behavior", () => {
  it("clears all daily fields after a successful save", () => {
    saveMasterItems([{ id: "i-1", category: "food", itemName: "Noodles", unitCost: 10 }]);
    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    const revenue = document.querySelector("#daily-revenue");
    const quantity = document.querySelector("[data-action='qty']");
    const notes = document.querySelector("#daily-notes");
    const saveBtn = document.querySelector("#save-day");

    revenue.value = "100";
    revenue.dispatchEvent(new Event("input", { bubbles: true }));
    quantity.value = "2";
    quantity.dispatchEvent(new Event("input", { bubbles: true }));
    notes.value = "Lunch rush";
    notes.dispatchEvent(new Event("input", { bubbles: true }));

    saveBtn.click();

    expect(document.querySelector("#daily-revenue").value).toBe("");
    expect(document.querySelector("[data-action='qty']").value).toBe("");
    expect(document.querySelector("#daily-notes").value).toBe("");
  });
});
