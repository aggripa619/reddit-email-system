"use client";
import { useEffect, useState } from "react";
import EmailCard from "@/components/email/EmailCard";
import MetricCard from "@/components/email/MetricCard";

interface Metrics { sent: number; openRate: number; replyRate: number; bounced: number; pending: number; }

export default function EmailQueuePage() {
  const [steps, setSteps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [pollMsg, setPollMsg] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [queueRes, metricsRes] = await Promise.all([
      fetch("/api/email/queue").then(r => r.json()),
      fetch("/api/email/metrics").then(r => r.json()),
    ]);
    setSteps(queueRes.steps ?? []);
    setMetrics(metricsRes);
    setLoading(false);
  }

  async function handlePoll() {
    setPolling(true); setPollMsg("");
    const res = await fetch("/api/email/imap-poll", { method: "POST" });
    const data = await res.json();
    setPollMsg(data.success ? `Poll done — ${data.matched} replies matched.` : `Error: ${data.error}`);
    setPolling(false);
    loadData();
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Email Outreach</h1>
          <span style={{ background: steps.length > 0 ? "#4f46e5" : "#374151", color: "white", borderRadius: 20, padding: "2px 12px", fontSize: 14 }}>
            {steps.length} pending
          </span>
        </div>
        <button onClick={handlePoll} disabled={polling}
          style={{ background: "transparent", border: "1px solid #4f46e5", color: "#a5b4fc", borderRadius: 6, padding: "8px 16px", cursor: polling ? "not-allowed" : "pointer", fontSize: 13 }}>
          {polling ? "Polling..." : "Poll for Replies"}
        </button>
      </div>

      {pollMsg && <p style={{ fontSize: 13, color: pollMsg.startsWith("Error") ? "#f87171" : "#34d399", marginBottom: 16 }}>{pollMsg}</p>}

      {/* Metrics */}
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          <MetricCard label="Emails Sent" value={metrics.sent} />
          <MetricCard label="Open Rate" value={`${metrics.openRate}%`} />
          <MetricCard label="Reply Rate" value={`${metrics.replyRate}%`} />
          <MetricCard label="Bounces" value={metrics.bounced} />
          <MetricCard label="Pending Review" value={metrics.pending} />
        </div>
      )}

      {steps.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No pending emails</p>
          <p style={{ fontSize: 14 }}>Import a CSV from the Import page to generate drafts.</p>
        </div>
      ) : steps.map(s => (
        <EmailCard key={s.step_id} step={s} onRemove={id => setSteps(p => p.filter(s => s.step_id !== id))} />
      ))}
    </div>
  );
}
