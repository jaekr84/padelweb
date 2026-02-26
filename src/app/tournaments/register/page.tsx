"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./register.module.css";

// ─── Mock tournament data (would come from DB by ID) ──────────────────────────
const TOURNAMENTS: Record<string, {
    name: string;
    club: string;
    date: string;
    categories: string[];
    prize: string;
    fee: string;
    maxTeams: number;
    registeredTeams: number;
    description: string;
}> = {
    "1": {
        name: "Copa Primavera",
        club: "Club Padelazo – Sede Norte",
        date: "12 al 14 de Octubre 2026",
        categories: ["5ta", "6ta", "7ma Libre"],
        prize: "$500.000 + Paletas",
        fee: "$15.000 por pareja",
        maxTeams: 32,
        registeredTeams: 18,
        description: "El torneo más esperado del año, con premios en efectivo y paletas de las mejores marcas. Jugá en equipo y llevate el trofeo.",
    },
    "3": {
        name: "Americano Express Damas",
        club: "Padel Point",
        date: "Sábado 22 de Noviembre 2026",
        categories: ["Suma 13 Damas"],
        prize: "Indumentaria Varlion",
        fee: "$8.000 por persona",
        maxTeams: 16,
        registeredTeams: 9,
        description: "Torneo americano exclusivo para damas. Se juega con rotación de parejas, los puntos se suman individualmente.",
    },
};

const DEFAULT_TOURNAMENT = TOURNAMENTS["1"];

// ─── Mock: logged-in user session ────────────────────────────────────────────
const SESSION_USER = {
    id: "u0",
    name: "Alex Rodríguez",
    handle: "@alex.rod",
    avatar: "AR",
    level: "5ta Cat.",
    club: "Club Padelazo",
};

// ─── Mock: searchable registered users ────────────────────────────────────────
const PLATFORM_USERS = [
    { id: "u1", name: "Martín López", handle: "@martin.lp", level: "5ta Cat.", club: "Padel Point" },
    { id: "u2", name: "Sofía Gómez", handle: "@sofi.gm", level: "6ta Cat.", club: "Club Padelazo" },
    { id: "u3", name: "Diego Herrera", handle: "@diegoH", level: "5ta Cat.", club: "Premium Padel Center" },
    { id: "u4", name: "Laura Méndez", handle: "@lauraMend", level: "7ma Libre", club: "Padel Point" },
    { id: "u5", name: "Carlos Vega", handle: "@carlosv", level: "5ta Cat.", club: "Club Norte" },
    { id: "u6", name: "Ana Torres", handle: "@anita.t", level: "4ta Cat.", club: "Club Padelazo" },
    { id: "u7", name: "Pablo Suárez", handle: "@pablosu", level: "5ta Cat.", club: "Premium Padel Center" },
    { id: "u8", name: "Valentina Cruz", handle: "@vale.cruz", level: "7ma Libre", club: "Padel Point" },
];

type PlatformUser = typeof PLATFORM_USERS[0];
type Step = "info" | "team" | "confirm" | "success";

