import { SignIn } from "@clerk/nextjs";
import styles from "./page.module.css";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Iniciar Sesión | Padel Social",
    description: "Ingresa a tu cuenta de Padel Social",
};

export default function LoginPage() {
    return (
        <div className={styles.container}>
            <SignIn path="/login" routing="path" signUpUrl="/register" />
        </div>
    );
}
