"use client";
import { useEffect, useRef, useState } from "react";

const VARS = ["{{username}}", "{{subreddit}}", "{{post_title}}", "{{comment_excerpt}}"];
const DUMMY: Record<string, string> = {
  "{{username}}": "u/johndoe", "{{subreddit}}": "r/SEO",
  "{{post_title}}": "How are brands optimising for ChatGPT?",
  "{{comment_excerpt}}": "I've been tracking this for a while...",
};

interface Template { id?: number; name: string; subject: string; body: string; }
const EMPTY: Template = { name: "", subject: "", body: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template>(EMPTY);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await fetch("/api/templates").then(r => r.json());
    setTemplates(data);
  }

  function insertVar(v: string) {
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const newBody = selected.body.slice(0, s) + v + selected.body.slice(e);
    setSelected(p => ({ ...p, body: newBody }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); });
  }

  async function handleSave() {
    setSaving(true);
    const method = isNew ? "POST" : "PUT";
    await fetch("/api/templates", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
    await load(); setSelected(EMPTY); setIsNew(true); setSaving(false);
  }

  async function handleDelete() {
    if (!selected.id) return;
    await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id }) });
    await load(); setSelected(EMPTY); setIsNew(true);
  }

  const preview = (text: string) => VARS.reduce((s, v) => s.replaceAll(v, DUMMY[v]), text);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Templates</h1>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr", gap: 24 }}>
        {/* Sidebar list */}
        <div>
          <button onClick={() => { setSelected(EMPTY); setIsNew(true); }}
            style={{ width: "100%", background: "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 0", marginBottom: 12, cursor: "pointer", fontWeight: 600 }}>
            + New Template
          </button>
          {templates.map(t => (
            <div key={t.id} onClick={() => { setSelected(t); setIsNew(false); }}
              style={{ padding: "10px 14px", borderRadius: 6, cursor: "pointer", marginBottom: 4,
                background: selected.id === t.id ? "#312e81" : "#1a1730",
                border: `1px solid ${selected.id === t.id ? "#4f46e5" : "transparent"}` }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{isNew ? "New Template" : "Edit Template"}</h2>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Name</label>
            <input value={selected.name} onChange={e => setSelected(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Product intro" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Subject</label>
            <input value={selected.subject} onChange={e => setSelected(p => ({ ...p, subject: e.target.value }))} placeholder="Subject line..." />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Body ({selected.body.length}/500)</label>
            <textarea ref={bodyRef} value={selected.body} onChange={e => setSelected(p => ({ ...p, body: e.target.value }))} rows={8} maxLength={500} placeholder="Message body..." />
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
            <button onClick={handleSave} disabled={saving || !selected.name}
              style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
              {saving ? "Saving..." : "Save"}
            </button>
            {!isNew && (
              <button onClick={handleDelete}
                style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 6, padding: "8px 18px", cursor: "pointer" }}>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Preview</h2>
          <div style={{ background: "#0f0c2e", borderRadius: 8, padding: 16, fontSize: 14 }}>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>Subject</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{preview(selected.subject) || "(none)"}</div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>Body</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#d1d5db", lineHeight: 1.6 }}>{preview(selected.body) || "(empty)"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
