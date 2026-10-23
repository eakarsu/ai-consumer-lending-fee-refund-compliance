// Pure helpers for search/filter, export and deterministic fallback insights. No provider calls.
export function filterRecords(rows, { q = "", status = "", risk = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (rows || []).filter((r) => {
    if (status && String(r.status || "") !== status) return false;
    if (risk && String(r.risk || "") !== risk) return false;
    if (!needle) return true;
    const hay = [r.reference, r.title, r.status, r.owner, r.risk, r.feature_id, JSON.stringify(r.payload ?? {})].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}
export function toCsv(rows) {
  const cols = ["id","feature_id","reference","title","status","owner","risk","due_date","amount","payload"];
  const esc = (v) => {
    let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); // preserves 0/false as "0"/"false"
    if (/^[=+@\t\r-]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(","), ...(rows || []).map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
export function buildInsights(rows, feature, now = new Date()) {
  const list = rows || [];
  const isOpen = (r) => !["Closed","Approved"].includes(String(r.status || ""));
  const open = list.filter(isOpen);
  const overdue = open.filter((r) => r.due_date && new Date(r.due_date) < now);
  const high = list.filter((r) => ["High","Critical"].includes(String(r.risk || "")));
  const totalValue = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const openValue = open.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const fields = feature?.fields || [];
  const incomplete = list.filter((r) => fields.some((f) => r.payload?.[f.key] === undefined || r.payload?.[f.key] === null || r.payload?.[f.key] === ""));
  const top = [...overdue, ...high].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5).map((r)=>r.reference||String(r.id||""));
  const title = feature?.title || "Record";
  return {
    aiGenerated: false,
    source: "deterministic fallback",
    label: "Deterministic fallback — not AI generated (aiGenerated: false)",
    featureId: feature?.id || null,
    recordCount: list.length,
    insights: [
      { id:"priority-queue", label:`${title} — priority queue`, count: overdue.length + high.length, overdueCount: overdue.length, highRiskCount: high.length, references: top, summary: overdue.length||high.length ? `${overdue.length} overdue and ${high.length} high-risk records need attention.` : "No overdue or high-risk records (count: 0)." },
      { id:"value-at-risk", label:`${title} — value at risk`, totalValue, openValue, openCount: open.length, summary: `Open value is ${openValue} across ${open.length} open records; total value is ${totalValue}.` },
      { id:"evidence-completeness", label:`${title} — evidence completeness`, incompleteCount: incomplete.length, completeCount: list.length - incomplete.length, summary: incomplete.length ? `${incomplete.length} records are missing at least one domain field.` : `All ${list.length} records have every domain field present (incomplete: 0).` },
    ],
    sections: [
      { title:"Priority queue", detail:`Overdue: ${overdue.length}; High risk: ${high.length}; References: ${top.join(", ") || "none"}` },
      { title:"Value at risk", detail:`Open records: ${open.length}; Open value: ${openValue}; Total value: ${totalValue}` },
      { title:"Evidence completeness", detail:`Complete: ${list.length - incomplete.length}; Incomplete: ${incomplete.length}; Total: ${list.length}` },
    ],
  };
}
