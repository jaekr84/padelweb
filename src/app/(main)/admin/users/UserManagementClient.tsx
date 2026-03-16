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
    UserX
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toggleUserStatus, banUser, updateUserRole, updateUserCategory } from "./actions";
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
}

export default function UserManagementClient({ initialUsers, categories }: UserManagementClientProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [usersList, setUsersList] = useState(initialUsers);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [banDays, setBanDays] = useState(7);
    const [newRole, setNewRole] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newPoints, setNewPoints] = useState<number>(0);
    const [loading, setLoading] = useState<string | null>(null);

    const filteredUsers = usersList.filter(u => {
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        
        if (filter === "all") return matchesSearch;
        if (filter === "active") return matchesSearch && u.isActive !== false;
        if (filter === "disabled") return matchesSearch && u.isActive === false;
        if (filter === "banned") return matchesSearch && u.bannedUntil && new Date(u.bannedUntil) > new Date();
        if (filter === "superadmin") return matchesSearch && u.role === "superadmin";
        
        return matchesSearch;
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

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
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

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-11 pr-4 py-3.5 bg-card border border-border rounded-2xl w-full sm:w-80 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-11 pr-10 py-3.5 bg-card border border-border rounded-2xl text-sm font-bold outline-none appearance-none focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="disabled">Deshabilitados</option>
                                <option value="banned">Baneados</option>
                                <option value="superadmin">Administradores</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table / List */}
                <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
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
                                                            {user.email}
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
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-bold text-muted-foreground opacity-60">
                                                    {format(new Date(user.createdAt), "dd MMM yyyy", { locale: es })}
                                                </span>
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

                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Search className="w-10 h-10 text-muted-foreground opacity-20" />
                                                <p className="text-sm font-black uppercase italic tracking-widest text-muted-foreground opacity-50">No se encontraron usuarios</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
                                        {['jugador', 'club'].map(role => (
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
                                            {categories.map((cat: any) => (
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

        </div>
    );
}
