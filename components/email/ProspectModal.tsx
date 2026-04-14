"use client";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:      { bg: "#1f2937", text: "#9ca3af" },
  active:       { bg: "#1e3a5f", text: "#93c5fd" },
  replied:      { bg: "#14532d", text: "#86efac" },
  bounced:      { bg: "#7f1d1d", text: "#fca5a5" },
  unsubscribed: { bg: "#451a03", text: "#fdba74" },
  sent:         { bg: "#1e3a5f", text: "#93c5fd" },
  skipped:      { bg: "#374151", text: "#6b7280" },
};

const STEP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  sent:    { bg: "#14532d", text: "#86efac" },
  pending: { bg: "#1e3a5f", text: "#93c5fd" },
  skipped: { bg: "#374151", text: "#6b7280" },
};

interface Prospect {
  id: number; email: string; first_name?: string; last_name?: string;
  company?: string; job_title?: string; persona?: string; source?: string;
  company_blurb?: string; status: string; risk_score?: number; created_at: string;
  steps_sent?: number;
}

interface SequenceStep {
  id: number; step: number; status: string; subject?: string; body_html?: string;
  scheduled_at?: string; sent_at?: string; delivered_at?: string; opened_at?: string;
  clicked_at?: string; replied_at?: string; bounced_at?: string;
}

interface ModalData {
  prospect: Prospect;
  emailHistory: SequenceStep[];
}

type Tab = "info" | "history" | "send";

