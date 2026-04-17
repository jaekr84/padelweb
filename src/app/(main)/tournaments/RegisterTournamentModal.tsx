"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";
import { getRegistrationContext, type RegistrationContext } from "./register/registration-actions";
import RegisterForm from "./register/RegisterForm";
import { Loader2, AlertCircle, Ban, Trophy, Users, Shield } from "lucide-react";
import Link from "next/link";

interface RegisterTournamentModalProps {
    tournamentId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function RegisterTournamentModal({
    tournamentId,
    isOpen,
    onClose,
    onSuccess
}: RegisterTournamentModalProps) {
    const [context, setContext] = useState<RegistrationContext | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen && !context && !isPending) {
            startTransition(async () => {
                try {
                    const data = await getRegistrationContext(tournamentId);
                    setContext(data);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Error al cargar la información");
                }
            });
        }
    }, [isOpen, tournamentId, context, isPending]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            // Keep context for a bit to avoid showing loader while closing
            const timer = setTimeout(() => {
                setContext(null);
                setError(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent hideClose={true} className="max-w-2xl p-0 overflow-hidden border border-white/10 bg-card/95 backdrop-blur-xl shadow-3xl rounded-[2.5rem] ring-1 ring-black/5">
                {!context && !error ? (
                    <div className="flex flex-col items-center justify-center p-24 space-y-6">
                        <DialogTitle className="sr-only">Cargando inscripción</DialogTitle>
                        <div className="relative">
                            <div className="absolute inset-0 bg-celeste/20 rounded-full blur-2xl animate-pulse" />
                            <div className="relative w-16 h-16 rounded-[2rem] bg-background border border-border flex items-center justify-center shadow-2xl">
                                <Loader2 className="w-8 h-8 text-celeste animate-spin" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black uppercase italic tracking-tighter text-foreground mb-1">Un momento</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Preparando tu inscripción...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-rojo/10 border border-rojo/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-rojo" />
                        </div>
                        <DialogTitle className="mb-2 text-rojo">Error de Acceso</DialogTitle>
                        <DialogDescription className="mb-8">{error}</DialogDescription>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-muted text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest border border-border hover:bg-muted/70 transition-all font-sans"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : context?.eligibility.isEligible === false ? (
                    <div className="p-10 text-center">
                        <div className="w-20 h-20 bg-rojo/5 border border-rojo/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            {context?.eligibility.reason === "role" ? <Ban className="w-10 h-10 text-rojo" /> :
                                context?.eligibility.reason === "gender" ? <Users className="w-10 h-10 text-rojo" /> :
                                    context?.eligibility.reason === "membership" ? <Shield className="w-10 h-10 text-rojo" /> :
                                        <AlertCircle className="w-10 h-10 text-rojo" />}
                        </div>
                        <DialogTitle className="mb-2">Requisito no cumplido</DialogTitle>
                        <p className="text-muted-foreground text-xs mb-8 font-medium italic leading-relaxed px-4">
                            {context?.eligibility.message}
                        </p>

                        {context?.eligibility.reason === "already_registered" ? (
                            <div className="flex flex-col gap-3">
                                <Link
                                    href={`/tournaments/${tournamentId}/manage`}
                                    className="w-full py-4 bg-azul-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-azul-primary/20 active:scale-95 transition-all text-center"
                                >
                                    Ver gestión del torneo
                                </Link>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-muted text-muted-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest border border-border"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-azul-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-azul-primary/20 active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <DialogTitle className="sr-only">Formulario de Inscripción - {context?.tournament?.name}</DialogTitle>
                        <RegisterForm
                            tournament={context?.tournament}
                            currentUser={context?.currentUser}
                            allCategories={context?.allCategories || []}
                            initialRegistrations={context?.initialRegistrations || []}
                            isModal={true}
                            onSuccess={() => {
                                if (onSuccess) onSuccess();
                                // We don't close immediately to let the success step show
                            }}
                            onCancel={onClose}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
