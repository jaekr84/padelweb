import LoginForm from "@/components/auth/LoginForm";
import styles from "./page.module.css";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Iniciar Sesión | Padel Social",
    description: "Ingresa a tu cuenta de Padel Social",
};

export default function LoginPage() {
    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <h1>Iniciar Sesión</h1>
                    <p>Bienvenido de vuelta a <span className={styles.brand}>Padel Social</span></p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
