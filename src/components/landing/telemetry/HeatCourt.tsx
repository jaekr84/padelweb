"use client";

import { useEffect, useRef } from "react";

// Mapa térmico de una cancha vista desde arriba: el puntero "juega" y deja
// calor que se enfría de a poco. Sin puntero (o en touch) un jugador fantasma
// recorre la cancha. Se dibuja en una grilla chica que el navegador escala
// con suavizado, y la cobertura se escribe directo en `coverageRef`.

const GW = 64;
const GH = 32;

// rampa térmica: transparente → violeta → rojo → infrarrojo → amarillo → blanco
const STOPS: [number, number, number, number][] = [
    [0, 10, 6, 30],
    [0.22, 70, 12, 120],
    [0.45, 210, 20, 70],
    [0.65, 255, 77, 31],
    [0.85, 255, 205, 40],
    [1, 255, 255, 235],
];

function buildLut() {
    const lut = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
        const v = i / 255;
        let j = 0;
        while (j < STOPS.length - 2 && v > STOPS[j + 1][0]) j++;
        const [a, b] = [STOPS[j], STOPS[j + 1]];
        const t = (v - a[0]) / (b[0] - a[0]);
        lut[i * 4] = a[1] + (b[1] - a[1]) * t;
        lut[i * 4 + 1] = a[2] + (b[2] - a[2]) * t;
        lut[i * 4 + 2] = a[3] + (b[3] - a[3]) * t;
        lut[i * 4 + 3] = Math.min(255, v * 3 * 255);
    }
    return lut;
}

export function HeatCourt({ coverageRef }: { coverageRef?: React.RefObject<HTMLSpanElement | null> }) {
    const wrap = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const box = wrap.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !box || !ctx) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        canvas.width = GW;
        canvas.height = GH;
        const heat = new Float32Array(GW * GH);
        const img = ctx.createImageData(GW, GH);
        const lut = buildLut();

        let pointer: { x: number; y: number } | null = null;
        let pointerAt = -1e9;
        const onMove = (e: PointerEvent) => {
            const r = box.getBoundingClientRect();
            pointer = { x: ((e.clientX - r.left) / r.width) * GW, y: ((e.clientY - r.top) / r.height) * GH };
            pointerAt = performance.now();
        };
        const onLeave = () => (pointer = null);
        box.addEventListener("pointermove", onMove);
        box.addEventListener("pointerleave", onLeave);

        const deposit = (cx: number, cy: number, amount: number) => {
            const R = 4;
            for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(GH - 1, Math.ceil(cy + R)); y++) {
                for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(GW - 1, Math.ceil(cx + R)); x++) {
                    const d2 = (x - cx) ** 2 + (y - cy) ** 2;
                    const i = y * GW + x;
                    heat[i] = Math.min(1, heat[i] + amount * Math.exp(-d2 / 5));
                }
            }
        };

        // fantasma: dos jugadores que se mueven por una curva de Lissajous en cada mitad
        const ghost = (t: number, side: 0 | 1) => {
            const x = side === 0 ? GW * (0.25 + 0.17 * Math.sin(t * 0.9 + 1)) : GW * (0.75 + 0.17 * Math.sin(t * 0.7));
            const y = GH * (0.5 + 0.38 * Math.sin(t * (side ? 1.3 : 1.1) + side * 2));
            return { x, y };
        };

        let frameN = 0;
        const render = (nowMs: number) => {
            const t = nowMs / 1000;
            for (let i = 0; i < heat.length; i++) heat[i] *= 0.988;
            if (pointer && nowMs - pointerAt < 1500) {
                deposit(pointer.x, pointer.y, 0.16);
            } else {
                const a = ghost(t, 0);
                const b = ghost(t, 1);
                deposit(a.x, a.y, 0.09);
                deposit(b.x, b.y, 0.09);
            }
            let covered = 0;
            for (let i = 0; i < heat.length; i++) {
                const v = Math.round(heat[i] * 255);
                if (heat[i] > 0.08) covered++;
                img.data[i * 4] = lut[v * 4];
                img.data[i * 4 + 1] = lut[v * 4 + 1];
                img.data[i * 4 + 2] = lut[v * 4 + 2];
                img.data[i * 4 + 3] = lut[v * 4 + 3];
            }
            ctx.putImageData(img, 0, 0);
            if (coverageRef?.current && frameN++ % 8 === 0) {
                coverageRef.current.textContent = String(Math.round((covered / heat.length) * 100)).padStart(2, "0");
            }
        };

        let raf = 0;
        let visible = false;
        const loop = (t: number) => {
            render(t);
            if (visible) raf = requestAnimationFrame(loop);
        };
        const io = new IntersectionObserver(([e]) => {
            const was = visible;
            visible = e.isIntersecting;
            if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
        });
        io.observe(box);

        if (reduce) {
            for (let i = 0; i < 400; i++) render(i * 16);
        }

        return () => {
            cancelAnimationFrame(raf);
            io.disconnect();
            box.removeEventListener("pointermove", onMove);
            box.removeEventListener("pointerleave", onLeave);
        };
    }, [coverageRef]);

    return (
        <div ref={wrap} className="relative w-full aspect-[2/1] touch-pan-y select-none">
            <canvas ref={ref} aria-hidden className="absolute inset-0 w-full h-full [filter:blur(10px)_saturate(1.2)] scale-[1.02]" />
            {/* líneas de la cancha (20 × 10 m) */}
            <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                <g fill="none" stroke="rgba(219,231,255,0.5)" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
                    <rect x="0.5" y="0.5" width="199" height="99" vectorEffect="non-scaling-stroke" />
                    <line x1="30.5" y1="0" x2="30.5" y2="100" vectorEffect="non-scaling-stroke" />
                    <line x1="169.5" y1="0" x2="169.5" y2="100" vectorEffect="non-scaling-stroke" />
                    <line x1="30.5" y1="50" x2="169.5" y2="50" vectorEffect="non-scaling-stroke" />
                </g>
                <line x1="100" y1="0" x2="100" y2="100" stroke="#ff4d1f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}