function RegisterContent() {
    const params = useSearchParams();
    const tid = params.get("id") ?? "1";
    const tournament = TOURNAMENTS[tid] ?? DEFAULT_TOURNAMENT;

    const [step, setStep] = useState<Step>("info");
    const [category, setCategory] = useState(tournament.categories[0]);
    const [partner, setPartner] = useState<PlatformUser | null>(null);
    const [partnerMode, setPartnerMode] = useState<"search" | "guest">("search");
    const [guestName, setGuestName] = useState("");
    const [search, setSearch] = useState("");
    const [focused, setFocused] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const filtered = search.trim().length >= 2
        ? PLATFORM_USERS.filter(
            (u) =>
                u.id !== SESSION_USER.id &&
                (u.name.toLowerCase().includes(search.toLowerCase()) ||
                    u.handle.toLowerCase().includes(search.toLowerCase()))
        )
        : [];

    const partnerDisplayName = partnerMode === "guest"
        ? (guestName.trim() || null)
        : (partner?.name ?? null);

    const filledTeam = partnerMode === "guest"
        ? guestName.trim().length > 0
        : Boolean(partner);

    const switchMode = (mode: "search" | "guest") => {
        setPartnerMode(mode);
        setPartner(null);
        setGuestName("");
        setSearch("");
    };

    const pct = Math.round((tournament.registeredTeams / tournament.maxTeams) * 100);
    const spotsLeft = tournament.maxTeams - tournament.registeredTeams;

    // ── Steps ──────────────────────────────────────────────────────────────────
    const steps: { id: Step; label: string }[] = [
        { id: "info", label: "Torneo" },
        { id: "team", label: "Pareja" },
        { id: "confirm", label: "Confirmar" },
        { id: "success", label: "Listo" },
    ];
    const stepIdx = steps.findIndex((s) => s.id === step);

    return (
        <div className={styles.page}>
            {/* ── Top bar ── */}
            <div className={styles.topBar}>
                <Link href="/tournaments" className={styles.backLink}>← Torneos</Link>
                <div className={styles.topTitle}>Inscripción – {tournament.name}</div>
                <div /> {/* spacer */}
            </div>

            {/* ── Step indicator ── */}
            <div className={styles.stepper}>
                {steps.map((s, i) => (
                    <div key={s.id} className={styles.stepItem}>
                        <div className={`${styles.stepDot} ${i < stepIdx ? styles.stepDone : ""} ${i === stepIdx ? styles.stepActive : ""}`}>
                            {i < stepIdx ? "✓" : i + 1}
                        </div>
                        <span className={`${styles.stepLabel} ${i === stepIdx ? styles.stepLabelActive : ""}`}>{s.label}</span>
                        {i < steps.length - 1 && <div className={`${styles.stepLine} ${i < stepIdx ? styles.stepLineDone : ""}`} />}
                    </div>
                ))}
            </div>

            <div className={styles.content}>

                {/* ═══ STEP 1: Tournament info ═══ */}
                {step === "info" && (
                    <div className={styles.card}>
                        <div className={styles.tourneyBanner}>
                            <span style={{ fontSize: "3rem" }}>🏆</span>
                            <div>
                                <h1 className={styles.tourneyName}>{tournament.name}</h1>
                                <p className={styles.tourneyClub}>🏟️ {tournament.club}</p>
                            </div>
                        </div>

                        <p className={styles.tourneyDesc}>{tournament.description}</p>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoIcon}>📅</span>
                                <div>
                                    <div className={styles.infoLabel}>Fecha</div>
                                    <div className={styles.infoValue}>{tournament.date}</div>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoIcon}>🎁</span>
                                <div>
                                    <div className={styles.infoLabel}>Premio</div>
                                    <div className={styles.infoValue}>{tournament.prize}</div>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoIcon}>💰</span>
                                <div>
                                    <div className={styles.infoLabel}>Inscripción</div>
                                    <div className={styles.infoValue}>{tournament.fee}</div>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoIcon}>📋</span>
                                <div>
                                    <div className={styles.infoLabel}>Categorías</div>
                                    <div className={styles.infoValue}>{tournament.categories.join(" · ")}</div>
                                </div>
                            </div>
                        </div>

                        {/* Spots bar */}
                        <div className={styles.spotsBox}>
                            <div className={styles.spotsTop}>
                                <span>Lugares disponibles</span>
                                <span style={{ fontWeight: 700 }}>{spotsLeft} de {tournament.maxTeams}</span>
                            </div>
                            <div className={styles.spotsBar}>
                                <div className={styles.spotsBarFill} style={{ width: `${pct}%` }} />
                            </div>
                            {spotsLeft <= 4 && (
                                <p className={styles.spotsWarning}>⚠️ ¡Últimos {spotsLeft} lugares!</p>
                            )}
                        </div>

                        {/* Category selector */}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Seleccioná tu categoría</label>
                            <div className={styles.catPills}>
                                {tournament.categories.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`${styles.catPill} ${category === cat ? styles.catPillActive : ""}`}
                                        onClick={() => setCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button className={styles.btnPrimary} onClick={() => setStep("team")}>
                            Continuar →
                        </button>
                    </div>
                )}

                {/* ═══ STEP 2: Team data ═══ */}
                {step === "team" && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Tu pareja</h2>
                        <p className={styles.cardSub}>
                            Elegí tu compañero/a para la categoría <strong>{category}</strong>.
                        </p>

                        {/* Player 1: logged-in user — read only */}
                        <div className={styles.playerBlock}>
                            <div className={styles.playerBlockLabel}>Vos</div>
                            <div className={styles.playerProfileCard}>
                                <div className={styles.avatar}>{SESSION_USER.avatar}</div>
                                <div className={styles.playerProfileInfo}>
                                    <div className={styles.playerProfileName}>{SESSION_USER.name}</div>
                                    <div className={styles.playerProfileMeta}>
                                        {SESSION_USER.handle} · {SESSION_USER.level} · {SESSION_USER.club}
                                    </div>
                                </div>
                                <span className={styles.selfBadge}>Tú</span>
                            </div>
                        </div>

                        {/* Player 2: mode toggle + input */}
                        <div className={styles.playerBlock}>
                            <div className={styles.partnerModeRow}>
                                <span className={styles.playerBlockLabel}>Tu compañero/a</span>
                                <div className={styles.modeSwitcher}>
                                    <button
                                        className={`${styles.modeBtn} ${partnerMode === "search" ? styles.modeBtnActive : ""}`}
                                        onClick={() => switchMode("search")}
                                    >
                                        🔍 Buscar usuario
                                    </button>
                                    <button
                                        className={`${styles.modeBtn} ${partnerMode === "guest" ? styles.modeBtnActive : ""}`}
                                        onClick={() => switchMode("guest")}
                                    >
                                        👤 Invitado
                                    </button>
                                </div>
                            </div>

                            {partner ? (
                                /* Selected partner card */
                                <div className={styles.playerProfileCard} style={{ borderColor: "rgba(217,249,93,0.4)" }}>
                                    <div className={styles.avatar} style={{ background: "rgba(217,249,93,0.15)", color: "var(--primary)" }}>
                                        {partner.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <div className={styles.playerProfileInfo}>
                                        <div className={styles.playerProfileName}>{partner.name}</div>
                                        <div className={styles.playerProfileMeta}>
                                            {partner.handle} · {partner.level} · {partner.club}
                                        </div>
                                    </div>
                                    <button
                                        className={styles.removePartnerBtn}
                                        onClick={() => { setPartner(null); setSearch(""); }}
                                    >✕ Cambiar</button>
                                </div>
                            ) : partnerMode === "guest" ? (
                                /* Guest input */
                                <div className={styles.guestInputWrap}>
                                    <div className={styles.searchInputRow}>
                                        <span className={styles.searchIcon}>👤</span>
                                        <input
                                            className={styles.searchInput}
                                            placeholder="Nombre del invitado…"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <p className={styles.guestNote}>
                                        El invitado no necesita estar registrado. Solo ingresá su nombre para identificarlo en el fixture.
                                    </p>
                                </div>
                            ) : (
                                /* Search box */
                                <div className={styles.searchWrap}>
                                    <div className={styles.searchInputRow}>
                                        <span className={styles.searchIcon}>🔍</span>
                                        <input
                                            className={styles.searchInput}
                                            placeholder="Buscar por nombre o @usuario…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setTimeout(() => setFocused(false), 150)}
                                        />
                                    </div>
                                    {focused && (search.trim().length < 2 ? (
                                        <div className={styles.searchDropdown}>
                                            <div className={styles.searchHint}>Escribí al menos 2 caracteres para buscar</div>
                                        </div>
                                    ) : filtered.length === 0 ? (
                                        <div className={styles.searchDropdown}>
                                            <div className={styles.searchHint}>No se encontraron usuarios con ese nombre</div>
                                        </div>
                                    ) : (
                                        <div className={styles.searchDropdown}>
                                            {filtered.map(u => (
                                                <button
                                                    key={u.id}
                                                    className={styles.searchResult}
                                                    onMouseDown={() => { setPartner(u); setSearch(""); }}
                                                >
                                                    <div className={styles.resultAvatar}>
                                                        {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className={styles.resultName}>{u.name}</div>
                                                        <div className={styles.resultMeta}>{u.handle} · {u.level} · {u.club}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.btnRow}>
                            <button className={styles.btnSecondary} onClick={() => setStep("info")}>← Volver</button>
                            <button
                                className={styles.btnPrimary}
                                disabled={!filledTeam}
                                onClick={() => setStep("confirm")}
                            >
                                Continuar →
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP 3: Confirm ═══ */}
                {step === "confirm" && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Confirmá tu inscripción</h2>
                        <p className={styles.cardSub}>Revisá los datos antes de inscribirte.</p>

                        <div className={styles.summaryBox}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Torneo</span>
                                <span className={styles.summaryValue}>{tournament.name}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Categoría</span>
                                <span className={styles.summaryValue}>{category}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Fecha</span>
                                <span className={styles.summaryValue}>{tournament.date}</span>
                            </div>
                            <div className={styles.summaryDivider} />
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Jugador 1</span>
                                <span className={styles.summaryValue}>{SESSION_USER.name} ({SESSION_USER.handle})</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Jugador 2</span>
                                <span className={styles.summaryValue}>
                                    {partnerMode === "guest"
                                        ? <>{guestName} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(invitado)</span></>
                                        : <>{partner?.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({partner?.handle})</span></>}
                                </span>
                            </div>
                            <div className={styles.summaryDivider} />
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Costo</span>
                                <span className={styles.summaryValue} style={{ color: "var(--primary)", fontWeight: 800 }}>{tournament.fee}</span>
                            </div>
                        </div>

                        <label className={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span>Acepto el reglamento del torneo y las condiciones de inscripción</span>
                        </label>

                        <div className={styles.btnRow}>
                            <button className={styles.btnSecondary} onClick={() => setStep("team")}>← Volver</button>
                            <button
                                className={styles.btnPrimary}
                                disabled={!agreed}
                                onClick={() => setStep("success")}
                            >
                                ✓ Confirmar Inscripción
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP 4: Success ═══ */}
                {step === "success" && (
                    <div className={styles.card} style={{ textAlign: "center", alignItems: "center" }}>
                        <div className={styles.successIcon}>🎉</div>
                        <h2 className={styles.cardTitle}>¡Inscripción confirmada!</h2>
                        <p className={styles.cardSub} style={{ maxWidth: 400 }}>
                            <strong>{SESSION_USER.name} / {partnerDisplayName}</strong> quedaron inscriptos en la categoría <strong>{category}</strong> del torneo <strong>{tournament.name}</strong>.
                            {partnerMode === "guest"
                                ? " El fixture usará el nombre ingresado para identificar al invitado."
                                : " Recibirán una notificación en la plataforma con los detalles."}
                        </p>

                        <div className={styles.successDetails}>
                            <div className={styles.successDetailItem}>
                                <span>📅 {tournament.date}</span>
                            </div>
                            <div className={styles.successDetailItem}>
                                <span>🏟️ {tournament.club}</span>
                            </div>
                            <div className={styles.successDetailItem}>
                                <span>🏷️ {category}</span>
                            </div>
                        </div>

                        <div className={styles.btnRow} style={{ justifyContent: "center" }}>
                            <Link href="/tournaments">
                                <button className={styles.btnSecondary}>Ver Torneos</button>
                            </Link>
                            <Link href="/feed">
                                <button className={styles.btnPrimary}>Ir al Feed →</button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
