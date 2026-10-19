"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save, UserCog, ArrowRightLeft, BadgeCheck, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { transferClubOwnership, updateClubAdmin, listClubs } from "./actions";
import AccessCard, { type Access } from "./AccessCard";

type ClubRow = Awaited<ReturnType<typeof listClubs>>[number];

export const inputClass =
    "w-full bg-surface border border-hairline rounded-xl px-3 py-2.5 text-[11px] font-bold text-foreground placeholder:text-subtle outline-none focus:border-emerald-500/50 transition-all";

export const labelClass = "text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-1";

export default function ManageClubDialog({
    club,
    onClose,
    onChanged,
}: {
    club: ClubRow | null;
    onClose: () => void;
    onChanged: () => Promise<void>;
}) {
    const [saving, startSaving] = useTransition();
    const [transferring, startTransfer] = useTransition();
    const [confirming, setConfirming] = useState(false);
    const [access, setAccess] = useState<Access | null>(null);
    const [transferNote, setTransferNote] = useState<string | null>(null);

    if (!club) return null;

    const ownerName = [club.ownerFirstName, club.ownerLastName].filter(Boolean).join(" ");

    const handleSave = (formData: FormData) => {
        startSaving(async () => {
            const res = await updateClubAdmin(club.id, formData);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("Datos del club guardados");
            await onChanged();
        });
    };

    const handleTransfer = (formData: FormData) => {
        // Primer click: pide confirmación. Cambiar el responsable le corta la
        // sesión a dos personas, no tiene que salir de un toque.
        if (!confirming) {
            setConfirming(true);
            return;
        }
        startTransfer(async () => {
            const res = await transferClubOwnership(club.id, formData);
            setConfirming(false);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            if (res?.success) {
                toast.success(`${res.clubName} tiene nuevo responsable`);
                setAccess(res.credentials ? { clubName: res.clubName, ...res.credentials } : null);
                setTransferNote(
                    res.oldOwnerEmail
                        ? res.oldOwnerDeactivated
                            ? `La cuenta anterior (${res.oldOwnerEmail}) era sólo de club y quedó desactivada. Se puede reactivar desde Usuarios.`
                            : `${res.oldOwnerEmail} dejó de tener rol Club y sigue como jugador.`
                        : null
                );
                await onChanged();
            }
        });
    };

    return (
        <Dialog open={!!club} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-hairline rounded-[2rem] p-5 md:p-6 gap-5">
                <DialogHeader className="text-left pr-10">
                    <DialogTitle className="text-foreground">{club.name}</DialogTitle>
                    <DialogDescription className="text-[10px] text-muted-foreground font-medium">
                        {club.members} socios · id {club.id}
                    </DialogDescription>
                </DialogHeader>

                {/* Datos públicos del club */}
                <form
                    key={`datos-${club.id}`}
                    // onSubmit y no `action`: con `action` React vacía el form al enviarlo.
                    onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }}
                    className="flex flex-col gap-3"
                >
                    <label className={labelClass}>Datos del club</label>
                    <input name="name" required minLength={2} maxLength={256} defaultValue={club.name} placeholder="Nombre del club *" className={inputClass} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input name="location" maxLength={256} defaultValue={club.location ?? ""} placeholder="Localidad" className={inputClass} />
                        <input name="address" maxLength={512} defaultValue={club.address ?? ""} placeholder="Dirección" className={inputClass} />
                        <input name="phone" maxLength={50} defaultValue={club.phone ?? ""} placeholder="Teléfono" className={inputClass} />
                        <input name="whatsapp" maxLength={50} defaultValue={club.whatsapp ?? ""} placeholder="WhatsApp" className={inputClass} />
                        <input name="instagram" maxLength={100} defaultValue={club.instagram ?? ""} placeholder="Instagram" className={inputClass} />
                        <input name="website" maxLength={256} defaultValue={club.website ?? ""} placeholder="Sitio web" className={inputClass} />
                    </div>
                    <textarea name="bio" rows={3} defaultValue={club.bio ?? ""} placeholder="Descripción" className={`${inputClass} resize-none`} />
                    <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface border border-hairline cursor-pointer">
                        <input type="checkbox" name="verified" defaultChecked={!!club.verified} className="w-4 h-4 accent-emerald-500" />
                        <BadgeCheck className="w-4 h-4 text-celeste" />
                        <span className="text-[10px] font-bold text-foreground">Verificado</span>
                        <span className="text-[9px] text-subtle font-medium">(tilde en el directorio)</span>
                    </label>
                    <p className="text-[8px] text-subtle font-medium ml-1 leading-relaxed">
                        El logo y las comodidades los carga el club desde Mi Club.
                    </p>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:w-auto bg-volt hover:bg-volt-dark text-carbon-950 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Guardar datos
                        </button>
                    </div>
                </form>

                <div className="h-px bg-hairline" />

                {/* Responsable */}
                <form
                    // Cambia la key al cambiar el dueño: el form arranca vacío para el próximo cambio.
                    key={`resp-${club.id}-${club.ownerId}`}
                    onSubmit={(e) => { e.preventDefault(); handleTransfer(new FormData(e.currentTarget)); }}
                    className="flex flex-col gap-3"
                >
                    <label className={labelClass}>Responsable</label>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-hairline">
                        <UserCog className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-foreground truncate">{ownerName || "Sin nombre"}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{club.ownerEmail || club.ownerId}</p>
                        </div>
                    </div>

                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="Email del nuevo responsable"
                        className={inputClass}
                        onChange={() => setConfirming(false)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input name="firstName" maxLength={256} placeholder="Nombre" className={inputClass} />
                        <input name="lastName" maxLength={256} placeholder="Apellido" className={inputClass} />
                        <input name="phone" maxLength={50} placeholder="Teléfono" className={inputClass} />
                    </div>
                    <p className="text-[8px] text-subtle font-medium ml-1 leading-relaxed -mt-1">
                        Nombre, apellido y teléfono se usan sólo si el email no tiene cuenta.
                    </p>

                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <ul className="space-y-0.5 text-[9px] font-medium text-muted-foreground leading-relaxed">
                            <li>· El nuevo responsable pasa a tener rol Club. Si el email no tiene cuenta, se le crea una con contraseña temporal.</li>
                            <li>· Los torneos que el responsable actual creó para este club pasan al nuevo.</li>
                            <li>· El actual pierde el rol Club. Si su cuenta era sólo del club, queda desactivada.</li>
                            <li>· A los dos se les cierra la sesión. Socios, torneos y canchas abiertas siguen en el club.</li>
                        </ul>
                    </div>

                    {transferNote && (
                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed px-1">{transferNote}</p>
                    )}
                    {access && <AccessCard access={access} />}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={transferring}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] ${
                                confirming
                                    ? "bg-amber-500 hover:bg-amber-400 text-carbon-950"
                                    : "bg-surface-raised border border-hairline-strong text-foreground hover:border-amber-500/50"
                            }`}
                        >
                            {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                            {confirming ? "Confirmar cambio" : "Cambiar responsable"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
