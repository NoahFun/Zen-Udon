import { describe, expect, it } from "vitest";
import { initApp } from "../src/main.js";

describe("app bootstrap", () => {
  it("renders daily entry view", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();
    expect(document.querySelector("[data-view='daily-entry']")).toBeTruthy();
  });
});
