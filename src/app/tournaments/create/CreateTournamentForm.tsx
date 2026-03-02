"use client";

import { useState, Fragment } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "./create.module.css";
import { createTournament, updateTournament } from "./actions";

const ALL_CATEGORIES = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"];

const POINTS_PRESETS = [
    { label: "Estándar (1000/600/360/180)", winner: 1000, finalist: 600, semi: 360, quarter: 180 },
    { label: "Amateur (500/300/160/80)", winner: 500, finalist: 300, semi: 160, quarter: 80 },
    { label: "Custom", winner: 0, finalist: 0, semi: 0, quarter: 0 },
];

const STEPS = ["Información", "Modalidad", "Puntuación", "Revisar"];

type PointsConfig = { winner: number; finalist: number; semi: number; quarter: number };

type InitialData = {
    id: string;
    name: string;
    description: string | null;
    surface: string | null;
    startDate: string | null;
    endDate: string | null;
    categories: string[] | null;
    pointsConfig: PointsConfig | null;
    imageUrl: string | null;
};

function detectPreset(pc: PointsConfig | null): number {
    if (!pc) return 0;
    if (pc.winner === 1000 && pc.finalist === 600) return 0;
    if (pc.winner === 500 && pc.finalist === 300) return 1;
    return 2;
}

