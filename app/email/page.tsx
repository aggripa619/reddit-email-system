"use client";
import { useEffect, useState } from "react";
import EmailCard from "@/components/email/EmailCard";
import MetricCard from "@/components/email/MetricCard";
import { getUKDatetimeMin, ukDatetimeToISO } from "@/lib/email/timezone";

interface Metrics { sent: number; openRate: number; replyRate: number; bounced: number; pending: number; }

export default function EmailQueuePage() {
  const [steps, setSteps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [pollMsg, setPollMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cardStates, setCardStates] = useState<Record<number, { subject: string; body: string }>>({});
  const [bulkSendAt, setBulkSendAt] = useState("");
  const [bulkLoading, setBulkLoading] = useState<"schedule" | "approve" | null>(null);
  const [bulkMsg, setBulkMsg] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [queueRes, metricsRes] = await Promise.all([
      fetch("/api/email/queue").then(r => r.json()),
      fetch("/api/email/metrics").then(r => r.json()),
    ]);
    const fetched = queueRes.steps ?? [];
    setSteps(fetched);
    setMetrics(metricsRes);
    setLoading(false);

    const initial: Record<number, { subject: string; body: string }> = {};
    for (const s of fetched) initial[s.step_id] = { subject: s.subject ?? "", body: s.body_html ?? "" };
    setCardStates(initial);
    setBulkSendAt(getUKDatetimeMin());
  }

  function handleSelect(id: number, sel: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      sel ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleSubjectChange(id: number, val: string) {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], subject: val } }));
  }

  function handleBodyChange(id: number, val: string) {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], body: val } }));
  }

  function removeCards(ids: Set<number>) {
    setSteps(p => p.filter(s => !ids.has(s.step_id)));
    setSelectedIds(new Set());
  }

  async function handleBulkSchedule() {
    if (!bulkSendAt || selectedIds.size === 0) return;
    setBulkLoading("schedule"); setBulkMsg("");
    const items = [...selectedIds].map(id => ({
      stepId: id,
      subject: cardStates[id]?.subject ?? "",
      bodyHtml: cardStates[id]?.body ?? "",
    }));
    const res = await fetch("/api/email/schedule-bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, sendAt: ukDatetimeToISO(bulkSendAt) }),
    });
    const data = await res.json();
    if (data.success) {
      setBulkMsg(`Scheduled ${data.scheduled} email${data.scheduled !== 1 ? "s" : ""}.`);
      removeCards(selectedIds);
    } else {
      setBulkMsg(`Error: ${data.error}`);
    }
    setBulkLoading(null);
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkLoading("approve"); setBulkMsg("");
    const items = [...selectedIds].map(id => ({
      stepId: id,
      subject: cardStates[id]?.subject ?? "",
      bodyHtml: cardStates[id]?.body ?? "",
    }));
    const res = await fetch("/api/email/approve-bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.success) {
      setBulkMsg(`Sent ${data.sent} email${data.sent !== 1 ? "s" : ""}.${data.errors?.length ? ` ${data.errors.length} failed.` : ""}`);
      removeCards(selectedIds);
    } else {
      setBulkMsg(`Error: ${data.error}`);
    }
    setBulkLoading(null);
  }

  async function handleSendScheduled() {
    setSending(true); setSendMsg("");
    const res = await fetch("/api/email/send-scheduled", { method: "POST" });
    const data = await res.json();
    setSendMsg(data.sent !== undefined
      ? `Sent ${data.sent} scheduled email${data.sent !== 1 ? "s" : ""}.${data.errors ? " Some errors occurred." : ""}`
      : `Error: ${data.error}`);
    setSending(false);
    loadData();
  }

  async function handlePoll() {
    setPolling(true); setPollMsg("");
    const res = await fetch("/api/email/imap-poll", { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      setPollMsg(`Error: ${data.error}`);
    } else if (data.errors?.length) {
      setPollMsg(`Poll done — ${data.matched} matched. Errors: ${data.errors.join(' | ')}`);
    } else {
      setPollMsg(`Poll done — ${data.matched} ${data.matched === 1 ? 'reply' : 'replies'} matched.`);
    }
    setPolling(false);
    loadData();
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;

  const allSelected = steps.length > 0 && selectedIds.size === steps.length;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Email Outreach</h1>
          <span style={{ background: steps.length > 0 ? "#4f46e5" : "#374151", color: "white", borderRadius: 20, padding: "2px 12px", fontSize: 14 }}>
            {steps.length} pending
          </span>
          {steps.length > 0 && (
            <button
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(steps.map(s => s.step_id)))}
              style={{ background: "transparent", color: "#9ca3af", border: "1px solid #374151", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 }}>
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSendScheduled} disabled={sending || polling}
            style={{ background: "transparent", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: 6, padding: "8px 16px", cursor: (sending || polling) ? "not-allowed" : "pointer", fontSize: 13 }}>
            {sending ? "Sending..." : "Send Scheduled"}
          </button>
          <button onClick={handlePoll} disabled={polling || sending}
            style={{ background: "transparent", border: "1px solid #4f46e5", color: "#a5b4fc", borderRadius: 6, padding: "8px 16px", cursor: (polling || sending) ? "not-allowed" : "pointer", fontSize: 13 }}>
            {polling ? "Polling..." : "Poll for Replies"}
          </button>
        </div>
      </div>

      {sendMsg && <p style={{ fontSize: 13, color: sendMsg.startsWith("Error") ? "#f87171" : "#34d399", marginBottom: 8 }}>{sendMsg}</p>}
      {pollMsg && <p style={{ fontSize: 13, color: pollMsg.startsWith("Error") ? "#f87171" : "#34d399", marginBottom: 16 }}>{pollMsg}</p>}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "#1e1b4b", border: "1px solid #4f46e5",
          borderRadius: 8, padding: "12px 16px",
          display: "flex", gap: 12, alignItems: "center",
          flexWrap: "wrap", marginBottom: 16,
        }}>
          <span style={{ color: "#a5b4fc", fontWeight: 600, fontSize: 14 }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="datetime-local"
              value={bulkSendAt}
              min={getUKDatetimeMin()}
              onChange={e => setBulkSendAt(e.target.value)}
              style={{ background: "#16133a", color: "white", border: "1px solid #4f46e5", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
            />
            <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>UK time</span>
          </div>
          <button onClick={handleBulkSchedule} disabled={bulkLoading !== null || !bulkSendAt}
            style={{ background: bulkLoading === "schedule" ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, cursor: (bulkLoading || !bulkSendAt) ? "not-allowed" : "pointer", fontSize: 13 }}>
            {bulkLoading === "schedule" ? "Scheduling..." : "Schedule Selected"}
          </button>
          <button onClick={handleBulkApprove} disabled={bulkLoading !== null}
            style={{ background: bulkLoading === "approve" ? "#14532d" : "#15803d", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, cursor: bulkLoading ? "not-allowed" : "pointer", fontSize: 13 }}>
            {bulkLoading === "approve" ? "Sending..." : "Approve & Send Selected"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} disabled={bulkLoading !== null}
            style={{ background: "transparent", color: "#6b7280", border: "none", cursor: "pointer", fontSize: 13 }}>
            Deselect All
          </button>
          {bulkMsg && (
            <span style={{ fontSize: 13, color: bulkMsg.startsWith("Error") ? "#f87171" : "#34d399" }}>
              {bulkMsg}
            </span>
          )}
        </div>
      )}

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
        <EmailCard
          key={s.step_id}
          step={s}
          onRemove={id => {
            setSteps(p => p.filter(s => s.step_id !== id));
            setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
          }}
          selected={selectedIds.has(s.step_id)}
          onSelect={handleSelect}
          onSubjectChange={handleSubjectChange}
          onBodyChange={handleBodyChange}
        />
      ))}
    </div>
  );
}
