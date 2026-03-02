"use client";

import { useState, useEffect, Suspense } from "react";
import { User, Users, GraduationCap, Building2 } from "lucide-react";
import { useSession } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { linkRoleToUser } from "./actions";
import styles from "./page.module.css";
// Re-using the auth CSS or we can make a specific one. For now let's reuse auth.module.css if possible, or create page.module.css
import pageStyles from "../login/[[...rest]]/page.module.css";

const ROLES = [
    { id: "jugador", label: "Jugador", icon: <User className={styles.roleIconSvg} /> },
    { id: "club", label: "Club", icon: <Users className={styles.roleIconSvg} /> },
    { id: "profesor", label: "Profesor", icon: <GraduationCap className={styles.roleIconSvg} /> },
    { id: "centro_de_padel", label: "Centro de Padel", icon: <Building2 className={styles.roleIconSvg} /> },
];

function OnboardingForm() {
    const searchParams = useSearchParams();
    const inviteClubId = searchParams.get("invite");
    const [role, setRole] = useState(inviteClubId ? "jugador" : "jugador");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { session } = useSession();
    const router = useRouter();

    // Lock role to jugador if invited
    useEffect(() => {
        if (inviteClubId) {
            setRole("jugador");
        }
    }, [inviteClubId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await linkRoleToUser(role, inviteClubId);
            if (res.success) {
                // Break the redirect loop on the server by setting a temporary bypass cookie
                document.cookie = "has_role=true; path=/; max-age=3600";

                // Force a hard reload of the clerk session token so the middleware catches the new role eventually
                await session?.reload();
                window.location.href = "/feed";
            } else {
                setError(res.error || "Ocurrió un error.");
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error.");
            setLoading(false);
        }
    };

    return (
        <div className={pageStyles.container}>
            <div className={pageStyles.authCard} style={{ maxWidth: '450px' }}>
                <div className={pageStyles.header}>
                    <h1>Completá tu perfil</h1>
                    <p>Contanos cómo vas a usar <span className={pageStyles.brand}>Padel Social</span></p>
                </div>

                <div className={styles.formContainer} style={{ marginTop: '1.5rem' }}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        {error && <div className={styles.error}>{error}</div>}

                        {inviteClubId && (
                            <div style={{ padding: '1rem', background: 'var(--primary-light, rgba(0, 150, 255, 0.1))', color: 'var(--primary)', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                                🎉 Has sido invitado a unirte a un club. Te registrarás como jugador.
                            </div>
                        )}

                        <div className={styles.inputGroup} style={{ marginBottom: "1rem", opacity: inviteClubId ? 0.5 : 1, pointerEvents: inviteClubId ? 'none' : 'auto' }}>
                            <label>¿Qué tipo de usuario sos?</label>
                            <div className={styles.rolesGrid}>
                                {ROLES.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`${styles.roleButton} ${role === r.id ? styles.active : ""}`}
                                        onClick={() => setRole(r.id)}
                                    >
                                        <span className={styles.roleIcon}>{r.icon}</span>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? "Guardando..." : "Continuar"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', marginTop: '20vh' }}>Cargando...</div>}>
            <OnboardingForm />
        </Suspense>
    );
}
