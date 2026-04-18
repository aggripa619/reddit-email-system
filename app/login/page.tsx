"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      window.location.href = params.get("from") ?? "/dashboard";
    } else {
      const data = await res.json();
      setError(data.error ?? "Invalid credentials");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0c2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#16133a", border: "1px solid #2d2a5e", borderRadius: 12, padding: "40px 36px", width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>AnswerInsight</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>Reddit DM System</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              style={{ width: "100%", boxSizing: "border-box", background: "#0f0c2e", border: "1px solid #374151", borderRadius: 6, padding: "10px 12px", color: "white", fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: "100%", boxSizing: "border-box", background: "#0f0c2e", border: "1px solid #374151", borderRadius: 6, padding: "10px 12px", color: "white", fontSize: 14 }}
            />
          </div>

          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            width: "100%", background: loading ? "#312e81" : "#4f46e5", color: "white",
            border: "none", borderRadius: 6, padding: "11px", fontSize: 15,
            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
