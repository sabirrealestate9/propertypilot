(function () {
    "use strict";
    
    const StorageKey = "sabir_realestate_properties_v1";
    const $ = (id) => document.getElementById(id);

    // Utilities
    function safeJsonParse(text) {
        try { return JSON.parse(text); } catch { return null; }
    }

    function n(v) {
        if (v === null || v === undefined) return 0;
        if (typeof v === "number") return isFinite(v) ? v : 0;
        const str = String(v).replace(/AED/gi, "").replace(/[, ]+/g, "").trim();
        const x = parseFloat(str);
        return isFinite(x) ? x : 0;
    }

    function s(v) {
        return (v === null || v === undefined) ? "" : String(v).trim();
    }

    function escapeHtml(str) {
        return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function moneyAed(amount) {
        try {
            return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(amount || 0);
        } catch { return `AED ${n(amount).toFixed(2)}`; }
    }

    function daysLeft(p) {
        if (!p || !p.tenantContractTo) return null;
        const end = new Date(p.tenantContractTo);
        if (Number.isNaN(end.getTime())) return null;
        const ms = end.getTime() - new Date().setHours(0, 0, 0, 0);
        return Math.ceil(ms / (1000 * 60 * 60 * 24));
    }

    function statusFor(p) {
        const dl = daysLeft(p);
        const hasTenant = s(p.tenantName).length > 0;
        if (!hasTenant) return "Vacant";
        if (dl === null) return "Active";
        if (dl <= 0) return "Expired";
        if (dl <= 30) return "Expiring";
        return "Active";
    }

    function statusClass(st) {
        const x = (st || "").toLowerCase();
        if (x === "active" || x === "paid") return "active";
        if (x === "expiring" || x === "pending") return "expiring";
        if (x === "expired" || x === "overdue") return "expired";
        if (x === "vacant") return "vacant";
        return "";
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function loadPropertiesFromStorage() {
        const raw = window.localStorage ? window.localStorage.getItem(StorageKey) : null;
        if (!raw) return [];
        const items = safeJsonParse(raw);
        return Array.isArray(items) ? items : [];
    }

    // Dashboard rendering
    function renderRecentRows(items) {
        const tbody = $("recentTbody");
        if (!tbody) return;

        const top = (items || []).slice().sort((a, b) => {
            const da = new Date(a.createdAtUtc || 0).getTime();
            const db = new Date(b.createdAtUtc || 0).getTime();
            return db - da;
        }).slice(0, 6);

        if (top.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="padding:24px; text-align:center; color:var(--text-muted);">No properties yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = top.map((p) => {
            const dl = daysLeft(p);
            const st = statusFor(p);
            const profit = n(p.rentOutMonthly) - n(p.rentInMonthly);
            return `<tr>
                <td><strong>${escapeHtml(p.unit || "—")}</strong></td>
                <td>${escapeHtml(p.type || "—")}</td>
                <td>${escapeHtml(p.ownerName || "—")}</td>
                <td>${s(p.tenantName) || "—"}</td>
                <td>${dl === null ? "—" : dl}</td>
                <td>${moneyAed(p.rentInMonthly)}</td>
                <td>${moneyAed(p.rentOutMonthly)}</td>
                <td class="${profit >= 0 ? 'profit-value positive' : 'profit-value negative'}">${moneyAed(profit)}</td>
                <td><span class="status-badge ${statusClass(st)}">${st}</span></td>
            </tr>`;
        }).join("");
    }

    function renderKpis(items) {
        const total = items.length;
        const occupied = items.filter((p) => s(p.tenantName).length > 0).length;
        const expiring90 = items.filter((p) => { const dl = daysLeft(p); return dl !== null && dl > 0 && dl <= 90; }).length;
        const profit = items.reduce((sum, p) => sum + n(p.rentOutMonthly) - n(p.rentInMonthly), 0);

        setText("kpiTotalUnits", String(total || 0));
        setText("kpiOccupied", total ? `${occupied} / ${total}` : "0");
        setText("kpiProfit", moneyAed(profit));
        setText("kpiOverdue", "0");
        setText("kpiExpiring", String(expiring90));
        setText("kpiMaintenance", "0");
    }

    let profitChart = null;
    let incExpChart = null;

    function getMonthLabels(n) {
        const labels = [];
        const d = new Date();
        d.setDate(1);
        for (let i = n - 1; i >= 0; i--) {
            const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
            labels.push(m.toLocaleString("en-US", { month: "short" }) + " " + String(m.getFullYear()).slice(-2));
        }
        return labels;
    }

    function renderCharts(items) {
        if (!window.Chart) return;
        const profitCanvas = $("profitChart");
        const pieCanvas = $("incomeExpenseChart");
        if (!profitCanvas || !pieCanvas) return;

        const PRIMARY = "rgba(103,61,230,1)";
        const PRIMARY_FILL = "rgba(103,61,230,0.12)";
        const INCOME = "rgba(16,185,129,0.85)";
        const EXPENSE = "rgba(239,68,68,0.80)";

        const monthlyProfit = items.reduce((sum, p) => sum + n(p.rentOutMonthly) - n(p.rentInMonthly), 0);
        const labels = getMonthLabels(12);
        const data = labels.map((_, i) => Math.round(monthlyProfit * (1 + Math.sin(i / 2) * 0.12) * 100) / 100);

        if (profitChart) profitChart.destroy();
        profitChart = new window.Chart(profitCanvas, {
            type: "line",
            data: { labels, datasets: [{ label: "Profit", data, borderColor: PRIMARY, backgroundColor: PRIMARY_FILL, tension: 0.35, fill: true, pointRadius: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(31,41,55,0.10)" } } } }
        });

        const income = items.reduce((sum, p) => sum + n(p.rentOutMonthly), 0);
        const expenses = items.reduce((sum, p) => sum + n(p.rentInMonthly), 0);

        if (incExpChart) incExpChart.destroy();
        incExpChart = new window.Chart(pieCanvas, {
            type: "doughnut",
            data: { labels: ["Income", "Expenses"], datasets: [{ data: [income, expenses], backgroundColor: [INCOME, EXPENSE], borderColor: ["rgba(16,185,129,1)", "rgba(239,68,68,1)"], borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, cutout: "68%" }
        });
    }

    function wireRangeButtons(items) {
        const btn6m = $("btn6m"), btn12m = $("btn12m"), btnAll = $("btnAll");
        function setActive(btn) { [btn6m, btn12m, btnAll].forEach((b) => b && b.classList.remove("active")); btn && btn.classList.add("active"); }
        function rerender(range) {
            if (!profitChart) return;
            const fullLabels = getMonthLabels(12);
            const monthlyProfit = items.reduce((sum, p) => sum + n(p.rentOutMonthly) - n(p.rentInMonthly), 0);
            const fullData = fullLabels.map((_, i) => Math.round(monthlyProfit * (1 + Math.sin(i / 2) * 0.12) * 100) / 100);
            let labels = fullLabels, data = fullData;
            if (range === "6m") { labels = fullLabels.slice(-6); data = fullData.slice(-6); }
            profitChart.data.labels = labels;
            profitChart.data.datasets[0].data = data;
            profitChart.update();
        }
        btn6m && btn6m.addEventListener("click", () => { setActive(btn6m); rerender("6m"); });
        btn12m && btn12m.addEventListener("click", () => { setActive(btn12m); rerender("12m"); });
        btnAll && btnAll.addEventListener("click", () => { setActive(btnAll); rerender("all"); });
        const refresh = $("refreshChartsBtn");
        refresh && refresh.addEventListener("click", () => renderCharts(items));
    }

    function renderNowMeta() {
        const el = $("nowMeta");
        if (el) el.textContent = ` • ${new Date().toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "2-digit" })}`;
    }

    function renderAlerts(items) {
        const list = $("alertsList");
        if (!list) return;
        const expiring30 = items.filter((p) => { const dl = daysLeft(p); return dl !== null && dl > 0 && dl <= 30; }).slice(0, 3);
        if (expiring30.length === 0) {
            list.innerHTML = `<div class="alert-item"><div class="ic"><i class="fas fa-circle-check"></i></div><div><h4>No urgent alerts</h4><p>No contracts expiring in the next 30 days.</p></div></div>`;
            return;
        }
        list.innerHTML = expiring30.map((p) => {
            const dl = daysLeft(p);
            return `<div class="alert-item"><div class="ic"><i class="fas fa-calendar-days"></i></div><div><h4>Contract expiring soon</h4><p><strong>${escapeHtml(p.unit || "—")}</strong> • ${dl} days left</p></div></div>`;
        }).join("");
    }

    function init() {
        if (!$("kpiTotalUnits") || !$("profitChart") || !$("recentTbody")) return;
        renderNowMeta();
        const items = loadPropertiesFromStorage();
        renderKpis(items);
        renderCharts(items);
        renderAlerts(items);
        renderRecentRows(items);
        wireRangeButtons(items);
        const search = $("dashSearchInput");
        search && search.addEventListener("input", () => {
            const q = s(search.value).toLowerCase();
            if (!q) { renderRecentRows(items); return; }
            const filtered = items.filter((p) => [p.unit, p.type, p.location, p.ownerName, p.tenantName].filter(Boolean).some((x) => String(x).toLowerCase().includes(q)));
            renderRecentRows(filtered);
        });
    }

    if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(init, 0);
    else document.addEventListener("DOMContentLoaded", init);
})();
