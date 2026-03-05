import { SignUp } from "@clerk/nextjs";
import styles from "../../login/[[...rest]]/page.module.css";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Registrarse | ACAP",
    description: "Crea tu cuenta en ACAP",
};

export default function RegisterPage() {
    return (
        <div className={styles.container}>
            <SignUp path="/register" routing="path" signInUrl="/login" />
        </div>
    );
}
