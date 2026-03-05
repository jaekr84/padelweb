"use client";

import { useState, useMemo } from "react";
import { UserProfile, useUser } from "@clerk/nextjs";
import { updatePlayerProfile, switchRole } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Edit2,
    MapPin,
    Calendar,
    Trophy,
    Activity,
    Settings,
    ChevronRight,
    Award,
    GraduationCap,
    Clock,
    Medal,
    Star,
    Hand
} from "lucide-react";
import Link from "next/link";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "../profiles/club/ClubProfileClient";
import CentroProfileClient from "../profiles/centro/CentroProfileClient";
import ProfeProfileClient from "../profiles/profe/ProfeProfileClient";

interface PlayerProfileClientProps {
    dbUser: any;
    registrations: any[];
    matchHistory: any[];
    isOwnProfile: boolean;
    clubProfile?: any;
    createdTournaments?: any[];
    profeProfile?: any;
}

export default function PlayerProfileClient({
    dbUser,
    registrations,
    matchHistory,
    isOwnProfile,
    clubProfile,
    createdTournaments,
    profeProfile
}: PlayerProfileClientProps) {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("tournaments");
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: dbUser?.name || user?.fullName || "",
        location: dbUser?.location || "",
        side: dbUser?.side || "drive",
        bio: dbUser?.bio || ""
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePlayerProfile(formData);
            toast.success("Perfil actualizado");
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            toast.error("Error al actualizar");
        } finally {
            setSaving(false);
        }
    };

    const handleSwitchRole = async () => {
        const promise = switchRole("profe");
        toast.promise(promise, {
            loading: 'Cambiando rol...',
            success: 'Ahora eres Profesor. ¡Configura tu perfil!',
            error: 'Error al cambiar rol'
        });
        await promise;
        router.push("/profiles/profe");
    };

    if (!isLoaded || !user) return null;

    const myName = dbUser?.name || user.fullName || "";

    // Stats aggregation
    const stats = useMemo(() => {
        const matches = matchHistory.length;
        const wins = matchHistory.filter(m => {
            const isT1 = m.match.team1Name?.includes(myName);
            return isT1 ? m.match.score1 > m.match.score2 : m.match.score2 > m.match.score1;
        }).length;

        return {
            matches,
            wins,
            points: dbUser?.points || 0,
            category: dbUser?.category || "5ta",
            side: dbUser?.side || "drive"
        };
    }, [matchHistory, myName, dbUser]);

    const activeTournaments = registrations.filter(r =>
        r.tournament.status === "en_curso" || r.tournament.status === "en_eliminatorias"
    );

    const allMatchesHistory = matchHistory.map(m => ({
        ...m,
        type: m.match.type === "group" ? "Fase de Grupos" : "Eliminatorias",
        tournamentName: m.tournamentName
    })).sort((a, b) => new Date(b.match.createdAt).getTime() - new Date(a.match.createdAt).getTime());

    return (
        <FeedLayout>
            <div className="min-h-screen bg-[#090A0F] text-white pb-20 font-sans selection:bg-blue-500/30">
                <div className="max-w-4xl mx-auto px-4 pt-4 md:pt-8 flex flex-col gap-6 animate-in fade-in duration-700">

                    {/* ── Specialized Profiles (Club / Centro) ── */}
                    {(dbUser?.role === "club" || dbUser?.role === "centro_de_padel") ? (
                        <div className="col-span-full">
                            {dbUser?.role === "club" ? (
                                <ClubProfileClient
                                    user={user}
                                    club={clubProfile}
                                    members={[]}
                                    userTournaments={createdTournaments || []}
                                />
                            ) : (
                                <CentroProfileClient
                                    centro={clubProfile}
                                    isOwner={isOwnProfile}
                                    embedded={false}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ── Hero (Standard Player/Profe) ── */}
                            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                                {/* Banner */}
                                <div className="h-32 md:h-48 bg-gradient-to-br from-blue-600/30 via-blue-900/50 to-emerald-500/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,0.15),transparent)]" />
                                </div>

                                <div className="absolute top-4 right-4 flex gap-2 z-10">
                                    {isOwnProfile && (
                                        <>
                                            {(dbUser?.role === "jugador" || dbUser?.role === "profe") && (
                                                !profeProfile ? (
                                                    <button className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg" onClick={handleSwitchRole}>
                                                        <GraduationCap className="h-4 w-4" /> Ser Profe
                                                    </button>
                                                ) : (
                                                    <Link href="/profiles/profe" className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg">
                                                        <GraduationCap className="h-4 w-4" /> Perfil Profe
                                                    </Link>
                                                )
                                            )}

                                            <button className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg" onClick={() => setIsEditing(true)}>
                                                <Edit2 className="h-4 w-4" /> Editar
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity" />
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#090A0F] overflow-hidden bg-slate-800 shadow-2xl relative">
                                            <img src={user.imageUrl} alt={user.fullName || ""} className="w-full h-full object-cover" />
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left pt-2 pb-1">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{user.fullName}</h1>
                                            {dbUser?.role && (
                                                <div className="flex self-center md:self-auto px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                                        {dbUser.role === 'profe' ? 'Profesor' : dbUser.role === 'admin' ? 'Administrador' : dbUser.role === 'club' ? 'Club' : dbUser.role === 'centro_de_padel' ? 'Centro' : 'Jugador'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/40 text-xs font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5" /> {dbUser?.location || "Sin ubicación"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5" /> Se unió {user.createdAt ? user.createdAt.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : "Recientemente"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <span className="text-2xl font-black italic tracking-tighter text-blue-500">{dbUser?.points || 0}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Puntos</span>
                                        </div>
                                        <div className="flex flex-col items-center px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <span className="text-2xl font-black italic tracking-tighter text-emerald-500">{dbUser?.category || "5ta"}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Nivel</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Bio Block ── */}
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] shadow-xl">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Sobre mí</h3>
                                <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                                    {dbUser?.bio || "Sin biografía aún. ¡Cuéntanos sobre tu juego! 🎾"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                                        <Hand className="h-3 w-3" /> Lado: {stats.side === "drive" ? "Drive" : "Revés"}
                                    </div>
                                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                        <Trophy className="h-3 w-3" /> Partidos: {stats.matches}
                                    </div>
                                </div>
                            </div>

                            {/* ── Tabs ── */}
                            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 overflow-x-auto no-scrollbar shadow-inner">
                                <button
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "tournaments" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                                    onClick={() => setActiveTab("tournaments")}
                                >
                                    Torneos
                                </button>
                                <button
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "stats" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                                    onClick={() => setActiveTab("stats")}
                                >
                                    Estadísticas
                                </button>
                                <button
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "trophies" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                                    onClick={() => setActiveTab("trophies")}
                                >
                                    Trofeos
                                </button>
                                {profeProfile && (
                                    <button
                                        className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "profe" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                                        onClick={() => setActiveTab("profe")}
                                    >
                                        Academia
                                    </button>
                                )}
                                <button
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "account" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                                    onClick={() => setActiveTab("account")}
                                >
                                    Mi Cuenta
                                </button>
                            </div>

                            {/* ── Content ── */}
                            <div className="animate-in slide-in-from-bottom-4 duration-500">
                                {activeTab === "tournaments" && (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex justify-between items-center px-2">
                                            <h2 className="text-lg font-black uppercase tracking-widest italic">Actividad Reciente</h2>
                                        </div>
                                        {activeTournaments.length === 0 ? (
                                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 text-center flex flex-col items-center gap-4">
                                                <Activity className="h-12 w-12 text-white/10" />
                                                <p className="text-white/40 text-sm font-medium">No tienes torneos activos ahora.</p>
                                                <Link href="/tournaments" className="mt-2 px-6 py-3 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40">Explorar Torneos</Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {activeTournaments.map(reg => (
                                                    <div key={reg.id} className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-blue-500/50 transition-all flex flex-col gap-4 shadow-xl">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex flex-col gap-1">
                                                                <h3 className="font-black uppercase italic tracking-tight text-lg group-hover:text-blue-400 transition-colors">{reg.tournament.name}</h3>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate">Compañero: {reg.partnerName || "TBD"}</span>
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${reg.tournament.status === "en_curso" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-purple-500/20 text-purple-400 border border-purple-500/30"}`}>
                                                                {reg.tournament.status === "en_curso" ? "Activo" : "Cruces"}
                                                            </div>
                                                        </div>
                                                        <Link href={`/tournaments/${reg.tournamentId}/manage`} className="w-full bg-white/10 group-hover:bg-blue-600 transition-all py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                                            Ver Torneo <ChevronRight className="h-3 w-3" />
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "stats" && (
                                    <div className="flex flex-col gap-6">
                                        <h2 className="text-lg font-black uppercase tracking-widest italic px-2">Historial de Partidos</h2>
                                        {allMatchesHistory.length > 0 ? (
                                            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-xl">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-white/5">
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Fecha</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Torneo</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Oponentes</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Resultado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {allMatchesHistory.map((m, i) => {
                                                                const isT1 = m.match.team1Name?.includes(myName);
                                                                const opponents = isT1 ? m.match.team2Name : m.match.team1Name;
                                                                const won = isT1 ? m.match.score1 > m.match.score2 : m.match.score2 > m.match.score1;
                                                                const date = new Date(m.match.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                                                                return (
                                                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                                        <td className="px-6 py-4 text-xs font-bold text-white/40 group-hover:text-white/60">{date}</td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-black uppercase italic tracking-tight mb-1">{m.tournamentName}</span>
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-blue-400/50 transition-colors uppercase">{m.type}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-xs font-bold text-white/80">{opponents}</td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${won ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-900/20" : "bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-900/20"}`}>
                                                                                    {won ? "V" : "D"}
                                                                                </div>
                                                                                <span className="text-sm font-black italic tracking-tighter tabular-nums">{m.match.score1}-{m.match.score2}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 text-center flex flex-col items-center gap-4">
                                                <Settings className="h-12 w-12 text-white/10" />
                                                <p className="text-white/40 text-sm font-medium">Aún no has disputado partidos oficiales.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "trophies" && (
                                    <div className="flex flex-col gap-6">
                                        <h2 className="text-lg font-black uppercase tracking-widest italic px-2">Muro de Campeones</h2>
                                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-16 text-center flex flex-col items-center gap-6 shadow-xl">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20" />
                                                <Trophy className="h-20 w-20 text-white/10 relative" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-white/40 text-sm font-medium">Próximamente verás aquí tus títulos y finales alcanzadas.</p>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/50">Keep competing</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "profe" && profeProfile && (
                                    <ProfeProfileClient
                                        profe={profeProfile}
                                        isOwner={isOwnProfile}
                                        embedded={true}
                                    />
                                )}

                                {activeTab === "account" && (
                                    <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl overflow-hidden scale-95 md:scale-100 origin-top">
                                        <UserProfile routing="hash" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Edit Modal ── */}
                    {isEditing && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
                            <div className="bg-[#0D0F16] border border-white/10 rounded-[2.5rem] w-full max-w-[500px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl">
                                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Editar Perfil</h2>
                                    <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
                                </div>
                                <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Nombre en Pista</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold transition-all outline-none focus:border-blue-500 shadow-inner"
                                            placeholder="Tu nombre"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Ubicación</label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold transition-all outline-none focus:border-blue-500 shadow-inner"
                                                placeholder="Ciudad"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Lado Preferido</label>
                                            <select
                                                value={formData.side}
                                                onChange={e => setFormData({ ...formData, side: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold transition-all outline-none focus:border-blue-500 shadow-inner appearance-none"
                                            >
                                                <option value="drive">Drive</option>
                                                <option value="reves">Revés</option>
                                                <option value="ambos">Ambos</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Bio Personal</label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold transition-all outline-none focus:border-blue-500 resize-none shadow-inner"
                                            placeholder="Cuéntanos un poco sobre ti..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <button type="button" onClick={() => setIsEditing(false)} className="bg-white/5 text-white/60 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                                        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50">
                                            {saving ? "Guardando..." : "Guardar Cambios"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FeedLayout>
    );
}
