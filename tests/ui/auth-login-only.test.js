import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/data/cloud-storage.js", () => ({
  createCloudClient: () => ({}),
  ensureProfileAndSeed: vi.fn(),
  getCurrentSession: vi.fn(async () => null),
  loadCloudAppData: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUpWithPassword: vi.fn(),
  upsertCloudDailyRecord: vi.fn(),
  upsertCloudMasterItem: vi.fn(),
  deleteCloudMasterItem: vi.fn()
}));

describe("auth ui", () => {
  it("shows login form without sign-up controls", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { initApp } = await import("../../src/main.js");
    await initApp();

    expect(document.querySelector("#auth-submit")?.textContent).toBe("Login");
    expect(document.querySelector("#auth-tab-signup")).toBeNull();
  });
});
