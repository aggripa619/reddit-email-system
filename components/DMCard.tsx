"use client";
import { useState } from "react";

interface Template { id: number; name: string; subject: string; body: string; }
interface PendingDM {
  id: number; reddit_username: string; post_title: string; post_url: string;
  post_subreddit: string; comment_body: string; comment_url: string;
  draft_subject: string; draft_body: string;
  total_contacts?: number; last_contacted?: string;
}

export default function DMCard({ dm, templates, onRemove }: {
  dm: PendingDM; templates: Template[]; onRemove: (id: number) => void;
}) {
  const [subject, setSubject] = useState(dm.draft_subject ?? "");
  const [body, setBody] = useState(dm.draft_body ?? "");
  const [loading, setLoading] = useState<"approve" | "discard" | null>(null);
  const [error, setError] = useState("");

  const daysSince = dm.last_contacted
    ? Math.floor((Date.now() - new Date(dm.last_contacted).getTime()) / 86400000)
    : null;

  async function handleApprove() {
    setLoading("approve"); setError("");
    const res = await fetch("/api/dm/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingDmId: dm.id, finalSubject: subject, finalBody: body }),
    });
    const data = await res.json();
    if (data.success) onRemove(dm.id);
    else { setError(data.error ?? "Failed to send"); setLoading(null); }
  }

  async function handleDiscard() {
    setLoading("discard");
    const res = await fetch("/api/dm/discard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingDmId: dm.id }),
    });
    if ((await res.json()).success) onRemove(dm.id);
    else setLoading(null);
  }

  function switchTemplate(templateId: string) {
    const t = templates.find(t => t.id === Number(templateId));
    if (!t) return;
    const sub = (s: string) => s
      .replace(/\{\{username\}\}/g, "u/" + dm.reddit_username)
      .replace(/\{\{subreddit\}\}/g, "r/" + dm.post_subreddit)
      .replace(/\{\{post_title\}\}/g, dm.post_title)
      .replace(/\{\{comment_excerpt\}\}/g, dm.comment_body?.slice(0, 100) ?? "");
    setSubject(sub(t.subject));
    setBody(sub(t.body));
  }

  return (
    <div style={{ background: "#16133a", border: "1px solid #374151", borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <a href={`https://reddit.com/user/${dm.reddit_username}`} target="_blank" rel="noopener noreferrer"
            style={{ color: "#818cf8", fontWeight: 700, fontSize: 16 }}>u/{dm.reddit_username}</a>
          <span style={{ background: "#312e81", color: "#a5b4fc", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>r/{dm.post_subreddit}</span>
          {(dm.total_contacts ?? 0) > 0 && (
            <span style={{ background: "#1f2937", color: "#9ca3af", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
              Contacted {dm.total_contacts}x{daysSince != null ? `, ${daysSince}d ago` : ""}
            </span>
          )}
        </div>
        {templates.length > 0 && (
          <select onChange={e => switchTemplate(e.target.value)} style={{ width: "auto", fontSize: 13 }}>
            <option value="">Switch template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ background: "#0f0c2e", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
        <span style={{ color: "#6b7280", fontSize: 12 }}>Post: </span>
        <a href={dm.post_url} target="_blank" rel="noopener noreferrer" style={{ color: "#c7d2fe" }}>{dm.post_title}</a>
        <div style={{ borderLeft: "3px solid #4f46e5", paddingLeft: 10, color: "#d1d5db", fontStyle: "italic", marginTop: 8 }}>
          <a href={dm.comment_url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
            "{dm.comment_body?.slice(0, 200)}{(dm.comment_body?.length ?? 0) > 200 ? "..." : ""}"
          </a>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} />
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleApprove} disabled={loading !== null}
          style={{ background: loading === "approve" ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 18px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {loading === "approve" ? "Sending..." : "Approve & Send"}
        </button>
        <button onClick={handleDiscard} disabled={loading !== null}
          style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 6, padding: "8px 18px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading === "discard" ? "..." : "Discard"}
        </button>
      </div>
    </div>
  );
}
