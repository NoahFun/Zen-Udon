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
    expect(document.querySelector("#daily-export-xlsx")).toBeTruthy();
    expect(document.querySelector("#weekly-export-xlsx")).toBeTruthy();
    expect(document.querySelector("#monthly-export-xlsx")).toBeTruthy();
    expect(document.querySelector("#daily-card-date").value).toBe(selectedDate);
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

  it("keeps weekly selector independent from daily date change", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    document.querySelector("[data-nav='dashboard']").click();
    const weeklyInput = document.querySelector("#weekly-card-date");
    weeklyInput.value = "2026-03-10";
    weeklyInput.dispatchEvent(new Event("change", { bubbles: true }));

    document.querySelector("[data-nav='daily']").click();
    const dailyDate = document.querySelector("#daily-date");
    dailyDate.value = "2026-03-20";
    dailyDate.dispatchEvent(new Event("change", { bubbles: true }));

    document.querySelector("[data-nav='dashboard']").click();
    expect(document.querySelector("#weekly-card-date").value).toBe("2026-03-10");
  });
});