export default function CreateTournamentForm({ initialData }: { initialData?: InitialData | null }) {
    const isEditing = !!initialData;
    const cats = initialData?.categories ?? [];
    const isCatMode = cats.length === 0 || cats[0] !== "libre";
    const pc = initialData?.pointsConfig ?? null;
    const detectedPreset = detectPreset(pc);

    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(initialData?.imageUrl ?? null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
    const [imageUploading, setImageUploading] = useState(false);

    // Step 1 – Información general
    const [info, setInfo] = useState({
        name: initialData?.name ?? "",
        club: "",
        startDate: initialData?.startDate ?? "",
        endDate: initialData?.endDate ?? "",
        description: initialData?.description ?? "",
        surface: initialData?.surface ?? "cemento",
    });

    // Step 2 – Modalidad
    const [modalidad, setModalidad] = useState({
        mode: isCatMode ? ("categorias" as const) : ("libre" as const),
        selectedCats: isCatMode ? cats : ([] as string[]),
        participacion: "pareja" as "pareja" | "individual",
        genero: "mixto" as "hombre" | "mujer" | "mixto",
        tipoTorneo: "",
    });

    // Step 3 – Puntuación
    const [preset, setPreset] = useState(detectedPreset);
    const [customPoints, setCustomPoints] = useState({
        winner: String(pc?.winner ?? 1000),
        finalist: String(pc?.finalist ?? 600),
        semi: String(pc?.semi ?? 360),
        quarter: String(pc?.quarter ?? 180),
    });

    // ---- Image upload ----
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        setImagePreview(URL.createObjectURL(file));
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setImageUrl(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al subir la imagen");
            setImagePreview(null);
        } finally {
            setImageUploading(false);
        }
    };

    // ---- Helpers ----
    const toggleCat = (cat: string) => {
        setModalidad((prev) => ({
            ...prev,
            selectedCats: prev.selectedCats.includes(cat)
                ? prev.selectedCats.filter((c) => c !== cat)
                : [...prev.selectedCats, cat],
        }));
    };

    const currentPoints = POINTS_PRESETS[preset];
    const resolvedPoints = preset < 2 ? currentPoints : {
        label: "Custom",
        winner: parseInt(customPoints.winner) || 0,
        finalist: parseInt(customPoints.finalist) || 0,
        semi: parseInt(customPoints.semi) || 0,
        quarter: parseInt(customPoints.quarter) || 0,
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const payload = {
                name: info.name,
                club: info.club,
                startDate: info.startDate,
                endDate: info.endDate,
                description: info.description,
                surface: info.surface,
                categories: modalidad.mode === "categorias" ? modalidad.selectedCats : ["libre"],
                pointsConfig: {
                    winner: resolvedPoints.winner,
                    finalist: resolvedPoints.finalist,
                    semi: resolvedPoints.semi,
                    quarter: resolvedPoints.quarter,
                },
                imageUrl,
                modalidad: {
                    mode: modalidad.mode,
                    participacion: modalidad.participacion,
                    genero: modalidad.genero,
                    tipoTorneo: modalidad.tipoTorneo,
                },
            };

            if (isEditing && initialData?.id) {
                await updateTournament(initialData.id, payload);
            } else {
                await createTournament(payload);
            }
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Hubo un error al guardar el torneo");
        } finally {
            setIsLoading(false);
        }
    };

    // ---- Success screen ----
    if (submitted) {
        return (
            <FeedLayout>
                <div className={styles.container}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>{isEditing ? "✅" : "🎉"}</div>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                            {isEditing ? "¡Torneo Actualizado!" : "¡Torneo Creado!"}
                        </h2>
                        <p style={{ color: "var(--text-muted)", maxWidth: 400 }}>
                            <strong style={{ color: "var(--primary)" }}>{info.name}</strong>{" "}
                            {isEditing ? "fue actualizado exitosamente." : "fue creado exitosamente. Ahora podés abrir las inscripciones y compartirlo con la comunidad."}
                        </p>
                        <a href="/profiles/club" style={{ display: "inline-block", marginTop: "1.5rem", background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.875rem 2rem", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                            Volver al Perfil
                        </a>
                    </div>
                </div>
            </FeedLayout>
        );
    }

    // ---- Chip button helper ----
    const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "2rem",
                border: `1.5px solid ${active ? "var(--primary)" : "var(--surface-border)"}`,
                background: active ? "rgba(217,249,93,0.1)" : "var(--surface)",
                color: active ? "var(--primary)" : "var(--foreground)",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                fontSize: "0.875rem",
                transition: "all 0.15s",
            }}
        >
            {children}
        </button>
    );

    return (
        <FeedLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{isEditing ? "Editar Torneo" : "Crear Torneo"}</h1>
                    <p className={styles.subtitle}>
                        {isEditing ? "Modificá los datos del torneo y guardá los cambios." : "Completá los datos para publicar tu torneo en la plataforma"}
                    </p>
                </div>

                {/* Steps indicator */}
                <div className={styles.stepsBar}>
                    {STEPS.map((s, i) => (
                        <Fragment key={s}>
                            <div className={styles.step}>
                                <div className={`${styles.stepCircle} ${i === step ? styles.active : ""} ${i < step ? styles.done : ""}`}>
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span className={`${styles.stepLabel} ${i === step ? styles.active : ""}`}>{s}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`${styles.stepLine} ${i < step ? styles.done : ""}`} />
                            )}
                        </Fragment>
                    ))}
                </div>

                {/* ─── STEP 0: Información ─── */}
                {step === 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Información General</h2>

                        {/* Image upload */}
                        <div className={styles.field}>
                            <label>Imagen del Torneo</label>
                            <div
                                style={{
                                    border: "2px dashed var(--surface-border)",
                                    borderRadius: "0.75rem",
                                    padding: "1.5rem",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    position: "relative",
                                    overflow: "hidden",
                                    minHeight: "160px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "var(--surface)",
                                }}
                                onClick={() => document.getElementById("tournament-image-input")?.click()}
                            >
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "0.5rem", objectFit: "cover" }}
                                    />
                                ) : (
                                    <div style={{ color: "var(--text-muted)" }}>
                                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📸</div>
                                        <div style={{ fontWeight: 600 }}>{imageUploading ? "Subiendo..." : "Hacer clic para subir imagen"}</div>
                                        <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>JPG, PNG, WebP · Máx. 5MB</div>
                                    </div>
                                )}
                                {imagePreview && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageUrl(null); }}
                                        style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "1rem" }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <input
                                id="tournament-image-input"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>Nombre del Torneo *</label>
                                <input className={styles.input} placeholder="ej. Copa Primavera" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label>Club / Sede</label>
                                <input className={styles.input} placeholder="ej. Club Padelazo" value={info.club} onChange={(e) => setInfo({ ...info, club: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>Fecha de Inicio</label>
                                <input className={styles.input} type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label>Fecha de Fin</label>
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

                {/* ─── STEP 1: Modalidad ─── */}
                {step === 1 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Modalidad del Torneo</h2>

                        <div className={styles.field}>
                            <label>¿Cómo se organiza el torneo?</label>
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <Chip active={modalidad.mode === "categorias"} onClick={() => setModalidad({ ...modalidad, mode: "categorias" })}>
                                    🏅 Por Categoría
                                </Chip>
                                <Chip active={modalidad.mode === "libre"} onClick={() => setModalidad({ ...modalidad, mode: "libre" })}>
                                    🎯 Libre (sin categoría)
                                </Chip>
                            </div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                                {modalidad.mode === "categorias"
                                    ? "Los jugadores se inscriben en la categoría que corresponde a su nivel."
                                    : "Torneo abierto sin restricción por categoría. Puede tener cupo máximo o ser libre."}
                            </p>
                        </div>

                        {modalidad.mode === "categorias" && (
                            <div className={styles.field}>
                                <label>Seleccioná las categorías incluidas</label>
                                <div className={styles.categoriesGrid} style={{ marginTop: "0.5rem" }}>
                                    {ALL_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            className={`${styles.categoryChip} ${modalidad.selectedCats.includes(cat) ? styles.selected : ""}`}
                                            onClick={() => toggleCat(cat)}
                                        >
                                            {cat} Cat.
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.field}>
                            <label>Tipo de participación</label>
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <Chip active={modalidad.participacion === "pareja"} onClick={() => setModalidad({ ...modalidad, participacion: "pareja" })}>
                                    👥 En Pareja
                                </Chip>
                                <Chip active={modalidad.participacion === "individual"} onClick={() => setModalidad({ ...modalidad, participacion: "individual" })}>
                                    🧍 Individual
                                </Chip>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label>Género</label>
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <Chip active={modalidad.genero === "mixto"} onClick={() => setModalidad({ ...modalidad, genero: "mixto" })}>⚤ Mixto</Chip>
                                <Chip active={modalidad.genero === "hombre"} onClick={() => setModalidad({ ...modalidad, genero: "hombre" })}>♂ Solo Hombres</Chip>
                                <Chip active={modalidad.genero === "mujer"} onClick={() => setModalidad({ ...modalidad, genero: "mujer" })}>♀ Solo Mujeres</Chip>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label>Tipo de Torneo</label>
                            <input
                                className={styles.input}
                                placeholder="ej. Americano, King of the Court, Eliminatorio, Copa..."
                                value={modalidad.tipoTorneo}
                                onChange={(e) => setModalidad({ ...modalidad, tipoTorneo: e.target.value })}
                            />
                            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                                Escribí el formato del torneo tal como lo llamás en tu club.
                            </p>
                        </div>
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

                {/* ─── STEP 3: Revisar ─── */}
                {step === 3 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Revisar y {isEditing ? "Guardar" : "Publicar"}</h2>
                        <div className={styles.reviewCard}>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Nombre</span>
                                <span className={styles.reviewValue}>{info.name || "—"}</span>
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
                                <span className={styles.reviewLabel}>Modalidad</span>
                                <span className={styles.reviewValue}>
                                    {modalidad.mode === "libre" ? "Libre" : `Por Categoría: ${modalidad.selectedCats.join(", ") || "—"}`}
                                </span>
                            </div>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Participación</span>
                                <span className={styles.reviewValue}>
                                    {modalidad.participacion === "pareja" ? "En Pareja" : "Individual"} · {modalidad.genero === "mixto" ? "Mixto" : modalidad.genero === "hombre" ? "Solo Hombres" : "Solo Mujeres"}
                                </span>
                            </div>
                            {modalidad.tipoTorneo && (
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>Tipo</span>
                                    <span className={styles.reviewValue}>{modalidad.tipoTorneo}</span>
                                </div>
                            )}
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
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        {isEditing && (
                            <a
                                href="/profiles/club"
                                style={{ padding: "0.75rem 1.25rem", borderRadius: "0.5rem", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", background: "var(--surface)" }}
                            >
                                ✕ Cancelar
                            </a>
                        )}
                        {step < STEPS.length - 1 ? (
                            <button className={styles.nextBtn} onClick={() => setStep((s) => s + 1)}>
                                Siguiente →
                            </button>
                        ) : (
                            <>
                                {error && (
                                    <p style={{ color: "var(--error, #ef4444)", fontSize: "0.875rem", textAlign: "center", flex: "1 1 100%" }}>
                                        ⚠️ {error}
                                    </p>
                                )}
                                <button className={styles.nextBtn} onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? "Guardando..." : isEditing ? "💾 Guardar Cambios" : "🏆 Publicar Torneo"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </FeedLayout>
    );
}
