"use client";
import { useEffect, useState } from "react";
import DMCard from "@/components/DMCard";

interface Template { id: number; name: string; subject: string; body: string; }
interface PendingDM {
  id: number; reddit_username: string; post_title: string; post_url: string;
  post_subreddit: string; comment_body: string; comment_url: string;
  draft_subject: string; draft_body: string; total_contacts?: number; last_contacted?: string;
}

export default function DashboardPage() {
  const [dms, setDms] = useState<PendingDM[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cardStates, setCardStates] = useState<Record<number, { subject: string; body: string }>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => { if (!r.ok) throw new Error(`dashboard ${r.status}`); return r.json(); }),
      fetch("/api/templates").then(r => { if (!r.ok) throw new Error(`templates ${r.status}`); return r.json(); }),
    ])
      .then(([dash, tmpl]) => {
        const fetched: PendingDM[] = dash.pendingDms ?? [];
        setDms(fetched);
        setTemplates(tmpl ?? []);
        setLoading(false);
        const initial: Record<number, { subject: string; body: string }> = {};
        for (const dm of fetched) initial[dm.id] = { subject: dm.draft_subject ?? "", body: dm.draft_body ?? "" };
        setCardStates(initial);
      })
      .catch(err => { console.error("Dashboard load failed:", err); setError(String(err)); setLoading(false); });
  }, []);

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

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true); setBulkMsg("");
    const items = [...selectedIds].map(id => ({
      pendingDmId: id,
      finalSubject: cardStates[id]?.subject ?? "",
      finalBody: cardStates[id]?.body ?? "",
    }));
    const res = await fetch("/api/dm/approve-bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.success) {
      setBulkMsg(`Sent ${data.sent} DM${data.sent !== 1 ? "s" : ""}.${data.errors?.length ? ` ${data.errors.length} failed.` : ""}`);
      const sent = new Set(selectedIds);
      setDms(p => p.filter(d => !sent.has(d.id)));
      setSelectedIds(new Set());
    } else {
      setBulkMsg(`Error: ${data.error}`);
    }
    setBulkLoading(false);
  }

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: "#f87171" }}>Error: {error}</div>;

  // Group by subreddit (API already orders by subreddit ASC)
  const grouped = dms.reduce<Record<string, PendingDM[]>>((acc, dm) => {
    const key = dm.post_subreddit || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(dm);
    return acc;
  }, {});

  const subreddits = Object.keys(grouped).sort();
  const allSelected = dms.length > 0 && selectedIds.size === dms.length;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>DM Review Queue</h1>
        <span style={{ background: dms.length > 0 ? "#4f46e5" : "#374151", color: "white", borderRadius: 20, padding: "2px 12px", fontSize: 14 }}>
          {dms.length} pending
        </span>
        {dms.length > 0 && (
          <button
            onClick={() => setSelectedIds(allSelected ? new Set() : new Set(dms.map(d => d.id)))}
            style={{ background: "transparent", color: "#9ca3af", border: "1px solid #374151", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 }}>
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

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
          <button onClick={handleBulkApprove} disabled={bulkLoading}
            style={{ background: bulkLoading ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, cursor: bulkLoading ? "not-allowed" : "pointer", fontSize: 13 }}>
            {bulkLoading ? "Sending..." : "Approve & Send Selected"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} disabled={bulkLoading}
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

      {dms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No pending DMs</p>
          <p style={{ fontSize: 14 }}>Run a scan from Settings to generate drafts.</p>
        </div>
      ) : subreddits.map(subreddit => (
        <div key={subreddit} style={{ marginBottom: 32 }}>
          {/* Subreddit section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ height: 1, background: "#312e81", flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#312e81", color: "#a5b4fc", borderRadius: 6, padding: "4px 14px", fontSize: 14, fontWeight: 700 }}>
                r/{subreddit}
              </span>
              <span style={{ color: "#6b7280", fontSize: 13 }}>
                {grouped[subreddit].length} {grouped[subreddit].length === 1 ? "DM" : "DMs"}
              </span>
              <button
                onClick={() => {
                  const ids = grouped[subreddit].map(d => d.id);
                  const allIn = ids.every(id => selectedIds.has(id));
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (allIn) ids.forEach(id => next.delete(id));
                    else ids.forEach(id => next.add(id));
                    return next;
                  });
                }}
                style={{ background: "transparent", color: "#9ca3af", border: "1px solid #374151", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
                {grouped[subreddit].every(d => selectedIds.has(d.id)) ? "Deselect" : "Select all"}
              </button>
            </div>
            <div style={{ height: 1, background: "#312e81", flex: 1 }} />
          </div>

          {grouped[subreddit].map(dm => (
            <DMCard
              key={dm.id}
              dm={dm}
              templates={templates}
              onRemove={id => {
                setDms(p => p.filter(d => d.id !== id));
                setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
              }}
              selected={selectedIds.has(dm.id)}
              onSelect={handleSelect}
              onSubjectChange={handleSubjectChange}
              onBodyChange={handleBodyChange}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
