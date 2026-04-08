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

  useEffect(() => {
    Promise.all([fetch("/api/dashboard").then(r => r.json()), fetch("/api/templates").then(r => r.json())])
      .then(([dash, tmpl]) => { setDms(dash.pendingDms ?? []); setTemplates(tmpl ?? []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>DM Review Queue</h1>
        <span style={{ background: dms.length > 0 ? "#4f46e5" : "#374151", color: "white", borderRadius: 20, padding: "2px 12px", fontSize: 14 }}>
          {dms.length} pending
        </span>
      </div>
      {dms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No pending DMs</p>
          <p style={{ fontSize: 14 }}>Run a scan from Settings to generate drafts.</p>
        </div>
      ) : dms.map(dm => (
        <DMCard key={dm.id} dm={dm} templates={templates} onRemove={id => setDms(p => p.filter(d => d.id !== id))} />
      ))}
    </div>
  );
}
