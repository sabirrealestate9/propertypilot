/* app.js
   Sabir Amin Real Estate Company LLC • Opal UI System
   Shared JS for ALL pages:
   - Sidebar + mobile drawer
   - Theme toggle (persisted)
   - Global API client (Google Apps Script Web App)
   - Dashboard loader (kpis, alerts, table, charts)
   - Safe helpers for other pages (properties, rent records, etc.)

   IMPORTANT:
   1) You must set OpalConfig.apiUrl to your deployed Apps Script Web App URL
   2) You must set OpalConfig.apiKey to the same key used in Code.gs CONFIG.API_KEY
*/

const OpalConfig = {
  apiUrl: "PASTE_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE",
  apiKey: "API_KEY_VALUE",
  defaultCurrency: "QAR"
};

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberFmt(n) {
  const x = Number(n ?? 0);
  return x.toLocaleString("en-US");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? "");
}

function getIsDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/* ===========================
   API Client (Apps Script)
=========================== */
async function apiGet(op, extraParams = {}) {
  if (!OpalConfig.apiUrl || OpalConfig.apiUrl.includes("PASTE_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE")) {
    throw new Error("OpalConfig.apiUrl is not set. Please paste your Apps Script Web App URL in app.js");
  }
  if (!OpalConfig.apiKey || OpalConfig.apiKey === "API_KEY_VALUE") {
    throw new Error("OpalConfig.apiKey is not set. Please set your API key in app.js");
  }

  const url = new URL(OpalConfig.apiUrl);
  url.searchParams.set("op", op);
  url.searchParams.set("key", OpalConfig.apiKey);

  Object.entries(extraParams).forEach(([k, v]) => {
    url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();

  if (!data || data.ok !== true) {
    const msg = (data && data.error) ? data.error : "API error";
    throw new Error(msg);
  }
  return data;
}

/* ===========================
   Shared Shell Init
=========================== */
function initShell() {
  // Mobile sidebar drawer
  const sidebar = qs("#sidebar");
  const backdrop = qs("#backdrop");
  const menuBtn = qs("#menuBtn");

  function openSidebar() {
    sidebar?.classList.add("open");
    backdrop?.classList.add("show");
  }
  function closeSidebar() {
    sidebar?.classList.remove("open");
    backdrop?.classList.remove("show");
  }

  menuBtn?.addEventListener("click", () => {
    if (sidebar?.classList.contains("open")) closeSidebar();
    else openSidebar();
  });
  backdrop?.addEventListener("click", closeSidebar);

  // Theme toggle (persist)
  const themeBtn = qs("#themeBtn");
  const themeLabel = qs("#themeLabel");

  const storedTheme = localStorage.getItem("sa_re_theme");
  if (storedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeLabel) themeLabel.textContent = "Dark";
  } else {
    if (themeLabel) themeLabel.textContent = "Light";
  }

  themeBtn?.addEventListener("click", () => {
    const isDark = getIsDark();
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("sa_re_theme", "light");
      if (themeLabel) themeLabel.textContent = "Light";
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("sa_re_theme", "dark");
      if (themeLabel) themeLabel.textContent = "Dark";
    }

    // Re-render charts (if present)
    if (typeof window.renderCharts === "function") {
      window.renderCharts();
    }
  });

  // Live time label (optional)
  const nowMeta = qs("#nowMeta");
  if (nowMeta) {
    const tick = () => {
      const d = new Date();
      nowMeta.textContent = "• " + d.toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    };
    tick();
    setInterval(tick, 30000);
  }
}

/* ===========================
   Dashboard Rendering
=========================== */
function statusBadge(status) {
  const s = String(status ?? "").toLowerCase().trim();
  if (s === "active") return `<span class="status-badge active">Active</span>`;
  if (s === "expiring") return `<span class="status-badge expiring">Expiring</span>`;
  if (s === "expired") return `<span class="status-badge expired">Expired</span>`;
  if (s === "vacant") return `<span class="status-badge vacant">Vacant</span>`;
  return `<span class="status-badge active">${escapeHtml(status || "Active")}</span>`;
}

function alertHtml(a) {
  const type = (a.type === "danger") ? "danger" : (a.type === "warn" ? "warn" : "info");
  const icon = (type === "danger")
    ? "fa-exclamation-circle"
    : (type === "warn" ? "fa-calendar-exclamation" : "fa-file-lines");

  return `
    <div class="alert ${type}">
      <div class="ic"><i class="fas ${icon}"></i></div>
      <div>
        <h4>${escapeHtml(a.title || "")}</h4>
        <p>${escapeHtml(a.message || "")}</p>
      </div>
    </div>
  `;
}

