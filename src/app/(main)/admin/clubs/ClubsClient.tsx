"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Building2, Loader2, Plus, Users, MapPin, ExternalLink, Pencil, BadgeCheck } from "lucide-react";
import { createClubWithOwner, listClubs } from "./actions";
import AccessCard, { type Access } from "./AccessCard";
import ManageClubDialog, { inputClass, labelClass } from "./ManageClubDialog";

type ClubRow = Awaited<ReturnType<typeof listClubs>>[number];

const formatDate = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

export default function ClubsClient({ initialClubs = [] }: { initialClubs?: ClubRow[] }) {
    const [clubs, setClubs] = useState<ClubRow[]>(initialClubs);
    const [created, setCreated] = useState<Access | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const editing = clubs.find(c => c.id === editingId) ?? null;
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const refresh = async () => {
        try {
            setClubs(await listClubs());
        } catch {
            // El listado es informativo: si falla, el alta igual quedó hecha.
        }
    };

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const res = await createClubWithOwner(formData);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            if (res?.success && res.credentials) {
                setCreated({ clubName: res.club.name, email: res.credentials.email, password: res.credentials.password });
                formRef.current?.reset();
                toast.success(`Club "${res.club.name}" creado`);
                await refresh();
            }
        });
    };

    return (
        <div className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4 font-sans">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 border-b border-hairline pb-4 mb-2"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center text-foreground shadow-sm">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Accesos al sistema</p>
                        <h1 className="text-xl md:text-2xl heading-sport leading-none text-foreground">Clubes</h1>
                    </div>
                </div>
                <p className="text-muted-foreground text-[10px] font-medium leading-relaxed pl-[56px]">
                    Alta y gestión de clubes. Al crear uno se crea también la cuenta de su responsable, que entra con una contraseña temporal y ya ve todo como Club. Desde la lista podés editar los datos de cada club o cambiarle el responsable.
                </p>
            </motion.header>

            <form
                ref={formRef}
                // onSubmit y no `action`: con `action` React vacía el form al
                // enviarlo, y si el servidor devolvía un error había que cargar todo de nuevo.
                onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }}
                className="p-4 md:p-6 rounded-2xl flex flex-col gap-4 glass-card shadow-xl"
            >
                <div className="flex flex-col gap-2">
                    <label className={labelClass}>Club</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input name="name" required minLength={2} maxLength={256} placeholder="Nombre del club *" className={inputClass} />
                        <input name="location" maxLength={256} placeholder="Localidad (opcional)" className={inputClass} />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className={labelClass}>Responsable</label>
                    <input name="email" type="email" required placeholder="Email del responsable *" autoComplete="off" className={inputClass} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input name="firstName" maxLength={256} placeholder="Nombre" className={inputClass} />
                        <input name="lastName" maxLength={256} placeholder="Apellido" className={inputClass} />
                        <input name="phone" maxLength={50} placeholder="Teléfono" className={inputClass} />
                    </div>
                    <p className="text-[8px] text-subtle font-medium ml-1 leading-relaxed">
                        Con este email inicia sesión el club. Si la persona ya tiene cuenta de jugador, no la crees de nuevo: dale el rol Club desde Usuarios y el club se crea solo.
                    </p>
                </div>

                {created && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <AccessCard access={created} />
                    </motion.div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full sm:w-auto bg-volt hover:bg-volt-dark text-carbon-950 px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando...</>
                        ) : (
                            <><Plus className="w-3.5 h-3.5" /> Crear club</>
                        )}
                    </button>
                </div>
            </form>

            <div className="p-4 md:p-5 rounded-2xl space-y-3 glass-card">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase italic tracking-tight text-foreground leading-none">Clubes en el sistema</h2>
                        <span className="text-[9px] font-bold text-muted-foreground">{clubs.length} en total</span>
                    </div>
                </div>

                {clubs.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-6 text-center font-medium">Todavía no hay clubes.</p>
                ) : (
                    <div className="divide-y divide-hairline">
                        {clubs.map(club => {
                            const owner = [club.ownerFirstName, club.ownerLastName].filter(Boolean).join(" ");
                            return (
                                <div key={club.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-raised border border-hairline overflow-hidden flex items-center justify-center">
                                            {club.logoUrl
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={club.logoUrl} alt="" className="w-full h-full object-cover" />
                                                : <Building2 className="w-4 h-4 text-subtle" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-foreground min-w-0">
                                                <span className="truncate">{club.name}</span>
                                                {club.verified && <BadgeCheck className="w-3 h-3 shrink-0 text-celeste" />}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground truncate">
                                                {owner ? `${owner} · ` : ""}{club.ownerEmail || club.ownerId}
                                            </span>
                                            <span className="flex items-center gap-2 text-[8px] font-bold text-subtle uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{club.members}</span>
                                                {club.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{club.location}</span>}
                                                <span>{formatDate(club.createdAt)}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(club.id)}
                                            className="h-8 px-2.5 rounded-lg bg-surface border border-hairline flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-emerald-500/50 transition-colors text-[8px] font-black uppercase tracking-widest"
                                            aria-label={`Gestionar ${club.name}`}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Gestionar</span>
                                        </button>
                                        <Link
                                            href={`/profiles/club?id=${encodeURIComponent(club.id)}`}
                                            className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                            aria-label={`Ver ${club.name}`}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* key: al abrir otro club arranca de cero (sin la confirmación ni el acceso del anterior). */}
            <ManageClubDialog key={editing?.id ?? "cerrado"} club={editing} onClose={() => setEditingId(null)} onChanged={refresh} />
        </div>
    );
}
