"use client";
import { useRef, useState } from "react";

const FIELD_STYLE = {
  width: "100%", background: "#1f2937", border: "1px solid #374151",
  borderRadius: 6, padding: "8px 12px", color: "#f9fafb", fontSize: 13,
  boxSizing: "border-box" as const,
};

interface ImportResult { imported: number; skipped: number; errors: string[]; }

const EMPTY_FORM = { email: "", first_name: "", last_name: "", company: "", job_title: "" };

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<number | null>(null);
  const [genError, setGenError] = useState("");

  // Manual add state
  const [form, setForm] = useState(EMPTY_FORM);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function setField(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setManualLoading(true);
    setManualResult(null);
    const res = await fetch("/api/email/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then(r => r.json());

    if (res.success) {
      setManualResult({ ok: true, msg: `${form.email} added successfully.` });
      setForm(EMPTY_FORM);
    } else {
      setManualResult({ ok: false, msg: res.error ?? "Failed to add prospect." });
    }
    setManualLoading(false);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true); setResult(null); setError(""); setGenerated(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/email/import", { method: "POST", body: form });
    const data = await res.json();
    if (data.success) setResult(data);
    else setError(data.error ?? "Import failed");
    setLoading(false);
  }

  async function handleGenerateDrafts() {
    setGenerating(true); setGenError(""); setGenerated(null);
    const res = await fetch("/api/email/generate-drafts", { method: "POST" });
    const data = await res.json();
    if (res.ok) setGenerated(data.generated);
    else setGenError(data.error ?? "Failed to generate drafts");
    setGenerating(false);
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Import Prospects</h1>

      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Upload CSV</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>
          Required column: <code style={{ background: "#0f0c2e", padding: "1px 6px", borderRadius: 3 }}>email</code>.
          Recommended: <code style={{ background: "#0f0c2e", padding: "1px 6px", borderRadius: 3 }}>first_name</code>,{" "}
          <code style={{ background: "#0f0c2e", padding: "1px 6px", borderRadius: 3 }}>company</code>,{" "}
          <code style={{ background: "#0f0c2e", padding: "1px 6px", borderRadius: 3 }}>job_title</code>.
          Handles variant column names (First Name, firstname, etc.). Duplicates are skipped.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ flex: 1, padding: "8px 12px" }} />
          <button onClick={handleUpload} disabled={loading}
            style={{ background: loading ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 20px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
      </section>

      {error && <p style={{ color: "#f87171", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {result && (
        <section style={{ background: "#16133a", borderRadius: 10, padding: 20, border: "1px solid #374151", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#34d399" }}>Import Complete</h2>
          <p style={{ fontSize: 14, marginBottom: 4 }}>Imported: <strong>{result.imported}</strong></p>
          <p style={{ fontSize: 14, marginBottom: 4 }}>Skipped (duplicates / invalid): <strong>{result.skipped}</strong></p>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "#f87171", marginBottom: 6 }}>Errors:</p>
              {result.errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: "#f87171" }}>{e}</p>)}
            </div>
          )}
        </section>
      )}

      {/* Manual Add */}
      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Add Prospect Manually</h2>
        <form onSubmit={handleManualAdd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>First Name</label>
              <input value={form.first_name} onChange={setField("first_name")} placeholder="Jane" style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Last Name</label>
              <input value={form.last_name} onChange={setField("last_name")} placeholder="Smith" style={FIELD_STYLE} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email <span style={{ color: "#f87171" }}>*</span></label>
            <input required type="email" value={form.email} onChange={setField("email")} placeholder="jane@company.com" style={FIELD_STYLE} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Company</label>
              <input value={form.company} onChange={setField("company")} placeholder="Acme Corp" style={FIELD_STYLE} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Job Title</label>
              <input value={form.job_title} onChange={setField("job_title")} placeholder="Head of SEO" style={FIELD_STYLE} />
            </div>
          </div>
          {manualResult && (
            <p style={{ fontSize: 13, color: manualResult.ok ? "#34d399" : "#f87171", margin: 0 }}>
              {manualResult.msg}
            </p>
          )}
          <div>
            <button type="submit" disabled={manualLoading}
              style={{ background: manualLoading ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 20px", cursor: manualLoading ? "not-allowed" : "pointer", fontWeight: 600 }}>
              {manualLoading ? "Adding..." : "Add Prospect"}
            </button>
          </div>
        </form>
      </section>

      {/* Generate Drafts */}
      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Generate Step 1 Drafts</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>
          Applies your{" "}
          <a href="/email/templates" style={{ color: "#818cf8" }}>Step 1 template</a>
          {" "}to all imported prospects that don{"'"}t yet have a draft. Variables like{" "}
          <code style={{ background: "#0f0c2e", padding: "1px 6px", borderRadius: 3 }}>{"{{first_name}}"}</code> are substituted automatically.
          You must have a Step 1 template saved before generating.
        </p>
        <button onClick={handleGenerateDrafts} disabled={generating}
          style={{ background: generating ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 20px", cursor: generating ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {generating ? "Generating..." : "Generate Step 1 Drafts"}
        </button>
        {genError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{genError}</p>}
        {generated !== null && (
          <p style={{ fontSize: 13, color: "#34d399", marginTop: 10 }}>
            {generated} draft{generated !== 1 ? "s" : ""} created.{" "}
            <a href="/email" style={{ color: "#818cf8" }}>Go to queue →</a>
          </p>
        )}
      </section>
    </div>
  );
}
