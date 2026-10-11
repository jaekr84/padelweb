"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

// Remate: la pelota viene hacia la pantalla, revienta el vidrio y queda
// incrustada: queda delante del vidrio roto, con la corona de astillas alrededor. Pelota y vidrio son fotos reales (Pexels 226587 y 21263452,
// licencia libre) procesadas sin fondo: ver public/img/landing/.
// Todo se arma a tamaño desktop y en mobile se escala el conjunto.

const BALL = 190;
// En burst.webp el agujero ocupa el 19% del ancho: así la pelota calza justo.
const BURST = Math.round(BALL / 0.19);
const CELESTE = "#74acdf";

function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Esquirlas y polvo que salen despedidos hacia la cámara (con semilla: sin mismatch SSR).
const DEBRIS = (() => {
    const rand = mulberry32(23);
    const f = (n: number) => n.toFixed(1);
    const shards = Array.from({ length: 22 }, () => {
        const n = 3 + Math.floor(rand() * 2);
        const poly = Array.from({ length: n }, (_, k) => {
            const ang = (k / n) * Math.PI * 2 + rand() * 0.8;
            return `${f(50 + Math.cos(ang) * (30 + rand() * 20))}% ${f(50 + Math.sin(ang) * (30 + rand() * 20))}%`;
        }).join(", ");
        return {
            a: rand() * Math.PI * 2,
            dist: 180 + rand() * 360,
            size: 8 + rand() * 24,
            rot: (rand() - 0.5) * 900,
            dur: 0.8 + rand() * 0.7,
            grow: 1.4 + rand() * 1.8,
            poly,
        };
    });
    const dust = Array.from({ length: 34 }, () => ({
        a: rand() * Math.PI * 2,
        dist: 90 + rand() * 280,
        size: 1.5 + rand() * 3,
        dur: 0.5 + rand() * 0.7,
    }));
    return { shards, dust };
})();

