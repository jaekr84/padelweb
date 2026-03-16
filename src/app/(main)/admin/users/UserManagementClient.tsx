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
    Users
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toggleUserStatus, banUser, updateUserRole, updateUserCategory, updateUserClub } from "./actions";
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

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 italic">Admin Console</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-muted-foreground text-xs font-bold mt-2 uppercase tracking-widest opacity-60">
                        Promoción de categorías, asignación de puntos y control de acceso
                    </p>
                </div>

                {/* Dashboard Controls Row */}
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    {/* KPI Section */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4 w-full">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-card border border-border rounded-[2rem] p-5 shadow-sm group hover:border-indigo-500/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Total</span>
                                    <span className="text-2xl font-black italic leading-none">{stats.total}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card border border-border rounded-[2rem] p-5 shadow-sm group hover:border-indigo-500/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Shield className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Admin</span>
                                    <span className="text-2xl font-black italic leading-none">{stats.superadmins}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card border border-border rounded-[2rem] p-5 shadow-sm group hover:border-violet-500/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Shield className="w-6 h-6 text-violet-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Clubes</span>
                                    <span className="text-2xl font-black italic leading-none">{stats.clubs}</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-card border border-border rounded-[2rem] p-5 shadow-sm group hover:border-emerald-500/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Trophy className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Jugadores</span>
                                    <span className="text-2xl font-black italic leading-none">{stats.players}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Filters Section */}
                    <div className="w-full xl:w-[450px] space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Email, nombre o DNI..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-11 pr-4 py-3.5 bg-card border border-border rounded-2xl w-full text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-3 bg-card border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500 transition-all shadow-sm w-full"
                            >
                                <option value="all">Estados</option>
                                <option value="active">Activos</option>
                                <option value="disabled">Desactivados</option>
                                <option value="banned">Baneados</option>
                            </select>

                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-3 py-3 bg-card border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500 transition-all shadow-sm w-full"
                            >
                                <option value="all">Roles</option>
                                <option value="jugador">Jugador</option>
                                <option value="club">Club</option>
                                <option value="superadmin">Admin</option>
                            </select>

                            <select 
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value)}
                                className="px-3 py-3 bg-card border border-border rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500 transition-all shadow-sm w-full"
                            >
                                <option value="all">Género</option>
                                <option value="masculino">Masc.</option>
                                <option value="femenino">Fem.</option>
                            </select>
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
                                    className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-lg overflow-hidden relative group"
                                >
                                    {/* User Info Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center font-black italic text-indigo-500 text-lg">
                                                {(user.firstName || "U").charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h3 className="text-base font-black uppercase italic tracking-tight truncate leading-tight">
                                                    {user.firstName} {user.lastName}
                                                </h3>
                                                <p className="text-[10px] font-bold text-muted-foreground truncate opacity-60">
                                                    {user.email} {user.documentNumber && `• DNI: ${user.documentNumber}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                             <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border ${user.role === 'superadmin' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-muted border-border text-muted-foreground'}`}>
                                                {user.role}
                                            </span>
                                            <div className="text-[10px] font-black uppercase italic text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-lg border border-indigo-500/10">
                                                {user.category || "D"} • {user.points || 0} pts
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2 py-2 border-y border-border/50">
                                        {banned ? (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
                                                <Clock className="w-3.5 h-3.5" /> Baneado hasta {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                            </div>
                                        ) : isInactive ? (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">
                                                <XCircle className="w-3.5 h-3.5" /> Cuenta Deshabilitada
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                                <CheckCircle className="w-3.5 h-3.5" /> Usuario Activo
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <button 
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setNewCategory(user.category || "D");
                                                setNewPoints(user.points || 0);
                                                setIsCategoryModalOpen(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest"
                                        >
                                            <Trophy className="w-3.5 h-3.5" /> Puntos
                                        </button>
                                        
                                        <div className="flex gap-2">
                                            {banned ? (
                                                <button 
                                                    onClick={() => handleUnban(user)}
                                                    className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 active:scale-95 transition-all"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsBanModalOpen(true);
                                                    }}
                                                    className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 active:scale-95 transition-all"
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
                                                className="p-3 rounded-xl bg-muted border border-border text-muted-foreground active:scale-95 transition-all"
                                                disabled={user.role === 'superadmin'}
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </button>

                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-3 rounded-xl transition-all border ${isInactive 
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                    : "bg-red-500/10 text-red-500 border-red-500/20"}`}
                                                disabled={user.role === 'superadmin'}
                                            >
                                                {isInactive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <style jsx>{`
                            .custom-scrollbar::-webkit-scrollbar {
                                height: 8px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: transparent;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: #6366f133;
                                border-radius: 10px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: #6366f166;
                            }
                        `}</style>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[1100px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/30 border-b border-border">
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usuario</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cat. / Puntos</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rol</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acciones</th>
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
                                                className={`group hover:bg-muted/50 transition-colors ${loading === user.id ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center font-black italic text-indigo-500 shrink-0">
                                                            {(user.firstName || "U").charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-black uppercase italic tracking-tight truncate">
                                                                {user.firstName} {user.lastName}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-muted-foreground truncate opacity-60">
                                                                {user.email} {user.documentNumber && `• DNI: ${user.documentNumber}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[11px] font-black uppercase italic text-indigo-500">
                                                            {user.category || "D"}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-muted-foreground">
                                                            {user.points || 0} pts
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${user.role === 'superadmin' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-muted border-border text-muted-foreground'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        {banned ? (
                                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-500">
                                                                <Clock className="w-3 h-3" /> Baneado hasta {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                                            </span>
                                                        ) : isInactive ? (
                                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500">
                                                                <XCircle className="w-3 h-3" /> Deshabilitado
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                                                <CheckCircle className="w-3 h-3" /> Activo
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewCategory(user.category || "D");
                                                                setNewPoints(user.points || 0);
                                                                setIsCategoryModalOpen(true);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                            title="Promover / Cambiar Categoría"
                                                        >
                                                            <Trophy className="w-4 h-4" />
                                                        </button>
                                                        {banned ? (
                                                            <button 
                                                                onClick={() => handleUnban(user)}
                                                                className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                                                title="Remover baneo"
                                                            >
                                                                <UserCheck className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setIsBanModalOpen(true);
                                                                }}
                                                                className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                                                title="Banear temporalmente"
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
                                                            className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                            title="Cambiar rol"
                                                            disabled={user.role === 'superadmin'}
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                        </button>

                                                        <button 
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                // If we had clubId in ManagedUser, we'd set it here
                                                                setIsClubModalOpen(true);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all shadow-sm"
                                                            title="Vincular a Club"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>

                                                        <button 
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={`p-2.5 rounded-xl transition-all shadow-sm border ${isInactive 
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" 
                                                                : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"}`}
                                                            title={isInactive ? "Habilitar cuenta" : "Deshabilitar cuenta"}
                                                            disabled={user.role === 'superadmin'}
                                                        >
                                                            {isInactive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
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
                        <div className="px-6 py-20 text-center bg-card border border-border rounded-[2.5rem]">
                            <div className="flex flex-col items-center gap-3">
                                <Search className="w-10 h-10 text-muted-foreground opacity-20" />
                                <p className="text-sm font-black uppercase italic tracking-widest text-muted-foreground opacity-50">No se encontraron usuarios</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ban Modal */}
            <AnimatePresence>
                {isBanModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card border border-border rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <Ban className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight">Banear Usuario</h2>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Duración del baneo</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[1, 7, 30].map(days => (
                                            <button 
                                                key={days}
                                                onClick={() => setBanDays(days)}
                                                className={`py-4 rounded-2xl text-xs font-black uppercase italic border transition-all ${banDays === days ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-muted border-border text-muted-foreground hover:border-indigo-500/50'}`}
                                            >
                                                {days} {days === 1 ? 'día' : 'días'}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 mt-4">
                                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Custom (días)</label>
                                         <input 
                                            type="number" 
                                            value={banDays}
                                            onChange={(e) => setBanDays(parseInt(e.target.value) || 0)}
                                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                                         />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsBanModalOpen(false)}
                                        className="flex-1 py-4 bg-muted hover:bg-border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleBan}
                                        className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-900/40"
                                    >
                                        Confirmar Baneo
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
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card border border-border rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                        <UserCog className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight">Cambiar Rol</h2>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Seleccionar nuevo rol</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['jugador', 'club', 'superadmin'].map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => setNewRole(role)}
                                                className={`py-4 rounded-2xl text-xs font-black uppercase italic border transition-all ${newRole === role ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-muted border-border text-muted-foreground hover:border-indigo-500/50'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsRoleModalOpen(false)}
                                        className="flex-1 py-4 bg-muted hover:bg-border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleUpdateRole}
                                        className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40"
                                    >
                                        Confirmar Cambio
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
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card border border-border rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                        <Trophy className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight">Promoción Manual</h2>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Asignar Categoría</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {Array.from(new Map(categories.map(cat => [cat.name, cat])).values()).map((cat: any) => (
                                                <button 
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setNewCategory(cat.name)}
                                                    className={`py-3 rounded-xl text-[10px] font-black uppercase italic border transition-all ${newCategory === cat.name ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-muted border-border text-muted-foreground hover:border-indigo-500/50'}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Ajustar Puntos (Manual)</label>
                                        <input 
                                            type="number" 
                                            value={newPoints}
                                            onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                                            className="w-full bg-muted border border-border rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsCategoryModalOpen(false)}
                                        className="flex-1 py-4 bg-muted hover:bg-border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleUpdateCategory}
                                        className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40"
                                    >
                                        Confirmar Cambios
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
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card border border-border rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight">Vincular a Club</h2>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {selectedUser?.firstName} {selectedUser?.lastName}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Seleccionar Club</label>
                                    <select 
                                        value={newClubId || ""}
                                        onChange={(e) => setNewClubId(e.target.value || null)}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="">Sin Club / Independiente</option>
                                        {clubs.map(club => (
                                            <option key={club.id} value={club.id}>{club.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsClubModalOpen(false)}
                                        className="flex-1 py-4 bg-muted hover:bg-border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleUpdateClub}
                                        className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40"
                                    >
                                        Actualizar Vinculación
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
