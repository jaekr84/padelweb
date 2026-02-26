import RegisterForm from "@/components/auth/RegisterForm";
import styles from "../login/page.module.css";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Registrarse | Padel Social",
    description: "Crea tu cuenta en Padel Social",
};

export default function RegisterPage() {
    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <h1>Crear Cuenta</h1>
                    <p>Únete a la comunidad de <span className={styles.brand}>Padel Social</span></p>
                </div>
                <RegisterForm />
            </div>
        </div>
    );
}
