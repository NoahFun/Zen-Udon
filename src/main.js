import { aggregateMonthly, aggregateWeekly, calcProfit, calcRowAmount, calcTotalExpenses, formatDate, getWeekStart, round2 } from "./domain/calculations.js";
import { getMonthlyExportRange, getWeeklyExportRange } from "./domain/date-ranges.js";
import { validateDailyForm, validateMasterItem, validateQuantity } from "./domain/validation.js";
import { clearDraft, loadAppData, loadDailyRecord, loadDraft, saveAppData, saveDailyRecord, saveDraft } from "./data/storage.js";
import {
  createCloudClient,
  ensureProfileAndSeed,
  getCurrentSession,
  loadCloudAppData,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  upsertCloudDailyRecord,
  upsertCloudMasterItem,
  deleteCloudMasterItem
} from "./data/cloud-storage.js";
import { buildWorkbook } from "./reports/export-xlsx.js";
import * as XLSX from "xlsx";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthFromDate(dateStr) {
  return String(dateStr || todayStr()).slice(0, 7);
}

function dateFromMonth(monthStr) {
  return `${monthStr}-01`;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function initApp() {
  const root = document.querySelector("#app");
  if (!root) return;
  const cloudClient = createCloudClient();
  const cloudMode = Boolean(cloudClient);
  let authUserId = null;
  let logoutOnClose = false;

  const state = {
    data: cloudMode ? { masterItems: [], dailyRecords: {} } : loadAppData(),
    selectedDate: todayStr(),
    revenue: "",
    quantities: {},
    notes: "",
    editingItemId: null,
    activeTab: "daily",
    dirty: false,
    dailyCardDate: todayStr(),
    weeklyCardDate: todayStr(),
    monthlyCardMonth: monthFromDate(todayStr()),
    chartPeriod: "daily",
    chartDate: todayStr(),
    chartMonth: monthFromDate(todayStr()),
    chartManual: false,
    dailyCategoryFilter: "all"
  };

  function markDirty(flag) {
    state.dirty = flag;
  }

  window.onbeforeunload = () => {
    if (state.dirty) return "You have unsaved changes.";
    return null;
  };

  function findItem(itemId) {
    return state.data.masterItems.find((x) => x.id === itemId);
  }

  function findDailyRecordByDate(date) {
    if (cloudMode) return state.data.dailyRecords[date] || null;
    return loadDailyRecord(date);
  }

  async function refreshCloudData() {
    if (!cloudMode || !authUserId) return;
    state.data = await loadCloudAppData(cloudClient, authUserId);
  }

  async function afterCloudAuth(session, rememberMe) {
    authUserId = session.user.id;
    logoutOnClose = !rememberMe;
    if (logoutOnClose) {
      window.addEventListener("beforeunload", () => {
        signOut(cloudClient);
      }, { once: true });
    }
    await ensureProfileAndSeed(cloudClient, authUserId);
    await refreshCloudData();
    loadDate(state.selectedDate);
    render();
  }

  function renderAuth(message = "", kind = "ok") {
    root.innerHTML = `
      <section class="card" data-view="auth">
        <h2>Account Access</h2>
        <p id="auth-message" class="message ${kind}">${escapeHtml(message)}</p>
        <div class="meta-row">
          <button id="auth-tab-login" type="button">Login</button>
          <button id="auth-tab-signup" type="button">Sign Up</button>
        </div>
        <form id="auth-form" class="inline-form">
          <label>Email <input id="auth-email" type="email" required /></label>
          <label>Password <input id="auth-password" type="password" minlength="6" required /></label>
          <label><input id="auth-remember" type="checkbox" checked /> Remember me</label>
          <button id="auth-submit" type="submit">Login</button>
        </form>
      </section>
    `;

    let mode = "login";
    const submitBtn = document.querySelector("#auth-submit");
    const tabLogin = document.querySelector("#auth-tab-login");
    const tabSignup = document.querySelector("#auth-tab-signup");
    const msg = document.querySelector("#auth-message");

    function syncAuthView() {
      submitBtn.textContent = mode === "login" ? "Login" : "Sign Up";
      tabLogin.className = mode === "login" ? "active" : "";
      tabSignup.className = mode === "signup" ? "active" : "";
    }
    syncAuthView();

    tabLogin?.addEventListener("click", () => {
      mode = "login";
      syncAuthView();
    });
    tabSignup?.addEventListener("click", () => {
      mode = "signup";
      syncAuthView();
    });

    const authForm = document.querySelector("#auth-form");
    authForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(document.querySelector("#auth-email")?.value || "").trim();
      const password = String(document.querySelector("#auth-password")?.value || "");
      const rememberMe = Boolean(document.querySelector("#auth-remember")?.checked);
      try {
        const result = mode === "login"
          ? await signInWithPassword(cloudClient, email, password)
          : await signUpWithPassword(cloudClient, email, password);
        if (result.error) throw result.error;
        if (!result.data.session) {
          msg.textContent = "Sign-up created. Check your email confirmation settings, then login.";
          msg.className = "message ok";
          return;
        }
        await afterCloudAuth(result.data.session, rememberMe);
      } catch (error) {
        msg.textContent = error?.message || "Authentication failed.";
        msg.className = "message error";
      }
    });
  }

  function loadDate(date) {
    state.selectedDate = date;
    const rec = findDailyRecordByDate(date);
    if (rec) {
      state.revenue = String(rec.revenue);
      state.notes = rec.notes || "";
      state.quantities = {};
      rec.rows.forEach((row) => {
        state.quantities[row.itemId] = String(row.quantity);
      });
    } else {
      if (cloudMode) {
        state.revenue = "";
        state.notes = "";
        state.quantities = {};
      } else {
        const draft = loadDraft();
        if (draft && draft.date === date) {
          state.revenue = draft.revenue ?? "";
          state.notes = draft.notes ?? "";
          state.quantities = draft.quantities || {};
        } else {
          state.revenue = "";
          state.notes = "";
          state.quantities = {};
        }
      }
    }
    state.dailyCardDate = state.selectedDate;
    if (!state.weeklyCardDate) state.weeklyCardDate = state.selectedDate;
    if (!state.monthlyCardMonth) state.monthlyCardMonth = monthFromDate(state.selectedDate);
    if (!state.chartManual) {
      state.chartDate = state.selectedDate;
      state.chartMonth = monthFromDate(state.selectedDate);
    }
  }

  function deriveRows() {
    const visibleItems = state.data.masterItems.filter((item) => {
      if (state.dailyCategoryFilter === "all") return true;
      return item.category === state.dailyCategoryFilter;
    });
    return visibleItems.map((item) => {
      const quantity = Number(state.quantities[item.id] || 0);
      const amount = calcRowAmount(item.unitCost, quantity);
      return {
        itemId: item.id,
        category: item.category,
        itemName: item.itemName,
        unitCost: Number(item.unitCost),
        quantity,
        amount
      };
    });
  }

  function calculateCurrent() {
    const rows = deriveRows();
    const totalExpenses = calcTotalExpenses(rows);
    const revenue = Number(state.revenue || 0);
    const profit = calcProfit(revenue, totalExpenses);
    return { rows, totalExpenses, profit, revenue };
  }

  function showMessage(text, kind = "ok") {
    const msg = document.querySelector("#global-message");
    if (!msg) return;
    msg.textContent = text;
    msg.className = `message ${kind}`;
  }

  function saveDraftSnapshot() {
    if (cloudMode) return;
    saveDraft({
      date: state.selectedDate,
      revenue: state.revenue,
      notes: state.notes,
      quantities: state.quantities
    });
  }

  function clearDailyFields() {
    state.revenue = "";
    state.notes = "";
    state.quantities = {};
  }

  async function upsertItem(payload) {
    if (cloudMode) {
      await upsertCloudMasterItem(cloudClient, authUserId, payload, state.editingItemId);
      state.editingItemId = null;
      await refreshCloudData();
      markDirty(true);
      render();
      return;
    }
    const now = new Date().toISOString();
    if (state.editingItemId) {
      state.data.masterItems = state.data.masterItems.map((item) => {
        if (item.id !== state.editingItemId) return item;
        return { ...item, ...payload, updatedAt: now };
      });
      state.editingItemId = null;
    } else {
      state.data.masterItems.push({
        id: uid(),
        ...payload,
        createdAt: now,
        updatedAt: now
      });
    }
    saveAppData(state.data);
    markDirty(true);
    render();
  }

  async function deleteItem(id) {
    const item = findItem(id);
    if (!item) return;
    const ok = window.confirm(`Delete item "${item.itemName}"?`);
    if (!ok) return;
    if (cloudMode) {
      await deleteCloudMasterItem(cloudClient, authUserId, id);
      delete state.quantities[id];
      await refreshCloudData();
      markDirty(true);
      render();
      return;
    }
    state.data.masterItems = state.data.masterItems.filter((x) => x.id !== id);
    delete state.quantities[id];
    saveAppData(state.data);
    markDirty(true);
    render();
  }

  async function saveDay() {
    const dailyValid = validateDailyForm(state.selectedDate, state.revenue);
    if (!dailyValid.valid) {
      showMessage(Object.values(dailyValid.errors)[0], "error");
      return;
    }
    const visibleRows = deriveRows();
    const visibleItemIds = new Set(visibleRows.map((row) => row.itemId));
    for (const [itemId, quantity] of Object.entries(state.quantities)) {
      if (!visibleItemIds.has(itemId)) continue;
      if (quantity === "") continue;
      if (!validateQuantity(quantity)) {
        const item = findItem(itemId);
        showMessage(`Invalid quantity for ${item?.itemName || "item"}.`, "error");
        return;
      }
    }

    const existing = findDailyRecordByDate(state.selectedDate);
    if (existing) {
      const ok = window.confirm(`Record for ${state.selectedDate} exists. Overwrite?`);
      if (!ok) return;
    }

    const { rows, totalExpenses, profit, revenue } = calculateCurrent();
    const record = {
      date: state.selectedDate,
      revenue: round2(revenue),
      rows,
      totalExpenses,
      profit,
      notes: state.notes,
      updatedAt: new Date().toISOString()
    };
    if (cloudMode) {
      await upsertCloudDailyRecord(cloudClient, authUserId, record);
      await refreshCloudData();
    } else {
      saveDailyRecord(record);
      state.data.dailyRecords[state.selectedDate] = record;
      clearDraft();
    }
    clearDailyFields();
    markDirty(false);
    showMessage(`Saved ${state.selectedDate}.`, "ok");
    render();
  }

  function renderMasterList() {
    const options = ["food", "utility", "salary"];
    const rows = state.data.masterItems
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${Number(item.unitCost).toFixed(2)}</td>
          <td class="actions-cell">
            <button data-action="edit-item" data-id="${item.id}">Edit</button>
            <button data-action="delete-item" data-id="${item.id}" class="danger">Delete</button>
          </td>
        </tr>`
      )
      .join("");

    const editing = state.editingItemId ? findItem(state.editingItemId) : null;
    return `
      <section class="card">
        <h2>Master List</h2>
        <form id="master-form" class="inline-form">
          <label>
            Category
            <input name="category" list="category-list" value="${escapeHtml(editing?.category || "")}" required />
          </label>
          <datalist id="category-list">
            ${options.map((x) => `<option value="${x}"></option>`).join("")}
          </datalist>
          <label>
            Item
            <input name="itemName" value="${escapeHtml(editing?.itemName || "")}" required />
          </label>
          <label>
            Unit Cost
            <input name="unitCost" type="number" min="0" step="0.01" value="${editing ? Number(editing.unitCost) : ""}" required />
          </label>
          <button type="submit">${editing ? "Update Item" : "Add Item"}</button>
          ${editing ? '<button type="button" id="cancel-edit">Cancel</button>' : ""}
        </form>
        <table>
          <thead><tr><th>Category</th><th>Item</th><th>Unit Cost</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }

  function renderDaily() {
    const { rows, totalExpenses, profit } = calculateCurrent();
    const rec = findDailyRecordByDate(state.selectedDate);
    const categories = Array.from(new Set(state.data.masterItems.map((item) => item.category).filter(Boolean))).sort();
    if (state.dailyCategoryFilter !== "all" && !categories.includes(state.dailyCategoryFilter)) {
      state.dailyCategoryFilter = "all";
    }
    const tableRows = rows
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.itemName)}</td>
        <td>${Number(row.unitCost).toFixed(2)}</td>
        <td>
          <input data-action="qty" data-id="${row.itemId}" type="number" min="0" step="0.01" value="${state.quantities[row.itemId] ?? ""}" />
        </td>
        <td data-amount-for="${row.itemId}">${Number(row.amount).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    return `
      <section class="card" data-view="daily-entry">
        <h2>Daily Entry</h2>
        <div class="meta-row">
          <label>Date <input id="daily-date" type="date" value="${state.selectedDate}" /></label>
          <label>Revenue (POS) <input id="daily-revenue" type="number" min="0" step="0.01" value="${escapeHtml(state.revenue)}" /></label>
          <label>Category
            <select id="daily-category-filter">
              <option value="all" ${state.dailyCategoryFilter === "all" ? "selected" : ""}>All</option>
              ${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.dailyCategoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
            </select>
          </label>
        </div>
        ${rec ? `<p class="hint">Saved record found for ${state.selectedDate}. Saving again will overwrite after confirmation.</p>` : ""}
        <table>
          <thead><tr><th>Category</th><th>Item</th><th>Unit Cost</th><th>Quantity</th><th>Amount</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="summary">
          <div>Total Expenses: <strong id="total-expenses">${totalExpenses.toFixed(2)}</strong></div>
          <div>Profit: <strong id="daily-profit">${profit.toFixed(2)}</strong></div>
        </div>
        <label>Notes <textarea id="daily-notes" rows="3">${escapeHtml(state.notes)}</textarea></label>
        <button id="save-day">Save Day</button>
      </section>
    `;
  }

  function renderDashboard() {
    const current = state.data.dailyRecords[state.dailyCardDate] || { revenue: 0, totalExpenses: 0, profit: 0 };
    const weekly = aggregateWeekly(state.data.dailyRecords, state.weeklyCardDate);
    const monthly = aggregateMonthly(state.data.dailyRecords, dateFromMonth(state.monthlyCardMonth));
    const historyRows = Object.keys(state.data.dailyRecords)
      .sort()
      .reverse()
      .map((date) => {
        const rec = state.data.dailyRecords[date];
        return `<tr>
          <td>${date}</td>
          <td>${Number(rec.revenue).toFixed(2)}</td>
          <td>${Number(rec.totalExpenses).toFixed(2)}</td>
          <td>${Number(rec.profit).toFixed(2)}</td>
          <td><button data-action="open-date" data-date="${date}">Open</button></td>
        </tr>`;
      })
      .join("");

    const weeklyRange = getWeeklyExportRange(state.weeklyCardDate, todayStr());
    const monthlyRange = getMonthlyExportRange(state.monthlyCardMonth, todayStr());

    return `
      <section class="card">
        <h2>Dashboard</h2>
        <div class="grid-3">
          <div class="metric">
            <h3 class="metric-title">Daily <button id="daily-export-xlsx" type="button">Export XLSX</button></h3>
            <label class="metric-control">Date <input id="daily-card-date" type="date" value="${state.dailyCardDate}" /></label>
            <p>Revenue ${Number(current.revenue).toFixed(2)}</p><p>Expenses ${Number(current.totalExpenses).toFixed(2)}</p><p>Profit ${Number(current.profit).toFixed(2)}</p>
          </div>
          <div class="metric">
            <h3 class="metric-title">Weekly <button id="weekly-export-xlsx" type="button">Export XLSX</button></h3>
            <label class="metric-control">Date <input id="weekly-card-date" type="date" value="${state.weeklyCardDate}" /></label>
            <p class="hint">${weeklyRange.startDate} to ${weeklyRange.endDate}</p>
            <p>Revenue ${weekly.revenue.toFixed(2)}</p><p>Expenses ${weekly.expenses.toFixed(2)}</p><p>Profit ${weekly.profit.toFixed(2)}</p>
          </div>
          <div class="metric">
            <h3 class="metric-title">Monthly <button id="monthly-export-xlsx" type="button">Export XLSX</button></h3>
            <label class="metric-control">Month <input id="monthly-card-month" type="month" value="${state.monthlyCardMonth}" /></label>
            <p class="hint">${monthlyRange.startDate} to ${monthlyRange.endDate}</p>
            <p>Revenue ${monthly.revenue.toFixed(2)}</p><p>Expenses ${monthly.expenses.toFixed(2)}</p><p>Profit ${monthly.profit.toFixed(2)}</p>
          </div>
        </div>
        <div class="chart-controls">
          <label>Chart Period
            <select id="chart-period">
              <option value="daily" ${state.chartPeriod === "daily" ? "selected" : ""}>Daily</option>
              <option value="weekly" ${state.chartPeriod === "weekly" ? "selected" : ""}>Weekly</option>
              <option value="monthly" ${state.chartPeriod === "monthly" ? "selected" : ""}>Monthly</option>
            </select>
          </label>
          ${state.chartPeriod === "monthly"
            ? `<label>Month <input id="chart-month" type="month" value="${state.chartMonth}" /></label>`
            : `<label>Date <input id="chart-date" type="date" value="${state.chartDate}" /></label>`}
          <button id="chart-sync">Sync to selected date</button>
        </div>
        <div class="grid-2">
          <canvas id="profit-chart" width="460" height="220"></canvas>
          <canvas id="category-chart" width="460" height="220"></canvas>
        </div>
        <h3>History</h3>
        <table>
          <thead><tr><th>Date</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Action</th></tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </section>
    `;
  }

  function drawCharts() {
    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return;
    const profitCanvas = document.querySelector("#profit-chart");
    const categoryCanvas = document.querySelector("#category-chart");
    if (!profitCanvas || !categoryCanvas) return;

    let pctx;
    let cctx;
    try {
      pctx = profitCanvas.getContext("2d");
      cctx = categoryCanvas.getContext("2d");
    } catch {
      return;
    }
    if (!pctx || !cctx) return;

    pctx.clearRect(0, 0, profitCanvas.width, profitCanvas.height);
    cctx.clearRect(0, 0, categoryCanvas.width, categoryCanvas.height);

    let points = [];
    let categorySourceRows = [];
    let profitTitle = "Profit Trend";
    let categoryTitle = "Expense by Category";
    if (state.chartPeriod === "daily") {
      const cut = state.chartDate || state.selectedDate;
      points = Object.keys(state.data.dailyRecords)
        .sort()
        .filter((date) => date <= cut)
        .slice(-14)
        .map((date) => ({ label: date, value: Number(state.data.dailyRecords[date].profit || 0) }));
      const current = state.data.dailyRecords[cut];
      categorySourceRows = current?.rows || [];
      profitTitle = "Profit Trend (daily)";
      categoryTitle = "Expense by Category (selected day)";
    } else if (state.chartPeriod === "weekly") {
      const ref = new Date(`${state.chartDate || state.selectedDate}T00:00:00`);
      for (let i = 7; i >= 0; i -= 1) {
        const d = new Date(ref);
        d.setDate(ref.getDate() - i * 7);
        const key = formatDate(d);
        const agg = aggregateWeekly(state.data.dailyRecords, key);
        points.push({ label: key, value: agg.profit });
      }
      const weekStart = getWeekStart(state.chartDate || state.selectedDate);
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const rec = state.data.dailyRecords[formatDate(d)];
        if (rec?.rows) categorySourceRows.push(...rec.rows);
      }
      profitTitle = "Profit Trend (weekly)";
      categoryTitle = "Expense by Category (selected week)";
    } else {
      const [y, m] = (state.chartMonth || monthFromDate(state.selectedDate)).split("-").map(Number);
      const ref = new Date(y, m - 1, 1);
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(ref);
        d.setMonth(ref.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const agg = aggregateMonthly(state.data.dailyRecords, `${key}-01`);
        points.push({ label: key, value: agg.profit });
      }
      const monthKey = state.chartMonth || monthFromDate(state.selectedDate);
      Object.values(state.data.dailyRecords).forEach((rec) => {
        if (String(rec.date).startsWith(monthKey) && rec.rows) categorySourceRows.push(...rec.rows);
      });
      profitTitle = "Profit Trend (monthly)";
      categoryTitle = "Expense by Category (selected month)";
    }

    pctx.fillStyle = "#111";
    pctx.fillText(profitTitle, 12, 16);
    if (points.length > 1) {
      const min = Math.min(...points.map((x) => x.value), 0);
      const max = Math.max(...points.map((x) => x.value), 1);
      const span = max - min || 1;
      pctx.strokeStyle = "#0b6";
      pctx.lineWidth = 2;
      pctx.beginPath();
      points.forEach((p, i) => {
        const x = 20 + (i / (points.length - 1)) * (profitCanvas.width - 40);
        const y = 200 - ((p.value - min) / span) * 160;
        if (i === 0) pctx.moveTo(x, y);
        else pctx.lineTo(x, y);
      });
      pctx.stroke();
    }

    const byCategory = {};
    categorySourceRows.forEach((row) => {
      byCategory[row.category] = Number(byCategory[row.category] || 0) + Number(row.amount || 0);
    });
    const entries = Object.entries(byCategory);
    cctx.fillStyle = "#111";
    cctx.fillText(categoryTitle, 12, 16);
    entries.forEach(([cat, value], i) => {
      const y = 40 + i * 42;
      const width = Math.min(350, value);
      cctx.fillStyle = "#d94f2b";
      cctx.fillRect(120, y, width, 24);
      cctx.fillStyle = "#111";
      cctx.fillText(`${cat}: ${round2(value)}`, 12, y + 16);
    });
  }

  function bindEvents() {
    function refreshDailyComputedFields() {
      const { rows, totalExpenses, profit } = calculateCurrent();
      rows.forEach((row) => {
        const amountCell = document.querySelector(`[data-amount-for='${row.itemId}']`);
        if (amountCell) amountCell.textContent = Number(row.amount).toFixed(2);
      });
      const totalEl = document.querySelector("#total-expenses");
      if (totalEl) totalEl.textContent = totalExpenses.toFixed(2);
      const profitEl = document.querySelector("#daily-profit");
      if (profitEl) profitEl.textContent = profit.toFixed(2);
    }

    const navButtons = document.querySelectorAll("[data-nav]");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeTab = btn.getAttribute("data-nav");
        render();
      });
    });
    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(cloudClient);
        authUserId = null;
        state.data = { masterItems: [], dailyRecords: {} };
        state.dirty = false;
        renderAuth("Signed out.", "ok");
      });
    }

    const masterForm = document.querySelector("#master-form");
    if (masterForm) {
      masterForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(masterForm);
        const payload = {
          category: String(fd.get("category") || "").trim(),
          itemName: String(fd.get("itemName") || "").trim(),
          unitCost: Number(fd.get("unitCost"))
        };
        const validate = validateMasterItem(payload, state.data.masterItems, state.editingItemId);
        if (!validate.valid) {
          showMessage(Object.values(validate.errors)[0], "error");
          return;
        }
        try {
          await upsertItem(payload);
          showMessage("Master list saved.", "ok");
        } catch (error) {
          showMessage(error?.message || "Failed to save master list.", "error");
        }
      });
    }

    const cancelEdit = document.querySelector("#cancel-edit");
    if (cancelEdit) {
      cancelEdit.addEventListener("click", () => {
        state.editingItemId = null;
        render();
      });
    }

    document.querySelectorAll("[data-action='edit-item']").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.editingItemId = btn.getAttribute("data-id");
        render();
      });
    });
    document.querySelectorAll("[data-action='delete-item']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await deleteItem(btn.getAttribute("data-id"));
        } catch (error) {
          showMessage(error?.message || "Failed to delete item.", "error");
        }
      });
    });

    const dateInput = document.querySelector("#daily-date");
    if (dateInput) {
      dateInput.addEventListener("change", () => {
        if (state.dirty && !window.confirm("You have unsaved changes. Continue?")) {
          dateInput.value = state.selectedDate;
          return;
        }
        loadDate(dateInput.value);
        markDirty(false);
        render();
      });
    }

    const revenueInput = document.querySelector("#daily-revenue");
    if (revenueInput) {
      revenueInput.addEventListener("input", () => {
        state.revenue = revenueInput.value;
        markDirty(true);
        saveDraftSnapshot();
        refreshDailyComputedFields();
      });
    }

    const dailyCategoryFilter = document.querySelector("#daily-category-filter");
    if (dailyCategoryFilter) {
      dailyCategoryFilter.addEventListener("change", () => {
        state.dailyCategoryFilter = dailyCategoryFilter.value || "all";
        render();
      });
    }

    const notesInput = document.querySelector("#daily-notes");
    if (notesInput) {
      notesInput.addEventListener("input", () => {
        state.notes = notesInput.value;
        markDirty(true);
        saveDraftSnapshot();
      });
    }

    document.querySelectorAll("[data-action='qty']").forEach((input) => {
      input.addEventListener("input", () => {
        const id = input.getAttribute("data-id");
        state.quantities[id] = input.value;
        markDirty(true);
        saveDraftSnapshot();
        refreshDailyComputedFields();
      });
    });

    const saveBtn = document.querySelector("#save-day");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        try {
          await saveDay();
        } catch (error) {
          showMessage(error?.message || "Failed to save day.", "error");
        }
      });
    }

    document.querySelectorAll("[data-action='open-date']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const date = btn.getAttribute("data-date");
        state.activeTab = "daily";
        loadDate(date);
        markDirty(false);
        render();
      });
    });

    const dailyCardDate = document.querySelector("#daily-card-date");
    if (dailyCardDate) {
      dailyCardDate.addEventListener("change", () => {
        state.dailyCardDate = dailyCardDate.value || state.selectedDate;
        render();
      });
    }

    const monthlyCardMonth = document.querySelector("#monthly-card-month");
    if (monthlyCardMonth) {
      monthlyCardMonth.addEventListener("change", () => {
        state.monthlyCardMonth = monthlyCardMonth.value || monthFromDate(state.selectedDate);
        render();
      });
    }

    const weeklyCardDate = document.querySelector("#weekly-card-date");
    if (weeklyCardDate) {
      weeklyCardDate.addEventListener("change", () => {
        state.weeklyCardDate = weeklyCardDate.value || todayStr();
        render();
      });
    }

    const chartPeriod = document.querySelector("#chart-period");
    if (chartPeriod) {
      chartPeriod.addEventListener("change", () => {
        state.chartPeriod = chartPeriod.value;
        state.chartManual = true;
        if (state.chartPeriod === "monthly" && !state.chartMonth) state.chartMonth = monthFromDate(state.selectedDate);
        if (state.chartPeriod !== "monthly" && !state.chartDate) state.chartDate = state.selectedDate;
        render();
      });
    }

    const chartDate = document.querySelector("#chart-date");
    if (chartDate) {
      chartDate.addEventListener("change", () => {
        state.chartDate = chartDate.value || state.selectedDate;
        state.chartManual = true;
        render();
      });
    }

    const chartMonth = document.querySelector("#chart-month");
    if (chartMonth) {
      chartMonth.addEventListener("change", () => {
        state.chartMonth = chartMonth.value || monthFromDate(state.selectedDate);
        state.chartManual = true;
        render();
      });
    }

    const chartSync = document.querySelector("#chart-sync");
    if (chartSync) {
      chartSync.addEventListener("click", () => {
        state.chartManual = false;
        state.chartDate = state.selectedDate;
        state.chartMonth = monthFromDate(state.selectedDate);
        render();
      });
    }

    const xlsxExport = document.querySelector("#export-xlsx");
    if (xlsxExport) {
      xlsxExport.remove();
    }

    const dailyExport = document.querySelector("#daily-export-xlsx");
    if (dailyExport) {
      dailyExport.addEventListener("click", () => {
        const startDate = state.dailyCardDate;
        const endDate = state.dailyCardDate;
        const wb = buildWorkbook(state.data, { startDate, endDate });
        const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(data, `daily-${startDate}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      });
    }

    const weeklyExport = document.querySelector("#weekly-export-xlsx");
    if (weeklyExport) {
      weeklyExport.addEventListener("click", () => {
        const { startDate, endDate } = getWeeklyExportRange(state.weeklyCardDate, todayStr());
        const wb = buildWorkbook(state.data, { startDate, endDate });
        const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(data, `weekly-${startDate}-to-${endDate}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      });
    }

    const monthlyExport = document.querySelector("#monthly-export-xlsx");
    if (monthlyExport) {
      monthlyExport.addEventListener("click", () => {
        const { startDate, endDate } = getMonthlyExportRange(state.monthlyCardMonth, todayStr());
        const wb = buildWorkbook(state.data, { startDate, endDate });
        const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(data, `monthly-${startDate}-to-${endDate}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      });
    }
  }

  function render() {
    root.innerHTML = `
      <div class="app-shell">
        <header>
          <h1>Restaurant Expenses & Profit</h1>
          <p id="global-message" class="message"></p>
        </header>
        <nav>
          <button data-nav="daily" class="${state.activeTab === "daily" ? "active" : ""}">Daily Entry</button>
          <button data-nav="master" class="${state.activeTab === "master" ? "active" : ""}">Master List</button>
          <button data-nav="dashboard" class="${state.activeTab === "dashboard" ? "active" : ""}">Dashboard</button>
          <div class="spacer"></div>
          ${cloudMode ? '<button id="logout-btn" type="button">Logout</button>' : ""}
        </nav>
        <main>
          ${state.activeTab === "daily" ? renderDaily() : ""}
          ${state.activeTab === "master" ? renderMasterList() : ""}
          ${state.activeTab === "dashboard" ? renderDashboard() : ""}
        </main>
      </div>
    `;
    bindEvents();
    if (state.activeTab === "dashboard") drawCharts();
  }

  if (cloudMode) {
    try {
      const session = await getCurrentSession(cloudClient);
      if (!session) {
        renderAuth();
        return;
      }
      await afterCloudAuth(session, !logoutOnClose);
      return;
    } catch (error) {
      renderAuth(error?.message || "Unable to initialize Supabase session.", "error");
      return;
    }
  }

  loadDate(state.selectedDate);
  render();
}

if (typeof window !== "undefined" && document.querySelector("#app")) {
  initApp();
}
