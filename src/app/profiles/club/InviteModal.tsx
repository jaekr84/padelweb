"use client";

import { useState, KeyboardEvent } from "react";
import s from "./invite.module.css";

// ── Simulated registered users ────────────────────────────────────────────────
const ALL_PLAYERS = [
    { id: "u1", name: "Martín Suárez", level: "4ta Cat.", avatar: "👤", email: "martin@mail.com", member: false },
    { id: "u2", name: "Laura Rodríguez", level: "3ra Cat.", avatar: "👩", email: "laura@mail.com", member: true },
    { id: "u3", name: "Pablo García", level: "6ta Cat.", avatar: "👤", email: "pablo@mail.com", member: false },
    { id: "u4", name: "Valentina Torres", level: "5ta Damas", avatar: "👩", email: "vale@mail.com", member: false },
    { id: "u5", name: "Roberto Paz", level: "2da Cat.", avatar: "👤", email: "roberto@mail.com", member: true },
    { id: "u6", name: "Sofía Ibáñez", level: "7ma Cat.", avatar: "👩", email: "sofia@mail.com", member: false },
];

type InviteStatus = "pendiente" | "aceptada" | "expirada";
interface Invitation { id: string; email: string; date: string; status: InviteStatus; }

// ── Simulated pending invitations ─────────────────────────────────────────────
const INITIAL_PENDING: Invitation[] = [
    { id: "i1", email: "nuevo@mail.com", date: "Hace 2 días", status: "pendiente" },
    { id: "i2", email: "lucas@padel.com", date: "Hace 5 días", status: "pendiente" },
    { id: "i3", email: "carmen@gmail.com", date: "Hace 10 días", status: "expirada" },
    { id: "i4", email: "ana@hotmail.com", date: "Hace 15 días", status: "aceptada" },
];

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface InviteModalProps {
    clubName: string;
    onClose: () => void;
}

