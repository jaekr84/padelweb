"use client";

import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useId } from "react";

// Logo A.C.A.P. (public/img/acap logo svg blanco sombra.svg) armado pieza por
// pieza: cada forma entra desde un lado distinto, después queda flotando con un
// brillo que lo recorre y se sacude cuando `hit` cambia (el remate del hero).
// Los trazos son los del SVG original, viewBox 3508 × 2481.

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RING_L =
    "M467.997,1297.93c0.031,0.032 48.688,-6.405 73.771,-6.901l0.024,-0.1l1164.538,0l-466.125,1001.936l-692.219,0l0,-0.015c-274.713,-2.084 -497.097,-225.753 -497.097,-500.953c0,-242.174 188.57,-447.487 417.108,-493.967Zm65.493,90.196c-214.566,9.609 -385.814,186.852 -385.814,403.771c0,222.028 179.409,402.488 401.044,404.17l0.957,0.012l628.807,-0l376.07,-808.363l-1004.245,0l-16.819,0.41Z";
const RING_R =
    "M2959.138,1187.948l-1029.037,0l-466.125,-1001.936l1340.377,0l-0.074,-0.11l74.332,0c28.636,-0.005 73.558,0.11 73.558,0.11l-0,0.015c260.495,-1.976 476.924,198.84 502.251,449.763c26.568,263.211 -156.411,496.95 -405.835,543.612c-35.336,6.611 -73.975,8.108 -89.446,8.447l-0.002,0.099Zm-6.237,-96.705c0.001,-0.031 0.001,-0.063 0.002,-0.094c210.226,1.595 384.8,-160.462 405.23,-362.869c24.225,-240.005 -167.09,-447.276 -405.23,-445.47l-0.007,-0.012l-0.005,0l0.012,0.012l-1337.151,-0.012l376.07,808.363l960.347,0l-0,0.09l0.732,-0.008Z";
const STRIPE = "M1834.523,1218.145l445.889,978.708l859.91,0l49.555,97.561l-987.331,-1.549l-499.74,-1074.72l131.716,0Z";
const TRIANGLE = "M1398.161,343.193l435.153,873.404l-870.306,0l435.153,-873.404Z";
const CYAN_LOW = "M2716.009,1289.38l397.987,845.529l-740.225,1.549l-393.341,-847.078l735.579,0Z";
const CYAN_TOP = "M2270.79,340.87l397.987,845.529l-740.225,1.549l-393.341,-847.078l735.579,0Z";
const BLUE = "M933.574,1290.929l-397.987,845.529l777.391,1.549l393.341,-847.078l-772.745,0Z";

const W = 3508;
const H = 2481;

