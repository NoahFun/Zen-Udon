import { describe, expect, it } from "vitest";
import { initApp } from "../../src/main.js";

describe("dashboard period controls", () => {
  it("shows per-card selectors and chart controls with selected-date defaults", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    const dashboardBtn = document.querySelector("[data-nav='dashboard']");
    dashboardBtn.click();

    const selectedDate = document.querySelector("#daily-date")?.value || new Date().toISOString().slice(0, 10);
    const expectedMonth = selectedDate.slice(0, 7);

    expect(document.querySelector("#daily-card-date")).toBeTruthy();
    expect(document.querySelector("#weekly-card-date")).toBeTruthy();
    expect(document.querySelector("#monthly-card-month")).toBeTruthy();
    expect(document.querySelector("#chart-period")).toBeTruthy();
    expect(document.querySelector("#chart-sync")).toBeTruthy();
    expect(document.querySelector("#daily-card-date").value).toBe(selectedDate);
    expect(document.querySelector("#weekly-card-date").value).toBe(selectedDate);
    expect(document.querySelector("#monthly-card-month").value).toBe(expectedMonth);
  });

  it("switches chart input mode for monthly period", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();
    document.querySelector("[data-nav='dashboard']").click();

    const period = document.querySelector("#chart-period");
    period.value = "monthly";
    period.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.querySelector("#chart-month")).toBeTruthy();
    expect(document.querySelector("#chart-date")).toBeFalsy();
  });
});
