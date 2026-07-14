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

const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 7).padStart(2, "0")); // 07–23
const MINUTES = ["00", "30"];

interface Props {
    categories: any[];
    clubId: string;
}

export default function CreateEventForm({ categories, clubId }: Props) {
    const router = useRouter();
    const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
        defaultValues: {
            name: "",
            date: "",
            time: "",
            address: "",
            city: "",
            registrationFee: "" as any,
            totalSlots: 16,
            categories: [] as string[],
        }
    });

    const selectedTime = watch("time");
    const selectedHour = selectedTime?.split(":")[0] ?? "";
    const selectedMinute = selectedTime?.split(":")[1] ?? "";

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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/cancha-abierta">
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-all active:scale-90">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </Link>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Nuevo Evento</p>
                        <h1 className="text-xl heading-sport text-foreground leading-none">
                            Configuración de <span className="text-azul-primary">Cancha Abierta</span>
                        </h1>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-azul-primary/10 flex items-center justify-center text-azul-primary">
                    <Sparkles className="w-4 h-4" />
                </div>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Section: Básicos */}
                <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nombre del Evento</label>
                            <div className="relative">
                                <Trophy className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-celeste/50" />
                                <input
                                    {...register("name", { required: true })}
                                    className="w-full bg-muted/30 border border-border/50 rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold placeholder:text-muted-foreground/30 focus:border-celeste/50 transition-all outline-none capitalize"
                                    placeholder="Ej: Americano Nocturno Viernes"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Fecha</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-celeste/50 pointer-events-none" />
                                    <input
                                        type="date"
                                        {...register("date", { required: true })}
                                        onClick={(e) => e.currentTarget.showPicker?.()}
                                        className="w-full bg-muted/30 border border-border/50 rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold focus:border-celeste/50 transition-all outline-none [color-scheme:dark] cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-celeste/50" />
                                    Hora
                                    {selectedTime && (
                                        <span className="ml-auto text-celeste font-black">{selectedTime}</span>
                                    )}
                                </label>
                                <input type="hidden" {...register("time", { required: true })} />
                                <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 space-y-2">
                                    {/* Hour row */}
                                    <div className="overflow-x-auto no-scrollbar">
                                        <div className="flex gap-1 w-max">
                                            {HOURS.map(h => (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => setValue("time", `${h}:${selectedMinute || "00"}`, { shouldValidate: true })}
                                                    className={`w-9 h-8 rounded-md text-[10px] font-black transition-all shrink-0 ${
                                                        selectedHour === h
                                                            ? "bg-celeste text-white shadow-lg shadow-celeste/30"
                                                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    }`}
                                                >
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Minute row */}
                                    <div className="flex gap-1.5">
                                        {MINUTES.map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setValue("time", `${selectedHour || "08"}:${m}`, { shouldValidate: true })}
                                                className={`flex-1 h-7 rounded-md text-[10px] font-black transition-all ${
                                                    selectedMinute === m
                                                        ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                }`}
                                            >
                                                :{m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Dirección (Club)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-celeste/50" />
                                    <input
                                        {...register("address", { required: true })}
                                        className="w-full bg-muted/30 border border-border/50 rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold placeholder:text-muted-foreground/30 focus:border-celeste/50 transition-all outline-none"
                                        placeholder="Calle y número..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Localidad / Zona</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-celeste/50" />
                                    <input
                                        {...register("city", { required: true })}
                                        className="w-full bg-muted/30 border border-border/50 rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold placeholder:text-muted-foreground/30 focus:border-celeste/50 transition-all outline-none capitalize"
                                        placeholder="Zona norte, Palermo, etc..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Logística y Costo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-3 h-3 text-celeste" />
                            Costo Inscripción
                        </label>
                        <input
                            type="number"
                            {...register("registrationFee")}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-transparent border-none text-2xl font-black italic tracking-tighter focus:ring-0 outline-none placeholder:text-muted-foreground/20"
                            placeholder="0"
                        />
                        <p className="text-[8px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-none">
                            Valor por persona para confirmar.
                        </p>
                    </div>

                    <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Users className="w-3 h-3 text-celeste" />
                            Cupos Totales
                        </label>
                        <input
                            type="number"
                            {...register("totalSlots")}
                            className="w-full bg-transparent border-none text-2xl font-black italic tracking-tighter focus:ring-0 outline-none placeholder:text-muted-foreground/20"
                            placeholder="16"
                        />
                        <p className="text-[8px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-none">
                            Máximo de jugadores permitidos.
                        </p>
                    </div>
                </div>

                {/* Section: Categorías */}
                <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Categorías Habilitadas</label>
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                            <label key={cat.id} className="relative group cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={cat.id}
                                    {...register("categories")}
                                    className="peer absolute opacity-0"
                                />
                                <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[9px] font-black uppercase tracking-widest transition-all peer-checked:bg-celeste peer-checked:text-white peer-checked:border-celeste-light group-hover:border-celeste/50">
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
                            <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[9px] font-black uppercase tracking-widest transition-all peer-checked:bg-celeste peer-checked:text-white peer-checked:border-celeste group-hover:border-celeste/50">
                                Libre
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-azul-primary hover:bg-azul-dark disabled:opacity-50 text-white font-black uppercase tracking-[0.3em] h-12 rounded-xl shadow-xl shadow-azul-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span className="text-[10px]">Crear Evento</span>
                            </>
                        )}
                    </button>
                    <p className="text-center text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-4">
                        Panel de gestión dinámica habilitado post-creación.
                    </p>
                </div>
            </form>
        </div>
    );
}
