"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import Link from "next/link";

const ROLES = [
    { id: "jugador", label: "Jugador", icon: "🎾" },
    { id: "club", label: "Club", icon: "🏟️" },
    { id: "profesor", label: "Profesor", icon: "🎓" },
    { id: "organizador", label: "Organizador", icon: "🏆" },
];

export default function RegisterForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("jugador");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: role,
                },
            },
        });

        if (error) {
            setError(error.message);
        } else {
            router.push("/");
        }
        setLoading(false);
    };

    const handleGoogleRegister = async () => {
        setError(null);
        // Para Google guardamos el rol seleccionado también
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    prompt: 'consent',
                    // Supabase metadata custom data passthrough can be tricky on OAuth directly,
                    // in production we usually handle this on a "complete profile" post-login screen 
                    // but for now we set the intent.
                }
            }
        });

        if (error) {
            setError("Error al conectar con Google.");
        }
    };

    return (
        <div className={styles.formContainer}>
            <div className={styles.inputGroup} style={{ marginBottom: "1.5rem" }}>
                <label>1. ¿Qué tipo de usuario sos?</label>
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

            <button
                type="button"
                className={styles.googleButton}
                onClick={handleGoogleRegister}
            >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Registrarse con Google
            </button>

            <div className={styles.divider}>
                <span>o registrate con correo y contraseña</span>
            </div>

            <form className={styles.form} onSubmit={handleRegister}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label htmlFor="email">Correo Electrónico</label>
                    <input
                        id="email"
                        type="email"
                        className={styles.input}
                        placeholder="nombre@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password">Contraseña</label>
                    <input
                        id="password"
                        type="password"
                        className={styles.input}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                    {loading ? "Creando cuenta..." : "Registrarse con Correo"}
                </button>

                <div className={styles.footer}>
                    ¿Ya tenés una cuenta? <Link href="/login" className={styles.link}>Iniciá sesión acá</Link>
                </div>
            </form>
        </div>
    );
}
