"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import styles from "./register.module.css";
import { registerForTournament } from "./actions";

type Tournament = {
    id: string;
    name: string;
    description: string | null;
    surface: string | null;
    startDate: string | null;
    endDate: string | null;
    categories: string[] | null;
    imageUrl: string | null;
    modalidad: { mode: string; participacion: string; genero: string; tipoTorneo: string } | null;
};

type CurrentUser = { id: string; name: string; email: string };

type Step = "info" | "team" | "confirm" | "success";

function getSurfaceLabel(surface: string | null) {
    const map: Record<string, string> = {
        cesped: "Césped Verde", cesped_azul: "Césped Azul",
        cemento: "Hormigón", indoor: "Indoor",
    };
    return surface ? (map[surface] || surface) : "—";
}

export default function RegisterForm({ tournament, currentUser }: { tournament: Tournament; currentUser: CurrentUser }) {
    const isIndividual = tournament.modalidad?.participacion === "individual";
    const cats = tournament.categories ?? [];
    const hasCategories = cats.length > 0 && cats[0] !== "libre";

    const steps: { id: Step; label: string }[] = isIndividual
        ? [{ id: "info", label: "Torneo" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }]
        : [{ id: "info", label: "Torneo" }, { id: "team", label: "Pareja" }, { id: "confirm", label: "Confirmar" }, { id: "success", label: "Listo" }];

    const [step, setStep] = useState<Step>("info");
    const [category, setCategory] = useState(cats[0] ?? "Libre");
    const [agreed, setAgreed] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [regError, setRegError] = useState<string | null>(null);

    // Pareja mode state
    const [partnerMode, setPartnerMode] = useState<"search" | "guest">("search");
    const [guestName, setGuestName] = useState("");
    const [partnerName, setPartnerName] = useState("");
    const [search, setSearch] = useState("");
    const [focused, setFocused] = useState(false);

    const switchMode = (mode: "search" | "guest") => {
        setPartnerMode(mode);
        setPartnerName("");
        setGuestName("");
        setSearch("");
    };

    const handleConfirm = () => {
        setRegError(null);
        startTransition(async () => {
            try {
                await registerForTournament({
                    tournamentId: tournament.id,
                    category: hasCategories ? category : null,
                    partnerName: isIndividual ? null : partnerDisplayName || null,
                    partnerUserId: null, // future: resolve platform user ID
                    isGuestPartner: !isIndividual && partnerMode === "guest",
                });
                setStep("success");
            } catch (err) {
                setRegError(err instanceof Error ? err.message : "Error al confirmar la inscripción");
            }
        });
    };

    const filledTeam = isIndividual
        ? true
        : partnerMode === "guest" ? guestName.trim().length > 0 : partnerName.trim().length > 0;

    const stepIdx = steps.findIndex((s) => s.id === step);

    const goNext = () => {
        if (isIndividual) {
            if (step === "info") setStep("confirm");
        } else {
            if (step === "info") setStep("team");
            else if (step === "team") setStep("confirm");
        }
    };

    const goBack = () => {
        if (isIndividual) {
            if (step === "confirm") setStep("info");
        } else {
            if (step === "team") setStep("info");
            else if (step === "confirm") setStep("team");
        }
    };

    const partnerDisplayName = partnerMode === "guest" ? guestName.trim() : partnerName.trim();

    return (
        <div className={styles.page}>
            {/* Top bar */}
            <div className={styles.topBar}>
                <Link href="/tournaments" className={styles.backLink}>← Torneos</Link>
                <div className={styles.topTitle}>Inscripción – {tournament.name}</div>
                <div />
            </div>

            {/* Step indicator */}
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

                {/* ═══ STEP: Torneo info ═══ */}
                {step === "info" && (
                    <div className={styles.card}>
                        {/* Banner */}
                        <div className={styles.tourneyBanner} style={{ padding: 0, overflow: "hidden", borderRadius: "0.75rem 0.75rem 0 0", minHeight: "120px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(45deg,#18181b,#27272a)" }}>
                            {tournament.imageUrl ? (
                                <img src={tournament.imageUrl} alt={tournament.name} style={{ width: "100%", height: "180px", objectFit: "cover" }} />
                            ) : (
                                <span style={{ fontSize: "3.5rem" }}>🏆</span>
                            )}
                        </div>
                        <div style={{ padding: "1.25rem" }}>
                            <h1 className={styles.tourneyName}>{tournament.name}</h1>
                            {tournament.description && <p className={styles.tourneyDesc}>{tournament.description}</p>}

                            <div className={styles.infoGrid}>
                                {tournament.startDate && (
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoIcon}>📅</span>
                                        <div>
                                            <div className={styles.infoLabel}>Fecha</div>
                                            <div className={styles.infoValue}>{tournament.startDate}{tournament.endDate && tournament.endDate !== tournament.startDate ? ` → ${tournament.endDate}` : ""}</div>
                                        </div>
                                    </div>
                                )}
                                {tournament.surface && (
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoIcon}>🏟️</span>
                                        <div>
                                            <div className={styles.infoLabel}>Superficie</div>
                                            <div className={styles.infoValue}>{getSurfaceLabel(tournament.surface)}</div>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.infoItem}>
                                    <span className={styles.infoIcon}>{isIndividual ? "🧍" : "👥"}</span>
                                    <div>
                                        <div className={styles.infoLabel}>Modalidad</div>
                                        <div className={styles.infoValue}>{isIndividual ? "Individual" : "En Pareja"}</div>
                                    </div>
                                </div>
                                {tournament.modalidad?.genero && (
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoIcon}>⚤</span>
                                        <div>
                                            <div className={styles.infoLabel}>Género</div>
                                            <div className={styles.infoValue}>
                                                {tournament.modalidad.genero === "mixto" ? "Mixto" : tournament.modalidad.genero === "hombre" ? "Solo Hombres" : "Solo Mujeres"}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {tournament.modalidad?.tipoTorneo && (
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoIcon}>🎯</span>
                                        <div>
                                            <div className={styles.infoLabel}>Tipo</div>
                                            <div className={styles.infoValue}>{tournament.modalidad.tipoTorneo}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category selector — only if tournament uses categories */}
                            {hasCategories && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>Seleccioná tu categoría</label>
                                    <div className={styles.catPills}>
                                        {cats.map((cat) => (
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
                            )}
                        </div>
                        <div style={{ padding: "0 1.25rem 1.25rem" }}>
                            <button className={styles.btnPrimary} onClick={goNext}>
                                {isIndividual ? "Continuar →" : "Elegir pareja →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: Pareja (solo si es pareja) ═══ */}
                {step === "team" && !isIndividual && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Tu pareja</h2>
                        <p className={styles.cardSub}>
                            Elegí tu compañero/a{hasCategories ? <> para la categoría <strong>{category}</strong></> : ""}.
                        </p>

                        {/* Player 1: current user */}
                        <div className={styles.playerBlock}>
                            <div className={styles.playerBlockLabel}>Vos</div>
                            <div className={styles.playerProfileCard}>
                                <div className={styles.avatar}>
                                    {currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <div className={styles.playerProfileInfo}>
                                    <div className={styles.playerProfileName}>{currentUser.name}</div>
                                    <div className={styles.playerProfileMeta}>{currentUser.email}</div>
                                </div>
                                <span className={styles.selfBadge}>Tú</span>
                            </div>
                        </div>

                        {/* Player 2 */}
                        <div className={styles.playerBlock}>
                            <div className={styles.partnerModeRow}>
                                <span className={styles.playerBlockLabel}>Tu compañero/a</span>
                                <div className={styles.modeSwitcher}>
                                    <button
                                        className={`${styles.modeBtn} ${partnerMode === "search" ? styles.modeBtnActive : ""}`}
                                        onClick={() => switchMode("search")}
                                    >🔍 Buscar usuario</button>
                                    <button
                                        className={`${styles.modeBtn} ${partnerMode === "guest" ? styles.modeBtnActive : ""}`}
                                        onClick={() => switchMode("guest")}
                                    >👤 Invitado</button>
                                </div>
                            </div>

                            {partnerMode === "guest" ? (
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
                                <div className={styles.searchWrap}>
                                    <div className={styles.searchInputRow}>
                                        <span className={styles.searchIcon}>🔍</span>
                                        <input
                                            className={styles.searchInput}
                                            placeholder="Buscar por nombre…"
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPartnerName(""); }}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setTimeout(() => setFocused(false), 150)}
                                        />
                                    </div>
                                    {partnerName && (
                                        <div className={styles.playerProfileCard} style={{ marginTop: "0.75rem", borderColor: "rgba(217,249,93,0.4)" }}>
                                            <div className={styles.avatar} style={{ background: "rgba(217,249,93,0.15)", color: "var(--primary)" }}>
                                                {partnerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                            </div>
                                            <div className={styles.playerProfileInfo}>
                                                <div className={styles.playerProfileName}>{partnerName}</div>
                                            </div>
                                            <button className={styles.removePartnerBtn} onClick={() => { setPartnerName(""); setSearch(""); }}>✕ Cambiar</button>
                                        </div>
                                    )}
                                    {focused && !partnerName && (
                                        <div className={styles.searchDropdown}>
                                            {search.trim().length < 2 ? (
                                                <div className={styles.searchHint}>Escribí al menos 2 caracteres</div>
                                            ) : (
                                                <div className={styles.searchHint}>
                                                    <button
                                                        className={styles.searchResult}
                                                        style={{ width: "100%", textAlign: "left" }}
                                                        onMouseDown={() => { setPartnerName(search.trim()); setSearch(""); }}
                                                    >
                                                        Usar «{search.trim()}» como nombre
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.btnRow}>
                            <button className={styles.btnSecondary} onClick={goBack}>← Volver</button>
                            <button className={styles.btnPrimary} disabled={!filledTeam} onClick={goNext}>
                                Continuar →
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: Confirmar ═══ */}
                {step === "confirm" && (
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Confirmá tu inscripción</h2>
                        <p className={styles.cardSub}>Revisá los datos antes de inscribirte.</p>

                        <div className={styles.summaryBox}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Torneo</span>
                                <span className={styles.summaryValue}>{tournament.name}</span>
                            </div>
                            {hasCategories && (
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Categoría</span>
                                    <span className={styles.summaryValue}>{category}</span>
                                </div>
                            )}
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Modalidad</span>
                                <span className={styles.summaryValue}>{isIndividual ? "Individual" : "En Pareja"}</span>
                            </div>
                            <div className={styles.summaryDivider} />
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>{isIndividual ? "Jugador" : "Jugador 1"}</span>
                                <span className={styles.summaryValue}>{currentUser.name}</span>
                            </div>
                            {!isIndividual && (
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Jugador 2</span>
                                    <span className={styles.summaryValue}>
                                        {partnerDisplayName}
                                        {partnerMode === "guest" && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (invitado)</span>}
                                    </span>
                                </div>
                            )}
                        </div>

                        {regError && (
                            <div style={{ marginBottom: "1rem", padding: "0.85rem 1rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.875rem" }}>
                                ⚠️ {regError}
                            </div>
                        )}

                        <label className={styles.checkRow}>
                            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className={styles.checkbox} />
                            <span>Acepto el reglamento del torneo y las condiciones de inscripción</span>
                        </label>

                        <div className={styles.btnRow}>
                            <button className={styles.btnSecondary} onClick={goBack}>← Volver</button>
                            <button className={styles.btnPrimary} disabled={!agreed || isPending} onClick={handleConfirm}>
                                {isPending ? "Confirmando..." : "✓ Confirmar Inscripción"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: Éxito ═══ */}
                {step === "success" && (
                    <div className={styles.card} style={{ textAlign: "center", alignItems: "center" }}>
                        <div className={styles.successIcon}>🎉</div>
                        <h2 className={styles.cardTitle}>¡Inscripción confirmada!</h2>
                        <p className={styles.cardSub} style={{ maxWidth: 400 }}>
                            {isIndividual
                                ? <><strong>{currentUser.name}</strong> quedó inscripto en <strong>{tournament.name}</strong>.</>
                                : <><strong>{currentUser.name} / {partnerDisplayName}</strong> quedaron inscriptos en <strong>{tournament.name}</strong>.</>
                            }
                            {hasCategories && <> · Categoría: <strong>{category}</strong></>}
                        </p>
                        <div className={styles.btnRow} style={{ justifyContent: "center", marginTop: "1.5rem" }}>
                            <Link href="/tournaments"><button className={styles.btnSecondary}>Ver Torneos</button></Link>
                            <Link href="/feed"><button className={styles.btnPrimary}>Ir al Feed →</button></Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
