"use client";

import { motion, useReducedMotion, MotionValue } from "framer-motion";
import type { CSSProperties } from "react";

// Escala: 1 metro = U px. La cancha mide 20 × 10 m.
const U = 40;
const LEN = 20;
const WID = 10;
const VOLT = "#d4ff3f";
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Layer = { kind: "glass" | "mesh"; h: number };
type Segment = { from: number; len: number; layers: Layer[] };

// Laterales: vidrio escalonado en los primeros 4 m de cada fondo, malla en el medio.
const SIDE: Segment[] = [
    { from: 0, len: 2, layers: [{ kind: "glass", h: 3 }, { kind: "mesh", h: 1 }] },
    { from: 2, len: 2, layers: [{ kind: "glass", h: 2 }, { kind: "mesh", h: 1 }] },
    { from: 4, len: 12, layers: [{ kind: "mesh", h: 3 }] },
    { from: 16, len: 2, layers: [{ kind: "glass", h: 2 }, { kind: "mesh", h: 1 }] },
    { from: 18, len: 2, layers: [{ kind: "glass", h: 3 }, { kind: "mesh", h: 1 }] },
];
// Fondos: vidrio de 3 m con 1 m de malla arriba, en paños de 2 m.
const END: Segment[] = [0, 2, 4, 6, 8].map((from) => ({
    from,
    len: 2,
    layers: [{ kind: "glass", h: 3 }, { kind: "mesh", h: 1 }],
}));

const glassStyle: CSSProperties = {
    background:
        "linear-gradient(125deg, rgba(190,235,255,0.14) 0%, rgba(190,235,255,0.04) 38%, rgba(255,255,255,0.16) 46%, rgba(190,235,255,0.03) 54%, rgba(190,235,255,0.08) 100%)",
    border: "1px solid rgba(210,240,255,0.35)",
    boxShadow: "inset 0 0 12px rgba(190,235,255,0.08)",
};
const meshStyle: CSSProperties = {
    backgroundImage:
        "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 7px)",
    border: "1px solid rgba(255,255,255,0.22)",
};

function Panel({ layer, vertical, delay, reduce }: { layer: Layer; vertical: boolean; delay: number; reduce: boolean | null }) {
    const size = layer.h * U;
    return (
        <motion.div
            className="relative shrink-0"
            style={{
                ...(layer.kind === "glass" ? glassStyle : meshStyle),
                ...(vertical ? { height: size, width: "100%" } : { width: size, height: "100%" }),
                transformOrigin: vertical ? "bottom" : "right",
            }}
            initial={reduce ? false : vertical ? { scaleY: 0, opacity: 0 } : { scaleX: 0, opacity: 0 }}
            animate={vertical ? { scaleY: 1, opacity: 1 } : { scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay, ease: EASE_OUT }}
        >
            {layer.kind === "glass" && (
                <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: VOLT, opacity: 0.55, boxShadow: `0 0 10px ${VOLT}` }} />
            )}
        </motion.div>
    );
}

// Pared sobre un lado largo (eje x): se para girando sobre su borde inferior.
function SideWall({ y, delay, reduce }: { y: number; delay: number; reduce: boolean | null }) {
    return (
        <>
            {SIDE.map((s, i) => {
                const h = s.layers.reduce((a, l) => a + l.h, 0) * U;
                return (
                    <div
                        key={i}
                        className="absolute flex flex-col-reverse border-x-2 border-[#2a3550]"
                        style={{
                            left: s.from * U,
                            top: y * U - h,
                            width: s.len * U,
                            height: h,
                            transformOrigin: "bottom",
                            transform: "rotateX(-90deg)",
                        }}
                    >
                        {s.layers.map((l, j) => (
                            <Panel key={j} layer={l} vertical delay={delay + i * 0.06 + j * 0.15} reduce={reduce} />
                        ))}
                    </div>
                );
            })}
        </>
    );
}

