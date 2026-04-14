"use client";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:       { bg: "#1f2937", text: "#9ca3af" },
  active:        { bg: "#1e3a5f", text: "#93c5fd" },
  replied:       { bg: "#14532d", text: "#86efac" },
  bounced:       { bg: "#7f1d1d", text: "#fca5a5" },
  unsubscribed:  { bg: "#451a03", text: "#fdba74" },
};

interface Prospect {
  id: number; email: string; first_name?: string; last_name?: string;
  company?: string; persona?: string; status: string;
  steps_sent?: number; current_step?: number; risk_score?: number;
}

export default function ProspectTable({
  prospects,
  onRowClick,
}: {
  prospects: Prospect[];
  onRowClick?: (prospect: Prospect) => void;
}) {
  if (!prospects.length) return <p style={{ color: "#6b7280", padding: "20px 0" }}>No prospects found.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#1e1b4b", color: "#9ca3af", textAlign: "left" }}>
          {["Name", "Company", "Persona", "Status", "Steps Sent", "Risk"].map(h => (
            <th key={h} style={{ padding: "10px 14px", fontWeight: 600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {prospects.map(p => {
          const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.pending;
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
          return (
            <tr
              key={p.id}
              onClick={() => onRowClick?.(p)}
              style={{
                borderBottom: "1px solid #1f2937",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = "#1a1a2e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
            >
              <td style={{ padding: "10px 14px" }}>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{p.email}</div>
              </td>
              <td style={{ padding: "10px 14px", color: "#d1d5db" }}>{p.company ?? "—"}</td>
              <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{p.persona?.replace("_", " ") ?? "—"}</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{ background: sc.bg, color: sc.text, borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>{p.status}</span>
              </td>
              <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{p.steps_sent ?? 0} / 3</td>
              <td style={{ padding: "10px 14px", color: "#9ca3af" }}>{p.risk_score ?? 0}/10</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