function recentRowHtml(r, currency) {
  const profit = Number(r.Profit ?? 0);
  const profitClass = profit >= 0 ? "money pos" : "money neg";
  const cur = currency || OpalConfig.defaultCurrency;

  return `
    <tr>
      <td><strong>${escapeHtml(r.Unit || "")}</strong></td>
      <td>${escapeHtml(r.Type || "")}</td>
      <td>${escapeHtml(r.Owner || "")}</td>
      <td>${escapeHtml(r.Tenant || "—")}</td>
      <td>${(r.DaysLeft === null || typeof r.DaysLeft === "undefined") ? "—" : escapeHtml(String(r.DaysLeft))}</td>
      <td>${numberFmt(r.RentIn)} ${escapeHtml(cur)}</td>
      <td>${numberFmt(r.RentOut)} ${escapeHtml(cur)}</td>
      <td><span class="${profitClass}">${numberFmt(profit)} ${escapeHtml(cur)}</span></td>
      <td>${statusBadge(r.Status)}</td>
    </tr>
  `;
}

/* ===========================
   Chart.js styling helpers
=========================== */
function getGridColor() {
  return getIsDark() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
}
function getTickColor() {
  return getIsDark() ? "rgba(230,233,239,0.80)" : "rgba(84,110,122,0.90)";
}

let profitChart = null;
let incomeExpenseChart = null;

function destroyCharts() {
  if (profitChart) { profitChart.destroy(); profitChart = null; }
  if (incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
}

/**
 * This function is attached to window so theme toggle can re-render.
 * Requires:
 *   - <canvas id="profitChart"></canvas>
 *   - <canvas id="incomeExpenseChart"></canvas>
 *   - window.__dashboardChartsData to be set
 */
function renderCharts() {
  if (!window.__dashboardChartsData) return;

  destroyCharts();

  const charts = window.__dashboardChartsData;

  // Profit Trend
  const profitCanvas = qs("#profitChart");
  if (profitCanvas) {
    const ctx = profitCanvas.getContext("2d");
    profitChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: charts.profitTrend?.labels || [],
        datasets: [{
          label: "Net Profit",
          data: charts.profitTrend?.data || [],
          borderColor: "#4dd0e1",
          backgroundColor: "rgba(77, 208, 225, 0.12)",
          borderWidth: 3,
          fill: true,
          tension: 0.42,
          pointRadius: 3.8,
          pointHoverRadius: 6,
          pointBackgroundColor: "#4dd0e1"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: getGridColor() }, ticks: { color: getTickColor() } },
          x: { grid: { display: false }, ticks: { color: getTickColor() } }
        }
      }
    });
  }

  // Income vs Expenses
  const ieCanvas = qs("#incomeExpenseChart");
  if (ieCanvas) {
    const ctx = ieCanvas.getContext("2d");
    incomeExpenseChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Income", "Expenses", "Profit"],
        datasets: [{
          data: [
            Number(charts.income ?? 0),
            Number(charts.expenses ?? 0),
            Number(charts.profit ?? 0),
          ],
          backgroundColor: ["#4dd0e1", "#9575cd", "#69f0ae"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: getTickColor(), boxWidth: 14, font: { weight: "700" } }
          }
        },
        cutout: "68%"
      }
    });
  }
}

// expose for theme toggle
window.renderCharts = renderCharts;

