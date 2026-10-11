"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Fondo del hero de Remate: los tres clips reales (public/mp4) en cadena, con
// fundido entre uno y otro. Sólo se descargan el clip activo y el siguiente;
// los posters (public/img/landing/remateN.jpg) cubren la carga y el modo sin
// movimiento.
const CLIPS = [1, 2, 3].map((n) => ({ src: `/mp4/remate${n}.mp4`, poster: `/img/landing/remate${n}.jpg` }));

export function HeroVideo({ className = "" }: { className?: string }) {
    const reduce = useReducedMotion();
    const [active, setActive] = useState(0);
    const refs = useRef<(HTMLVideoElement | null)[]>([]);

    useEffect(() => {
        if (reduce) return;
        refs.current.forEach((v, i) => {
            if (!v) return;
            if (i === active) {
                v.currentTime = 0;
                v.play().catch(() => {});
            } else {
                v.pause();
            }
        });
    }, [active, reduce]);

    const next = (active + 1) % CLIPS.length;

    return (
        <div aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
            {CLIPS.map((c, i) => (
                <video
                    key={c.src}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    src={reduce ? undefined : c.src}
                    poster={c.poster}
                    muted
                    autoPlay={i === 0 && !reduce}
                    playsInline
                    preload={i === active || i === next ? "auto" : "none"}
                    onEnded={() => setActive(next)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
                />
            ))}
        </div>
    );
}
