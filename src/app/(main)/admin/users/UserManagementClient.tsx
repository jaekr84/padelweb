"use client";

import * as React from "react";
import { useState, useMemo } from "react";
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
    ShieldCheck,
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
    Loader2,
    Key,
    Copy,
    Share,
    MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    toggleUserStatus,
    banUser,
    updateUserRole,
    updateUserCategory,
    updateUserClub,
    resetDatabasePlayers,
    getUsers,
    resetUserPassword
} from "./actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogPortal,
    DialogOverlay,
    DialogClose
} from "@/components/ui/Dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const categorySchema = z.object({
    category: z.string().min(1, "Categoría requerida"),
    points: z.number().min(0, "Los puntos no pueden ser negativos"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

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
    clubId: string | null;
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
    const queryClient = useQueryClient();
    const { tournamentFilter, setTournamentFilter } = useAppStore();

    // TanStack Query for data fetching
    const { data: usersList = initialUsers, isLoading: isFetching } = useQuery({
        queryKey: ["users"],
        queryFn: () => getUsers(),
        initialData: initialUsers,
        staleTime: 1000 * 60, // 1 minute
    });

    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);

    const [banDays, setBanDays] = useState(7);
    const [newRoles, setNewRoles] = useState<string[]>([]);
    const [newClubId, setNewClubId] = useState<string | null>(null);
    const [generatedTempPassword, setGeneratedTempPassword] = useState("");
    const [resetModal, setResetModal] = useState<{ isOpen: boolean, step: 'confirm' | 'result', userName?: string, userId?: string }>({ isOpen: false, step: 'confirm' });

    // Mutations for actions
    const toggleStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => toggleUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Estado actualizado correctamente");
        },
        onError: (error: any) => toast.error(error.message || "Error al actualizar estado"),
    });

    const banMutation = useMutation({
        mutationFn: ({ userId, days }: { userId: string; days: number | null }) => banUser(userId, days),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsBanModalOpen(false);
            toast.success("Sanción aplicada");
        },
        onError: (error: any) => toast.error(error.message || "Error al aplicar sanción"),
    });

    const updateCategoryMutation = useMutation({
        mutationFn: (values: CategoryFormValues & { userId: string }) =>
            updateUserCategory(values.userId, values.category, values.points),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsCategoryModalOpen(false);
            toast.success("Categoría y puntos actualizados");
        },
        onError: (error: any) => toast.error(error.message || "Error al actualizar categoría"),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsRoleModalOpen(false);
            toast.success("Rol actualizado");
        },
        onError: (error: any) => toast.error(error.message || "Error al actualizar rol"),
    });

    const updateClubMutation = useMutation({
        mutationFn: ({ userId, clubId }: { userId: string; clubId: string | null }) => updateUserClub(userId, clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsClubModalOpen(false);
            toast.success("Club vinculado correctamente");
        },
        onError: (error: any) => toast.error(error.message || "Error al vincular club"),
    });

    const resetMutation = useMutation({
        mutationFn: resetDatabasePlayers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Base de datos reseteada");
        },
        onError: (error: any) => toast.error(error.message || "Error al resetear"),
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (userId: string) => resetUserPassword(userId),
        onSuccess: (data) => {
            setGeneratedTempPassword(data.tempPassword);
            setResetModal(prev => ({ ...prev, step: 'result' }));
            toast.success("Contraseña restablecida");
        },
        onError: (error: any) => toast.error(error.message || "Error al restablecer contraseña"),
    });

    // React Hook Form for Category Edit
    const categoryForm = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            category: "D",
            points: 0,
        }
    });

    const filteredUsers = (usersList as ManagedUser[]).filter(u => {
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const matchesSearch =
            fullName.includes(tournamentFilter.search.toLowerCase()) ||
            u.email.toLowerCase().includes(tournamentFilter.search.toLowerCase()) ||
            (u.documentNumber && u.documentNumber.includes(tournamentFilter.search));

        let matchesStatus = true;
        if (tournamentFilter.status === "active") matchesStatus = u.isActive !== false;
        if (tournamentFilter.status === "disabled") matchesStatus = u.isActive === false;
        if (tournamentFilter.status === "banned") matchesStatus = !!(u.bannedUntil && new Date(u.bannedUntil) > new Date());

        const matchesRole = tournamentFilter.role === "all" || u.role === tournamentFilter.role;
        const matchesGender = tournamentFilter.gender === "all" || (u as any).gender === tournamentFilter.gender;
        const matchesCategory = tournamentFilter.category === "all" || u.category === tournamentFilter.category;

        return matchesSearch && matchesStatus && matchesRole && matchesGender && matchesCategory;
    });

    const isCurrentlyBanned = (user: ManagedUser) => {
        return user.bannedUntil && new Date(user.bannedUntil) > new Date();
    };

    const stats = useMemo(() => ({
        total: usersList.length,
        superadmins: usersList.filter(u => u.role === "superadmin").length,
        players: usersList.filter(u => u.role === "jugador").length,
        active: usersList.filter(u => u.isActive !== false).length,
    }), [usersList]);

    const handleReset = async () => {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará a TODOS los jugadores y clubes de la base de datos (excepto SuperAdmins). Esta acción es IRREVERSIBLE.")) return;
        resetMutation.mutate();
    };

    const isLoading = (userId: string) =>
        toggleStatusMutation.isPending && toggleStatusMutation.variables?.userId === userId ||
        banMutation.isPending && banMutation.variables?.userId === userId ||
        updateCategoryMutation.isPending && selectedUser?.id === userId ||
        updateRoleMutation.isPending && updateRoleMutation.variables?.userId === userId ||
        updateClubMutation.isPending && updateClubMutation.variables?.userId === userId ||
        resetPasswordMutation.isPending && resetPasswordMutation.variables === userId;

    const handleToggleStatus = (user: ManagedUser) => {
        toggleStatusMutation.mutate({ userId: user.id, isActive: user.isActive !== true });
    };

    const handleBan = () => {
        if (!selectedUser) return;
        banMutation.mutate({ userId: selectedUser.id, days: banDays });
    };

    const handleUnban = (user: ManagedUser) => {
        banMutation.mutate({ userId: user.id, days: null });
    };

    const handleUpdateCategory = (data: CategoryFormValues) => {
        if (!selectedUser) return;
        updateCategoryMutation.mutate({ ...data, userId: selectedUser.id });
    };

    const handleUpdateRole = () => {
        if (!selectedUser || newRoles.length === 0) return;
        updateRoleMutation.mutate({ userId: selectedUser.id, role: newRoles.join(",") });
    };

    const handleUpdateClub = () => {
        if (!selectedUser) return;
        updateClubMutation.mutate({ userId: selectedUser.id, clubId: newClubId });
    };

    const handleSharePassword = async () => {
        if (!generatedTempPassword) return toast.error("No hay contraseña para compartir");

        const text = `Se ha restablecido tu contraseña en A.C.A.P.\n\n👤 Usuario: ${selectedUser?.email || 'Tu mail'}\n🔑 Clave Temporal: ${generatedTempPassword}\n\nActualizala desde tu perfil al ingresar.`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Acceso A.C.A.P.',
                    text: text,
                });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                    toast.error("No se pudo abrir el menú de compartir");
                }
            }
        } else {
            // Plan B only if there's no native share system (mostly desktop)
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
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

            <div className="w-full space-y-8 relative z-10">
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
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                    {[
                        { label: "Total Personal", value: stats.total, icon: Users, color: "indigo" },
                        { label: "Tier 1 Admin", value: stats.superadmins, icon: Shield, color: "indigo" },
                        { label: "Organizaciones", value: clubs.length, icon: Shield, color: "violet" },
                        { label: "Unidades Activas", value: stats.players, icon: Trophy, color: "emerald" }
                    ].map((kpi, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-card border border-border rounded-2xl p-4 shadow-sm group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</span>
                                    <span className="text-xl font-black italic leading-none text-foreground tracking-tighter">{kpi.value}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Dashboard Controls Row */}
                <div className="flex flex-col md:flex-row gap-3 items-center bg-card/30 backdrop-blur-md border border-border p-3 rounded-2xl shadow-sm">
                    {/* Filters Section */}
                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="BUSCAR USUARIO (EMAIL, NOMBRE)..."
                            value={tournamentFilter.search}
                            onChange={(e) => setTournamentFilter({ search: e.target.value })}
                            className="pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl w-full text-[9px] font-black uppercase tracking-widest text-foreground outline-none focus:border-indigo-500/50 transition-all placeholder:text-muted-foreground/60"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative min-w-[100px]">
                            <select
                                value={tournamentFilter.status}
                                onChange={(e) => setTournamentFilter({ status: e.target.value })}
                                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all w-full text-foreground"
                            >
                                <option value="all">ESTADOS</option>
                                <option value="active">ACTIVOS</option>
                                <option value="disabled">INACTIVOS</option>
                                <option value="banned">BANEADOS</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>

                        <div className="relative min-w-[100px]">
                            <select
                                value={tournamentFilter.role}
                                onChange={(e) => setTournamentFilter({ role: e.target.value })}
                                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all w-full text-foreground"
                            >
                                <option value="all">ROLES</option>
                                <option value="jugador">JUGADOR</option>
                                <option value="club">CLUB</option>
                                <option value="superadmin">ADMIN</option>
                            </select>
                            <UserCog className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>

                        <div className="relative min-w-[100px]">
                            <select
                                value={tournamentFilter.gender || "all"}
                                onChange={(e) => setTournamentFilter({ gender: e.target.value })}
                                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none appearance-none focus:border-indigo-500/50 transition-all w-full text-foreground"
                            >
                                <option value="all">GÉNERO</option>
                                <option value="masculino">MASC.</option>
                                <option value="femenino">FEM.</option>
                            </select>
                            <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
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
                                            <div className="flex flex-wrap justify-end gap-1 max-w-[120px]">
                                                {user.role.split(',').map(r => (
                                                    <span key={r} className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border shadow-sm ${r === 'superadmin' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : r === 'club' ? 'bg-violet-100 border-violet-200 text-violet-700' : 'bg-muted border-border text-muted-foreground'}`}>
                                                        {r}
                                                    </span>
                                                ))}
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


                                        <div className="grid grid-cols-2 gap-2.5 flex-1">
                                            {banned ? (
                                                <button
                                                    onClick={() => handleUnban(user)}
                                                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 active:scale-95 transition-all"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    <span className="text-[8px] font-black uppercase">HABILITAR</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsBanModalOpen(true);
                                                    }}
                                                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-amber-50 hover:text-amber-600 active:scale-95 transition-all disabled:opacity-20"
                                                    disabled={isLoading(user.id)}
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                    <span className="text-[8px] font-black uppercase">BAN</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setResetModal({ isOpen: true, step: 'confirm', userName: user.firstName || user.email, userId: user.id });
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-20"
                                                disabled={isLoading(user.id)}
                                            >
                                                <Key className="w-3.5 h-3.5" />
                                                <span className="text-[8px] font-black uppercase">RESET</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewRoles(user.role.split(',').map(r => r.trim().toLowerCase()));
                                                    setIsRoleModalOpen(true);
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-20"
                                                disabled={isLoading(user.id)}
                                            >
                                                <UserCog className="w-3.5 h-3.5" />
                                                <span className="text-[8px] font-black uppercase">ROL</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewClubId(user.clubId);
                                                    setIsClubModalOpen(true);
                                                }}
                                                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-violet-50 hover:text-violet-600 active:scale-95 transition-all"
                                            >
                                                <Shield className="w-3.5 h-3.5" />
                                                <span className="text-[8px] font-black uppercase">CLUB</span>
                                            </button>

                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-2xl transition-all border shadow-sm ${isInactive
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-rose-50 text-rose-600 border-rose-100"}`}
                                                disabled={isLoading(user.id)}
                                            >
                                                {isLoading(user.id) ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        {isInactive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                        <span className="text-[8px] font-black uppercase">{isInactive ? "ACTIVAR" : "DESACTIVAR"}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="hidden md:block bg-card border border-border rounded-3xl overflow-hidden shadow-xl relative">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Usuario</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Roles / Acceso</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground w-40">Estado</th>
                                        <th className="px-5 py-4 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground w-64">Operaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredUsers.map((user) => {
                                        const banned = isCurrentlyBanned(user);
                                        const isInactive = user.isActive === false;

                                        return (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`group hover:bg-muted/30 transition-colors relative ${isLoading(user.id) ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black italic text-indigo-600 text-sm shrink-0">
                                                            {(user.firstName || "U").charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black uppercase italic tracking-tight truncate text-foreground">
                                                                    {user.firstName} {user.lastName}
                                                                </span>
                                                                {user.documentNumber && (
                                                                    <span className="text-[8px] font-black text-indigo-500/50 uppercase bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                                                        {user.documentNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] font-black text-muted-foreground/60 truncate uppercase tracking-tighter">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.role.split(',').map(r => (
                                                            <span key={r} className={`text-[8px] font-black uppercase tracking-tight px-2 py-0.5 rounded border ${r === 'superadmin' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700' : r === 'club' ? 'bg-violet-500/10 border-violet-500/20 text-violet-700' : 'bg-zinc-500/10 border-zinc-500/20 text-muted-foreground'}`}>
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col">
                                                        {banned ? (
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-amber-600 bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/20 w-fit">
                                                                <Clock className="w-3 h-3" /> HASTA {format(new Date(user.bannedUntil!), "dd/MM", { locale: es })}
                                                            </div>
                                                        ) : isInactive ? (
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-rose-600 bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/20 w-fit">
                                                                <XCircle className="w-3 h-3" /> INACTIVO
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-emerald-600 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/20 w-fit">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" /> ACTIVO
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">

                                                        {banned ? (
                                                            <button
                                                                onClick={() => handleUnban(user)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                                title="HABILITAR"
                                                            >
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                <span className="text-[8px] font-black uppercase">HABILITAR</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setIsBanModalOpen(true);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-border hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-20"
                                                                title="BAN"
                                                                disabled={isLoading(user.id)}
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                                <span className="text-[8px] font-black uppercase">BAN</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setResetModal({ isOpen: true, step: 'confirm', userName: user.firstName || user.email, userId: user.id });
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-20"
                                                            disabled={isLoading(user.id)}
                                                            title="Restablecer Contraseña"
                                                        >
                                                            <Key className="w-3.5 h-3.5" />
                                                            <span className="text-[8px] font-black uppercase">RESET</span>
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewRoles(user.role.split(',').map(r => r.trim().toLowerCase()));
                                                                setIsRoleModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-20"
                                                            title="ROLES"
                                                            disabled={isLoading(user.id)}
                                                        >
                                                            <UserCog className="w-3.5 h-3.5" />
                                                            <span className="text-[8px] font-black uppercase">ROLES</span>
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewClubId(user.clubId);
                                                                setIsClubModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                            title="CLUB"
                                                        >
                                                            <Shield className="w-3.5 h-3.5" />
                                                            <span className="text-[8px] font-black uppercase">CLUB</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border shadow-sm active:scale-95 ${isInactive
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                                                                : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"}`}
                                                            title={isInactive ? "ACTIVAR" : "DESACTIVAR"}
                                                            disabled={isLoading(user.id)}
                                                        >
                                                            {isLoading(user.id) ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    {isInactive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                                    <span className="text-[8px] font-black uppercase">{isInactive ? "ACTIVAR" : "DESACTIVAR"}</span>
                                                                </>
                                                            )}
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
                                    <Search className="w-8 h-8 text-muted-foreground/60" />
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

            <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
                <DialogContent className="max-w-md bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl p-0">
                    <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none" />
                    <div className="p-10 space-y-8 relative z-10">
                        <DialogHeader className="flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-lg shadow-amber-500/5">
                                <Ban className="w-10 h-10 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground">RESTRICCIÓN</DialogTitle>
                                <DialogDescription className="text-[10px] font-black text-amber-600/60 uppercase tracking-[0.3em]">
                                    Sancionando a: {selectedUser?.firstName} {selectedUser?.lastName}
                                </DialogDescription>
                            </div>
                        </DialogHeader>

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
                            <DialogClose asChild>
                                <button className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all">
                                    CANCELAR
                                </button>
                            </DialogClose>
                            <button
                                onClick={handleBan}
                                disabled={selectedUser ? isLoading(selectedUser.id) : false}
                                className="flex-1 py-5 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-500 shadow-xl shadow-amber-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {selectedUser && isLoading(selectedUser.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "APLICAR SANCION"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>



            <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                <DialogContent className="max-w-md bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl p-0 [&>button:last-child]:hidden">
                    <div className="absolute inset-0 bg-violet-500/5 blur-[100px] pointer-events-none" />
                    <div className="p-10 space-y-8 relative z-10">
                        <DialogHeader className="flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-lg shadow-violet-500/5">
                                <UserCog className="w-10 h-10 text-violet-600" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground">ACCESO</DialogTitle>
                                <DialogDescription className="text-[10px] font-black text-violet-600/60 uppercase tracking-[0.3em]">
                                    Modificar privilegios de: {selectedUser?.firstName}
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                {["jugador", "club", "superadmin"].map(role => {
                                    const isSelected = newRoles.some(r => r.toLowerCase() === role.toLowerCase());
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                setNewRoles(prev =>
                                                    prev.some(r => r.toLowerCase() === role.toLowerCase())
                                                        ? prev.filter(r => r.toLowerCase() !== role.toLowerCase())
                                                        : [...prev, role.toLowerCase()]
                                                );
                                            }}
                                            className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all relative overflow-hidden ${isSelected ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-muted border-border text-muted-foreground hover:border-violet-500/30'}`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            {role}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-widest px-4 opacity-70">
                                Selecciona todos los roles que correspondan al usuario. Los privilegios se acumulan.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <DialogClose asChild>
                                <button className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all">
                                    CANCELAR
                                </button>
                            </DialogClose>
                            <button
                                onClick={handleUpdateRole}
                                disabled={selectedUser ? isLoading(selectedUser.id) : false}
                                className="flex-1 py-5 rounded-2xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-violet-500 shadow-xl shadow-violet-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {selectedUser && isLoading(selectedUser.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "ACTUALIZAR ROL"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isClubModalOpen} onOpenChange={setIsClubModalOpen}>
                <DialogContent className="max-w-md bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl p-0">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none" />
                    <div className="p-10 space-y-8 relative z-10">
                        <DialogHeader className="flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-lg shadow-blue-500/5">
                                <Shield className="w-10 h-10 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground">AFILIACIÓN</DialogTitle>
                                <DialogDescription className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.3em]">
                                    Vincular {selectedUser?.firstName} a un Club
                                </DialogDescription>
                            </div>
                        </DialogHeader>

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
                            <DialogClose asChild>
                                <button className="flex-1 py-5 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all">
                                    CANCELAR
                                </button>
                            </DialogClose>
                            <button
                                onClick={handleUpdateClub}
                                disabled={selectedUser ? isLoading(selectedUser.id) : false}
                                className="flex-1 py-5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 shadow-xl shadow-blue-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {selectedUser && isLoading(selectedUser.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : "VINCULAR CLUB"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Integrated Reset Password Flow Modal */}
            <Dialog open={resetModal.isOpen} onOpenChange={(open) => setResetModal(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent className="max-w-md bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl [&>button:last-child]:hidden">
                    <AnimatePresence mode="wait">
                        {resetModal.step === 'confirm' ? (
                            <motion.div
                                key="confirm-step"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <DialogHeader className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto border border-rose-500/20">
                                        <Key className="w-8 h-8 text-rose-600" />
                                    </div>
                                    <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-center leading-tight">
                                        ¿Restablecer contraseña de <span className="text-rose-600">{resetModal.userName}</span>?
                                    </DialogTitle>
                                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                                        Esta acción invalidará la clave actual y generará una nueva clave temporal.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            if (resetModal.userId) {
                                                resetPasswordMutation.mutate(resetModal.userId);
                                            }
                                        }}
                                        disabled={resetPasswordMutation.isPending}
                                        className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "SÍ, RESTABLECER"}
                                    </button>
                                    <button
                                        onClick={() => setResetModal({ isOpen: false, step: 'confirm' })}
                                        className="w-full py-4 bg-muted text-muted-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all active:scale-95 border border-border"
                                    >
                                        CANCELAR
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="result-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <DialogHeader className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                                        <Key className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight text-center">Contraseña Lista</DialogTitle>
                                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                                        Se ha generado una clave temporal para la unidad
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="my-8 p-6 bg-muted rounded-3xl border border-border relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-500/5 blur-3xl" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 text-center relative z-10">Nueva Clave Temporal</p>
                                    <div className="flex items-center justify-center gap-4 relative z-10">
                                        <span className="text-4xl font-black tracking-tighter text-indigo-600 font-mono">
                                            {generatedTempPassword}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    if (navigator.clipboard && window.isSecureContext) {
                                                        await navigator.clipboard.writeText(generatedTempPassword);
                                                        toast.success("Copiado al portapapeles");
                                                    } else {
                                                        const textArea = document.createElement("textarea");
                                                        textArea.value = generatedTempPassword;
                                                        document.body.appendChild(textArea);
                                                        textArea.select();
                                                        document.execCommand('copy');
                                                        document.body.removeChild(textArea);
                                                        toast.success("Copiado al portapapeles");
                                                    }
                                                } catch (err) {
                                                    toast.error("Error al copiar");
                                                }
                                            }}
                                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 active:scale-90 transition-all shadow-lg"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleSharePassword}
                                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 active:scale-90 transition-all shadow-lg"
                                        >
                                            <Share className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-4">
                                        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
                                            Copiá esta clave y enviala manualmente al usuario por seguridad.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setResetModal({ isOpen: false, step: 'confirm' })}
                                        className="w-full py-4 bg-foreground text-background rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95"
                                    >
                                        ENTENDIDO
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </DialogContent>
            </Dialog>
        </div>
    );
}
