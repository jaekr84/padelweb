"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "./create.module.css";

const ALL_CATEGORIES = [
    "1ra", "2da", "3ra", "4ta",
    "5ta", "6ta", "7ma", "8va", "9na",
];

const POINTS_PRESETS = [
    { label: "Estándar (1000/600/360/180)", winner: 1000, finalist: 600, semi: 360, quarter: 180 },
    { label: "Amateur (500/300/160/80)", winner: 500, finalist: 300, semi: 160, quarter: 80 },
    { label: "Custom", winner: 0, finalist: 0, semi: 0, quarter: 0 },
];

const STEPS = ["Información", "Categorías", "Puntuación", "Revisar"];

type CatConfig = {
    name: string;
    maxTeams: string;
    format: string;
};

export default function CreateTournamentPage() {
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    // Step 1 – Información general
    const [info, setInfo] = useState({
        name: "",
        club: "",
        startDate: "",
        endDate: "",
        description: "",
        surface: "cemento",
    });

    // Step 2 – Categorías
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [catConfigs, setCatConfigs] = useState<Record<string, CatConfig>>({});

    // Step 3 – Puntuación
    const [preset, setPreset] = useState(0);
    const [customPoints, setCustomPoints] = useState({ winner: "1000", finalist: "600", semi: "360", quarter: "180" });

    // ---- Helpers ----
    const toggleCat = (cat: string) => {
        setSelectedCats((prev) => {
            if (prev.includes(cat)) {
                const next = prev.filter((c) => c !== cat);
                const configs = { ...catConfigs };
                delete configs[cat];
                setCatConfigs(configs);
                return next;
            }
            setCatConfigs((prev2) => ({ ...prev2, [cat]: { name: cat, maxTeams: "16", format: "eliminatoria" } }));
            return [...prev, cat];
        });
    };

    const updateCatConfig = (cat: string, field: keyof CatConfig, value: string) => {
        setCatConfigs((prev) => ({ ...prev, [cat]: { ...prev[cat], [field]: value } }));
    };

    const currentPoints = POINTS_PRESETS[preset];
    const resolvedPoints = preset < 2 ? currentPoints : {
        label: "Custom",
        winner: parseInt(customPoints.winner) || 0,
        finalist: parseInt(customPoints.finalist) || 0,
        semi: parseInt(customPoints.semi) || 0,
        quarter: parseInt(customPoints.quarter) || 0,
    };

    const handleSubmit = () => setSubmitted(true);

    // ---- Success screen ----
    if (submitted) {
        return (
            <FeedLayout>
                <div className={styles.container}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>🎉</div>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>¡Torneo Creado!</h2>
                        <p style={{ color: "var(--text-muted)", maxWidth: 400 }}>
                            <strong style={{ color: "var(--primary)" }}>{info.name}</strong> fue creado exitosamente.
                            Ahora podés abrir las inscripciones y compartirlo con la comunidad.
                        </p>
                        <a href="/tournaments" style={{ display: "inline-block", marginTop: "1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.875rem 2rem", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                            Ver mis Torneos
                        </a>
                    </div>
                </div>
            </FeedLayout>
        );
    }

    return (
        <FeedLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Crear Torneo</h1>
                    <p className={styles.subtitle}>Completá los datos para publicar tu torneo en la plataforma</p>
                </div>

                {/* Steps indicator */}
                <div className={styles.stepsBar}>
                    {STEPS.map((s, i) => (
                        <>
                            <div className={styles.step} key={s}>
                                <div className={`${styles.stepCircle} ${i === step ? styles.active : ""} ${i < step ? styles.done : ""}`}>
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span className={`${styles.stepLabel} ${i === step ? styles.active : ""}`}>{s}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`${styles.stepLine} ${i < step ? styles.done : ""}`} key={`line-${i}`} />
                            )}
                        </>
                    ))}
                </div>

                {/* ─── STEP 0: Información ─── */}
                {step === 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Información General</h2>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>Nombre del Torneo *</label>
                                <input className={styles.input} placeholder="ej. Copa Primavera" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label>Club / Sede *</label>
                                <input className={styles.input} placeholder="ej. Club Padelazo" value={info.club} onChange={(e) => setInfo({ ...info, club: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>Fecha de Inicio *</label>
                                <input className={styles.input} type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label>Fecha de Fin *</label>
                                <input className={styles.input} type="date" value={info.endDate} onChange={(e) => setInfo({ ...info, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label>Superficie</label>
                            <select className={styles.select} value={info.surface} onChange={(e) => setInfo({ ...info, surface: e.target.value })}>
                                <option value="cesped">Césped Sintético (Verde)</option>
                                <option value="cesped_azul">Césped Sintético (Azul)</option>
                                <option value="cemento">Hormigón / Cemento</option>
                                <option value="indoor">Indoor</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Descripción / Premios</label>
                            <textarea className={styles.textarea} placeholder="Describí el torneo, los premios, condiciones, etc." value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} />
                        </div>
                    </div>
                )}

                {/* ─── STEP 1: Categorías ─── */}
                {step === 1 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Categorías del Torneo</h2>
                        <div className={styles.field}>
                            <label>Seleccioná las categorías que vas a incluir</label>
                            <div className={styles.categoriesGrid}>
                                {ALL_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`${styles.categoryChip} ${selectedCats.includes(cat) ? styles.selected : ""}`}
                                        onClick={() => toggleCat(cat)}
                                    >
                                        {cat} Categoría
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedCats.length > 0 && (
                            <div className={styles.field}>
                                <label>Configuración por Categoría</label>
                                <div className={styles.selectedCategories}>
                                    {selectedCats.map((cat) => (
                                        <div key={cat} className={styles.catConfig}>
                                            <div className={styles.catConfigLabel}>{cat}</div>
                                            <select
                                                className={styles.select}
                                                value={catConfigs[cat]?.maxTeams || "16"}
                                                onChange={(e) => updateCatConfig(cat, "maxTeams", e.target.value)}
                                            >
                                                <option value="8">8 parejas</option>
                                                <option value="16">16 parejas</option>
                                                <option value="32">32 parejas</option>
                                            </select>
                                            <select
                                                className={styles.select}
                                                value={catConfigs[cat]?.format || "eliminatoria"}
                                                onChange={(e) => updateCatConfig(cat, "format", e.target.value)}
                                            >
                                                <option value="eliminatoria">Eliminatoria Directa</option>
                                                <option value="grupos">Fase de Grupos + Eliminatoria</option>
                                                <option value="americano">Americano (Round Robin)</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 2: Puntuación ─── */}
                {step === 2 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Sistema de Puntos de Ranking</h2>
                        <div className={styles.field}>
                            <label>Preset de Puntos</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {POINTS_PRESETS.map((p, i) => (
                                    <label key={p.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "1rem", borderRadius: "0.75rem", border: `1px solid ${preset === i ? "var(--primary)" : "var(--surface-border)"}`, background: preset === i ? "rgba(217,249,93,0.05)" : "var(--surface)" }}>
                                        <input type="radio" name="preset" checked={preset === i} onChange={() => setPreset(i)} style={{ accentColor: "var(--primary)" }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.label}</div>
                                            {i < 2 && <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Campeón: {p.winner}pts · Finalista: {p.finalist}pts · Semi: {p.semi}pts</div>}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {preset === 2 && (
                            <div className={styles.row}>
                                {["winner", "finalist", "semi", "quarter"].map((field) => (
                                    <div className={styles.field} key={field}>
                                        <label>Pts. {field === "winner" ? "Campeón" : field === "finalist" ? "Finalista" : field === "semi" ? "Semifinalista" : "Cuartos"}</label>
                                        <input className={styles.input} type="number" value={customPoints[field as keyof typeof customPoints]} onChange={(e) => setCustomPoints({ ...customPoints, [field]: e.target.value })} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 3: Review ─── */}
                {step === 3 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Revisar y Publicar</h2>
                        <div className={styles.reviewCard}>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Nombre</span>
                                <span className={styles.reviewValue}>{info.name || "—"}</span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Club / Sede</span>
                                <span className={styles.reviewValue}>{info.club || "—"}</span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Fechas</span>
                                <span className={styles.reviewValue}>{info.startDate || "—"} → {info.endDate || "—"}</span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Superficie</span>
                                <span className={styles.reviewValue} style={{ textTransform: "capitalize" }}>{info.surface}</span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Categorías</span>
                                <span className={styles.reviewValue}>{selectedCats.length > 0 ? selectedCats.join(", ") : "—"}</span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Puntos Campeón</span>
                                <span className={styles.reviewValue} style={{ color: "var(--primary)" }}>{resolvedPoints.winner} pts</span>
                            </div>
                            {info.description && (
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>Descripción</span>
                                    <span className={styles.reviewValue}>{info.description}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    {step > 0 ? (
                        <button className={styles.backBtn} onClick={() => setStep((s) => s - 1)}>← Atrás</button>
                    ) : (
                        <span />
                    )}
                    {step < STEPS.length - 1 ? (
                        <button className={styles.nextBtn} onClick={() => setStep((s) => s + 1)}>
                            Siguiente →
                        </button>
                    ) : (
                        <button className={styles.nextBtn} onClick={handleSubmit}>
                            🏆 Publicar Torneo
                        </button>
                    )}
                </div>
            </div>
        </FeedLayout>
    );
}
