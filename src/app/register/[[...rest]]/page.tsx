import { SignUp } from "@clerk/nextjs";
import styles from "../../login/[[...rest]]/page.module.css";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Registrarse | Padel Social",
    description: "Crea tu cuenta en Padel Social",
};

export default function RegisterPage() {
    return (
        <div className={styles.container}>
            <SignUp path="/register" routing="path" signInUrl="/login" />
        </div>
    );
}
