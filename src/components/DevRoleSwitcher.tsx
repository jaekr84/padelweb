"use client";

import { useState } from "react";
import { switchRole } from "@/app/dev/actions";

const ROLES = [
    { id: "jugador", label: "Jugador", emoji: "🎾" },
    { id: "profe", label: "Profe", emoji: "🏫" },
    { id: "centro_de_padel", label: "Centro de Pádel", emoji: "🏟️" },
    { id: "club", label: "Club", emoji: "🏟️" },
] as const;

type Role = typeof ROLES[number]["id"];

export default function DevRoleSwitcher({ currentRole }: { currentRole: string }) {
    const [open, setOpen] = useState(false);
    const [activeRole, setActiveRole] = useState(currentRole);

    const handleSwitch = async (role: Role) => {
        setOpen(false);
        try {
            await switchRole(role);
        } catch (e) {
            console.error("switchRole failed:", e);
        }
        // Write cookie immediately client-side so Sidebar picks it up right away
        document.cookie = `__padel_role=${role}; path=/; max-age=86400; samesite=lax`;
        setActiveRole(role);
        // Hard reload so layout.tsx re-runs server-side and re-writes the cookie too
        window.location.reload();
    };

    return (
        <div style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            fontFamily: "var(--font-geist-sans, system-ui)",
        }}>
            {/* Panel */}
            {open && (
                <div style={{
                    marginBottom: "0.75rem",
                    background: "#18181b",
                    border: "1px solid rgba(217,249,93,0.3)",
                    borderRadius: "1rem",
                    padding: "1rem",
                    minWidth: "200px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#a1a1aa", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                        🛠 Dev · Cambiar Rol
                    </div>
                    {ROLES.map((r) => {
                        const isActive = activeRole === r.id;
                        return (
                            <button
                                key={r.id}
                                onClick={() => handleSwitch(r.id)}
                                disabled={isActive}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    width: "100%",
                                    padding: "0.6rem 0.75rem",
                                    marginBottom: "0.35rem",
                                    borderRadius: "0.5rem",
                                    border: `1px solid ${isActive ? "rgba(217,249,93,0.6)" : "rgba(255,255,255,0.06)"}`,
                                    background: isActive ? "rgba(217,249,93,0.1)" : "rgba(255,255,255,0.03)",
                                    color: isActive ? "#d9f95d" : "#e4e4e7",
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: "0.875rem",
                                    cursor: isActive ? "default" : "pointer",
                                    opacity: 1,
                                    transition: "all 0.15s",
                                    textAlign: "left",
                                }}
                            >
                                <span>{r.emoji}</span>
                                <span>{r.label}</span>
                                {isActive && (
                                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", background: "rgba(217,249,93,0.2)", color: "#d9f95d", padding: "0.1rem 0.5rem", borderRadius: "1rem" }}>
                                        activo
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.7rem", color: "#52525b", textAlign: "center" }}>
                        Solo visible en desarrollo
                    </div>
                </div>
            )}

            {/* Toggle button */}
            <button
                onClick={() => setOpen((o) => !o)}
                title="Dev: cambiar rol"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: open ? "rgba(217,249,93,0.15)" : "#18181b",
                    border: `1.5px solid ${open ? "rgba(217,249,93,0.6)" : "rgba(217,249,93,0.3)"}`,
                    borderRadius: "2rem",
                    padding: "0.5rem 1rem",
                    color: "#d9f95d",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    transition: "all 0.15s",
                    letterSpacing: "0.02em",
                }}
            >
                <span>🛠</span>
                <span>{ROLES.find(r => r.id === activeRole)?.emoji} {activeRole}</span>
                <span style={{ opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
            </button>
        </div>
    );
}
