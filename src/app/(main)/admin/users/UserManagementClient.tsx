"use client";

import { useState } from "react";
import { 
    Plus, 
    Trash2, 
    Save, 
    MoveUp, 
    MoveDown, 
    Layers, 
    Pencil, 
    X, 
    Trophy,
    Shield,
    Search,
    Ban,
    CheckCircle,
    XCircle,
    Clock,
    UserCog,
    Filter,
    UserCheck,
    UserX,
    Users,
    ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toggleUserStatus, banUser, updateUserRole, updateUserCategory, updateUserClub, resetDatabasePlayers } from "./actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ManagedUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean | null;
    bannedUntil: Date | null;
    points: number | null;
    category: string | null;
    gender: string | null;
    documentNumber: string | null;
    createdAt: Date;
}

interface Category {
    id: string;
    name: string;
    categoryOrder: number;
}

interface UserManagementClientProps {
    initialUsers: ManagedUser[];
    categories: Category[];
    clubs: { id: string, name: string }[];
}

export default function UserManagementClient({ initialUsers, categories, clubs }: UserManagementClientProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [genderFilter, setGenderFilter] = useState("all");
    const [usersList, setUsersList] = useState(initialUsers);

    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [banDays, setBanDays] = useState(7);
    const [newRole, setNewRole] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newClubId, setNewClubId] = useState<string | null>(null);
    const [newPoints, setNewPoints] = useState<number>(0);
    const [loading, setLoading] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    const filteredUsers = usersList.filter(u => {
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const matchesSearch = 
            fullName.includes(search.toLowerCase()) || 
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.documentNumber && u.documentNumber.includes(search));
        
        // Status Filter
        let matchesStatus = true;
        if (statusFilter === "active") matchesStatus = u.isActive !== false;
        if (statusFilter === "disabled") matchesStatus = u.isActive === false;
        if (statusFilter === "banned") matchesStatus = !!(u.bannedUntil && new Date(u.bannedUntil) > new Date());

        // Role Filter
        let matchesRole = true;
        if (roleFilter !== "all") matchesRole = u.role === roleFilter;

        // Gender Filter
        let matchesGender = true;
        if (genderFilter !== "all") matchesGender = u.gender === genderFilter;
        
        return matchesSearch && matchesStatus && matchesRole && matchesGender;
    });

    const handleUpdateCategory = async () => {
        if (!selectedUser) return;
        setLoading(selectedUser.id);
        try {
            await updateUserCategory(selectedUser.id, newCategory, newPoints);
            setUsersList(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, category: newCategory, points: newPoints } : u
            ));
            setIsCategoryModalOpen(false);
            toast.success(`Categoría actualizada a ${newCategory}`);
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar categoría");
        }
        setLoading(null);
    };

    const handleToggleStatus = async (user: ManagedUser) => {
        setLoading(user.id);
        const newStatus = user.isActive === false;
        try {
            await toggleUserStatus(user.id, newStatus);
            setUsersList(prev => prev.map(u => 
                u.id === user.id ? { ...u, isActive: newStatus } : u
            ));
            toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);
        } catch (error: any) {
            toast.error(error.message || "Error al cambiar estado");
        }
        setLoading(null);
    };

    const handleBan = async () => {
        if (!selectedUser) return;
        setLoading(selectedUser.id);
        try {
            await banUser(selectedUser.id, banDays);
            const bannedUntil = new Date();
            bannedUntil.setDate(bannedUntil.getDate() + banDays);
            
            setUsersList(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, bannedUntil } : u
            ));
            setIsBanModalOpen(false);
            toast.success(`Usuario baneado por ${banDays} días`);
        } catch (error: any) {
            toast.error(error.message || "Error al banear usuario");
        }
        setLoading(null);
    };

    const handleUpdateRole = async () => {
        if (!selectedUser || !newRole) return;
        setLoading(selectedUser.id);
        try {
            await updateUserRole(selectedUser.id, newRole);
            setUsersList(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, role: newRole } : u
            ));
            setIsRoleModalOpen(false);
            toast.success(`Rol actualizado a ${newRole}`);
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar rol");
        }
        setLoading(null);
    };

    const handleUpdateClub = async () => {
        if (!selectedUser) return;
        setLoading(selectedUser.id);
        try {
            await updateUserClub(selectedUser.id, newClubId);
            // We should ideally have clubId and club name in ManagedUser if we want to display it
            // For now just success toast
            setIsClubModalOpen(false);
            toast.success("Viculación con club actualizada");
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar club");
        }
        setLoading(null);
    };

    const handleUnban = async (user: ManagedUser) => {
        setLoading(user.id);
        try {
            await banUser(user.id, null);
            setUsersList(prev => prev.map(u => 
                u.id === user.id ? { ...u, bannedUntil: null } : u
            ));
            toast.success("Baneo removido");
        } catch (error: any) {
            toast.error(error.message || "Error al remover baneo");
        }
        setLoading(null);
    };

    const isCurrentlyBanned = (user: ManagedUser) => {
        return user.bannedUntil && new Date(user.bannedUntil) > new Date();
    };

    const stats = {
        total: usersList.length,
        superadmins: usersList.filter(u => u.role === "superadmin").length,
        clubs: usersList.filter(u => u.role === "club").length,
        players: usersList.filter(u => u.role === "jugador").length,
    };

    const handleReset = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará a TODOS los jugadores y clubes de la base de datos (excepto SuperAdmins). Esta acción es IRREVERSIBLE.")) return;
        if (!confirm("CONFIRMACIÓN FINAL: Se perderán todos los datos de jugadores, registros y estadísticas. ¿Proceder?")) return;
        
        setIsResetting(true);
        try {
            await resetDatabasePlayers();
            toast.success("Base de datos de jugadores reseteada correctamente");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Error al resetear base de datos");
        }
        setIsResetting(false);
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 pb-20 pt-8 px-4 md:px-8 font-sans selection:bg-indigo-500/30 relative">
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #6366f1, #a855f7, #3b82f6, #6366f1);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #6366f1, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.2);
                }
            `}</style>

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-violet-600/5 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>
            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 mb-2">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                <Shield className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/80 italic">Admin Tactical Console</span>
                                <div className="h-px w-12 bg-indigo-500/30 mt-1" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">
                            Gestión de <span className="text-gradient-animate">Usuarios</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                             <Layers className="w-3 h-3" /> Promoción de categorías, asignación de puntos y control de acceso neural
                        </p>
                    </div>

                    <button 
                        onClick={handleReset}
                        disabled={isResetting}
                        className="px-8 py-4 bg-red-600/10 text-red-400 border border-red-400/20 rounded-2xl font-black uppercase italic text-[10px] tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center gap-3 shrink-0 disabled:opacity-50 active:scale-95 shadow-lg group"
                    >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        {isResetting ? "EJECUTANDO RESET..." : "Reset Base de Datos"}
                    </button>
                </div>

                {/* Dashboard Controls Row */}
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    {/* KPI Section */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4 w-full">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card rounded-[2rem] p-6 shadow-xl group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                                    <Users className="w-7 h-7 text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Personnel</span>
                                    <span className="text-3xl font-black italic leading-none text-white tracking-tighter">{stats.total}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card rounded-[2rem] p-6 shadow-xl group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                                    <Shield className="w-7 h-7 text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tier 1 Admin</span>
                                    <span className="text-3xl font-black italic leading-none text-white tracking-tighter">{stats.superadmins}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-[2rem] p-6 shadow-xl group hover:border-violet-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/5">
                                    <Shield className="w-7 h-7 text-violet-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Verified Clubs</span>
                                    <span className="text-3xl font-black italic leading-none text-white tracking-tighter">{stats.clubs}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card rounded-[2rem] p-6 shadow-xl group hover:border-emerald-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/5">
                                    <Trophy className="w-7 h-7 text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Units</span>
                                    <span className="text-3xl font-black italic leading-none text-white tracking-tighter">{stats.players}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Filters Section */}
                    <div className="w-full xl:w-[450px] space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text"
                                placeholder="IDENTIFICAR USUARIO (EMAIL, NOMBRE, DNI)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-12 pr-6 py-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl w-full text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-indigo-500/50 transition-all shadow-xl placeholder:text-slate-600"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-slate-300"
                                >
                                    <option value="all">ESTADOS</option>
                                    <option value="active">ACTIVOS</option>
                                    <option value="disabled">INACTIVOS</option>
                                    <option value="banned">BANEADOS</option>
                                </select>
                                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select 
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-slate-300"
                                >
                                    <option value="all">ROLES</option>
                                    <option value="jugador">JUGADOR</option>
                                    <option value="club">CLUB</option>
                                    <option value="superadmin">ADMIN</option>
                                </select>
                                <UserCog className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select 
                                    value={genderFilter}
                                    onChange={(e) => setGenderFilter(e.target.value)}
                                    className="px-4 py-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-slate-300"
                                >
                                    <option value="all">GÉNERO</option>
                                    <option value="masculino">MASC.</option>
                                    <option value="femenino">FEM.</option>
                                </select>
                                <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users View */}
                <div className="space-y-4">
                    {/* Mobile Card Layout */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredUsers.map((user) => {
                            const banned = isCurrentlyBanned(user);
                            const isInactive = user.isActive === false;
                            
                            return (
                                <motion.div 
                                    key={user.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card rounded-[2rem] p-6 space-y-5 shadow-2xl relative group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                                    
                                    {/* User Info Header */}
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-indigo-400 text-xl shadow-inner">
                                                {(user.firstName || "U").charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h3 className="text-lg font-black uppercase italic tracking-tighter truncate leading-tight text-white">
                                                    {user.firstName} {user.lastName}
                                                </h3>
                                                <p className="text-[10px] font-black text-slate-500 truncate uppercase tracking-widest mt-0.5">
                                                    {user.email}
                                                </p>
                                                {user.documentNumber && (
                                                    <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">DNI: {user.documentNumber}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                             <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border shadow-sm ${user.role === 'superadmin' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                                {user.role}
                                            </span>
                                            <div className="text-[10px] font-black uppercase italic text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                                {user.category || "D"} <span className="text-slate-600 px-1">/</span> {user.points || 0} pts
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center gap-3 py-3 border-y border-white/5 relative z-10">
                                        {banned ? (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                BANEADO HASTA {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                            </div>
                                        ) : isInactive ? (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                CUENTA DESHABILITADA
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                OPERATIVO / ACTIVO
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-1 relative z-10">
                                        <button 
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setNewCategory(user.category || "D");
                                                setNewPoints(user.points || 0);
                                                setIsCategoryModalOpen(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest border border-indigo-400/20"
                                        >
                                            <Trophy className="w-4 h-4" /> STATS
                                        </button>
                                        
                                        <div className="flex gap-2.5">
                                            {banned ? (
                                                <button 
                                                    onClick={() => handleUnban(user)}
                                                    className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 active:scale-95 transition-all"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsBanModalOpen(true);
                                                    }}
                                                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20 active:scale-95 transition-all disabled:opacity-20"
                                                    disabled={user.role === 'superadmin'}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewRole(user.role);
                                                    setIsRoleModalOpen(true);
                                                }}
                                                className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20 active:scale-95 transition-all disabled:opacity-20"
                                                disabled={user.role === 'superadmin'}
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </button>

                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-4 rounded-2xl transition-all border shadow-sm ${isInactive 
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
                                                disabled={user.role === 'superadmin'}
                                            >
                                                {isInactive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block glass-card rounded-[2.5rem] overflow-hidden shadow-2xl relative border-white/5">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[1100px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Identificación</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Stats / Tier</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Privilegios</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Estado Neural</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((user) => {
                                        const banned = isCurrentlyBanned(user);
                                        const isInactive = user.isActive === false;
                                        
                                        return (
                                            <motion.tr 
                                                key={user.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`group hover:bg-white/[0.02] transition-colors relative ${loading === user.id ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black italic text-indigo-400 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                                            {(user.firstName || "U").charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-base font-black uppercase italic tracking-tighter truncate text-white">
                                                                {user.firstName} {user.lastName}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-500 truncate uppercase tracking-widest mt-0.5">
                                                                {user.email} {user.documentNumber && <span className="text-indigo-400/40 ml-2">DNI: {user.documentNumber}</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                                            <span className="text-xs font-black italic text-indigo-400">
                                                                {user.category || "D"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black italic text-white leading-none">
                                                                {user.points || 0}
                                                            </span>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-0.5">PUNTOS</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border shadow-sm ${user.role === 'superadmin' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        {banned ? (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                                                                <Clock className="w-3.5 h-3.5" /> BANEADO HASTA {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                                            </span>
                                                        ) : isInactive ? (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">
                                                                <XCircle className="w-3.5 h-3.5" /> INACTIVO
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> ACTIVO
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewCategory(user.category || "D");
                                                                setNewPoints(user.points || 0);
                                                                setIsCategoryModalOpen(true);
                                                            }}
                                                            className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20 transition-all shadow-xl active:scale-90"
                                                            title="STATS"
                                                        >
                                                            <Trophy className="w-4.5 h-4.5" />
                                                        </button>
                                                        {banned ? (
                                                            <button 
                                                                onClick={() => handleUnban(user)}
                                                                className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-xl active:scale-90"
                                                                title="UNBAN"
                                                            >
                                                                <UserCheck className="w-4.5 h-4.5" />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setIsBanModalOpen(true);
                                                                }}
                                                                className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20 transition-all shadow-xl active:scale-90"
                                                                title="BAN"
                                                                disabled={user.role === 'superadmin'}
                                                            >
                                                                <Ban className="w-4.5 h-4.5" />
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewRole(user.role);
                                                                setIsRoleModalOpen(true);
                                                            }}
                                                            className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20 transition-all shadow-xl active:scale-90"
                                                            title="ROL"
                                                            disabled={user.role === 'superadmin'}
                                                        >
                                                            <UserCog className="w-4.5 h-4.5" />
                                                        </button>

                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsClubModalOpen(true);
                                                            }}
                                                            className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/20 transition-all shadow-xl active:scale-90"
                                                            title="CLUB"
                                                        >
                                                            <Shield className="w-4.5 h-4.5" />
                                                        </button>

                                                        <button 
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={`p-3 rounded-2xl transition-all shadow-xl active:scale-90 border ${isInactive 
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" 
                                                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white"}`}
                                                            title={isInactive ? "ENABLE" : "DISABLE"}
                                                            disabled={user.role === 'superadmin'}
                                                        >
                                                            {isInactive ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="px-8 py-24 text-center glass-card border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px]" />
                            <div className="flex flex-col items-center gap-6 relative z-10">
                                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                                    <Search className="w-8 h-8 text-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white text-lg font-black uppercase italic tracking-[0.2em]">Cero Coincidencias</p>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">El radar no detecta usuarios con los parámetros actuales</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isBanModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-card border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                                        <Ban className="w-10 h-10 text-amber-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">RESTRICCIÓN</h2>
                                        <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-[0.3em]">
                                            Sancionando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">PERIODO DE EXCLUSIÓN</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[1, 7, 30].map(days => (
                                            <button 
                                                key={days}
                                                onClick={() => setBanDays(days)}
                                                className={`py-5 rounded-2xl text-[10px] font-black uppercase italic border transition-all ${banDays === days ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30'}`}
                                            >
                                                {days} {days === 1 ? 'DÍA' : 'DÍAS'}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="space-y-2">
                                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">MANUAL (DÍAS)</label>
                                         <input 
                                            type="number" 
                                            value={banDays}
                                            onChange={(e) => setBanDays(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-black text-white outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                            placeholder="0"
                                         />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsBanModalOpen(false)}
                                        className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 transition-all border border-white/5 active:scale-95"
                                    >
                                        ABORTAR
                                    </button>
                                    <button 
                                        onClick={handleBan}
                                        className="flex-[2] py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                                    >
                                        CONFIRMAR EXCLUSIÓN
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Role Modal */}
            <AnimatePresence>
                {isRoleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-card border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                        <UserCog className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">NIVEL DE ACCESO</h2>
                                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em]">
                                            Modificando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">SELECCIONAR ROL</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['jugador', 'club', 'superadmin'].map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => setNewRole(role)}
                                                className={`py-5 rounded-2xl text-[10px] font-black uppercase italic border transition-all ${newRole === role ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/30'}`}
                                            >
                                                {role === 'superadmin' ? 'ADMINISTRADOR' : role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsRoleModalOpen(false)}
                                        className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 transition-all border border-white/5"
                                    >
                                        ATRAS
                                    </button>
                                    <button 
                                        onClick={handleUpdateRole}
                                        className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                                    >
                                        CONFIRMAR CAMBIO
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Category Modal (Promotion) */}
            <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-card border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                        <Trophy className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">AJUSTE DE RANGO</h2>
                                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em]">
                                            Sincronizando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">CATEGORIA ASIGNADA</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {Array.from(new Map(categories.map(cat => [cat.name, cat])).values()).map((cat: any) => (
                                                <button 
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setNewCategory(cat.name)}
                                                    className={`py-4 rounded-2xl text-[10px] font-black uppercase italic border transition-all ${newCategory === cat.name ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/30'}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">PUNTUACIÓN MANUAL</label>
                                        <input 
                                            type="number" 
                                            value={newPoints}
                                            onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-black text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsCategoryModalOpen(false)}
                                        className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 transition-all border border-white/5"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleUpdateCategory}
                                        className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                                    >
                                        ACTUALIZAR STATS
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Club Modal */}
            <AnimatePresence>
                {isClubModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-card border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-violet-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/5">
                                        <Shield className="w-10 h-10 text-violet-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">VINCULACIÓN</h2>
                                        <p className="text-[10px] font-black text-violet-400/60 uppercase tracking-[0.3em]">
                                            Asociando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">SELECCIONAR CENTRO</label>
                                    <div className="relative group">
                                        <select 
                                            value={newClubId || ""}
                                            onChange={(e) => setNewClubId(e.target.value || null)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-black text-white outline-none focus:border-violet-500/50 transition-all appearance-none shadow-inner"
                                        >
                                            <option value="" className="bg-slate-900">SIN CLUB / INDEPENDIENTE</option>
                                            {clubs.map(club => (
                                                <option key={club.id} value={club.id} className="bg-slate-900">{club.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-violet-400 transition-colors">
                                            <ChevronRight className="w-5 h-5 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsClubModalOpen(false)}
                                        className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 transition-all border border-white/5"
                                    >
                                        SALIR
                                    </button>
                                    <button 
                                        onClick={handleUpdateClub}
                                        className="flex-[2] py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-violet-500/20 active:scale-95 border border-violet-400/20"
                                    >
                                        SITUACIÓN ACTUALIZADA
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
