"use client";

import { useEffect, useRef } from "react";

// Cancha de pádel en wireframe 3D (20 × 10 m, vidrios de 3 m) con un punto
// simulado en cámara lenta: tiros con su parábola, pique, estela y cuatro
// jugadores que persiguen la pelota. Todo en canvas 2D con una proyección
// propia; la cámara gira apenas siguiendo al puntero.

export type Shot = { kind: string; speed: number };

const IR = "#ff4d1f";
const ICE = "#dbe7ff";
const VOLT = "#d4ff3f";
const SLOWMO = 0.5;

const KINDS = [
    { kind: "DRIVE", speed: [70, 95], peak: 0.6 },
    { kind: "REVÉS", speed: [60, 85], peak: 0.7 },
    { kind: "VOLEA", speed: [55, 80], peak: 0.3 },
    { kind: "BANDEJA", speed: [60, 78], peak: 0.9 },
    { kind: "VÍBORA", speed: [85, 105], peak: 0.5 },
    { kind: "GLOBO", speed: [35, 50], peak: 5.5 },
    { kind: "SMASH", speed: [110, 140], peak: 0.2 },
] as const;

type V3 = { x: number; y: number; z: number };
type Seg = { from: V3; to: V3; t0: number; dur: number; peak: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function TrajectoryCourt({ className = "", onShot }: { className?: string; onShot?: (s: Shot) => void }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const onShotRef = useRef(onShot);

    useEffect(() => {
        onShotRef.current = onShot;
    }, [onShot]);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // canvas no resuelve var(): se lee la familia de next/font ya calculada
        const mono = `${getComputedStyle(document.body).getPropertyValue("--font-chakra").trim() || "ui-monospace"}, monospace`;

        let w = 0;
        let h = 0;
        const resize = () => {
            const r = canvas.getBoundingClientRect();
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        resize();

        // ── Cámara ──
        let yaw = 0;
        let yawTarget = 0;
        let pointerAt = -1e9;
        const pitch = 0.62;
        const dist = 26;
        const onPointer = (e: PointerEvent) => {
            yawTarget = (e.clientX / window.innerWidth - 0.5) * 0.5;
            pointerAt = performance.now();
        };
        window.addEventListener("pointermove", onPointer);

        let fit = { s: 1, ox: 0, oy: 0 };
        const raw = (p: V3) => {
            const cx = p.x - 10;
            const cy = p.y - 5;
            const rx = cx * Math.cos(yaw) - cy * Math.sin(yaw);
            const ry = cx * Math.sin(yaw) + cy * Math.cos(yaw);
            // cámara detrás del lateral y = 0, mirando al centro desde arriba
            const fwdY = Math.cos(pitch);
            const fwdZ = -Math.sin(pitch);
            const vy = ry + dist * fwdY;
            const vz = p.z - dist * Math.sin(pitch);
            const zc = vy * fwdY + vz * fwdZ;
            const yc = vy * Math.sin(pitch) + vz * Math.cos(pitch);
            const f = dist / zc;
            return { x: rx * f, y: -yc * f, f };
        };
        const refit = () => {
            const pts = [
                [0, 0, 0], [20, 0, 0], [0, 10, 0], [20, 10, 0],
                [0, 0, 3], [20, 0, 3], [0, 10, 4], [20, 10, 4],
            ].map(([x, y, z]) => raw({ x, y, z }));
            const minX = Math.min(...pts.map((p) => p.x));
            const maxX = Math.max(...pts.map((p) => p.x));
            const minY = Math.min(...pts.map((p) => p.y));
            const maxY = Math.max(...pts.map((p) => p.y));
            const s = Math.min((w * 0.94) / (maxX - minX), (h * 0.9) / (maxY - minY));
            fit = { s, ox: w / 2 - ((minX + maxX) / 2) * s, oy: h / 2 - ((minY + maxY) / 2) * s };
        };
        const P = (x: number, y: number, z = 0) => {
            const p = raw({ x, y, z });
            return { x: fit.ox + p.x * fit.s, y: fit.oy + p.y * fit.s, f: p.f };
        };
        const line = (a: number[], b: number[], color: string, width = 1) => {
            const p = P(a[0], a[1], a[2] ?? 0);
            const q = P(b[0], b[1], b[2] ?? 0);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        };
        const quad = (pts: number[][], fill: string, stroke?: string) => {
            ctx.beginPath();
            pts.forEach(([x, y, z], i) => {
                const p = P(x, y, z);
                if (i) ctx.lineTo(p.x, p.y);
                else ctx.moveTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        // ── Simulación ──
        const players = [
            { x: 3, y: 2.5, hx: 3, hy: 2.5, team: 0 },
            { x: 3, y: 7.5, hx: 3, hy: 7.5, team: 0 },
            { x: 17, y: 2.5, hx: 17, hy: 2.5, team: 1 },
            { x: 17, y: 7.5, hx: 17, hy: 7.5, team: 1 },
        ];
        let segs: Seg[] = [];
        let label = { kind: "", speed: 0, until: 0 };
        let ripples: { x: number; y: number; t0: number }[] = [];
        const trail: { x: number; y: number; z: number }[] = [];
        let hitPoint: V3 = { x: 3, y: 5, z: 1 };

        const newShot = (from: V3, now: number) => {
            const toRight = from.x < 10;
            const k = KINDS[Math.floor(Math.random() * KINDS.length)];
            const deep = k.kind === "GLOBO" || k.kind === "DRIVE";
            const tx = toRight ? (deep ? rand(15, 19) : rand(11.5, 18)) : deep ? rand(1, 5) : rand(2, 8.5);
            const land = { x: tx, y: rand(1, 9), z: 0 };
            const speed = Math.round(rand(k.speed[0], k.speed[1]));
            const d = Math.hypot(land.x - from.x, land.y - from.y);
            const dur = d / (speed / 3.6) / SLOWMO;
            const dir = { x: (land.x - from.x) / d, y: (land.y - from.y) / d };
            const next = { x: clamp(land.x + dir.x * 2.6, 0.6, 19.4), y: clamp(land.y + dir.y * 2.6, 0.6, 9.4), z: 1 };
            segs = [
                { from, to: land, t0: now, dur, peak: k.peak },
                { from: land, to: next, t0: now + dur, dur: 0.55 / SLOWMO, peak: 0.6 },
            ];
            hitPoint = next;
            label = { kind: k.kind, speed, until: now + dur };
            onShotRef.current?.({ kind: k.kind, speed });
            // el receptor más cercano en Y sale a buscarla
            const team = toRight ? 1 : 0;
            const mates = players.filter((p) => p.team === team);
            const [rcv, mate] = Math.abs(mates[0].y - next.y) < Math.abs(mates[1].y - next.y) ? mates : [mates[1], mates[0]];
            rcv.hx = clamp(next.x + (toRight ? 0.5 : -0.5), 0.3, 19.7);
            rcv.hy = next.y;
            mate.hx = toRight ? 16 : 4;
            mate.hy = 10 - next.y;
            for (const p of players.filter((q) => q.team !== team)) {
                p.hx = toRight ? rand(5.5, 8) : rand(12, 14.5);
                p.hy = p === players[0] || p === players[2] ? rand(2, 4) : rand(6, 8);
            }
        };

        const ballAt = (now: number): V3 => {
            const s = now < segs[1].t0 ? segs[0] : segs[1];
            const u = clamp((now - s.t0) / s.dur, 0, 1);
            const base = s === segs[0] ? s.from.z * (1 - u) : u * s.to.z;
            return {
                x: s.from.x + (s.to.x - s.from.x) * u,
                y: s.from.y + (s.to.y - s.from.y) * u,
                z: base + 4 * s.peak * u * (1 - u),
            };
        };

        let last = performance.now() / 1000;
        let bounced = false;
        newShot({ x: 3, y: 5, z: 1 }, last);

        const drawCourt = () => {
            // piso y grilla de 1 m
            quad([[0, 0, 0], [20, 0, 0], [20, 10, 0], [0, 10, 0]], "rgba(255,77,31,0.035)");
            for (let x = 1; x < 20; x++) line([x, 0], [x, 10], "rgba(219,231,255,0.045)");
            for (let y = 1; y < 10; y++) line([0, y], [20, y], "rgba(219,231,255,0.045)");
            // líneas reglamentarias
            const L = "rgba(219,231,255,0.55)";
            line([0, 0], [20, 0], L, 1.4);
            line([0, 10], [20, 10], L, 1.4);
            line([0, 0], [0, 10], L, 1.4);
            line([20, 0], [20, 10], L, 1.4);
            line([3.05, 0], [3.05, 10], L, 1.2);
            line([16.95, 0], [16.95, 10], L, 1.2);
            line([3.05, 5], [16.95, 5], L, 1.2);
            // vidrios de fondo y laterales (primeros 4 m), reja hasta 4 m
            const G = "rgba(219,231,255,0.05)";
            const GE = "rgba(219,231,255,0.28)";
            quad([[0, 0, 0], [0, 10, 0], [0, 10, 3], [0, 0, 3]], G, GE);
            quad([[20, 0, 0], [20, 10, 0], [20, 10, 3], [20, 0, 3]], G, GE);
            for (const [x0, x1] of [[0, 4], [16, 20]]) {
                quad([[x0, 10, 0], [x1, 10, 0], [x1, 10, 3], [x0, 10, 3]], G, GE);
                quad([[x0, 0, 0], [x1, 0, 0], [x1, 0, 3], [x0, 0, 3]], "rgba(219,231,255,0.02)", "rgba(219,231,255,0.14)");
            }
            ctx.setLineDash([2, 5]);
            line([4, 10, 4], [16, 10, 4], "rgba(219,231,255,0.22)");
            line([0, 10, 4], [4, 10, 4], "rgba(219,231,255,0.22)");
            line([16, 10, 4], [20, 10, 4], "rgba(219,231,255,0.22)");
            for (let x = 4; x <= 16; x += 2) line([x, 10, 0], [x, 10, 4], "rgba(219,231,255,0.12)");
            ctx.setLineDash([]);
            // red
            quad([[10, 0, 0], [10, 10, 0], [10, 10, 0.88], [10, 0, 0.92]], "rgba(255,77,31,0.12)");
            ctx.shadowColor = IR;
            ctx.shadowBlur = 12;
            line([10, 0, 0.92], [10, 10, 0.92], IR, 2);
            ctx.shadowBlur = 0;
            line([10, 0, 0], [10, 0, 0.92], IR, 1.5);
            line([10, 10, 0], [10, 10, 0.92], IR, 1.5);
        };

        const drawPlayer = (p: (typeof players)[number]) => {
            const c = p.team === 0 ? ICE : IR;
            const foot = P(p.x, p.y, 0);
            const head = P(p.x, p.y, 1.75);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y, 9 * foot.f, 3.5 * foot.f, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = c;
            ctx.lineWidth = 3 * foot.f;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(foot.x, foot.y);
            ctx.lineTo(head.x, head.y + 5 * head.f);
            ctx.stroke();
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(head.x, head.y, 4 * head.f, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineCap = "butt";
        };

        const frame = (nowMs: number) => {
            const now = nowMs / 1000;
            const dt = Math.min(0.05, now - last);
            last = now;

            if (nowMs - pointerAt > 2500) yawTarget = Math.sin(now * 0.25) * 0.18;
            yaw += (yawTarget - yaw) * Math.min(1, dt * 2.5);
            refit();

            if (now >= segs[1].t0 && !bounced) {
                bounced = true;
                ripples.push({ x: segs[0].to.x, y: segs[0].to.y, t0: now });
            }
            if (now >= segs[1].t0 + segs[1].dur) {
                bounced = false;
                newShot(hitPoint, now);
            }
            for (const p of players) {
                const k = Math.min(1, dt * 2.2 * (SLOWMO * 2));
                p.x += (p.hx - p.x) * k;
                p.y += (p.hy - p.y) * k;
            }

            const ball = ballAt(now);
            trail.push(ball);
            if (trail.length > 42) trail.shift();

            ctx.clearRect(0, 0, w, h);
            drawCourt();

            // ondas de pique
            ripples = ripples.filter((r) => now - r.t0 < 1.4);
            for (const r of ripples) {
                const u = (now - r.t0) / 1.4;
                ctx.strokeStyle = `rgba(212,255,63,${(1 - u) * 0.9})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i <= 28; i++) {
                    const a = (i / 28) * Math.PI * 2;
                    const q = P(r.x + Math.cos(a) * u * 1.6, r.y + Math.sin(a) * u * 1.6, 0);
                    if (i) ctx.lineTo(q.x, q.y);
                    else ctx.moveTo(q.x, q.y);
                }
                ctx.stroke();
                const c = P(r.x, r.y, 0);
                ctx.fillStyle = `rgba(212,255,63,${1 - u})`;
                ctx.fillRect(c.x - 2, c.y - 2, 4, 4);
            }

            // jugadores de atrás primero
            [...players].sort((a, b) => b.y - a.y).forEach(drawPlayer);

            // sombra, estela y pelota
            const sh = P(ball.x, ball.y, 0);
            ctx.fillStyle = `rgba(0,0,0,${0.5 - Math.min(0.35, ball.z * 0.06)})`;
            ctx.beginPath();
            ctx.ellipse(sh.x, sh.y, 5 * sh.f, 2 * sh.f, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.setLineDash([1, 4]);
            const bp = P(ball.x, ball.y, ball.z);
            line([ball.x, ball.y, 0], [ball.x, ball.y, ball.z], "rgba(212,255,63,0.35)");
            ctx.setLineDash([]);

            for (let i = 1; i < trail.length; i++) {
                const a = P(trail[i - 1].x, trail[i - 1].y, trail[i - 1].z);
                const b = P(trail[i].x, trail[i].y, trail[i].z);
                const t = i / trail.length;
                ctx.strokeStyle = `rgba(255,77,31,${t * 0.9})`;
                ctx.lineWidth = t * 4 * b.f;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
            ctx.shadowColor = VOLT;
            ctx.shadowBlur = 18;
            ctx.fillStyle = VOLT;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, 4.5 * bp.f, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // etiqueta del tiro
            if (now < label.until + 0.6) {
                const alpha = clamp((label.until + 0.6 - now) / 0.6, 0, 1);
                const lx = bp.x + 26;
                const ly = bp.y - 34;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = "rgba(219,231,255,0.6)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bp.x + 5, bp.y - 5);
                ctx.lineTo(lx - 4, ly + 6);
                ctx.lineTo(lx + 90, ly + 6);
                ctx.stroke();
                ctx.font = `600 10px ${mono}`;
                ctx.fillStyle = ICE;
                ctx.fillText(label.kind, lx, ly - 8);
                ctx.font = `700 14px ${mono}`;
                ctx.fillStyle = VOLT;
                ctx.fillText(`${label.speed} KM/H`, lx, ly + 3);
                ctx.globalAlpha = 1;
            }
        };

        let raf = 0;
        let visible = true;
        const loop = (t: number) => {
            frame(t);
            if (visible) raf = requestAnimationFrame(loop);
        };
        const io = new IntersectionObserver(([e]) => {
            const was = visible;
            visible = e.isIntersecting;
            if (visible && !was && !reduce) {
                last = performance.now() / 1000;
                raf = requestAnimationFrame(loop);
            }
        });
        io.observe(canvas);

        if (reduce) {
            // un cuadro fijo a mitad de vuelo
            const t = segs[0].t0 + segs[0].dur * 0.55;
            last = t - 0.62;
            for (let i = 0; i < 30; i++) frame((t - 0.6 + i * 0.02) * 1000);
        } else {
            raf = requestAnimationFrame(loop);
        }

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            window.removeEventListener("pointermove", onPointer);
        };
    }, []);

    return <canvas ref={ref} aria-hidden className={`block w-full h-full ${className}`} />;
}