// Pared sobre un fondo (eje y): gira sobre el borde que toca el piso.
function EndWall({ atStart, delay, reduce }: { atStart: boolean; delay: number; reduce: boolean | null }) {
    return (
        <>
            {END.map((s, i) => {
                const h = s.layers.reduce((a, l) => a + l.h, 0) * U;
                return (
                    <div
                        key={i}
                        className={`absolute flex border-y-2 border-[#2a3550] ${atStart ? "flex-row-reverse" : "flex-row"}`}
                        style={{
                            left: atStart ? -h : LEN * U,
                            top: s.from * U,
                            width: h,
                            height: s.len * U,
                            transformOrigin: atStart ? "right" : "left",
                            transform: atStart ? "rotateY(90deg)" : "rotateY(-90deg)",
                        }}
                    >
                        {s.layers.map((l, j) => (
                            <Panel key={j} layer={l} vertical={false} delay={delay + i * 0.06 + j * 0.15} reduce={reduce} />
                        ))}
                    </div>
                );
            })}
        </>
    );
}

export function PadelCourt3D({ rotateX, rotateZ }: { rotateX: MotionValue<number>; rotateZ: MotionValue<number> }) {
    const reduce = useReducedMotion();
    const draw = (delay: number) => ({
        initial: reduce ? false : { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { duration: 1.4, delay, ease: EASE_OUT },
    });
    const netH = 0.88 * U;

    return (
        <div aria-hidden className="absolute inset-x-0 bottom-[4%] md:bottom-[1%] flex justify-center pointer-events-none [perspective:1400px]">
            <motion.div
                className="relative shrink-0 scale-[0.42] sm:scale-[0.62] md:scale-[0.85] lg:scale-[1.05]"
                style={{
                    width: LEN * U,
                    height: WID * U,
                    rotateX,
                    rotateZ,
                    transformStyle: "preserve-3d",
                    transformOrigin: "50% 55%",
                }}
            >
                {/* Piso: césped azul + líneas */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(180deg, rgba(30,64,175,0.42), rgba(30,64,175,0.22))",
                        boxShadow: `0 0 120px rgba(212,255,63,0.12), inset 0 0 60px rgba(0,0,0,0.5)`,
                    }}
                />
                <svg viewBox={`0 0 ${LEN * U} ${WID * U}`} className="absolute inset-0 w-full h-full" fill="none" stroke={VOLT} strokeWidth={2}>
                    <motion.rect x={1} y={1} width={LEN * U - 2} height={WID * U - 2} {...draw(0.2)} strokeOpacity={0.7} />
                    {/* Líneas de saque a 6,95 m de la red */}
                    <motion.path d={`M${3.05 * U} 0 V${WID * U} M${16.95 * U} 0 V${WID * U}`} {...draw(0.5)} strokeOpacity={0.6} />
                    <motion.path d={`M${3.05 * U} ${5 * U} H${16.95 * U}`} {...draw(0.8)} strokeOpacity={0.6} />
                </svg>

                {/* Paredes: fondo lejano y laterales primero, el lateral cercano al final */}
                <SideWall y={0} delay={0.9} reduce={reduce} />
                <EndWall atStart delay={1.0} reduce={reduce} />
                <EndWall atStart={false} delay={1.0} reduce={reduce} />
                <SideWall y={WID} delay={1.2} reduce={reduce} />

                {/* Red */}
                <motion.div
                    className="absolute"
                    style={{
                        left: 10 * U - netH,
                        top: -6,
                        width: netH,
                        height: WID * U + 12,
                        transformOrigin: "right",
                        transform: "rotateY(90deg)",
                        backgroundImage:
                            "repeating-linear-gradient(0deg, rgba(255,255,255,0.45) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.45) 0 1px, transparent 1px 5px)",
                        backgroundColor: "rgba(5,8,15,0.35)",
                        borderLeft: "6px solid rgba(255,255,255,0.95)",
                        borderTop: "4px solid #2a3550",
                        borderBottom: "4px solid #2a3550",
                    }}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.1 }}
                />
            </motion.div>
        </div>
    );
}
