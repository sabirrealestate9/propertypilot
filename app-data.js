// app-data.js
(function () {
  function getApiUrl() {
    const url = window.APP_CONFIG && window.APP_CONFIG.API_URL;
    if (!url) throw new Error("API_URL not configured. Add API_URL in app-config.js.");
    return url;
  }

  async function post(action, payload) {
    const url = new URL(getApiUrl());
    url.searchParams.set("action", action);
    url.searchParams.set("_ts", String(Date.now()));

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      cache: "no-store"
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch {
      throw new Error("API returned non-JSON. First 200 chars: " + (text || "").slice(0, 200));
    }

    if (!res.ok) throw new Error("HTTP " + res.status + " - " + (json.error || text.slice(0, 200)));
    if (json && json.ok === false) throw new Error(json.error || "API ok=false");
    return json;
  }

  window.PropertyPilotApi = {
    sheetUrl: (window.APP_CONFIG && window.APP_CONFIG.SHEET_URL) || "",

    async getStudios() {
      const r = await post("getStudios", {});
      return r.data || r.studios || r.rows || [];
    },

    async getTable() {
      const r = await post("getTable", {});
      return r.data || r.table || r.rows || [];
    },

    async getRentRecords({ month, year }) {
      const r = await post("getRentRecords", { month, year });
      return r.data || r.records || r.rows || [];
    },

    async addRentPayment(payload) {
      // expected payload keys can be StudioId/Month/Year/PaymentDate/Amount...
      return await post("addRentPayment", payload);
    },

    async getPaymentHistory({ studioId }) {
      const r = await post("getPaymentHistory", { studioId });
      return r.data || r.history || r.rows || [];
    },

    async exportCsv({ month, year }) {
      const r = await post("exportCsv", { month, year });
      return r.csv || "";
    },

    async sendReminder({ studioId, month, year }) {
      return await post("sendReminder", { studioId, month, year });
    },

    async sendBulkReminder({ month, year }) {
      return await post("sendBulkReminder", { month, year });
    }
  };
})();