// El que lo usa decide dónde va el impacto (`className`, un punto de 0×0
// posicionado) y a qué escala (`scaleClassName`, 1 = pelota de 190px).
export function BallImpact({
    onImpact,
    className = "",
    scaleClassName = "",
}: {
    onImpact?: () => void;
    className?: string;
    scaleClassName?: string;
}) {
    const reduce = useReducedMotion();
    const [run, setRun] = useState(0);
    const [hit, setHit] = useState(false);
    const showHit = hit || !!reduce;
    const animateHit = hit && !reduce;
    const delay = run === 0 ? 1.8 : 0.15;

    const replay = () => {
        if (reduce) return;
        setHit(false);
        setRun((r) => r + 1);
    };

    // Las grietas se propagan desde el impacto hacia afuera.
    const spread = reduce
        ? {}
        : {
              initial: { clipPath: "circle(8% at 50% 50%)", opacity: 0.4 },
              animate: { clipPath: "circle(71% at 50% 50%)", opacity: 1 },
              transition: { duration: 0.45, ease: [0.1, 0.8, 0.3, 1] as [number, number, number, number] },
          };

    return (
        <div className={`z-20 w-0 h-0 pointer-events-none ${className}`}>
            {animateHit && (
                <motion.div
                    key={`flash-${run}`}
                    className="fixed inset-0 bg-white"
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                />
            )}

            <div className={`absolute left-0 top-0 ${scaleClassName}`}>
                    {showHit && (
                        <>
                            {/* Detrás del vidrio roto, lo que se ve queda apenas desenfocado */}
                            <motion.div
                                key={`frost-${run}`}
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    width: BALL * 2.6,
                                    height: BALL * 2.6,
                                    backdropFilter: "blur(2.5px) brightness(1.12)",
                                    WebkitBackdropFilter: "blur(2.5px) brightness(1.12)",
                                    maskImage: "radial-gradient(circle, #000 30%, transparent 70%)",
                                    WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)",
                                }}
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                            {/* Vidrio estallado (foto real) */}
                            <motion.img
                                key={`burst-${run}`}
                                src="/img/landing/burst.webp"
                                alt=""
                                draggable={false}
                                className="absolute max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
                                style={{ width: BURST, height: BURST }}
                                {...spread}
                            />
                        </>
                    )}

                    {/* Pelota (foto real) */}
                    <motion.button
                        key={`ball-${run}`}
                        type="button"
                        aria-label="Repetir el remate"
                        onClick={replay}
                        className="absolute rounded-full pointer-events-auto cursor-pointer"
                        style={{ width: BALL, height: BALL, left: -BALL / 2, top: -BALL / 2 }}
                        initial={reduce ? false : { x: "-75vw", y: "60vh", scale: 0.04, rotate: -1080, filter: "blur(4px)" }}
                        animate={{
                            x: ["-75vw", "-32vw", "0vw"],
                            y: ["60vh", "-8vh", "0vh"],
                            scale: [0.04, 0.22, 1],
                            rotate: [-1080, -400, 0],
                            filter: ["blur(4px)", "blur(1.5px)", "blur(0px)"],
                        }}
                        transition={{
                            duration: 0.9,
                            times: [0, 0.62, 1],
                            delay,
                            x: { duration: 0.9, times: [0, 0.62, 1], ease: "easeIn", delay },
                            y: { duration: 0.9, times: [0, 0.62, 1], ease: ["easeOut", "easeIn"], delay },
                            scale: { duration: 0.9, times: [0, 0.62, 1], ease: "easeIn", delay },
                            rotate: { duration: 0.9, ease: "linear", delay },
                        }}
                        onAnimationComplete={() => {
                            if (reduce || hit) return;
                            setHit(true);
                            onImpact?.();
                        }}
                    >
                        {/* Golpe: se comprime contra el vidrio, rebota apenas y se asienta */}
                        <motion.div
                            key={`squash-${hit}`}
                            className="relative w-full h-full"
                            style={{ filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.6))" }}
                            initial={false}
                            animate={animateHit ? { scale: [1.09, 0.95, 1.025, 0.995, 1], rotate: [0, 4, -1.5, 0.5, 0] } : {}}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- animado y con alfa; next/image no aporta acá */}
                            <img src="/img/landing/ball.webp" alt="" draggable={false} className="w-full h-full select-none" />
                        </motion.div>
                    </motion.button>

                    {/* Esquirlas y polvo de vidrio despedidos hacia la cámara */}
                    {animateHit &&
                        DEBRIS.shards.map((s, i) => (
                            <motion.span
                                key={`s${run}-${i}`}
                                className="absolute"
                                style={{
                                    width: s.size,
                                    height: s.size,
                                    left: -s.size / 2,
                                    top: -s.size / 2,
                                    clipPath: `polygon(${s.poly})`,
                                    background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(190,230,255,0.35) 60%, rgba(255,255,255,0.7))",
                                }}
                                initial={{ x: Math.cos(s.a) * 60, y: Math.sin(s.a) * 60, scale: 0.4, rotate: 0, opacity: 1 }}
                                animate={{
                                    x: Math.cos(s.a) * s.dist,
                                    y: [Math.sin(s.a) * 60, Math.sin(s.a) * s.dist * 0.7, Math.sin(s.a) * s.dist + 260],
                                    scale: s.grow,
                                    rotate: s.rot,
                                    opacity: [1, 1, 0],
                                }}
                                transition={{ duration: s.dur, ease: [0.2, 0.7, 0.4, 1], y: { duration: s.dur, ease: "easeIn", times: [0, 0.35, 1] } }}
                            />
                        ))}
                    {animateHit &&
                        DEBRIS.dust.map((d, i) => (
                            <motion.span
                                key={`d${run}-${i}`}
                                className="absolute rounded-full bg-white"
                                style={{ width: d.size, height: d.size, left: -d.size / 2, top: -d.size / 2, boxShadow: `0 0 6px ${CELESTE}88` }}
                                initial={{ x: Math.cos(d.a) * 55, y: Math.sin(d.a) * 55, opacity: 0.9 }}
                                animate={{ x: Math.cos(d.a) * d.dist, y: Math.sin(d.a) * d.dist + 120, opacity: 0 }}
                                transition={{ duration: d.dur, ease: "easeOut" }}
                            />
                        ))}
            </div>
        </div>
    );
}
