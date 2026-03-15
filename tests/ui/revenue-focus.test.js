import { describe, expect, it } from "vitest";
import { initApp } from "../../src/main.js";

describe("daily revenue input UX", () => {
  it("keeps focus while typing revenue", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    const revenue = document.querySelector("#daily-revenue");
    revenue.focus();
    revenue.value = "1";
    revenue.dispatchEvent(new Event("input", { bubbles: true }));

    const nextRevenue = document.querySelector("#daily-revenue");
    expect(document.activeElement).toBe(nextRevenue);
    expect(nextRevenue.value).toBe("1");
  });

  it("does not recreate revenue input element on each keystroke", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();

    const revenue = document.querySelector("#daily-revenue");
    revenue.value = "12";
    revenue.dispatchEvent(new Event("input", { bubbles: true }));

    const sameRevenue = document.querySelector("#daily-revenue");
    expect(sameRevenue).toBe(revenue);
  });
});