function fmt(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProspectModal({
  prospect,
  onClose,
  onDeleted,
}: {
  prospect: Prospect;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [data, setData] = useState<ModalData | null>(null);
  const [loading, setLoading] = useState(true);

  // Send email form state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/email/prospects/${prospect.id}`).then(r => r.json());
    setData(res);
    setLoading(false);
  }

  useEffect(() => { load(); }, [prospect.id]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/email/prospects/${prospect.id}`, { method: "DELETE" });
    onDeleted();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/email/prospects/${prospect.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml: body }),
      }).then(r => r.json());

      if (res.success) {
        setSendResult({ ok: true, msg: "Email sent successfully." });
        setSubject("");
        setBody("");
        await load(); // refresh history
        setTab("history");
      } else {
        setSendResult({ ok: false, msg: res.error ?? "Send failed." });
      }
    } catch {
      setSendResult({ ok: false, msg: "Network error." });
    } finally {
      setSending(false);
    }
  }

  const p = data?.prospect ?? prospect;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
  const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.pending;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {/* Modal panel — stop click propagation so backdrop doesn't fire */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#111827", border: "1px solid #1f2937", borderRadius: 12,
            width: "min(720px, 95vw)", maxHeight: "85vh", display: "flex",
            flexDirection: "column", zIndex: 51, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "20px 24px", borderBottom: "1px solid #1f2937",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#f9fafb" }}>{name}</h2>
                <span style={{ background: sc.bg, color: sc.text, borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
                  {p.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{p.email}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}
            >×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1f2937", padding: "0 24px" }}>
            {(["info", "history", "send"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "12px 16px", fontSize: 13, fontWeight: 600,
                  color: tab === t ? "#818cf8" : "#6b7280",
                  borderBottom: tab === t ? "2px solid #818cf8" : "2px solid transparent",
                  textTransform: "capitalize",
                }}
              >
                {t === "send" ? "Send Email" : t === "history" ? "Email History" : "Info"}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {loading ? (
              <p style={{ color: "#6b7280" }}>Loading…</p>
            ) : tab === "info" ? (
              <InfoTab prospect={p} />
            ) : tab === "history" ? (
              <HistoryTab steps={data?.emailHistory ?? []} />
            ) : (
              <SendTab
                prospect={p}
                subject={subject} setSubject={setSubject}
                body={body} setBody={setBody}
                sending={sending} result={sendResult}
                onSubmit={handleSend}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 24px", borderTop: "1px solid #1f2937",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "#7f1d1d", color: "#fca5a5", border: "none",
                borderRadius: 6, padding: "8px 18px", cursor: deleting ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: 13, opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "Deleting…" : "Delete Prospect"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#1f2937", color: "#d1d5db", border: "none",
                borderRadius: 6, padding: "8px 18px", cursor: "pointer",
                fontWeight: 600, fontSize: 13,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoTab({ prospect: p }: { prospect: Prospect }) {
  const fields: [string, string | number | undefined | null][] = [
    ["Company", p.company],
    ["Job Title", p.job_title],
    ["Persona", p.persona?.replace(/_/g, " ")],
    ["Source", p.source],
    ["Risk Score", p.risk_score != null ? `${p.risk_score} / 10` : undefined],
    ["Steps Sent", p.steps_sent != null ? `${p.steps_sent} / 3` : undefined],
    ["Added", p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined],
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, color: value ? "#d1d5db" : "#374151" }}>{value ?? "—"}</div>
          </div>
        ))}
      </div>
      {p.company_blurb && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Company Blurb</div>
          <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: 0, padding: "12px 14px", background: "#1f2937", borderRadius: 6 }}>
            {p.company_blurb}
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ steps }: { steps: SequenceStep[] }) {
  if (!steps.length) {
    return <p style={{ color: "#6b7280", fontSize: 13 }}>No emails have been sent yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map(s => {
        const sc = STEP_STATUS_COLORS[s.status] ?? STEP_STATUS_COLORS.pending;
        return (
          <div key={s.id} style={{ background: "#1f2937", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280", background: "#111827", borderRadius: 4, padding: "2px 6px" }}>
                  Step {s.step}
                </span>
                <span style={{ fontSize: 11, background: sc.bg, color: sc.text, borderRadius: 4, padding: "2px 6px" }}>
                  {s.status}
                </span>
                {s.delivered_at && (
                  <span style={{ fontSize: 11, background: "#1a2e1a", color: "#6ee7b7", borderRadius: 4, padding: "2px 6px" }}>delivered</span>
                )}
                {s.opened_at && (
                  <span style={{ fontSize: 11, background: "#1e3a5f", color: "#93c5fd", borderRadius: 4, padding: "2px 6px" }}>opened</span>
                )}
                {s.clicked_at && (
                  <span style={{ fontSize: 11, background: "#312e81", color: "#c4b5fd", borderRadius: 4, padding: "2px 6px" }}>clicked</span>
                )}
                {s.replied_at && (
                  <span style={{ fontSize: 11, background: "#14532d", color: "#86efac", borderRadius: 4, padding: "2px 6px" }}>replied</span>
                )}
                {s.bounced_at && (
                  <span style={{ fontSize: 11, background: "#7f1d1d", color: "#fca5a5", borderRadius: 4, padding: "2px 6px" }}>bounced</span>
                )}
              </div>
            </div>
            {s.subject && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", marginBottom: 4 }}>{s.subject}</div>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
              {s.sent_at && <Ts label="Sent" iso={s.sent_at} />}
              {s.delivered_at && <Ts label="Delivered" iso={s.delivered_at} />}
              {s.opened_at && <Ts label="Opened" iso={s.opened_at} />}
              {s.clicked_at && <Ts label="Clicked" iso={s.clicked_at} />}
              {s.replied_at && <Ts label="Replied" iso={s.replied_at} />}
              {s.bounced_at && <Ts label="Bounced" iso={s.bounced_at} />}
              {s.scheduled_at && !s.sent_at && <Ts label="Scheduled" iso={s.scheduled_at} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Ts({ label, iso }: { label: string; iso: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: "#6b7280" }}>{label}: </span>
      <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(iso)}</span>
    </div>
  );
}

interface EmailTemplate {
  id: number; step: number; name: string; subject: string; body_html: string;
}

function substitute(text: string, prospect: Prospect): string {
  return text
    .replace(/\{\{first_name\}\}/g, prospect.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, prospect.last_name ?? '')
    .replace(/\{\{company\}\}/g, prospect.company ?? '')
    .replace(/\{\{job_title\}\}/g, prospect.job_title ?? '');
}

function SendTab({
  prospect, subject, setSubject, body, setBody, sending, result, onSubmit,
}: {
  prospect: Prospect;
  subject: string; setSubject: (v: string) => void;
  body: string; setBody: (v: string) => void;
  sending: boolean; result: { ok: boolean; msg: string } | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    fetch("/api/email/templates")
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []));
  }, []);

  function applyTemplate(id: string) {
    if (!id) return;
    const tmpl = templates.find(t => t.id === parseInt(id));
    if (!tmpl) return;
    setSubject(substitute(tmpl.subject, prospect));
    setBody(substitute(tmpl.body_html, prospect));
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
        Send a one-off email to this prospect. It will be recorded in their email history.
      </p>

      {templates.length > 0 && (
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Load from template</label>
          <select
            defaultValue=""
            onChange={e => applyTemplate(e.target.value)}
            style={{
              width: "100%", background: "#1f2937", border: "1px solid #374151",
              borderRadius: 6, padding: "8px 12px", color: "#f9fafb", fontSize: 13,
              boxSizing: "border-box",
            }}
          >
            <option value="">— choose a template —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                Step {t.step} — {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Subject</label>
        <input
          required value={subject} onChange={e => setSubject(e.target.value)}
          placeholder="Enter subject…"
          style={{
            width: "100%", background: "#1f2937", border: "1px solid #374151",
            borderRadius: 6, padding: "8px 12px", color: "#f9fafb", fontSize: 13,
            boxSizing: "border-box",
          }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Body (HTML or plain text)</label>
        <textarea
          required value={body} onChange={e => setBody(e.target.value)}
          rows={8} placeholder="Write your email…"
          style={{
            width: "100%", background: "#1f2937", border: "1px solid #374151",
            borderRadius: 6, padding: "8px 12px", color: "#f9fafb", fontSize: 13,
            resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
      </div>
      {result && (
        <div style={{
          padding: "10px 14px", borderRadius: 6, fontSize: 13,
          background: result.ok ? "#14532d" : "#7f1d1d",
          color: result.ok ? "#86efac" : "#fca5a5",
        }}>
          {result.msg}
        </div>
      )}
      <button
        type="submit" disabled={sending}
        style={{
          background: "#4f46e5", color: "white", border: "none",
          borderRadius: 6, padding: "10px 20px", cursor: sending ? "not-allowed" : "pointer",
          fontWeight: 600, fontSize: 13, alignSelf: "flex-start",
          opacity: sending ? 0.6 : 1,
        }}
      >
        {sending ? "Sending…" : "Send Email"}
      </button>
    </form>
  );
}