export function InviteModal({ clubName, onClose }: InviteModalProps) {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [emailChips, setEmailChips] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [message, setMessage] = useState(`¡Hola! Te invito a unirte a ${clubName} en Padel Social. ¡Nos vemos en la cancha! 🎾`);
    const [sent, setSent] = useState(false);
    const [pending, setPending] = useState<Invitation[]>(INITIAL_PENDING);

    const [tab, setTab] = useState<"invite" | "pending">("invite");

    const filtered = search.length > 1
        ? ALL_PLAYERS.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase())
        )
        : [];

    const togglePlayer = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const addEmailChip = () => {
        const val = emailInput.trim();
        if (isValidEmail(val) && !emailChips.includes(val)) {
            setEmailChips(prev => [...prev, val]);
        }
        setEmailInput("");
    };

    const handleEmailKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "," || e.key === " ") {
            e.preventDefault();
            addEmailChip();
        }
        if (e.key === "Backspace" && emailInput === "" && emailChips.length > 0) {
            setEmailChips(prev => prev.slice(0, -1));
        }
    };

    const removeChip = (email: string) => setEmailChips(prev => prev.filter(e => e !== email));

    const totalInvites = selectedIds.size + emailChips.length;

    const handleSend = () => {
        // In production: call Supabase Edge Function here
        // For existing users: INSERT into invitations + send email via Resend
        // For new emails: supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
        setSent(true);
        const newPending = [
            ...Array.from(selectedIds).map(id => ({
                id: `new-${id}`,
                email: ALL_PLAYERS.find(p => p.id === id)?.email ?? "",
                date: "Ahora",
                status: "pendiente" as const,
            })),
            ...emailChips.map(email => ({
                id: `new-${email}`,
                email,
                date: "Ahora",
                status: "pendiente" as const,
            })),
        ];
        setPending(prev => [...newPending, ...prev]);
    };

    return (
        <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={s.modal}>

                {/* Header */}
                <div className={s.modalHeader}>
                    <div>
                        <div className={s.modalTitle}>✉️ Invitar Miembros</div>
                        <div className={s.modalSub}>{clubName}</div>
                    </div>
                    <button className={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--surface-border)", padding: "0 1.5rem" }}>
                    {(["invite", "pending"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                background: "transparent", border: "none", padding: "0.75rem 0.875rem",
                                fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                                color: tab === t ? "var(--primary)" : "var(--text-muted)",
                                borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
                                transition: "color 0.2s",
                            }}
                        >
                            {t === "invite" ? "Enviar Invitaciones" : `Pendientes (${pending.filter(p => p.status === "pendiente").length})`}
                        </button>
                    ))}
                </div>

                {/* ── INVITE TAB ── */}
                {tab === "invite" && !sent && (
                    <div className={s.modalBody}>
                        {/* Search existing players */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Buscar jugadores registrados
                            </label>
                            <div className={s.searchBox}>
                                <span style={{ color: "var(--text-muted)" }}>🔍</span>
                                <input
                                    className={s.searchInput}
                                    placeholder="Nombre o email del jugador..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {filtered.length > 0 && (
                                <div className={s.resultsList} style={{ marginTop: "0.5rem" }}>
                                    {filtered.map(player => (
                                        <button
                                            key={player.id}
                                            className={`${s.resultItem} ${selectedIds.has(player.id) ? s.selected : ""}`}
                                            onClick={() => !player.member && togglePlayer(player.id)}
                                            disabled={player.member}
                                            style={{ width: "100%", textAlign: "left", cursor: player.member ? "not-allowed" : "pointer" }}
                                        >
                                            <div className={s.resultAvatar}>{player.avatar}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className={s.resultName}>{player.name}</div>
                                                <div className={s.resultSub}>{player.level} · {player.email}</div>
                                            </div>
                                            {player.member
                                                ? <span className={s.alreadyMember}>Ya es miembro</span>
                                                : selectedIds.has(player.id) && <span className={s.resultCheck}>✓</span>
                                            }
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedIds.size > 0 && (
                                <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                                    {Array.from(selectedIds).map(id => {
                                        const p = ALL_PLAYERS.find(x => x.id === id)!;
                                        return (
                                            <div key={id} className={s.emailChip}>
                                                {p.avatar} {p.name}
                                                <button className={s.emailChipRemove} onClick={() => togglePlayer(id)}>✕</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className={s.divider}>o invitá por email</div>

                        {/* Email input */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Emails (nuevos usuarios)
                            </label>
                            <div className={s.emailArea} onClick={() => document.getElementById("emailInput")?.focus()}>
                                {emailChips.map(email => (
                                    <div key={email} className={s.emailChip}>
                                        {email}
                                        <button className={s.emailChipRemove} onClick={() => removeChip(email)}>✕</button>
                                    </div>
                                ))}
                                <input
                                    id="emailInput"
                                    className={s.emailInput}
                                    placeholder={emailChips.length === 0 ? "ej: jugador@mail.com (Enter para agregar)" : "Agregar otro email..."}
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyDown={handleEmailKey}
                                    onBlur={addEmailChip}
                                />
                            </div>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.375rem" }}>
                                Presioná Enter, coma o espacio para agregar varios emails.
                                Los usuarios nuevos recibirán un link de registro que los conecta automáticamente al club.
                            </p>
                        </div>

                        {/* Message */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Mensaje personalizado
                            </label>
                            <textarea
                                className={s.messageInput}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                {/* ── PENDING TAB ── */}
                {tab === "pending" && (
                    <div className={s.modalBody}>
                        <div className={s.pendingPanel}>
                            {pending.map(item => (
                                <div key={item.id} className={s.pendingItem}>
                                    <span style={{ fontSize: "1.25rem" }}>📧</span>
                                    <div style={{ flex: 1 }}>
                                        <div className={s.pendingEmail}>{item.email}</div>
                                        <div className={s.pendingDate}>{item.date}</div>
                                    </div>
                                    <span className={`${s.pendingStatus} ${item.status === "pendiente" ? s.statusPendiente :
                                        item.status === "aceptada" ? s.statusAceptada : s.statusExpirada
                                        }`}>
                                        {item.status}
                                    </span>
                                    {item.status !== "aceptada" && (
                                        <button className={s.resendBtn} title="Reenviar invitación">↻</button>
                                    )}
                                </div>
                            ))}
                            {pending.length === 0 && (
                                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0", fontSize: "0.9rem" }}>
                                    No hay invitaciones pendientes.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── SUCCESS ── */}
                {sent && tab === "invite" && (
                    <div className={s.successState}>
                        <div className={s.successIcon}>🎉</div>
                        <div className={s.successTitle}>¡Invitaciones enviadas!</div>
                        <p className={s.successSub}>
                            Se envió un email de invitación a {totalInvites} {totalInvites === 1 ? "persona" : "personas"}.
                            Los jugadores registrados también recibirán una notificación en la app.
                        </p>
                        <button className={s.btnSend} onClick={() => { setSent(false); setSelectedIds(new Set()); setEmailChips([]); setSearch(""); setTab("pending"); }}>
                            Ver invitaciones pendientes →
                        </button>
                    </div>
                )}

                {/* Footer */}
                {tab === "invite" && !sent && (
                    <div className={s.modalFooter}>
                        <span className={s.footerHint}>
                            {totalInvites > 0 ? `${totalInvites} invitación${totalInvites > 1 ? "es" : ""} lista${totalInvites > 1 ? "s" : ""}` : "Buscá jugadores o ingresá emails"}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
                            <button
                                className={s.btnSend}
                                disabled={totalInvites === 0}
                                onClick={handleSend}
                            >
                                Enviar →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
