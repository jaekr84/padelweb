"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    Calendar, Clock, MapPin, DollarSign, 
    Users, Trophy, ChevronLeft, Save, Sparkles 
} from "lucide-react";
import Link from "next/link";
import { createOpenCourtEventAction } from "../actions";

interface Props {
    categories: any[];
    clubId: string;
}

export default function CreateEventForm({ categories, clubId }: Props) {
    const router = useRouter();
    const { register, handleSubmit, formState: { isSubmitting } } = useForm({
        defaultValues: {
            name: "",
            date: "",
            time: "",
            address: "",
            city: "",
            registrationFee: 0,
            totalSlots: 16,
            categories: [] as string[],
        }
    });

    const onSubmit = async (data: any) => {
        try {
            const res = await createOpenCourtEventAction({
                ...data,
                clubId,
                name: data.name.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
                registrationFee: Number(data.registrationFee),
                totalSlots: Number(data.totalSlots),
            });

            if (res.success) {
                toast.success("¡Evento creado con éxito!");
                router.push("/admin/cancha-abierta");
            } else {
                toast.error("Error al crear el evento");
            }
        } catch (error) {
            toast.error("Hubo un error inesperado");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border/40 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/cancha-abierta">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all active:scale-90">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Nuevo Evento</p>
                        <h1 className="text-2xl font-black uppercase italic tracking-tight text-foreground leading-none">
                            Configuración de <span className="text-emerald-500">Cancha Abierta</span>
                        </h1>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Sparkles className="w-5 h-5" />
                </div>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Section: Básicos */}
                <div className="bg-card/40 border border-border/50 rounded-3xl p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nombre del Evento</label>
                            <div className="relative">
                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                                <input
                                    {...register("name", { required: true })}
                                    className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:border-emerald-500/50 transition-all outline-none capitalize"
                                    placeholder="Ej: Americano Nocturno Viernes"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Fecha</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 pointer-events-none" />
                                    <input
                                        type="date"
                                        {...register("date", { required: true })}
                                        onClick={(e) => e.currentTarget.showPicker?.()}
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-emerald-500/50 transition-all outline-none [color-scheme:dark] cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 pointer-events-none" />
                                    <input
                                        type="time"
                                        {...register("time", { required: true })}
                                        onClick={(e) => e.currentTarget.showPicker?.()}
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-emerald-500/50 transition-all outline-none [color-scheme:dark] cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Dirección (Club)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                                    <input
                                        {...register("address", { required: true })}
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:border-blue-500/50 transition-all outline-none"
                                        placeholder="Calle y número..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Localidad / Zona</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                                    <input
                                        {...register("city", { required: true })}
                                        className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:border-emerald-500/50 transition-all outline-none capitalize"
                                        placeholder="Zona norte, Palermo, etc..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Logística y Costo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card/40 border border-border/50 rounded-3xl p-8 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            Costo Inscripción
                        </label>
                        <input
                            type="number"
                            {...register("registrationFee")}
                            className="w-full bg-transparent border-none text-3xl font-black italic tracking-tighter focus:ring-0 outline-none placeholder:text-muted-foreground/20"
                            placeholder="0"
                        />
                        <p className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                            Valor por persona para confirmar la asistencia.
                        </p>
                    </div>

                    <div className="bg-card/40 border border-border/50 rounded-3xl p-8 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            Cupos Totales
                        </label>
                        <input
                            type="number"
                            {...register("totalSlots")}
                            className="w-full bg-transparent border-none text-3xl font-black italic tracking-tighter focus:ring-0 outline-none placeholder:text-muted-foreground/20"
                            placeholder="16"
                        />
                        <p className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                            Cantidad máxima de jugadores permitidos.
                        </p>
                    </div>
                </div>

                {/* Section: Categorías */}
                <div className="bg-card/40 border border-border/50 rounded-3xl p-8 space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Categorías Habilitadas</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <label key={cat.id} className="relative group cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={cat.id}
                                    {...register("categories")}
                                    className="peer absolute opacity-0"
                                />
                                <div className="px-4 py-2 rounded-xl bg-muted/50 border border-border/50 text-[10px] font-black uppercase tracking-widest transition-all peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-400 group-hover:border-emerald-500/50">
                                    {cat.name}
                                </div>
                            </label>
                        ))}
                        <label className="relative group cursor-pointer">
                            <input
                                type="checkbox"
                                value="libre"
                                {...register("categories")}
                                className="peer absolute opacity-0"
                            />
                            <div className="px-4 py-2 rounded-xl bg-muted/50 border border-border/50 text-[10px] font-black uppercase tracking-widest transition-all peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-400 group-hover:border-emerald-500/50">
                                Libre
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.3em] py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Crear Evento
                            </>
                        )}
                    </button>
                    <p className="text-center text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-6">
                        Al crear el evento, se habilitará el panel de gestión dinámica.
                    </p>
                </div>
            </form>
        </div>
    );
}
