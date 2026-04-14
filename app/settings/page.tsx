"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Subreddit { id: number; name: string; active: number; }
interface SettingsData {
  subreddits: Subreddit[];
  lastScan: { ran_at: string; posts_found: number; users_queued: number; status: string } | null;
  connectionStatus: { ok: boolean; username?: string };
  hasRefreshToken: boolean;
}

function OAuthBanner() {
  const searchParams = useSearchParams();
  const oauthConnected = searchParams.get("connected") === "1";
  const oauthError = searchParams.get("error");
  if (!oauthConnected && !oauthError) return null;
  return (
    <>
      {oauthConnected && (
        <div style={{ background: "#052e16", border: "1px solid #16a34a", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#34d399", fontSize: 14 }}>
          Reddit account connected successfully.
        </div>
      )}
      {oauthError && (
        <div style={{ background: "#1c0a0a", border: "1px solid #dc2626", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 14 }}>
          {oauthError === "reddit_auth_denied" ? "Reddit authorization was denied." : "Failed to connect Reddit account. Check server logs."}
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [newSub, setNewSub] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const d = await fetch("/api/settings").then(r => r.json());
    setData(d);
  }

  async function act(body: object) {
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  async function handleScan() {
    setScanning(true); setScanMsg("");
    const res = await fetch("/api/scan", { method: "POST" });
    const d = await res.json();
    setScanMsg(d.success ? `Done — ${d.usersQueued} users queued.` : `Error: ${d.error}`);
    setScanning(false); load();
  }

  if (!data) return <div style={{ padding: 40, color: "#9ca3af" }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <Suspense fallback={null}><OAuthBanner /></Suspense>

      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Reddit Connection</h2>
        {data.hasRefreshToken ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: data.connectionStatus.ok ? "#10b981" : "#ef4444" }} />
              <span style={{ fontSize: 14 }}>
                {data.connectionStatus.ok ? `Connected as u/${data.connectionStatus.username}` : "Token stored but connection check failed"}
              </span>
            </div>
            {data.lastScan && (
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, marginBottom: 0 }}>
                Last scan: {new Date(data.lastScan.ran_at).toLocaleString()} · {data.lastScan.status} · {data.lastScan.users_queued} queued
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
              No Reddit account connected. Click below to authorize via OAuth.
            </p>
            <a href="/api/auth/reddit/start"
              style={{ display: "inline-block", background: "#ff4500", color: "white", border: "none", borderRadius: 6,
                padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Connect Reddit Account
            </a>
          </>
        )}
      </section>

      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Subreddits to Scan</h2>
        {data.subreddits.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button onClick={() => act({ action: "toggle", id: s.id, active: !s.active })}
              style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                background: s.active ? "#4f46e5" : "#374151", position: "relative" }}>
              <span style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
                background: "white", left: s.active ? 21 : 3, transition: "left .15s" }} />
            </button>
            <span style={{ flex: 1, fontSize: 14, color: s.active ? "#f9fafb" : "#6b7280" }}>r/{s.name}</span>
            <button onClick={() => act({ action: "remove", id: s.id })}
              style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20 }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="subreddit (without r/)"
            onKeyDown={e => { if (e.key === "Enter") { act({ action: "add", name: newSub }); setNewSub(""); } }}
            style={{ flex: 1 }} />
          <button onClick={() => { act({ action: "add", name: newSub }); setNewSub(""); }}
            style={{ background: "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>
            Add
          </button>
        </div>
      </section>

      <section style={{ background: "#16133a", borderRadius: 10, padding: 20, border: "1px solid #374151" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Manual Scan</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>Trigger an immediate scan. Auto-scan runs daily at 08:00 UTC.</p>
        <button onClick={handleScan} disabled={scanning}
          style={{ background: scanning ? "#312e81" : "#4f46e5", color: "white", border: "none", borderRadius: 6, padding: "10px 24px", cursor: scanning ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {scanning ? "Scanning..." : "Run Scan Now"}
        </button>
        {scanMsg && <p style={{ marginTop: 10, fontSize: 14, color: scanMsg.startsWith("Error") ? "#f87171" : "#34d399" }}>{scanMsg}</p>}
      </section>
    </div>
  );
}
