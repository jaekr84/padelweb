"use client";

import Link from "next/link";
import {
    Users, Trophy, ShieldCheck, Building2, Activity,
    UserCheck, UserX, Image as ImageIcon, MapPin,
    Mars, Venus, HelpCircle, Layers, AlertCircle,
    Mail, ClipboardList, TrendingUp, Star
} from "lucide-react";

interface DashboardStats {
    usuarios: {
        jugadores: number;
        admins: number;
        clubs: number;
        activos: number;
        baneados: number;
        conFoto: number;
        conUbicacion: number;
    };
    genero: {
        masculino: number;
        femenino: number;
        sinEspecificar: number;
    };
    lado: {
        drive: number;
        reves: number;
        ambos: number;
        sinEspecificar: number;
    };
    categorias: { category: string; count: number }[];
    torneos: {
        draft: number;
        publicados: number;
        enCurso: number;
        finalizados: number;
    };
    inscripciones: number;
    canchaAbierta: number;
    pendientes: {
        solicitudes: number;
        mensajes: number;
    };
}

function StatCard({ label, value, icon: Icon, color, sub, href }: {
    label: string;
    value: number | string;
    icon: any;
    color: string;
    sub?: string;
    href?: string;
}) {
    const content = (
        <div className={`bg-card/60 border border-hairline rounded-2xl p-4 flex items-center gap-4 hover:bg-card transition-all group ${href ? "cursor-pointer hover:border-celeste/40" : ""}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">{label}</p>
                <p className="text-2xl font-black text-foreground leading-none">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
            </div>
        </div>
    );
    return href ? <Link href={href}>{content}</Link> : content;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-1 rounded-full bg-volt" />
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{children}</h2>
        </div>
    );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-muted-foreground w-28 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-black text-muted-foreground w-8 text-right">{value}</span>
            <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
        </div>
    );
}

const CATEGORY_ORDER = ["A", "B", "C", "D", "E", "F"];
const CATEGORY_COLORS: Record<string, string> = {
    A: "bg-yellow-400",
    B: "bg-orange-400",
    C: "bg-blue-400",
    D: "bg-emerald-400",
    E: "bg-slate-400",
    F: "bg-rose-300",
};

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
    const totalTorneos = stats.torneos.draft + stats.torneos.publicados + stats.torneos.enCurso + stats.torneos.finalizados;
    const totalPendientes = stats.pendientes.solicitudes + stats.pendientes.mensajes;
    const perfilCompleto = stats.usuarios.jugadores > 0
        ? Math.round((stats.usuarios.conFoto / stats.usuarios.jugadores) * 100)
        : 0;

    const sortedCats = [...stats.categorias].sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground font-sans pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-hairline py-4 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <p className="label-tech text-[9px] text-celeste-light">Panel General</p>
                        <h1 className="text-xl heading-sport text-foreground leading-none">
                            Dashboard <span className="text-celeste-light">A.C.A.P.</span>
                        </h1>
                    </div>
                    {totalPendientes > 0 && (
                        <Link href="/admin/requests" className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl px-3 py-2 text-[11px] font-black hover:bg-amber-500/25 transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {totalPendientes} pendiente{totalPendientes !== 1 ? "s" : ""}
                        </Link>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

                {/* ── KPIs principales ── */}
                <section>
                    <SectionTitle>Resumen general</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Jugadores" value={stats.usuarios.jugadores} icon={Users} color="bg-celeste/15 text-celeste-light" href="/admin/users" />
                        <StatCard label="Torneos" value={totalTorneos} icon={Trophy} color="bg-amber-500/15 text-amber-400" href="/admin/tournaments" />
                        <StatCard label="Inscripciones" value={stats.inscripciones} icon={ClipboardList} color="bg-emerald-500/15 text-emerald-400" />
                        <StatCard label="Clubes" value={stats.usuarios.clubs} icon={Building2} color="bg-sky-500/15 text-sky-400" href="/directory" />
                    </div>
                </section>

                {/* ── Usuarios ── */}
                <section>
                    <SectionTitle>Usuarios</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Activos" value={stats.usuarios.activos} icon={UserCheck} color="bg-emerald-500/15 text-emerald-400" sub={`de ${stats.usuarios.jugadores} totales`} />
                        <StatCard label="Baneados" value={stats.usuarios.baneados} icon={UserX} color="bg-red-500/15 text-red-400" />
                        <StatCard label="Con foto" value={`${perfilCompleto}%`} icon={ImageIcon} color="bg-violet-500/15 text-violet-400" sub={`${stats.usuarios.conFoto} jugadores`} />
                        <StatCard label="Con ubicación" value={stats.usuarios.conUbicacion} icon={MapPin} color="bg-teal-500/15 text-teal-400" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <StatCard label="Admins" value={stats.usuarios.admins} icon={ShieldCheck} color="bg-rose-500/15 text-rose-400" href="/admin/users" />
                        <StatCard label="Cancha Abierta" value={stats.canchaAbierta} icon={Activity} color="bg-orange-500/15 text-orange-400" href="/admin/cancha-abierta" />
                    </div>
                </section>

                {/* ── Género y Lado ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-card/60 border border-hairline rounded-2xl p-5">
                        <SectionTitle>Género</SectionTitle>
                        <div className="space-y-3">
                            <BarRow label="Masculino" value={stats.genero.masculino} total={stats.usuarios.jugadores} color="bg-blue-400" />
                            <BarRow label="Femenino" value={stats.genero.femenino} total={stats.usuarios.jugadores} color="bg-pink-400" />
                            <BarRow label="Sin especificar" value={stats.genero.sinEspecificar} total={stats.usuarios.jugadores} color="bg-slate-500" />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <div className="flex-1 bg-blue-500/15 rounded-xl py-2 text-center">
                                <p className="text-lg font-black text-blue-400">{stats.genero.masculino}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Hombres</p>
                            </div>
                            <div className="flex-1 bg-pink-500/15 rounded-xl py-2 text-center">
                                <p className="text-lg font-black text-pink-400">{stats.genero.femenino}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-pink-400">Mujeres</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-card/60 border border-hairline rounded-2xl p-5">
                        <SectionTitle>Lado de juego</SectionTitle>
                        <div className="space-y-3">
                            <BarRow label="Drive" value={stats.lado.drive} total={stats.usuarios.jugadores} color="bg-indigo-400" />
                            <BarRow label="Revés" value={stats.lado.reves} total={stats.usuarios.jugadores} color="bg-emerald-400" />
                            <BarRow label="Ambos" value={stats.lado.ambos} total={stats.usuarios.jugadores} color="bg-amber-400" />
                            <BarRow label="Sin especificar" value={stats.lado.sinEspecificar} total={stats.usuarios.jugadores} color="bg-slate-500" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                { label: "Drive", value: stats.lado.drive, color: "bg-celeste/15 text-celeste-light" },
                                { label: "Revés", value: stats.lado.reves, color: "bg-emerald-500/15 text-emerald-400" },
                                { label: "Ambos", value: stats.lado.ambos, color: "bg-amber-500/15 text-amber-400" },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl py-2 text-center ${s.color}`}>
                                    <p className="text-lg font-black">{s.value}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ── Categorías ── */}
                <section className="bg-card/60 border border-hairline rounded-2xl p-5">
                    <SectionTitle>Distribución por categoría</SectionTitle>
                    <div className="space-y-3">
                        {sortedCats.map(c => (
                            <BarRow
                                key={c.category}
                                label={`Cat. ${c.category}`}
                                value={c.count}
                                total={stats.usuarios.jugadores}
                                color={CATEGORY_COLORS[c.category] ?? "bg-slate-400"}
                            />
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {sortedCats.map(c => (
                            <div key={c.category} className="flex items-center gap-2 bg-surface border border-hairline rounded-xl px-3 py-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[c.category] ?? "bg-slate-400"}`} />
                                <span className="text-[11px] font-black text-muted-foreground">{c.category}</span>
                                <span className="text-[11px] font-bold text-muted-foreground">{c.count}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Torneos ── */}
                <section className="bg-card/60 border border-hairline rounded-2xl p-5">
                    <SectionTitle>Torneos</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Borrador", value: stats.torneos.draft, color: "bg-surface-raised text-subtle border-hairline" },
                            { label: "Publicados", value: stats.torneos.publicados, color: "bg-blue-500/15 text-blue-400 border-blue-100" },
                            { label: "En curso", value: stats.torneos.enCurso, color: "bg-emerald-500/15 text-emerald-400 border-emerald-100" },
                            { label: "Finalizados", value: stats.torneos.finalizados, color: "bg-surface text-muted-foreground border-hairline" },
                        ].map(t => (
                            <div key={t.label} className={`border rounded-xl p-3 text-center ${t.color}`}>
                                <p className="text-2xl font-black">{t.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-70">{t.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Alertas ── */}
                {totalPendientes > 0 && (
                    <section className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5">
                        <SectionTitle>Pendientes de revisión</SectionTitle>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/admin/requests" className="bg-card/60 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 hover:border-amber-400/50 transition-colors">
                                <ClipboardList className="w-5 h-5 text-amber-400 shrink-0" />
                                <div>
                                    <p className="text-xl font-black text-amber-400">{stats.pendientes.solicitudes}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Solicitudes</p>
                                </div>
                            </Link>
                            <Link href="/admin/requests" className="bg-card/60 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 hover:border-amber-400/50 transition-colors">
                                <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                                <div>
                                    <p className="text-xl font-black text-amber-400">{stats.pendientes.mensajes}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Mensajes</p>
                                </div>
                            </Link>
                        </div>
                    </section>
                )}

            </div>
        </div>
    );
}
