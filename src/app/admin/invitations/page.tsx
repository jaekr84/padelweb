"use client";

import { useTransition, useRef } from "react";
import { createClubInvitation } from "./actions";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export default function InvitationsPage() {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await createClubInvitation(formData);
            if (result.error) {
                toast.error(result.error);
            } else if (result.success) {
                toast.success(result.message);
                formRef.current?.reset();
            }
        });
    };

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-black uppercase italic mb-2 border-b border-indigo-500/20 pb-4">
                Invitar Clubes
            </h1>
            <p className="text-slate-400 text-sm mb-8">
                Envía invitaciones para crear cuentas de rol <span className="text-indigo-400 font-bold">CLUB</span>. El usuario recibirá un correo con un link único y el rol se le asignará automáticamente al aceptar.
            </p>

            <form ref={formRef} action={handleSubmit} className="bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500">
                        Correo del Club
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="club@ejemplo.com"
                        required
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                            </>
                        ) : (
                            <>
                                Enviar Invitación <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
