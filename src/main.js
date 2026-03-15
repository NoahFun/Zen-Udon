import { aggregateMonthly, aggregateWeekly, calcProfit, calcRowAmount, calcTotalExpenses, round2 } from "./domain/calculations.js";
import { validateDailyForm, validateMasterItem, validateQuantity } from "./domain/validation.js";
import { clearDraft, loadAppData, loadDailyRecord, loadDraft, saveAppData, saveDailyRecord, saveDraft } from "./data/storage.js";
import { createJsonBackup, restoreFromJson } from "./data/backup.js";
import { buildCsvRows, toCsvString } from "./reports/export-csv.js";
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

export function initApp() {
  const root = document.querySelector("#app");
  if (!root) return;

  const state = {
    data: loadAppData(),
    selectedDate: todayStr(),
    revenue: "",
    quantities: {},
    notes: "",
    editingItemId: null,
    activeTab: "daily",
    dirty: false
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

  function loadDate(date) {
    state.selectedDate = date;
    const rec = loadDailyRecord(date);
    if (rec) {
      state.revenue = String(rec.revenue);
      state.notes = rec.notes || "";
      state.quantities = {};
      rec.rows.forEach((row) => {
        state.quantities[row.itemId] = String(row.quantity);
      });
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

  function deriveRows() {
    return state.data.masterItems.map((item) => {
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
    saveDraft({
      date: state.selectedDate,
      revenue: state.revenue,
      notes: state.notes,
      quantities: state.quantities
    });
  }

  function upsertItem(payload) {
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

  function deleteItem(id) {
    const item = findItem(id);
    if (!item) return;
    const ok = window.confirm(`Delete item "${item.itemName}"?`);
    if (!ok) return;
    state.data.masterItems = state.data.masterItems.filter((x) => x.id !== id);
    delete state.quantities[id];
    saveAppData(state.data);
    markDirty(true);
    render();
  }

  function saveDay() {
    const dailyValid = validateDailyForm(state.selectedDate, state.revenue);
    if (!dailyValid.valid) {
      showMessage(Object.values(dailyValid.errors)[0], "error");
      return;
    }
    for (const [itemId, quantity] of Object.entries(state.quantities)) {
      if (quantity === "") continue;
      if (!validateQuantity(quantity)) {
        const item = findItem(itemId);
        showMessage(`Invalid quantity for ${item?.itemName || "item"}.`, "error");
        return;
      }
    }

    const existing = loadDailyRecord(state.selectedDate);
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
    saveDailyRecord(record);
    state.data.dailyRecords[state.selectedDate] = record;
    clearDraft();
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
    const rec = loadDailyRecord(state.selectedDate);
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
        <td>${Number(row.amount).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    return `
      <section class="card" data-view="daily-entry">
        <h2>Daily Entry</h2>
        <div class="meta-row">
          <label>Date <input id="daily-date" type="date" value="${state.selectedDate}" /></label>
          <label>Revenue (POS) <input id="daily-revenue" type="number" min="0" step="0.01" value="${escapeHtml(state.revenue)}" /></label>
        </div>
        ${rec ? `<p class="hint">Saved record found for ${state.selectedDate}. Saving again will overwrite after confirmation.</p>` : ""}
        <table>
          <thead><tr><th>Category</th><th>Item</th><th>Unit Cost</th><th>Quantity</th><th>Amount</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="summary">
          <div>Total Expenses: <strong>${totalExpenses.toFixed(2)}</strong></div>
          <div>Profit: <strong>${profit.toFixed(2)}</strong></div>
        </div>
        <label>Notes <textarea id="daily-notes" rows="3">${escapeHtml(state.notes)}</textarea></label>
        <button id="save-day">Save Day</button>
      </section>
    `;
  }

  function renderDashboard() {
    const current = state.data.dailyRecords[state.selectedDate] || { revenue: 0, totalExpenses: 0, profit: 0 };
    const weekly = aggregateWeekly(state.data.dailyRecords, state.selectedDate);
    const monthly = aggregateMonthly(state.data.dailyRecords, state.selectedDate);
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

    return `
      <section class="card">
        <h2>Dashboard</h2>
        <div class="grid-3">
          <div class="metric"><h3>Daily</h3><p>Revenue ${Number(current.revenue).toFixed(2)}</p><p>Expenses ${Number(current.totalExpenses).toFixed(2)}</p><p>Profit ${Number(current.profit).toFixed(2)}</p></div>
          <div class="metric"><h3>Weekly</h3><p>Revenue ${weekly.revenue.toFixed(2)}</p><p>Expenses ${weekly.expenses.toFixed(2)}</p><p>Profit ${weekly.profit.toFixed(2)}</p></div>
          <div class="metric"><h3>Monthly</h3><p>Revenue ${monthly.revenue.toFixed(2)}</p><p>Expenses ${monthly.expenses.toFixed(2)}</p><p>Profit ${monthly.profit.toFixed(2)}</p></div>
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
    const profitCanvas = document.querySelector("#profit-chart");
    const categoryCanvas = document.querySelector("#category-chart");
    if (!profitCanvas || !categoryCanvas) return;

    const pctx = profitCanvas.getContext("2d");
    const cctx = categoryCanvas.getContext("2d");
    if (!pctx || !cctx) return;

    pctx.clearRect(0, 0, profitCanvas.width, profitCanvas.height);
    cctx.clearRect(0, 0, categoryCanvas.width, categoryCanvas.height);

    const points = Object.keys(state.data.dailyRecords).sort().slice(-14).map((date) => ({
      date,
      value: Number(state.data.dailyRecords[date].profit || 0)
    }));
    pctx.fillStyle = "#111";
    pctx.fillText("Profit Trend (last 14 saved days)", 12, 16);
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

    const current = state.data.dailyRecords[state.selectedDate];
    const byCategory = {};
    if (current) {
      current.rows.forEach((row) => {
        byCategory[row.category] = Number(byCategory[row.category] || 0) + Number(row.amount || 0);
      });
    }
    const entries = Object.entries(byCategory);
    cctx.fillStyle = "#111";
    cctx.fillText("Expense by Category (selected day)", 12, 16);
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
    function renderAndRefocus(selector) {
      render();
      const input = document.querySelector(selector);
      if (input) input.focus();
    }

    const navButtons = document.querySelectorAll("[data-nav]");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeTab = btn.getAttribute("data-nav");
        render();
      });
    });

    const masterForm = document.querySelector("#master-form");
    if (masterForm) {
      masterForm.addEventListener("submit", (event) => {
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
        upsertItem(payload);
        showMessage("Master list saved.", "ok");
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
      btn.addEventListener("click", () => deleteItem(btn.getAttribute("data-id")));
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
        renderAndRefocus("#daily-revenue");
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
        renderAndRefocus(`[data-action='qty'][data-id='${id}']`);
      });
    });

    const saveBtn = document.querySelector("#save-day");
    if (saveBtn) saveBtn.addEventListener("click", saveDay);

    document.querySelectorAll("[data-action='open-date']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const date = btn.getAttribute("data-date");
        state.activeTab = "daily";
        loadDate(date);
        markDirty(false);
        render();
      });
    });

    const jsonExport = document.querySelector("#export-json");
    if (jsonExport) {
      jsonExport.addEventListener("click", () => {
        const text = createJsonBackup();
        downloadFile(text, `restaurant-backup-${todayStr()}.json`, "application/json");
      });
    }

    const jsonImport = document.querySelector("#import-json");
    if (jsonImport) {
      jsonImport.addEventListener("change", async () => {
        const file = jsonImport.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
          restoreFromJson(text);
          state.data = loadAppData();
          loadDate(state.selectedDate);
          showMessage("Backup restored.", "ok");
          render();
        } catch (error) {
          showMessage(error.message, "error");
        } finally {
          jsonImport.value = "";
        }
      });
    }

    const csvExport = document.querySelector("#export-csv");
    if (csvExport) {
      csvExport.addEventListener("click", () => {
        const rows = buildCsvRows(state.data);
        const csv = toCsvString(rows);
        downloadFile(csv, `restaurant-report-${todayStr()}.csv`, "text/csv");
      });
    }

    const xlsxExport = document.querySelector("#export-xlsx");
    if (xlsxExport) {
      xlsxExport.addEventListener("click", () => {
        const wb = buildWorkbook(state.data);
        const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(data, `restaurant-report-${todayStr()}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
          <button id="export-json">Export JSON</button>
          <label class="file-input">Import JSON<input id="import-json" type="file" accept=".json,application/json" /></label>
          <button id="export-csv">Export CSV</button>
          <button id="export-xlsx">Export XLSX</button>
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

  loadDate(state.selectedDate);
  render();
}

if (typeof window !== "undefined" && document.querySelector("#app")) {
  initApp();
}
