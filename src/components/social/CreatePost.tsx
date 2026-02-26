"use client";

import { useState } from "react";
import styles from "./social.module.css";

export default function CreatePost() {
    const [content, setContent] = useState("");

    const handleSubmit = () => {
        // Aquí después conectaremos a Supabase insert en la tabla posts
        console.log("Posteando:", content);
        setContent("");
    };

    return (
        <div className={styles.createBox}>
            <div className={styles.avatar}>👤</div>
            <div className={styles.inputArea}>
                <textarea
                    className={styles.textarea}
                    placeholder="¿Buscando partido? ¿Algún torneo interesante?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                <div className={styles.createActions}>
                    <div className={styles.mediaButtons}>
                        <span className={styles.mediaIcon} title="Subir Foto">🖼️</span>
                        <span className={styles.mediaIcon} title="Añadir Hashtag">#️⃣</span>
                        <span className={styles.mediaIcon} title="Etiquetar Torneo">🏆</span>
                    </div>
                    <button
                        className={styles.submitBtn}
                        disabled={!content.trim()}
                        onClick={handleSubmit}
                    >
                        Publicar
                    </button>
                </div>
            </div>
        </div>
    );
}
