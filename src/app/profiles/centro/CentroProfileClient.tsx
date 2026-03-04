"use client";

import { useState, useRef } from "react";
import styles from "@/app/profiles/profile.module.css";
import centroStyles from "./centro.module.css";
import { updateCentroProfile } from "./actions";
import Link from "next/link";

const DAYS_OF_WEEK = [
    { key: "lun", label: "Lunes" },
    { key: "mar", label: "Martes" },
    { key: "mie", label: "Miércoles" },
    { key: "jue", label: "Jueves" },
    { key: "vie", label: "Viernes" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" },
];

const DEFAULT_SCHEDULE = Object.fromEntries(
    DAYS_OF_WEEK.map(({ key }) => [key, { open: "08:00", close: "22:00", closed: false }])
);

interface CentroProfileClientProps {
    centro: any;
    isOwner: boolean;
    embedded?: boolean;
}

export default function CentroProfileClient({ centro, isOwner, embedded = false }: CentroProfileClientProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<string[]>(centro?.photos || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: centro?.name || "",
        bio: centro?.bio || "",
        location: centro?.location || "",
        address: centro?.address || "",
        phone: centro?.phone || "",
        whatsapp: centro?.whatsapp || "",
        instagram: centro?.instagram || "",
        website: centro?.website || "",
        courts: centro?.courts || 0,
        amenities: centro?.amenities?.join(", ") || "",
        schedule: centro?.schedule || DEFAULT_SCHEDULE,
    });

    const [scheduleData, setScheduleData] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
        centro?.schedule || DEFAULT_SCHEDULE
    );

    // ── Photo upload with client-side compression (max 5) ──
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const MAX = 900;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                    else { width = Math.round((width * MAX) / height); height = MAX; }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.72));
            };
            img.src = url;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 5 - photos.length;
        if (remaining <= 0) return;

        const toProcess = files.slice(0, remaining);
        const compressed = await Promise.all(toProcess.map(compressImage));
        setPhotos(prev => [...prev, ...compressed].slice(0, 5));
        e.target.value = "";
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCentroProfile({
                name: formData.name,
                bio: formData.bio,
                location: formData.location,
                address: formData.address,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                instagram: formData.instagram,
                website: formData.website,
                courts: Number(formData.courts),
                amenities: formData.amenities.split(",").map((s: string) => s.trim()).filter(Boolean),
                schedule: scheduleData,
                photos,
            });
            setIsEditing(false);
            window.location.reload();
        } catch (err) {
            alert("Error al guardar el perfil");
        }
        setSaving(false);
    };

    const editModal = isEditing && (
        <div className={styles.modalOverlay}>
            <div className={`${styles.editModal} ${centroStyles.wideModal}`}>
                <div className={styles.modalHeader}>
                    <h2>✏️ Editar Centro de Pádel</h2>
                    <button onClick={() => setIsEditing(false)} className={styles.closeBtn}>✕</button>
                </div>

                <div className={styles.editForm} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                    {/* Basic Info */}
                    <div className={centroStyles.editSection}>
                        <div className={centroStyles.editSectionTitle}>📋 Información General</div>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Nombre del Centro</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Cantidad de Canchas</label>
                                <input type="number" min="1" max="50" value={formData.courts} onChange={e => setFormData({ ...formData, courts: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Descripción / Bio</label>
                            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} placeholder="Contá sobre tu centro..." />
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Zona / Barrio</label>
                                <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Ej: Palermo" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Dirección exacta</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej: Av. Corrientes 1234" />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Amenidades (separadas por coma)</label>
                            <input type="text" value={formData.amenities} onChange={e => setFormData({ ...formData, amenities: e.target.value })} placeholder="Ej: Vestuarios, Estacionamiento, Cafetería" />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className={centroStyles.editSection}>
                        <div className={centroStyles.editSectionTitle}>📞 Contacto</div>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>WhatsApp</label>
                                <input type="text" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="Ej: 1112345678" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Instagram</label>
                                <input type="text" value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} placeholder="@centro" />
                            </div>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Teléfono</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Sitio Web</label>
                                <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className={centroStyles.editSection}>
                        <div className={centroStyles.editSectionTitle}>🕐 Horarios</div>
                        <div className={centroStyles.scheduleGrid}>
                            {DAYS_OF_WEEK.map(({ key, label }) => {
                                const day = scheduleData[key] || { open: "08:00", close: "22:00", closed: false };
                                return (
                                    <div key={key} className={centroStyles.scheduleRow}>
                                        <span className={centroStyles.dayLabel}>{label}</span>
                                        <label className={centroStyles.closedToggle}>
                                            <input
                                                type="checkbox"
                                                checked={day.closed}
                                                onChange={e => setScheduleData(prev => ({
                                                    ...prev,
                                                    [key]: { ...day, closed: e.target.checked }
                                                }))}
                                            />
                                            <span>Cerrado</span>
                                        </label>
                                        {!day.closed && (
                                            <>
                                                <input
                                                    type="time"
                                                    value={day.open}
                                                    className={centroStyles.timeInput}
                                                    onChange={e => setScheduleData(prev => ({
                                                        ...prev,
                                                        [key]: { ...day, open: e.target.value }
                                                    }))}
                                                />
                                                <span className={centroStyles.timeSeparator}>→</span>
                                                <input
                                                    type="time"
                                                    value={day.close}
                                                    className={centroStyles.timeInput}
                                                    onChange={e => setScheduleData(prev => ({
                                                        ...prev,
                                                        [key]: { ...day, close: e.target.value }
                                                    }))}
                                                />
                                            </>
                                        )}
                                        {day.closed && <span className={centroStyles.closedBadge}>Cerrado</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photos */}
                    <div className={centroStyles.editSection}>
                        <div className={centroStyles.editSectionTitle}>📸 Fotos del Centro <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({photos.length}/5)</span></div>
                        <div className={centroStyles.photoGrid}>
                            {photos.map((src, i) => (
                                <div key={i} className={centroStyles.photoThumb}>
                                    <img src={src} alt={`foto-${i + 1}`} />
                                    <button className={centroStyles.removePhotoBtn} onClick={() => handleRemovePhoto(i)}>✕</button>
                                </div>
                            ))}
                            {photos.length < 5 && (
                                <button className={centroStyles.addPhotoBtn} onClick={() => fileInputRef.current?.click()}>
                                    <span>+</span>
                                    <small>Agregar foto</small>
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handlePhotoUpload}
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancelar</button>
                        <button onClick={handleSave} disabled={saving} className={styles.saveBtn}>
                            {saving ? "Guardando..." : "✅ Guardar Cambios"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Shared display sections ──
    const schedule = centro?.schedule as Record<string, { open: string; close: string; closed: boolean }> | null;

    const publicContent = (
        <>
            {/* Photo Gallery — Mosaic */}
            {photos.length > 0 && (() => {
                const count = Math.min(photos.length, 5);
                const mosaicClass = centroStyles[`mosaic${count}` as keyof typeof centroStyles];
                return (
                    <div className={centroStyles.photoGallery}>
                        <div className={`${mosaicClass}`}>
                            {photos.slice(0, count).map((src, i) => (
                                <div key={i} className={centroStyles.mosaicCell}>
                                    <img src={src} alt={`foto-${i + 1}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            <div className={styles.contentGrid}>
                {/* Left: Info */}
                <div className={styles.mainCol}>
                    {/* About */}
                    {centro?.bio && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🏟️ Sobre el Centro</div>
                            <div className={styles.sectionBody}>
                                <p style={{ lineHeight: 1.7, opacity: 0.85 }}>{centro.bio}</p>
                            </div>
                        </div>
                    )}

                    {/* Courts & Amenities */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>🏓 Instalaciones</div>
                        <div className={styles.sectionBody}>
                            <div className={centroStyles.statsBand}>
                                <div className={centroStyles.statItem}>
                                    <div className={centroStyles.statNum}>{centro?.courts || 0}</div>
                                    <div className={centroStyles.statLbl}>Canchas</div>
                                </div>
                                {centro?.location && (
                                    <div className={centroStyles.statItem}>
                                        <div className={centroStyles.statNum}>📍</div>
                                        <div className={centroStyles.statLbl}>{centro.location}</div>
                                    </div>
                                )}
                            </div>
                            {centro?.amenities && centro.amenities.length > 0 && (
                                <div className={styles.tags} style={{ marginTop: '1rem' }}>
                                    {centro.amenities.map((a: string) => (
                                        <span key={a} className={styles.tag}>✓ {a}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    {centro?.address && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>📍 Dirección</div>
                            <div className={styles.sectionBody}>
                                <p style={{ opacity: 0.85 }}>{centro.address}</p>
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(centro.address)}`}
                                    target="_blank"
                                    className={centroStyles.mapsLink}
                                >
                                    🗺️ Ver en Google Maps
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Schedule + Contact */}
                <div className={styles.stickyRight}>
                    {/* Schedule */}
                    {schedule && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🕐 Horarios</div>
                            <div className={styles.sectionBody}>
                                <div className={centroStyles.scheduleDisplay}>
                                    {DAYS_OF_WEEK.map(({ key, label }) => {
                                        const day = schedule[key];
                                        if (!day) return null;
                                        return (
                                            <div key={key} className={`${centroStyles.scheduleDisplayRow} ${day.closed ? centroStyles.closedRow : ''}`}>
                                                <span className={centroStyles.dayName}>{label}</span>
                                                <span className={centroStyles.dayHours}>
                                                    {day.closed ? "Cerrado" : `${day.open} – ${day.close}`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contact */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>📞 Contacto y Reservas</div>
                        <div className={styles.sectionBody} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {centro?.whatsapp && (
                                <Link
                                    href={`https://wa.me/${centro.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Vi el perfil de ${centro.name} en PadelApp y quisiera consultar disponibilidad 🎾`)}`}
                                    target="_blank"
                                    className={`${styles.btnSocial} ${styles.btnWhatsApp}`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                                >
                                    📲 Reservar por WhatsApp
                                </Link>
                            )}
                            {centro?.instagram && (
                                <Link
                                    href={`https://instagram.com/${centro.instagram.replace('@', '')}`}
                                    target="_blank"
                                    className={`${styles.btnSocial} ${styles.btnInstagram}`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                                >
                                    📸 Instagram
                                </Link>
                            )}
                            {centro?.phone && (
                                <a href={`tel:${centro.phone}`} className={centroStyles.phoneLink}>
                                    📞 {centro.phone}
                                </a>
                            )}
                            {centro?.website && (
                                <a href={centro.website} target="_blank" className={centroStyles.phoneLink}>
                                    🌐 Sitio Web
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    // ── EMBEDDED MODE ──
    if (embedded) {
        return (
            <>
                {isOwner && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                            ✏️ Editar Centro de Pádel
                        </button>
                        {centro?.id && (
                            <Link href={`/profiles/centro/${centro.id}`} target="_blank" className={styles.editButton} style={{ textDecoration: 'none' }}>
                                👁️ Ver perfil público
                            </Link>
                        )}
                    </div>
                )}

                {!centro ? (
                    <div className={styles.section}>
                        <div className={styles.sectionBody} style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ opacity: 0.6, marginBottom: '1rem' }}>Todavía no configuraste tu centro de pádel.</p>
                            {isOwner && (
                                <button className={styles.btnAction} onClick={() => setIsEditing(true)}>
                                    🏟️ Configurar Mi Centro
                                </button>
                            )}
                        </div>
                    </div>
                ) : publicContent}

                {editModal}
            </>
        );
    }

    // ── FULL PAGE (Public Profile) ──
    return (
        <div className={styles.page}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroBanner} />
                <div className={styles.heroBody}>
                    <div className={styles.heroAvatar}>
                        {centro?.logoUrl ? <img src={centro.logoUrl} alt={centro.name} /> : <span>🏟️</span>}
                    </div>
                    <div className={styles.heroInfo}>
                        <div className={styles.heroMain}>
                            <h1 className={styles.heroName}>{centro?.name || "Centro de Pádel"}</h1>
                            {centro?.verified && <span className={styles.verifiedBadge} title="Verificado">✓</span>}
                        </div>
                        <p className={styles.heroBio}>{centro?.bio || "Centro de pádel profesional 🎾"}</p>
                        <div className={styles.heroMeta}>
                            {centro?.location && <div className={styles.heroMetaItem}>📍 {centro.location}</div>}
                            {centro?.courts && <div className={styles.heroMetaItem}>🏓 <span className={styles.accent}>{centro.courts} canchas</span></div>}
                            {centro?.rating && <div className={styles.heroMetaItem}>⭐ <span className={styles.accent}>{centro.rating}</span></div>}
                        </div>
                    </div>
                    <div className={styles.heroActions}>
                        {centro?.whatsapp && (
                            <Link
                                href={`https://wa.me/${centro.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Vi el perfil de ${centro.name} en PadelApp 🎾`)}`}
                                target="_blank"
                                className={`${styles.btnSocial} ${styles.btnWhatsApp}`}
                            >
                                📲 WhatsApp
                            </Link>
                        )}
                        {centro?.instagram && (
                            <Link href={`https://instagram.com/${centro.instagram.replace('@', '')}`} target="_blank" className={`${styles.btnSocial} ${styles.btnInstagram}`}>
                                📸 Instagram
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {publicContent}
        </div>
    );
}
