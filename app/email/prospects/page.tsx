"use client";
import { useEffect, useState } from "react";
import ProspectTable from "@/components/email/ProspectTable";
import ProspectModal from "@/components/email/ProspectModal";

const STATUSES = ["", "pending", "active", "replied", "bounced", "unsubscribed"];

export default function ProspectsPage() {
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { load(); }, [status, page]);

  async function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    const res = await fetch("/api/email/prospects?" + params).then(r => r.json());
    setData(res);
  }

  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / 50);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Prospects</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ width: "auto" }}>
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>{total} total</span>
        </div>
      </div>

      {data ? (
        <ProspectTable prospects={data.rows} onRowClick={p => setSelected(p)} />
      ) : (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      )}

      {pageCount > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: "#1e1b4b", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: page === 1 ? "not-allowed" : "pointer" }}>
            ← Prev
          </button>
          <span style={{ color: "#9ca3af", lineHeight: "32px", fontSize: 13 }}>{page} / {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
            style={{ background: "#1e1b4b", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: page === pageCount ? "not-allowed" : "pointer" }}>
            Next →
          </button>
        </div>
      )}

      {selected && (
        <ProspectModal
          prospect={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
