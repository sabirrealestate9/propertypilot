// app-data.js
(function () {
  function getApiUrl() {
    const url = window.APP_CONFIG && window.APP_CONFIG.API_URL;
    if (!url) throw new Error("API_URL not configured. Add API_URL in app-config.js.");
    return url;
  }

  function getApiKey() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_KEY) ? String(window.APP_CONFIG.API_KEY) : "";
  }

  async function readJsonResponse(res) {
    const text = await res.text();
    const trimmed = (text || "").trim();

    // HTML means redirect/login page -> Apps Script not public
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.includes("<head") ||
      trimmed.includes("<body")
    ) {
      throw new Error(
        "API returned HTML instead of JSON. Apps Script must be deployed as Web App with Access: Anyone."
      );
    }

    let json;
    try { json = JSON.parse(trimmed); }
    catch {
      throw new Error("API returned non-JSON. First 200 chars: " + trimmed.slice(0, 200));
    }

    if (!res.ok) throw new Error("HTTP " + res.status + " - " + (json.error || trimmed.slice(0, 200)));
    if (json && json.ok === false) throw new Error(json.error || "API ok=false");

    return json;
  }

  async function postOrGet(action, payload) {
    const base = new URL(getApiUrl());
    base.searchParams.set("_ts", String(Date.now()));

    // ✅ Support both styles:
    base.searchParams.set("action", action);
    base.searchParams.set("op", action);

    const key = getApiKey();
    if (key) base.searchParams.set("key", key);

    // 1) Try POST JSON
    try {
      const res = await fetch(base.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
        cache: "no-store"
      });
      return await readJsonResponse(res);
    } catch (e) {
      // 2) Fallback to GET query params (many Apps Script examples use GET)
      const url = new URL(base.toString());
      if (payload && typeof payload === "object") {
        Object.entries(payload).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          url.searchParams.set(k, String(v));
        });
      }
      const res2 = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      return await readJsonResponse(res2);
    }
  }

  window.PropertyPilotApi = {
    sheetUrl: (window.APP_CONFIG && window.APP_CONFIG.SHEET_URL) || "",

    async getStudios() {
      const r = await postOrGet("getStudios", {});
      return r.data || r.studios || r.rows || [];
    },

    async getTable() {
      const r = await postOrGet("getTable", {});
      return r.data || r.table || r.rows || [];
    },

    async getRentRecords({ month, year }) {
      // Send both numeric + name (some scripts store Month as text)
      const monthNum = Number(month);
      const yearNum = Number(year);
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthText = monthNames[(monthNum - 1)] || String(monthNum);

      const r = await postOrGet("getRentRecords", {
        month: monthNum,
        year: yearNum,
        Month: monthNum,
        Year: yearNum,
        monthName: monthText,
        MonthName: monthText
      });

      return r.data || r.records || r.rows || [];
    },

    async addRentPayment(payload) {
      return await postOrGet("addRentPayment", payload || {});
    },

    async getPaymentHistory({ studioId }) {
      const r = await postOrGet("getPaymentHistory", {
        studioId,
        StudioId: studioId
      });
      return r.data || r.history || r.rows || [];
    },

    async exportCsv({ month, year }) {
      const r = await postOrGet("exportCsv", { month, year });
      return r.csv || "";
    },

    async sendReminder({ studioId, month, year }) {
      return await postOrGet("sendReminder", { studioId, month, year });
    },

    async sendBulkReminder({ month, year }) {
      return await postOrGet("sendBulkReminder", { month, year });
    }
  };
})();
