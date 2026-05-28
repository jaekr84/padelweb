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
        <div className={`bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group ${href ? "cursor-pointer hover:border-indigo-200" : ""}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
    return href ? <Link href={href}>{content}</Link> : content;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-1 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">{children}</h2>
        </div>
    );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-600 w-28 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-black text-slate-800 w-8 text-right">{value}</span>
            <span className="text-[10px] text-slate-400 w-8">{pct}%</span>
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
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 py-4 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-500">Panel General</p>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 leading-none">
                            Dashboard <span className="text-indigo-600">A.C.A.P.</span>
                        </h1>
                    </div>
                    {totalPendientes > 0 && (
                        <Link href="/admin/requests" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2 text-[11px] font-black hover:bg-amber-100 transition-colors">
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
                        <StatCard label="Jugadores" value={stats.usuarios.jugadores} icon={Users} color="bg-indigo-50 text-indigo-600" href="/admin/users" />
                        <StatCard label="Torneos" value={totalTorneos} icon={Trophy} color="bg-amber-50 text-amber-600" href="/admin/tournaments" />
                        <StatCard label="Inscripciones" value={stats.inscripciones} icon={ClipboardList} color="bg-emerald-50 text-emerald-600" />
                        <StatCard label="Clubes" value={stats.usuarios.clubs} icon={Building2} color="bg-sky-50 text-sky-600" href="/directory" />
                    </div>
                </section>

                {/* ── Usuarios ── */}
                <section>
                    <SectionTitle>Usuarios</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Activos" value={stats.usuarios.activos} icon={UserCheck} color="bg-emerald-50 text-emerald-600" sub={`de ${stats.usuarios.jugadores} totales`} />
                        <StatCard label="Baneados" value={stats.usuarios.baneados} icon={UserX} color="bg-red-50 text-red-500" />
                        <StatCard label="Con foto" value={`${perfilCompleto}%`} icon={ImageIcon} color="bg-violet-50 text-violet-600" sub={`${stats.usuarios.conFoto} jugadores`} />
                        <StatCard label="Con ubicación" value={stats.usuarios.conUbicacion} icon={MapPin} color="bg-teal-50 text-teal-600" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <StatCard label="Admins" value={stats.usuarios.admins} icon={ShieldCheck} color="bg-rose-50 text-rose-600" href="/admin/users" />
                        <StatCard label="Cancha Abierta" value={stats.canchaAbierta} icon={Activity} color="bg-orange-50 text-orange-600" href="/admin/cancha-abierta" />
                    </div>
                </section>

                {/* ── Género y Lado ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <SectionTitle>Género</SectionTitle>
                        <div className="space-y-3">
                            <BarRow label="Masculino" value={stats.genero.masculino} total={stats.usuarios.jugadores} color="bg-blue-400" />
                            <BarRow label="Femenino" value={stats.genero.femenino} total={stats.usuarios.jugadores} color="bg-pink-400" />
                            <BarRow label="Sin especificar" value={stats.genero.sinEspecificar} total={stats.usuarios.jugadores} color="bg-slate-300" />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <div className="flex-1 bg-blue-50 rounded-xl py-2 text-center">
                                <p className="text-lg font-black text-blue-600">{stats.genero.masculino}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Hombres</p>
                            </div>
                            <div className="flex-1 bg-pink-50 rounded-xl py-2 text-center">
                                <p className="text-lg font-black text-pink-600">{stats.genero.femenino}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-pink-400">Mujeres</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <SectionTitle>Lado de juego</SectionTitle>
                        <div className="space-y-3">
                            <BarRow label="Drive" value={stats.lado.drive} total={stats.usuarios.jugadores} color="bg-indigo-400" />
                            <BarRow label="Revés" value={stats.lado.reves} total={stats.usuarios.jugadores} color="bg-emerald-400" />
                            <BarRow label="Ambos" value={stats.lado.ambos} total={stats.usuarios.jugadores} color="bg-amber-400" />
                            <BarRow label="Sin especificar" value={stats.lado.sinEspecificar} total={stats.usuarios.jugadores} color="bg-slate-300" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                { label: "Drive", value: stats.lado.drive, color: "bg-indigo-50 text-indigo-600" },
                                { label: "Revés", value: stats.lado.reves, color: "bg-emerald-50 text-emerald-600" },
                                { label: "Ambos", value: stats.lado.ambos, color: "bg-amber-50 text-amber-600" },
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
                <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
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
                            <div key={c.category} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[c.category] ?? "bg-slate-400"}`} />
                                <span className="text-[11px] font-black text-slate-700">{c.category}</span>
                                <span className="text-[11px] font-bold text-slate-400">{c.count}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Torneos ── */}
                <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <SectionTitle>Torneos</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Borrador", value: stats.torneos.draft, color: "bg-slate-100 text-slate-500 border-slate-200" },
                            { label: "Publicados", value: stats.torneos.publicados, color: "bg-blue-50 text-blue-600 border-blue-100" },
                            { label: "En curso", value: stats.torneos.enCurso, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                            { label: "Finalizados", value: stats.torneos.finalizados, color: "bg-slate-50 text-slate-400 border-slate-100" },
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
                    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <SectionTitle>Pendientes de revisión</SectionTitle>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/admin/requests" className="bg-white border border-amber-100 rounded-xl p-4 flex items-center gap-3 hover:border-amber-300 transition-colors">
                                <ClipboardList className="w-5 h-5 text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-xl font-black text-amber-700">{stats.pendientes.solicitudes}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Solicitudes</p>
                                </div>
                            </Link>
                            <Link href="/admin/requests" className="bg-white border border-amber-100 rounded-xl p-4 flex items-center gap-3 hover:border-amber-300 transition-colors">
                                <Mail className="w-5 h-5 text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-xl font-black text-amber-700">{stats.pendientes.mensajes}</p>
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
