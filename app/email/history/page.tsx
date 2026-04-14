"use client";
import { useEffect, useState } from "react";

interface SentStep {
  id: number; step: number; subject: string; sent_at: string;
  opened_at?: string; replied_at?: string;
  email: string; first_name?: string; last_name?: string; company?: string;
}

export default function EmailHistoryPage() {
  const [rows, setRows] = useState<SentStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email/metrics").then(r => r.json()); // warm cache
    // Fetch sent steps via prospects API with a hack — use queue route with filter
    fetch("/api/email/prospects?page=1&status=active")
      .then(r => r.json())
      .then(() => setLoading(false));

    // Use a dedicated sent endpoint
    fetch("/api/email/sent").then(r => r.json()).then(d => {
      setRows(d.rows ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Email History</h1>
      {rows.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No emails sent yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1e1b4b", color: "#9ca3af", textAlign: "left" }}>
              {["Recipient", "Company", "Step", "Subject", "Sent", "Opened", "Replied"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{r.email}</div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{r.company ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "#312e81", color: "#a5b4fc", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}>{r.step}/3</span>
                  </td>
                  <td style={{ padding: "10px 14px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</td>
                  <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 12 }}>{new Date(r.sent_at).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 14px", fontSize: 18 }}>{r.opened_at ? "✓" : "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 18 }}>{r.replied_at ? "✓" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
