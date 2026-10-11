"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { useReducedMotion } from "framer-motion";

// Fondo del hero de Remate: los tres clips reales (public/mp4) en cadena, con
// fundido entre uno y otro.
//
// Carga pensada para no frenar la página:
// - Los clips están recodificados sin audio (~1 MB en desktop, ~0,3 MB en
//   mobile).
// - Lo primero que se ve es el poster (webp liviano, precargado con prioridad).
// - Los videos recién se piden cuando la página terminó de cargar, y de a uno:
//   el siguiente se precarga a mitad del clip activo.
// - Con ahorro de datos o red lenta se quedan los posters, sin video.
const CLIPS = [1, 2, 3].map((n) => ({
    web: `/mp4/remate${n}-web.mp4`,
    mobile: `/mp4/remate${n}-mobile.mp4`,
    poster: `/img/landing/remate${n}.webp`,
}));

type Connection = { saveData?: boolean; effectiveType?: string };

export function HeroVideo({ className = "" }: { className?: string }) {
    const reduce = useReducedMotion();
    const [active, setActive] = useState(0);
    // null = todavía no se decidió (SSR / antes del load): sólo posters.
    const [variant, setVariant] = useState<"web" | "mobile" | null>(null);
    const [preloadNext, setPreloadNext] = useState(false);
    const refs = useRef<(HTMLVideoElement | null)[]>([]);

    preload(CLIPS[0].poster, { as: "image", fetchPriority: "high" });

    useEffect(() => {
        if (reduce) return;
        const conn = (navigator as Navigator & { connection?: Connection }).connection;
        if (conn?.saveData || /(^|-)2g|3g/.test(conn?.effectiveType ?? "")) return;

        const pick = () => setVariant(window.matchMedia("(max-width: 767px)").matches ? "mobile" : "web");
        if (document.readyState === "complete") {
            pick();
            return;
        }
        window.addEventListener("load", pick, { once: true });
        return () => window.removeEventListener("load", pick);
    }, [reduce]);

    useEffect(() => {
        if (!variant) return;
        setPreloadNext(false);
        refs.current.forEach((v, i) => {
            if (!v) return;
            if (i === active) {
                v.currentTime = 0;
                v.play().catch(() => {});
            } else {
                v.pause();
            }
        });
    }, [active, variant]);

    const next = (active + 1) % CLIPS.length;

    return (
        <div aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
            {CLIPS.map((c, i) => {
                const load = variant && (i === active || (i === next && preloadNext));
                return (
                    <video
                        key={c.poster}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        src={load ? c[variant] : undefined}
                        poster={c.poster}
                        muted
                        playsInline
                        preload={load ? "auto" : "none"}
                        onTimeUpdate={(e) => {
                            if (i === active && !preloadNext && e.currentTarget.currentTime > e.currentTarget.duration / 2) {
                                setPreloadNext(true);
                            }
                        }}
                        onEnded={() => setActive(next)}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
                    />
                );
            })}
        </div>
    );
}
