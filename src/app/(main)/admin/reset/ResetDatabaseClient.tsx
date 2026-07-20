"use client";

import { useState, useTransition } from "react";
import {
    Users, Trophy, Activity, Swords, Building2, MessageSquare,
    AlertTriangle, ShieldAlert, Loader2, RotateCcw, Check
} from "lucide-react";
import { toast } from "sonner";
import { getResetCounts, resetScope } from "./actions";
import { RESET_CONFIRMATIONS, type ResetScope, type ResetCounts } from "./constants";

interface Props {
    initialCounts: ResetCounts;
}

interface ScopeCard {
    scope: ResetScope;
    title: string;
    icon: React.ElementType;
    /** Qué borra, en palabras del usuario. */
    wipes: string[];
    /** Conteos a mostrar como "lo que se va a borrar". */
    summary: (c: ResetCounts) => string;
}

const CARDS: ScopeCard[] = [
    {
        scope: "users",
        title: "Usuarios",
        icon: Users,
        wipes: ["Usuarios (excepto superadmins)", "Sus inscripciones a torneos, partidos y cancha abierta", "Sus posts, mensajes y publicaciones"],
        summary: c => `${c.users} usuarios`,
    },
    {
        scope: "tournaments",
        title: "Torneos",
        icon: Trophy,
        wipes: ["Torneos e inscripciones", "Grupos, partidos de grupo y llaves", "Puntos de ranking (vuelven a 0)"],
        summary: c => `${c.tournaments} torneos · ${c.tournamentRegistrations} inscripciones`,
    },
    {
        scope: "openCourt",
        title: "Cancha Abierta",
        icon: Activity,
        wipes: ["Eventos de cancha abierta", "Inscripciones, canchas y partidos generados"],
        summary: c => `${c.openCourtEvents} eventos · ${c.openCourtRegistrations} inscripciones`,
    },
    {
        scope: "matches",
        title: "Partidos",
        icon: Swords,
        wipes: ["Partidos públicos", "Sus inscripciones"],
        summary: c => `${c.matches} partidos · ${c.matchRegistrations} inscripciones`,
    },
    {
        scope: "clubs",
        title: "Clubes",
        icon: Building2,
        wipes: ["Clubes y solicitudes de club", "Desvincula del club a los usuarios que queden"],
        summary: c => `${c.clubs} clubes`,
    },
    {
        scope: "social",
        title: "Contenido social",
        icon: MessageSquare,
        wipes: ["Posts y comentarios", "Marketplace", "Conversaciones y mensajes", "Notificaciones push y solicitudes"],
        summary: c => `${c.posts} posts · ${c.messages} mensajes · ${c.marketplaceItems} publicaciones`,
    },
];

