"use client";
import { useState } from "react";
import { getUKDatetimeMin, ukDatetimeToISO } from "@/lib/email/timezone";

interface Step {
  step_id: number; step: number; subject: string; body_html: string;
  prospect_id: number; email: string; first_name?: string; last_name?: string;
  company?: string; job_title?: string; persona?: string;
  company_blurb?: string; risk_score?: number;
}

interface EmailCardProps {
  step: Step;
  onRemove: (id: number) => void;
  selected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  onSubjectChange?: (id: number, val: string) => void;
  onBodyChange?: (id: number, val: string) => void;
}

function riskColor(score: number) {
  if (score >= 7) return { bg: "#7f1d1d", text: "#fca5a5" };
  if (score >= 4) return { bg: "#78350f", text: "#fcd34d" };
  return { bg: "#14532d", text: "#86efac" };
}

export default function EmailCard({ step, onRemove, selected, onSelect, onSubjectChange, onBodyChange }: EmailCardProps) {
  const [subject, setSubject] = useState(step.subject ?? "");
  const [body, setBody] = useState(step.body_html ?? "");
  const [loading, setLoading] = useState<"approve" | "schedule" | "discard" | null>(null);
  const [error, setError] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [sendAt, setSendAt] = useState(getUKDatetimeMin());

  const risk = riskColor(step.risk_score ?? 0);
  const name = [step.first_name, step.last_name].filter(Boolean).join(" ") || step.email;

  async function handleApprove() {
    setLoading("approve"); setError("");
    const res = await fetch("/api/email/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.step_id, subject, bodyHtml: body }),
    });
    const data = await res.json();
    if (data.success) onRemove(step.step_id);
    else { setError(data.error ?? "Failed to send"); setLoading(null); }
  }

  async function handleSchedule() {
    setLoading("schedule"); setError("");
    const res = await fetch("/api/email/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.step_id, subject, bodyHtml: body, sendAt: ukDatetimeToISO(sendAt) }),
    });
    const data = await res.json();
    if (data.success) onRemove(step.step_id);
    else { setError(data.error ?? "Failed to schedule"); setLoading(null); }
  }

  async function handleDiscard() {
    setLoading("discard");
    const res = await fetch("/api/email/discard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.step_id }),
    });
    if ((await res.json()).success) onRemove(step.step_id);
    else setLoading(null);
  }

  return (
    <div style={{ background: "#16133a", border: "1px solid #374151", borderRadius: 10, padding: 20, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {onSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={e => onSelect(step.step_id, e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#4f46e5" }}
            />
          )}
          <span style={{ fontWeight: 700, fontSize: 16 }}>{name}</span>
          {step.company && <span style={{ color: "#9ca3af", fontSize: 14 }}>· {step.company}</span>}
          <span style={{ background: "#312e81", color: "#a5b4fc", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>Step {step.step}/3</span>
          {step.persona && step.persona !== "OTHER" && (
            <span style={{ background: "#1f2937", color: "#d1d5db", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>{step.persona.replace("_", " ")}</span>
          )}
          <span style={{ background: risk.bg, color: risk.text, borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
            Risk {step.risk_score ?? 0}/10
          </span>
        </div>
        <a href={`mailto:${step.email}`} style={{ fontSize: 12, color: "#818cf8" }}>{step.email}</a>
      </div>

      {/* Company blurb */}
      {step.company_blurb && (
        <div style={{ background: "#0f0c2e", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#d1d5db", borderLeft: "3px solid #4f46e5" }}>
          {step.company_blurb}
        </div>
      )}

      {/* Editable fields */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Subject</label>
        <input
          value={subject}
          onChange={e => { setSubject(e.target.value); onSubjectChange?.(step.step_id, e.target.value); }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Body (HTML)</label>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); onBodyChange?.(step.step_id, e.target.value); }}
          rows={6}
        />
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handleApprove} disabled={loading !== null}
          style={{ background: loading === "approve" ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 18px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {loading === "approve" ? "Sending..." : "Approve & Send"}
        </button>
        <button onClick={() => { setShowScheduler(s => !s); setError(""); }} disabled={loading !== null}
          style={{ background: showScheduler ? "#1e1b4b" : "transparent", color: "#a5b4fc", border: "1px solid #4f46e5", borderRadius: 6, padding: "8px 18px", cursor: loading ? "not-allowed" : "pointer" }}>
          Schedule for later {showScheduler ? "▴" : "▾"}
        </button>
        <button onClick={handleDiscard} disabled={loading !== null}
          style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 6, padding: "8px 18px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading === "discard" ? "..." : "Discard"}
        </button>
      </div>

      {showScheduler && (
        <div style={{ marginTop: 12, background: "#0f0c2e", border: "1px solid #312e81", borderRadius: 8, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>Send at (UK time)</label>
          <input
            type="datetime-local"
            value={sendAt}
            min={getUKDatetimeMin()}
            onChange={e => setSendAt(e.target.value)}
            style={{ background: "#1e1b4b", color: "white", border: "1px solid #4f46e5", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
          />
          <button onClick={handleSchedule} disabled={loading !== null || !sendAt}
            style={{ background: loading === "schedule" ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "7px 16px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13 }}>
            {loading === "schedule" ? "Scheduling..." : "Confirm Schedule"}
          </button>
          <button onClick={() => setShowScheduler(false)} disabled={loading !== null}
            style={{ background: "transparent", color: "#6b7280", border: "none", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