export function AcapLogoAnimated({ hit = 0, delay = 0.5, className = "" }: { hit?: number; delay?: number; className?: string }) {
    const reduce = useReducedMotion();
    const jolt = useAnimationControls();
    const uid = useId().replace(/:/g, "");
    const id = (name: string) => `${uid}-${name}`;

    useEffect(() => {
        if (!hit || reduce) return;
        jolt.start({
            x: [0, 22, -16, 9, -4, 0],
            rotate: [0, 2.5, -1.8, 1, -0.4, 0],
            scale: [1, 1.04, 0.985, 1.01, 1],
            transition: { duration: 0.7, ease: "easeOut" },
        });
    }, [hit, reduce, jolt]);

    // Cada pieza llega desde su lado; `i` escalona la entrada.
    const piece = (from: { x?: number; y?: number; rotate?: number }, i: number) => ({
        initial: reduce ? false : { opacity: 0, x: from.x ?? 0, y: from.y ?? 0, rotate: from.rotate ?? 0 },
        animate: { opacity: 1, x: 0, y: 0, rotate: 0 },
        transition: { duration: 1, delay: delay + i * 0.12, ease: EASE_OUT },
        style: { transformBox: "fill-box" as const, transformOrigin: "center" },
    });
    const ring = (i: number) => ({
        initial: reduce ? false : { opacity: 0, scale: 0.6 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 1.1, delay: delay + i * 0.12, ease: EASE_OUT },
        style: { transformBox: "fill-box" as const, transformOrigin: "center" },
    });
    const shapes = [RING_L, RING_R, STRIPE, TRIANGLE, CYAN_LOW, CYAN_TOP, BLUE];

    return (
        <div aria-hidden className={`relative ${className}`}>
            {/* Halo de luz celeste y rojo detrás del logo */}
            <motion.div
                className="absolute inset-[-18%] rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle at 38% 45%, rgba(205,46,58,0.35), transparent 55%), radial-gradient(circle at 62% 55%, rgba(116,172,223,0.45), transparent 60%)" }}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={reduce ? { opacity: 0.8 } : { opacity: [0, 0.9, 0.6, 0.9], scale: [0.6, 1, 0.95, 1] }}
                transition={reduce ? undefined : { duration: 6, delay, times: [0, 0.25, 0.6, 1], repeat: Infinity, repeatType: "mirror" }}
            />

            <motion.div animate={jolt} className="relative">
                <motion.div
                    animate={reduce ? undefined : { y: [0, -12, 0] }}
                    transition={{ duration: 5, delay: delay + 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="w-full h-auto overflow-visible drop-shadow-[0_18px_40px_rgba(3,10,26,0.7)]"
                        style={{ fillRule: "evenodd", clipRule: "evenodd" }}
                    >
                        <defs>
                            <radialGradient id={id("r1")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1655.440393,0,0,1001.936328,50.889764,1791.896849)">
                                <stop offset="0" stopColor="#fff" />
                                <stop offset="0.67" stopColor="#ddd" />
                                <stop offset="0.85" stopColor="#7b7b7b" />
                                <stop offset="1" stopColor="#000" />
                            </radialGradient>
                            <linearGradient id={id("l2")} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1993.008091,0,0,1002.046234,1463.976161,686.924477)">
                                <stop offset="0" stopColor="#000" />
                                <stop offset="0.16" stopColor="#787878" />
                                <stop offset="0.34" stopColor="#dbdbdb" />
                                <stop offset="1" stopColor="#fff" />
                            </linearGradient>
                            <linearGradient id={id("l3")} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(870.306362,0,0,873.403538,963.007997,779.8947)">
                                <stop offset="0" stopColor="#000" />
                                <stop offset="1" stopColor="#f00" />
                            </linearGradient>
                            <linearGradient id={id("l4")} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1133.566294,0,0,847.077545,1980.430203,1712.91887)">
                                <stop offset="0" stopColor="#000" />
                                <stop offset="1" stopColor="#00b8f1" />
                            </linearGradient>
                            <linearGradient id={id("l5")} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1133.566294,0,0,847.077545,1535.211202,764.408822)">
                                <stop offset="0" stopColor="#000" />
                                <stop offset="0.51" stopColor="#0089b4" />
                                <stop offset="1" stopColor="#00b8f1" />
                            </linearGradient>
                            <linearGradient id={id("l6")} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1170.732402,0,0,847.077545,1706.318979,1714.467457)">
                                <stop offset="0" stopColor="#22409a" />
                                <stop offset="0.5" stopColor="#193073" />
                                <stop offset="1" stopColor="#000" />
                            </linearGradient>
                            {/* Brillo: banda blanca diagonal que cruza el logo */}
                            <linearGradient id={id("shine")} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
                                <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
                                <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
                            </linearGradient>
                            <mask id={id("mask")}>
                                {shapes.map((d, i) => (
                                    <path key={i} d={d} fill="#fff" />
                                ))}
                            </mask>
                        </defs>

                        <motion.path d={RING_L} fill={`url(#${id("r1")})`} {...ring(4)} />
                        <motion.path d={RING_R} fill={`url(#${id("l2")})`} {...ring(3)} />
                        <motion.path d={TRIANGLE} fill={`url(#${id("l3")})`} {...piece({ y: -900, rotate: -25 }, 0)} />
                        <motion.path d={CYAN_TOP} fill={`url(#${id("l5")})`} {...piece({ x: 1100, y: -300 }, 1)} />
                        <motion.path d={CYAN_LOW} fill={`url(#${id("l4")})`} {...piece({ x: 1200, y: 500 }, 2)} />
                        <motion.path d={BLUE} fill={`url(#${id("l6")})`} {...piece({ x: -1200, y: 400 }, 2)} />
                        <motion.path d={STRIPE} fill="#fff" {...piece({ y: 700 }, 3)} />

                        {!reduce && (
                            <g mask={`url(#${id("mask")})`}>
                                <motion.rect
                                    y={0}
                                    width={W * 0.6}
                                    height={H}
                                    fill={`url(#${id("shine")})`}
                                    style={{ mixBlendMode: "overlay" }}
                                    initial={{ x: -W * 0.7 }}
                                    animate={{ x: W * 1.1 }}
                                    transition={{ duration: 1.6, delay: delay + 1.3, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
                                />
                            </g>
                        )}
                    </svg>
                </motion.div>
            </motion.div>
        </div>
    );
}
