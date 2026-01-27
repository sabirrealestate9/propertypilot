// Client-side configuration used by rent records pages/scripts
window.APP_CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbxsUQBW4L1FPpcdCyZXUJrKxHj8Eokq1mnzchUS6887ZR3kaGpSmSLtMuij1gJEzzBR/exec",
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1ryQPlHzOeL-IfwPUIwb0u5oQSyczVon4GEEE5zCrEtk/edit",
  API_KEY: ""
};

fetch("https://script.google.com/macros/s/AKfycbxsUQBW4L1FPpcdCyZXUJrKxHj8Eokq1mnzchUS6887ZR3kaGpSmSLtMuij1gJEzzBR/exec?action=addRentPayment", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
  body: JSON.stringify({ StudioId:"z26", Month:1, Year:2026, PaymentDate:"2026-01-01", Amount:100, Maintenance:0 })
}).then(r => r.text()).then(console.log);
