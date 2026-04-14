"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { step: 1, label: "Step 1 — Day 1", hint: "Initial outreach" },
  { step: 2, label: "Step 2 — Day 4", hint: "Follow-up" },
  { step: 3, label: "Step 3 — Day 8", hint: "Final touch" },
];

const VARS = ["{{first_name}}", "{{last_name}}", "{{company}}", "{{job_title}}"];
const DUMMY: Record<string, string> = {
  "{{first_name}}": "Alex",
  "{{last_name}}": "Johnson",
  "{{company}}": "Acme Corp",
  "{{job_title}}": "Head of Marketing",
};

interface EmailTemplate { id?: number; step: number; name: string; subject: string; body_html: string; }
const empty = (step: number): EmailTemplate => ({ step, name: "", subject: "", body_html: "" });

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [form, setForm] = useState<EmailTemplate>(empty(1));
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await fetch("/api/email/templates").then(r => r.json());
    setTemplates(data.templates ?? []);
  }

  function selectStep(step: number) {
    setActiveStep(step);
    const existing = templates.find(t => t.step === step);
    setForm(existing ? { ...existing } : empty(step));
  }

  function insertVar(v: string) {
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const newBody = form.body_html.slice(0, s) + v + form.body_html.slice(e);
    setForm(p => ({ ...p, body_html: newBody }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); });
  }

  async function handleSave() {
    setSaving(true);
    if (form.id) {
      await fetch("/api/email/templates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, name: form.name, subject: form.subject, body_html: form.body_html }),
      });
    } else {
      await fetch("/api/email/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: activeStep, name: form.name, subject: form.subject, body_html: form.body_html }),
      });
    }
    await load();
    setSaving(false);
  }

  async function handleDelete() {
    if (!form.id) return;
    await fetch("/api/email/templates", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: form.id }),
    });
    setForm(empty(activeStep));
    await load();
  }

  const preview = (text: string) => VARS.reduce((s, v) => s.replaceAll(v, DUMMY[v]), text);

  // Re-sync form when templates load
  useEffect(() => {
    const existing = templates.find(t => t.step === activeStep);
    setForm(existing ? { ...existing } : empty(activeStep));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Email Templates</h1>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
        One template per sequence step. Use variables like <code style={{ background: "#1e1b4b", padding: "1px 6px", borderRadius: 4 }}>{"{{first_name}}"}</code> — they are substituted when drafts are generated.
      </p>

      {/* Step tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {STEPS.map(s => (
          <button key={s.step} onClick={() => selectStep(s.step)}
            style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
              border: activeStep === s.step ? "2px solid #4f46e5" : "2px solid #2d2a5e",
              background: activeStep === s.step ? "#312e81" : "transparent",
              color: activeStep === s.step ? "white" : "#9ca3af",
            }}>
            {s.label}
            {templates.find(t => t.step === s.step) && (
              <span style={{ marginLeft: 8, background: "#22c55e", borderRadius: 10, width: 8, height: 8, display: "inline-block" }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Editor */}
        <div>
          <div style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 16, fontWeight: 600 }}>
            {STEPS.find(s => s.step === activeStep)?.hint}
            {form.id ? " — editing saved template" : " — no template yet"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Template Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={`e.g. Step ${activeStep} outreach`} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Subject</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Subject line — use {{company}} or {{first_name}}" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Body (HTML)</label>
            <textarea ref={bodyRef} value={form.body_html}
              onChange={e => setForm(p => ({ ...p, body_html: e.target.value }))}
              rows={12} placeholder="<p>Hi {{first_name}},</p><p>...</p>" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {VARS.map(v => (
              <button key={v} onClick={() => insertVar(v)}
                style={{ background: "#1e1b4b", color: "#a5b4fc", border: "1px solid #4f46e5", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving || !form.name || !form.subject || !form.body_html}
              style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontWeight: 600, opacity: (!form.name || !form.subject || !form.body_html) ? 0.5 : 1 }}>
              {saving ? "Saving..." : form.id ? "Update Template" : "Save Template"}
            </button>
            {form.id && (
              <button onClick={handleDelete}
                style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 6, padding: "8px 18px", cursor: "pointer" }}>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#9ca3af" }}>Preview</h2>
          <div style={{ background: "#0f0c2e", borderRadius: 8, padding: 20, fontSize: 14 }}>
            <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Subject</div>
            <div style={{ fontWeight: 600, marginBottom: 16, color: "#e5e7eb" }}>{preview(form.subject) || "(none)"}</div>
            <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Body</div>
            <div
              style={{ color: "#d1d5db", lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: preview(form.body_html) || "<em style='color:#6b7280'>(empty)</em>" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
