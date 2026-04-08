"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📋" },
  { href: "/templates", label: "Templates", icon: "✉️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/history", label: "History", icon: "📜" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => setPendingCount(d.pendingCount ?? 0)).catch(() => {});
  }, [pathname]);

  const navLinks = (
    <nav style={{ flex: 1, padding: "12px 8px" }}>
      {NAV.map(item => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            borderRadius: 8, marginBottom: 4, textDecoration: "none",
            background: active ? "#4f46e5" : "transparent",
            color: active ? "white" : "#c7d2fe",
            fontWeight: active ? 600 : 400, fontSize: 14,
          }}>
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.href === "/dashboard" && pendingCount > 0 && (
              <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#4f46e5", color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 12, fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #2d2a5e" }}>
        <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>AnswerInsight</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Reddit DM</div>
      </div>
      {navLinks}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #2d2a5e", fontSize: 11, color: "#6b7280" }}>
        Auto-scan: daily 08:00 UTC
      </div>
    </div>
  );

  return (
    <>
      <aside style={{
        width: 220, minHeight: "100vh", background: "#1E1B4B", color: "white",
        position: "fixed", top: 0, left: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
      }} className="rdsidebar">{sidebarInner}</aside>

      <div style={{ width: 220, flexShrink: 0 }} className="rdsidebar-spacer" />

      <button onClick={() => setOpen(!open)} className="rdhamburguer" aria-label="Open navigation"
        style={{ display: "none", position: "fixed", top: 12, left: 12, zIndex: 200,
          background: "#1e1b4b", border: "none", color: "white", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 18 }}>
        ☰
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 150 }} />
          <aside style={{ position: "fixed", top: 0, left: 0, width: 220, height: "100vh",
            background: "#1E1B4B", color: "white", zIndex: 160, display: "flex", flexDirection: "column" }}>
            {sidebarInner}
          </aside>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .rdsidebar { display: none !important; }
          .rdsidebar-spacer { display: none !important; }
          .rdhamburguer { display: block !important; }
        }
      `}</style>
    </>
  );
}