/* ===========================
   Dashboard Loader
=========================== */
async function loadDashboard() {
  // Shows a clean fallback message if API fails
  const safeFail = (msg) => {
    console.error(msg);
    const alertsList = qs("#alertsList");
    if (alertsList) {
      alertsList.innerHTML = `
        <div class="alert danger">
          <div class="ic"><i class="fas fa-triangle-exclamation"></i></div>
          <div>
            <h4>Dashboard data could not be loaded</h4>
            <p>${escapeHtml(String(msg))}</p>
          </div>
        </div>`;
    }
  };

  try {
    const payload = await apiGet("dashboard");

    // KPIs
    setText("kpiTotalUnits", payload.kpis?.totalUnits ?? "—");
    setText("kpiOccupied", (payload.kpis?.occupiedPct ?? 0) + "%");
    setText("kpiProfit", numberFmt(payload.kpis?.netProfit ?? 0));
    setText("kpiCurrency", payload.currency || OpalConfig.defaultCurrency);
    setText("kpiOverdue", payload.kpis?.overduePayments ?? 0);
    setText("kpiExpiring", payload.kpis?.expiringContracts ?? 0);
    setText("kpiMaintenance", payload.kpis?.maintenanceIssues ?? 0);

    // Sidebar badge (you can set it to overdue count or rent alerts)
    const rentBadge = qs("#rentBadge");
    if (rentBadge) rentBadge.textContent = String(payload.kpis?.overduePayments ?? 0);

    // Alerts
    const alertsList = qs("#alertsList");
    if (alertsList && Array.isArray(payload.alerts)) {
      alertsList.innerHTML = payload.alerts.map(alertHtml).join("");
    }

    // Recent Properties Table
    const recentTbody = qs("#recentTbody");
    if (recentTbody && Array.isArray(payload.recentProperties)) {
      recentTbody.innerHTML = payload.recentProperties
        .map(r => recentRowHtml(r, payload.currency || OpalConfig.defaultCurrency))
        .join("");
    }

    // Charts
    if (qs("#profitChart") && qs("#incomeExpenseChart")) {
      window.__dashboardChartsData = payload.charts || {};
      renderCharts();
    }

    // Hook existing buttons if they exist (optional)
    const refreshBtn = qs("#refreshChartsBtn");
    refreshBtn?.addEventListener("click", async () => {
      // simplest: reload dashboard (fresh snapshot)
      await loadDashboard();
    });

    // Search box: filters recent table rows
    const searchInput = qs("#searchInput");
    if (searchInput && recentTbody) {
      searchInput.addEventListener("input", () => {
        const q = (searchInput.value || "").trim().toLowerCase();
        qsa("tr", recentTbody).forEach(tr => {
          const txt = tr.innerText.toLowerCase();
          tr.style.display = (!q || txt.includes(q)) ? "" : "none";
        });
      });
    }

  } catch (err) {
    safeFail(err?.message || err);
  }
}

/* ===========================
   Page Router (auto-run)
   Add on each page:
     <body data-page="dashboard"> for index.html
     <body data-page="properties"> for properties.html
     <body data-page="rent-records"> for rent-records.html
   Then implement loaders when needed.
=========================== */
async function loadPropertiesPage() {
  // Placeholder: you will build your properties table/cards here
  // Example usage:
  // const res = await apiGet("properties");
  // console.log(res.data);
}

async function loadRentRecordsPage() {
  // Placeholder: you will build rent records list/table here
  // const res = await apiGet("rentRecords");
  // console.log(res.data);
}

async function loadTransactionsPage() {
  // Placeholder
}

async function loadRecurringExpensesPage() {
  // Placeholder
}

document.addEventListener("DOMContentLoaded", () => {
  initShell();

  const page = document.body.getAttribute("data-page") || "";

  if (page === "dashboard") {
    loadDashboard();
  } else if (page === "properties") {
    loadPropertiesPage();
  } else if (page === "rent-records") {
    loadRentRecordsPage();
  } else if (page === "transactions") {
    loadTransactionsPage();
  } else if (page === "recurring-expenses") {
    loadRecurringExpensesPage();
  }

  // Optional: generic FAB + Export hooks (safe)
  const fabBtn = qs("#fabBtn");
  fabBtn?.addEventListener("click", () => {
    alert("Quick Add (demo): Connect this to Add Property / Add Transaction modal.");
  });

  const exportBtn = qs("#exportBtn");
  exportBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Export (demo): You can generate CSV/PDF from your live Sheet data here.");
  });

  const addTaskBtn = qs("#addTaskBtn");
  addTaskBtn?.addEventListener("click", () => {
    const taskList = qs("#taskList");
    if (!taskList) return;

    const now = new Date();
    const item = document.createElement("div");
    item.className = "task";
    item.innerHTML = `
      <div class="task-left">
        <div class="task-dot" style="background: var(--opal-cyan);"></div>
        <div>
          <div class="task-title">New task created (${now.toLocaleDateString("en-GB")})</div>
          <div class="task-meta">Assigned: You • Priority: Normal</div>
        </div>
      </div>
      <div class="task-chip ok">On Track</div>
    `;
    taskList.prepend(item);
  });
});