export default function ResetDatabaseClient({ initialCounts }: Props) {
    const [counts, setCounts] = useState<ResetCounts>(initialCounts);
    const [confirmingScope, setConfirmingScope] = useState<ResetScope | null>(null);
    const [typed, setTyped] = useState("");
    const [password, setPassword] = useState("");
    const [isPending, startTransition] = useTransition();

    const expectedPhrase = confirmingScope ? RESET_CONFIRMATIONS[confirmingScope] : "";
    const canConfirm = typed.trim() === expectedPhrase && password.length > 0;
    const activeCard = CARDS.find(c => c.scope === confirmingScope);

    const closeModal = () => {
        setConfirmingScope(null);
        setTyped("");
        setPassword("");
    };

    const handleConfirm = () => {
        if (!confirmingScope || !canConfirm) return;
        const scope = confirmingScope;

        startTransition(async () => {
            try {
                await resetScope(scope, typed.trim(), password);
                const fresh = await getResetCounts();
                setCounts(fresh);
                toast.success(
                    scope === "all" ? "Base de datos reseteada por completo" : `Reset de ${activeCard?.title ?? scope} completado`
                );
                closeModal();
            } catch (err: any) {
                toast.error(err?.message || "No se pudo completar el reset");
            }
        });
    };

    return (
        <div className="theme-night min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start gap-3 border-b border-white/12 pb-5">
                    <div className="w-10 h-10 rounded-xl bg-live/15 border border-live/40 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-5 h-5 text-live" />
                    </div>
                    <div>
                        <span className="label-tech text-[9px] text-live">Zona de peligro · Solo superadmin</span>
                        <h1 className="heading-sport text-2xl text-white mt-0.5">Resetear base de datos</h1>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
                            Deja los datos en punto de inicio antes de producción. Las acciones son
                            <span className="text-white font-bold"> irreversibles</span> y no generan copia de seguridad:
                            exportá un backup antes de ejecutarlas.
                        </p>
                    </div>
                </div>

                {/* Qué nunca se toca */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/30">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Nunca se borran</span>
                    <span className="text-[11px] text-slate-300">
                        Superadmins ({counts.protectedUsers} cuentas) · Categorías · Sponsors · Configuración del sistema
                    </span>
                </div>

                {/* Resets por área */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CARDS.map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.scope} className="flex flex-col gap-3 p-4 rounded-xl bg-carbon-900 border border-white/12">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/12 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-[13px] font-black uppercase italic tracking-tight text-white leading-none">{card.title}</h2>
                                        <span className="text-[10px] font-bold text-slate-400">{card.summary(counts)}</span>
                                    </div>
                                </div>

                                <ul className="space-y-1 flex-1">
                                    {card.wipes.map(w => (
                                        <li key={w} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                                            <span className="text-live mt-[1px]">—</span>
                                            <span>{w}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => { setConfirmingScope(card.scope); setTyped(""); setPassword(""); }}
                                    className="h-9 rounded-lg bg-live/15 border border-live/40 text-live label-tech text-[9px] hover:bg-live hover:text-white transition-all"
                                >
                                    Resetear {card.title}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Reset total */}
                <div className="p-5 rounded-xl bg-live/[0.07] border-2 border-live/40 space-y-3">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-live shrink-0" />
                        <div>
                            <h2 className="text-[13px] font-black uppercase italic tracking-tight text-white leading-none">Borrar todo</h2>
                            <span className="text-[10px] font-bold text-slate-400">
                                Ejecuta las seis áreas de una vez: {counts.users} usuarios, {counts.tournaments} torneos,{" "}
                                {counts.openCourtEvents} eventos, {counts.matches} partidos, {counts.clubs} clubes y todo el contenido
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => { setConfirmingScope("all"); setTyped(""); setPassword(""); }}
                        className="w-full h-11 rounded-lg bg-live text-white label-tech text-[10px] hover:bg-rojo-dark transition-all shadow-lg shadow-live/20"
                    >
                        Dejar la base en punto de inicio
                    </button>
                </div>
            </div>

            {/* Confirmación */}
            {confirmingScope && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={isPending ? undefined : closeModal} />

                    <div className="relative w-full max-w-md bg-carbon-900 border border-live/40 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-live/15 border border-live/40 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-live" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase italic tracking-tight text-white leading-none">
                                        {confirmingScope === "all" ? "Borrar todo" : `Resetear ${activeCard?.title}`}
                                    </h3>
                                    <span className="text-[10px] font-bold text-live uppercase tracking-widest">Acción irreversible</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-black/40 border border-white/12 space-y-1.5">
                                <span className="label-tech text-[9px] text-slate-400">Se va a borrar</span>
                                {(confirmingScope === "all"
                                    ? CARDS.map(c => `${c.title}: ${c.summary(counts)}`)
                                    : (activeCard?.wipes ?? [])
                                ).map(line => (
                                    <p key={line} className="text-[11px] text-slate-200">— {line}</p>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400">
                                    Escribí <span className="text-live font-black">{expectedPhrase}</span> para confirmar
                                </label>
                                <input
                                    autoFocus
                                    value={typed}
                                    onChange={e => setTyped(e.target.value)}
                                    disabled={isPending}
                                    placeholder={expectedPhrase}
                                    className="w-full h-11 px-3 rounded-lg bg-black/40 border border-white/12 text-white text-sm font-bold tracking-wide outline-none focus:border-live/60 placeholder:text-slate-600 disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400">
                                    Confirmá con tu contraseña de superadmin
                                </label>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    disabled={isPending}
                                    placeholder="••••••••"
                                    className="w-full h-11 px-3 rounded-lg bg-black/40 border border-white/12 text-white text-sm font-bold outline-none focus:border-live/60 placeholder:text-slate-600 disabled:opacity-50"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={closeModal}
                                    disabled={isPending}
                                    className="flex-1 h-10 rounded-lg bg-white/5 border border-white/12 text-slate-300 label-tech text-[9px] hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!canConfirm || isPending}
                                    className="flex-[2] h-10 rounded-lg bg-live text-white label-tech text-[9px] hover:bg-rojo-dark transition-all flex items-center justify-center gap-2 disabled:bg-carbon-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                                >
                                    {isPending ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Borrando...</>
                                    ) : (
                                        <><RotateCcw className="w-3.5 h-3.5" /> Confirmar borrado</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
