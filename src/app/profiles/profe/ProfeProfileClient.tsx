"use client";

import { useState } from "react";
import styles from "@/app/profiles/profile.module.css";
import { UserProfile } from "@clerk/nextjs";
import { updateProfeProfile } from "./actions";
import { switchRole } from "@/app/profile/actions";
import Link from "next/link";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const AVAIL = [
    [0, 0, 0, 0, 1, 1, 1], // Mañana
    [1, 0, 1, 0, 0, 1, 1], // Tarde
    [1, 1, 0, 1, 0, 1, 0], // Noche
];
const SLOT_LABELS = ["Mañana", "Tarde", "Noche"];

interface ProfeProfileClientProps {
    profe: any;
    isOwner: boolean;
    embedded?: boolean;
}

export default function ProfeProfileClient({ profe, isOwner, embedded = false }: ProfeProfileClientProps) {
    const [activeTab, setActiveTab] = useState<"info" | "account">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localAvail, setLocalAvail] = useState<number[][]>(profe?.availability || AVAIL);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);

    const [isEditingPricing, setIsEditingPricing] = useState(false);
    const defaultPricing = [
        { tipo: "Clase Particular (1-a-1)", dur: "60 min de entrenamiento intenso", precio: "$12.000", icon: "👤", desc: "Mejora tu técnica específica" },
        { tipo: "Clase en Pareja", dur: "60 min con tu compañero", precio: "$8.000 c/u", icon: "👥", desc: "Táctica y posicionamiento" },
        { tipo: "Clase Grupal", dur: "90 min (3–4 pers.)", precio: "$6.000 c/u", icon: "👨‍👩‍👧", desc: "Dinámica y ritmo de partido" },
    ];
    const [localPricing, setLocalPricing] = useState<{ tipo: string, dur: string, precio: string, icon: string, desc: string }[]>(
        profe?.pricing || defaultPricing
    );

    const [formData, setFormData] = useState({
        name: profe?.name || "",
        bio: profe?.bio || "",
        location: profe?.location || "",
        level: profe?.level || "Profesor Nacional",
        experience: profe?.experience || "5 años",
        phone: profe?.phone || "",
        whatsapp: profe?.whatsapp || "",
        instagram: profe?.instagram || "",
        workingZones: profe?.workingZones?.join(", ") || "",
        specialities: profe?.specialities?.join(", ") || "",
    });

    if (!profe) return <div className={styles.emptyState}>Instructor no encontrado</div>;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfeProfile({
                ...formData,
                workingZones: formData.workingZones.split(",").map((s: string) => s.trim()).filter(Boolean),
                specialities: formData.specialities.split(",").map((s: string) => s.trim()).filter(Boolean),
            });
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            alert("Error al actualizar el perfil");
        }
        setSaving(false);
    };

    const handleSwitchRole = async () => {
        if (!confirm("¿Deseas volver a tu Perfil de Jugador?")) return;
        setSaving(true);
        try {
            await switchRole("jugador");
            window.location.href = "/profile";
        } catch (error) {
            alert("Error al cambiar de rol");
            setSaving(false);
        }
    };

    const handleToggleSlot = (ri: number, di: number) => {
        if (!isOwner || !isEditingSchedule) return;
        const newAvail = localAvail.map((row, rIdx) =>
            row.map((val, dIdx) => (rIdx === ri && dIdx === di ? (val ? 0 : 1) : val))
        );
        setLocalAvail(newAvail);
    };

    const handleSaveSchedule = async () => {
        setSaving(true);
        try {
            await updateProfeProfile({
                name: profe.name,
                bio: profe.bio || "",
                location: profe.location || "",
                level: profe.level || "",
                experience: profe.experience || "",
                phone: profe.phone || "",
                whatsapp: profe.whatsapp || "",
                instagram: profe.instagram || "",
                workingZones: profe.workingZones || [],
                specialities: profe.specialities || [],
                availability: localAvail,
                pricing: localPricing,
            });
            setIsEditingSchedule(false);
        } catch (error) {
            alert("Error al guardar horario");
        }
        setSaving(false);
    };

    const formatPrecio = (raw: string): string => {
        const digits = raw.replace(/\D/g, "");
        if (!digits) return "";
        const formatted = Number(digits).toLocaleString("es-AR");
        return `$${formatted}`;
    };

    const handlePricingChange = (index: number, field: string, value: string) => {
        const newPricing = [...localPricing];
        const finalValue = field === "precio" ? formatPrecio(value) : value;
        newPricing[index] = { ...newPricing[index], [field]: finalValue };
        setLocalPricing(newPricing);
    };

    const handleAddPricing = () => {
        setLocalPricing([...localPricing, { tipo: "Nueva Clase", dur: "60 min", precio: "$0", icon: "🎾", desc: "Descripción" }]);
    };

    const handleRemovePricing = (index: number) => {
        setLocalPricing(localPricing.filter((_, i) => i !== index));
    };

    const handleSavePricing = async () => {
        setSaving(true);
        try {
            await updateProfeProfile({
                name: profe.name,
                bio: profe.bio || "",
                location: profe.location || "",
                level: profe.level || "",
                experience: profe.experience || "",
                phone: profe.phone || "",
                whatsapp: profe.whatsapp || "",
                instagram: profe.instagram || "",
                workingZones: profe.workingZones || [],
                specialities: profe.specialities || [],
                availability: localAvail,
                pricing: localPricing,
            });
            setIsEditingPricing(false);
        } catch (error) {
            alert("Error al guardar precios");
        }
        setSaving(false);
    };

    // ── Shared content sections (used in both embedded and full-page modes) ──

    const pricingSection = (
        <div className={styles.section}>
            <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📚 Clases y Planes</span>
                {isOwner && (
                    <button
                        className={styles.editButton}
                        style={{ margin: 0, padding: '4px 12px', fontSize: '0.9rem' }}
                        onClick={() => setIsEditingPricing(!isEditingPricing)}
                    >
                        {isEditingPricing ? "Cancelar" : "✏️ Editar Planes"}
                    </button>
                )}
            </div>
            <div className={styles.sectionBody}>
                {isEditingPricing ? (
                    <div>
                        <div className={styles.pricingEditTable}>
                            <div className={styles.pricingEditHead}>
                                <div style={{ width: '52px', textAlign: 'center' }}>Ícono</div>
                                <div style={{ flex: 2 }}>Tipo de Clase</div>
                                <div style={{ flex: 2 }}>Detalles / Duración</div>
                                <div style={{ flex: 1 }}>Precio</div>
                                <div style={{ width: '40px' }}></div>
                            </div>
                            {localPricing.map((c, i) => (
                                <div key={i} className={styles.pricingEditRow}>
                                    <input value={c.icon} onChange={e => handlePricingChange(i, 'icon', e.target.value)} className={styles.pricingInput} style={{ width: '52px', textAlign: 'center', fontSize: '1.1rem' }} placeholder="🎾" />
                                    <input value={c.tipo} onChange={e => handlePricingChange(i, 'tipo', e.target.value)} className={styles.pricingInput} style={{ flex: 2 }} placeholder="Ej: Clase Particular" />
                                    <input value={c.dur} onChange={e => handlePricingChange(i, 'dur', e.target.value)} className={styles.pricingInput} style={{ flex: 2 }} placeholder="Ej: 60 min" />
                                    <input value={c.precio} onChange={e => handlePricingChange(i, 'precio', e.target.value)} className={styles.pricingInput} style={{ flex: 1 }} placeholder="$0" />
                                    <button onClick={() => handleRemovePricing(i)} className={styles.pricingDeleteBtn} title="Eliminar fila">✕</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
                            <button onClick={handleAddPricing} className={styles.pricingAddBtn}>+ Agregar fila</button>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => setIsEditingPricing(false)} className={styles.pricingCancelBtn}>Cancelar</button>
                            <button onClick={handleSavePricing} disabled={saving} className={styles.btnAction} style={{ margin: 0 }}>{saving ? "Guardando..." : "✅ Guardar Planes"}</button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.pricingGrid}>
                        {localPricing.map((c: any, i: number) => (
                            <div key={i} className={styles.pricingCard}>
                                <div className={styles.pricingIcon}>{c.icon}</div>
                                <div className={styles.pricingInfo}>
                                    <div className={styles.pricingTitle}>{c.tipo}</div>
                                    <div className={styles.pricingDur}>{c.dur}</div>
                                </div>
                                <div className={styles.pricingPrice}>
                                    <span className={styles.price}>{c.precio}</span>
                                    <span className={styles.priceLabel}>por sesión</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const scheduleSection = (
        <div className={styles.section}>
            <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📅 Mi Horario</span>
                {isOwner && (
                    <button
                        className={styles.editButton}
                        style={{ margin: 0, padding: '4px 12px', fontSize: '0.9rem' }}
                        onClick={() => {
                            if (isEditingSchedule) setLocalAvail(profe?.availability || AVAIL);
                            setIsEditingSchedule(!isEditingSchedule);
                        }}
                    >
                        {isEditingSchedule ? "Cancelar" : "✏️ Editar Horarios"}
                    </button>
                )}
            </div>
            <div className={styles.sectionBody}>
                {isEditingSchedule && (
                    <p className={styles.textMuted} style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                        Haz clic en los círculos para cambiar tu disponibilidad.
                    </p>
                )}
                <div className={styles.availContainer}>
                    <div className={styles.availGrid} style={{ marginBottom: "1rem" }}>
                        <div />
                        {DAYS.map((d) => (<div key={d} className={styles.availDayName}>{d}</div>))}
                    </div>
                    {localAvail.map((row, ri) => (
                        <div key={ri} className={styles.availRow}>
                            <div className={styles.availLabel}>{SLOT_LABELS[ri]}</div>
                            <div className={styles.availGrid} style={{ flex: 1 }}>
                                {row.map((v, di) => (
                                    <div
                                        key={di}
                                        onClick={() => (isOwner && isEditingSchedule) && handleToggleSlot(ri, di)}
                                        className={`${styles.slotCell} ${v ? styles.activeSlot : styles.busySlot} ${isEditingSchedule ? styles.editableSlot : ""}`}
                                        style={{ cursor: (isOwner && isEditingSchedule) ? "pointer" : "default" }}
                                        title={(isOwner && isEditingSchedule) ? "Haz clic para cambiar disponibilidad" : ""}
                                    >
                                        {v ? "●" : ""}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {isEditingSchedule && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                        <button onClick={handleSaveSchedule} disabled={saving} className={styles.btnAction}>
                            {saving ? "Guardando..." : "✅ Guardar Horario"}
                        </button>
                    </div>
                )}
                {profe.whatsapp ? (
                    <Link
                        href={`https://wa.me/${profe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${profe.name}! Vi tu perfil en PadelApp y quisiera reservar una clase 🎾 ¿Tenés disponibilidad?`)}`}
                        target="_blank"
                        className={styles.btnAction}
                        style={{ marginTop: "1.5rem", display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                        📲 Reservar Clase por WhatsApp
                    </Link>
                ) : (
                    <button className={styles.btnAction} style={{ marginTop: "1.5rem" }} disabled>
                        🎾 Reservar Clase
                    </button>
                )}
            </div>
        </div>
    );

    const editModal = isEditing && (
        <div className={styles.modalOverlay}>
            <div className={styles.editModal}>
                <div className={styles.modalHeader}>
                    <h2>Editar Perfil Instructor</h2>
                    <button onClick={() => setIsEditing(false)} className={styles.closeBtn}>✕</button>
                </div>
                <form onSubmit={handleSave} className={styles.editForm}>
                    <div className={styles.formGroup}>
                        <label>Nombre Profesional</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Resumen / Biografía</label>
                        <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Ubicación</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Título / Nivel</label>
                            <input type="text" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Años Exp.</label>
                            <input type="text" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} />
                        </div>
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>WhatsApp (Cod. Area + Num)</label>
                            <input type="text" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Instagram User</label>
                            <input type="text" value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} placeholder="@usuario" />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Zonas de Trabajo</label>
                        <input type="text" value={formData.workingZones} onChange={e => setFormData({ ...formData, workingZones: e.target.value })} placeholder="Ej: Palermo, San Isidro, Tortuguitas" />
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancelar</button>
                        <button type="submit" disabled={saving} className={styles.saveBtn}>
                            {saving ? "Procesando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ── EMBEDDED MODE: skip the page wrapper and hero ──
    if (embedded) {
        return (
            <>
                {isOwner && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                            ✏️ Editar Perfil Instructor
                        </button>
                    </div>
                )}
                <div className={styles.contentGrid}>
                    <div className={styles.mainCol}>
                        <div className={styles.tabWrapper}>
                            <button
                                className={`${styles.tabItem} ${activeTab === "info" ? styles.active : ""}`}
                                onClick={() => setActiveTab("info")}
                            >
                                Información
                            </button>
                        </div>
                        {activeTab === "info" && (
                            <div className={styles.tabContent}>
                                {pricingSection}
                                {profe.workingZones && profe.workingZones.length > 0 && (
                                    <div className={styles.section}>
                                        <div className={styles.sectionHeader}>📍 Cobertura y Zonas</div>
                                        <div className={styles.sectionBody}>
                                            <div className={styles.tags}>
                                                {profe.workingZones.map((zone: string) => (
                                                    <span key={zone} className={styles.tag}>🏡 {zone}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={styles.stickyRight}>
                        {scheduleSection}
                    </div>
                </div>
                {editModal}
            </>
        );
    }

    // ── FULL PAGE MODE ──
    return (
        <div className={styles.page}>
            {/* ── Hero ── */}
            <div className={styles.hero}>
                <div className={styles.heroBanner} />
                <div className={styles.heroBody}>
                    <div className={styles.headerActionsTop}>
                        {isOwner && (
                            <>
                                <button className={styles.roleSwitchButton} onClick={handleSwitchRole} disabled={saving}>
                                    {saving ? "Cambiando..." : "🎾 Ser Jugador"}
                                </button>
                                <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                                    ✏️ Editar
                                </button>
                            </>
                        )}
                    </div>

                    <div className={styles.heroAvatar}>
                        {profe.avatarUrl ? <img src={profe.avatarUrl} alt={profe.name} /> : <span>🎓</span>}
                    </div>

                    <div className={styles.heroInfo}>
                        <div className={styles.heroMain}>
                            <h1 className={styles.heroName}>{profe.name}</h1>
                            {profe.verified && <span className={styles.verifiedBadge} title="Perfil Verificado">✓</span>}
                        </div>
                        <p className={styles.heroBio}>{profe.bio || "Enseñando padel de alto nivel. ¡Consulta por tus clases! 🎾"}</p>

                        <div className={styles.heroMeta}>
                            <div className={styles.heroMetaItem}>📍 {profe.location || "Ubicación"}</div>
                            <div className={styles.heroMetaItem}>🎓 <span className={styles.accent}>{profe.level}</span></div>
                            <div className={styles.heroMetaItem}>⭐ <span className={styles.accent}>{profe.rating || "0.0"}</span></div>
                        </div>
                    </div>

                    <div className={styles.heroActions}>
                        {profe.whatsapp && (
                            <Link
                                href={`https://wa.me/${profe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${profe.name}! Vi tu perfil en PadelApp y me gustaría consultar sobre tus clases 🎾`)}`}
                                target="_blank"
                                className={`${styles.btnSocial} ${styles.btnWhatsApp}`}
                            >
                                📲 WhatsApp
                            </Link>
                        )}
                        {profe.instagram && (
                            <Link href={`https://instagram.com/${profe.instagram.replace('@', '')}`} target="_blank" className={`${styles.btnSocial} ${styles.btnInstagram}`}>
                                📸 Instagram
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.contentGrid}>
                {/* ── Left Column ── */}
                <div className={styles.mainCol}>
                    <div className={styles.tabWrapper}>
                        <button
                            className={`${styles.tabItem} ${activeTab === "info" ? styles.active : ""}`}
                            onClick={() => setActiveTab("info")}
                        >
                            Información
                        </button>
                        {isOwner && (
                            <button
                                className={`${styles.tabItem} ${activeTab === "account" ? styles.active : ""}`}
                                onClick={() => setActiveTab("account")}
                            >
                                Mi Cuenta
                            </button>
                        )}
                    </div>

                    {activeTab === "info" && (
                        <div className={styles.tabContent}>
                            {pricingSection}
                            {profe.workingZones && profe.workingZones.length > 0 && (
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>📍 Cobertura y Zonas</div>
                                    <div className={styles.sectionBody}>
                                        <div className={styles.tags}>
                                            {profe.workingZones.map((zone: string) => (
                                                <span key={zone} className={styles.tag}>
                                                    🏡 {zone}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "account" && isOwner && (
                        <div className={styles.accountSection}>
                            <UserProfile routing="hash" />
                        </div>
                    )}
                </div>

                {/* ── Right Column (Sticky) ── */}
                <div className={styles.stickyRight}>
                    {scheduleSection}
                </div>
            </div>

            {editModal}
        </div>
    );
}
