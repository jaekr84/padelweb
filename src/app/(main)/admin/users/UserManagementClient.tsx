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
    ChevronRight,
    Loader2
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
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8 font-sans selection:bg-indigo-500/30 relative">
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
                    background: hsl(var(--card));
                    backdrop-filter: blur(20px);
                    border: 1px solid hsl(var(--border));
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
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 mb-2">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                <Shield className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 italic">Admin Tactical Console</span>
                                <div className="h-px w-12 bg-indigo-500/30 mt-1" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-foreground">
                            Gestión de <span className="text-gradient-animate">Usuarios</span>
                        </h1>
                        <p className="text-muted-foreground text-[10px] font-black mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Layers className="w-3 h-3" /> Promoción de categorías, asignación de puntos y control de acceso neural
                        </p>
                    </div>

                    <button 
                        onClick={handleReset}
                        disabled={isResetting}
                        className="px-8 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black uppercase italic text-[10px] tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all flex items-center gap-3 shrink-0 disabled:opacity-50 active:scale-95 shadow-lg group"
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
                            className="bg-card border border-border rounded-[2rem] p-6 shadow-xl group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                                    <Users className="w-7 h-7 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Personnel</span>
                                    <span className="text-3xl font-black italic leading-none text-foreground tracking-tighter">{stats.total}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card border border-border rounded-[2rem] p-6 shadow-xl group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                                    <Shield className="w-7 h-7 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tier 1 Admin</span>
                                    <span className="text-3xl font-black italic leading-none text-foreground tracking-tighter">{stats.superadmins}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card border border-border rounded-[2rem] p-6 shadow-xl group hover:border-violet-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/5">
                                    <Shield className="w-7 h-7 text-violet-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verified Clubs</span>
                                    <span className="text-3xl font-black italic leading-none text-foreground tracking-tighter">{stats.clubs}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-card border border-border rounded-[2rem] p-6 shadow-xl group hover:border-emerald-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/5">
                                    <Trophy className="w-7 h-7 text-emerald-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Units</span>
                                    <span className="text-3xl font-black italic leading-none text-foreground tracking-tighter">{stats.players}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Filters Section */}
                    <div className="w-full xl:w-[450px] space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text"
                                placeholder="IDENTIFICAR USUARIO (EMAIL, NOMBRE, DNI)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-12 pr-6 py-4 bg-muted border border-border rounded-2xl w-full text-[10px] font-black uppercase tracking-[0.2em] text-foreground outline-none focus:border-indigo-500/50 transition-all shadow-xl placeholder:text-muted-foreground/30"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-4 bg-muted border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-foreground"
                                >
                                    <option value="all">ESTADOS</option>
                                    <option value="active">ACTIVOS</option>
                                    <option value="disabled">INACTIVOS</option>
                                    <option value="banned">BANEADOS</option>
                                </select>
                                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select 
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-4 bg-muted border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-foreground"
                                >
                                    <option value="all">ROLES</option>
                                    <option value="jugador">JUGADOR</option>
                                    <option value="club">CLUB</option>
                                    <option value="superadmin">ADMIN</option>
                                </select>
                                <UserCog className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select 
                                    value={genderFilter}
                                    onChange={(e) => setGenderFilter(e.target.value)}
                                    className="px-4 py-4 bg-muted border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all shadow-xl w-full text-foreground"
                                >
                                    <option value="all">GÉNERO</option>
                                    <option value="masculino">MASC.</option>
                                    <option value="femenino">FEM.</option>
                                </select>
                                <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
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
                                    className="bg-card border border-border rounded-[2rem] p-6 space-y-5 shadow-2xl relative group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                                    
                                    {/* User Info Header */}
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center font-black italic text-indigo-600 text-xl shadow-inner">
                                                {(user.firstName || "U").charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h3 className="text-lg font-black uppercase italic tracking-tighter truncate leading-tight text-foreground">
                                                    {user.firstName} {user.lastName}
                                                </h3>
                                                <p className="text-[10px] font-black text-muted-foreground truncate uppercase tracking-widest mt-0.5">
                                                    {user.email}
                                                </p>
                                                {user.documentNumber && (
                                                    <p className="text-[9px] font-black text-indigo-600/60 uppercase tracking-widest mt-1">DNI: {user.documentNumber}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                             <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border shadow-sm ${user.role === 'superadmin' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-muted border-border text-muted-foreground'}`}>
                                                {user.role}
                                            </span>
                                            <div className="text-[10px] font-black uppercase italic text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shadow-lg shadow-indigo-500/5">
                                                {user.category || "D"} <span className="text-muted-foreground/30 px-1">/</span> {user.points || 0} pts
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center gap-3 py-3 border-y border-border relative z-10">
                                        {banned ? (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                                BANEADO HASTA {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                            </div>
                                        ) : isInactive ? (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                                CUENTA DESHABILITADA
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
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
                                            className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/10 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest border border-indigo-400/20"
                                        >
                                            <Trophy className="w-4 h-4" /> STATS
                                        </button>
                                        
                                        <div className="flex gap-2.5">
                                            {banned ? (
                                                <button 
                                                    onClick={() => handleUnban(user)}
                                                    className="p-4 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 active:scale-95 transition-all"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsBanModalOpen(true);
                                                    }}
                                                    className="p-4 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 active:scale-95 transition-all disabled:opacity-20"
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
                                                className="p-4 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-95 transition-all disabled:opacity-20"
                                                disabled={user.role === 'superadmin'}
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </button>

                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-4 rounded-2xl transition-all border shadow-sm ${isInactive 
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                    : "bg-rose-50 text-rose-600 border-rose-100"}`}
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
                    <div className="hidden md:block bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[1100px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted border-b border-border">
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Identificación</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Stats / Tier</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Privilegios</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estado Neural</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.map((user) => {
                                        const banned = isCurrentlyBanned(user);
                                        const isInactive = user.isActive === false;
                                        
                                        return (
                                            <motion.tr 
                                                key={user.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`group hover:bg-muted/50 transition-colors relative ${loading === user.id ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center font-black italic text-indigo-600 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                                            {(user.firstName || "U").charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-base font-black uppercase italic tracking-tighter truncate text-foreground">
                                                                {user.firstName} {user.lastName}
                                                            </span>
                                                            <span className="text-[10px] font-black text-muted-foreground truncate uppercase tracking-widest mt-0.5">
                                                                {user.email} {user.documentNumber && <span className="text-indigo-600/40 ml-2">DNI: {user.documentNumber}</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                                                            <span className="text-xs font-black italic text-indigo-600">
                                                                {user.category || "D"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black italic text-foreground leading-none">
                                                                {user.points || 0}
                                                            </span>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">PUNTOS</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border shadow-sm ${user.role === 'superadmin' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-muted border-border text-muted-foreground'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        {banned ? (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">
                                                                <Clock className="w-3.5 h-3.5" /> BANEADO HASTA {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                                            </span>
                                                        ) : isInactive ? (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-600">
                                                                <XCircle className="w-3.5 h-3.5" /> INACTIVO
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> ACTIVO
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
                                                            className="p-3 rounded-2xl bg-muted text-muted-foreground border border-border hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-xl active:scale-90"
                                                            title="STATS"
                                                        >
                                                            <Trophy className="w-4.5 h-4.5" />
                                                        </button>
                                                        {banned ? (
                                                            <button 
                                                                onClick={() => handleUnban(user)}
                                                                className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-xl active:scale-90"
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
                                                                className="p-3 rounded-2xl bg-muted text-muted-foreground border border-border hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all shadow-xl active:scale-90"
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
                                                            className="p-3 rounded-2xl bg-muted text-muted-foreground border border-border hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-xl active:scale-90"
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
                                                            className="p-3 rounded-2xl bg-muted text-muted-foreground border border-border hover:bg-violet-50 hover:text-violet-600 hover:border-violet-100 transition-all shadow-xl active:scale-90"
                                                            title="CLUB"
                                                        >
                                                            <Shield className="w-4.5 h-4.5" />
                                                        </button>

                                                        <button 
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={`p-3 rounded-2xl transition-all shadow-xl active:scale-90 border ${isInactive 
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white" 
                                                                : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"}`}
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
                        <div className="px-8 py-24 text-center bg-card border border-border rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px]" />
                            <div className="flex flex-col items-center gap-6 relative z-10">
                                <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center animate-pulse">
                                    <Search className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-foreground text-lg font-black uppercase italic tracking-[0.2em]">Cero Coincidencias</p>
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">El radar no detecta usuarios con los parámetros actuales</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isBanModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-card border border-border rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-lg shadow-amber-500/5">
                                        <Ban className="w-10 h-10 text-amber-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">RESTRICCIÓN</h2>
                                        <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-[0.3em]">
                                            Sancionando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">PERIODO DE EXCLUSIÓN</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[1, 7, 30].map(days => (
                                            <button 
                                                key={days}
                                                onClick={() => setBanDays(days)}
                                                className={`py-5 rounded-2xl text-[10px] font-black uppercase italic border transition-all ${banDays === days ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted border-border text-muted-foreground hover:border-amber-500/30'}`}
                                            >
                                                {days} {days === 1 ? 'DÍA' : 'DÍAS'}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="space-y-2">
                                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">MANUAL (DÍAS)</label>
                                         <input 
                                            type="number" 
                                            value={banDays}
                                            onChange={(e) => setBanDays(parseInt(e.target.value) || 0)}
                                            className="w-full bg-muted border border-border rounded-2xl px-6 py-5 text-sm font-black text-foreground outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                            placeholder="0"
                                         />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsBanModalOpen(false)}
                                        className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleBan}
                                        disabled={loading === selectedUser?.id}
                                        className="flex-1 py-5 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-500 shadow-xl shadow-amber-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading === selectedUser?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "APLICAR SANCION"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                        <Trophy className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">PROMOCIÓN</h2>
                                        <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-[0.3em]">
                                            Ajustando perfil de: {selectedUser?.firstName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">ASIGNAR CATEGORÍA</label>
                                        <div className="relative group">
                                            <select 
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                className="w-full bg-muted border border-border rounded-2xl px-6 py-5 text-xs font-black uppercase text-foreground outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>CATEGORÍA {cat.name}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">BALANCE DE PUNTOS</label>
                                        <input 
                                            type="number" 
                                            value={newPoints}
                                            onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                                            className="w-full bg-muted border border-border rounded-2xl px-6 py-5 text-sm font-black text-foreground outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                                            placeholder="Score total"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsCategoryModalOpen(false)}
                                        className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleUpdateCategory}
                                        disabled={loading === selectedUser?.id}
                                        className="flex-1 py-5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 shadow-xl shadow-indigo-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading === selectedUser?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "ACTUALIZAR STATS"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isRoleModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-violet-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-lg shadow-violet-500/5">
                                        <UserCog className="w-10 h-10 text-violet-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">ACCESO</h2>
                                        <p className="text-[10px] font-black text-violet-600/60 uppercase tracking-[0.3em]">
                                            Modificar privilegios de: {selectedUser?.firstName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {["jugador", "club", "superadmin"].map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => setNewRole(role)}
                                                className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newRole === role ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-muted border-border text-muted-foreground hover:border-violet-500/30'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsRoleModalOpen(false)}
                                        className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleUpdateRole}
                                        disabled={loading === selectedUser?.id}
                                        className="flex-1 py-5 rounded-2xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-violet-500 shadow-xl shadow-violet-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading === selectedUser?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "ACTUALIZAR ROL"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isClubModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative"
                        >
                            <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-lg shadow-blue-500/5">
                                        <Shield className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">AFILIACIÓN</h2>
                                        <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.3em]">
                                            Vincular {selectedUser?.firstName} a un Club
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2">SELECCIONAR CLUB</label>
                                        <div className="relative group">
                                            <select 
                                                value={newClubId || ""}
                                                onChange={(e) => setNewClubId(e.target.value || null)}
                                                className="w-full bg-muted border border-border rounded-2xl px-6 py-5 text-xs font-black uppercase text-foreground outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">SIN CLUB ASIGNADO</option>
                                                {clubs.map(club => (
                                                    <option key={club.id} value={club.id}>{club.name.toUpperCase()}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsClubModalOpen(false)}
                                        className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        onClick={handleUpdateClub}
                                        disabled={loading === selectedUser?.id}
                                        className="flex-1 py-5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 shadow-xl shadow-blue-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading === selectedUser?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "VINCULAR CLUB"}
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
