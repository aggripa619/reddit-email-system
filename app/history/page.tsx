"use client";
import { useEffect, useState } from "react";

interface SentDM {
  id: number; reddit_username: string; final_subject: string;
  sent_at: string; post_title?: string; post_subreddit?: string; template_name?: string;
}
interface Modal { username: string; history: any; dms: any[]; }

export default function HistoryPage() {
  const [rows, setRows] = useState<SentDM[]>([]);
  const [sub, setSub] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);

  useEffect(() => { load(); }, [sub, from, to]);

  async function load() {
    const p = new URLSearchParams();
    if (sub) p.set("subreddit", sub); if (from) p.set("from", from); if (to) p.set("to", to);
    const d = await fetch("/api/history?" + p).then(r => r.json());
    setRows(d.rows ?? []);
  }

  async function openModal(username: string) {
    const d = await fetch("/api/history?username=" + encodeURIComponent(username)).then(r => r.json());
    setModal({ username, history: d.contactHistory, dms: d.userDMs ?? [] });
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Sent History</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Filter subreddit" style={{ width: 180 }} />
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
        <button onClick={() => { setSub(""); setFrom(""); setTo(""); }}
          style={{ background: "transparent", border: "1px solid #374151", color: "#9ca3af", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
          Clear
        </button>
      </div>

      {rows.length === 0 ? <p style={{ color: "#6b7280" }}>No sent DMs yet.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1e1b4b", color: "#9ca3af", textAlign: "left" }}>
              {["Username", "Subreddit", "Post", "Template", "Sent At"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "10px 14px" }}>
                  <button onClick={() => openModal(r.reddit_username)}
                    style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                    u/{r.reddit_username}
                  </button>
                </td>
                <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{r.post_subreddit ? `r/${r.post_subreddit}` : "—"}</td>
                <td style={{ padding: "10px 14px", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.post_title ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{r.template_name ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{new Date(r.sent_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setModal(null)}>
          <div style={{ background: "#16133a", borderRadius: 12, padding: 28, maxWidth: 560, width: "90%", border: "1px solid #374151" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>u/{modal.username}</h2>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 24 }}>×</button>
            </div>
            {modal.history ? (
              <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 16 }}>
                Total contacts: <strong style={{ color: "white" }}>{modal.history.total_contacts}</strong> &nbsp;|&nbsp;
                Last: <strong style={{ color: "white" }}>{new Date(modal.history.last_contacted).toLocaleDateString()}</strong>
              </p>
            ) : <p style={{ color: "#6b7280" }}>No history found.</p>}
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {modal.dms.map((d: any) => (
                <div key={d.id} style={{ background: "#0f0c2e", borderRadius: 6, padding: "10px 14px", marginBottom: 8, fontSize: 13 }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 600, marginBottom: 4 }}>{d.final_subject}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{new Date(d.sent_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
