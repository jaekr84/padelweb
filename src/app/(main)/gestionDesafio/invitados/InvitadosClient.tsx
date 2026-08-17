"use client";

// Alta manual de los invitados. Dos caminos, y la diferencia importa:
//   · Promover — la persona no tenía cuenta: se le carga su email y deja de ser
//     invitado. Mismo id, así que conserva todo lo que jugó.
//   · Fusionar — la persona ya tenía cuenta propia: todo lo del invitado se pasa
//     a esa cuenta y el invitado desaparece. Es el arreglo del duplicado.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Link2, Merge, MessageCircle, Search, Trash2, UserCheck, UserPlus } from "lucide-react";
import { ETIQUETA_LADO, type Lado } from "@/lib/desafio";
import {
    eliminarInvitado, fusionarInvitado, generarLinkDeActivacion, promoverInvitado,
    type InvitadoResumen,
} from "../../desafio/actions/invitados";
import { toast } from "sonner";
import { Modal, useAccion } from "../../desafio/piezas";

type Cuenta = { userId: string; nombre: string; email: string; categoria: string | null };

export default function InvitadosClient({
    invitados,
    cuentas,
}: {
    invitados: InvitadoResumen[];
    cuentas: Cuenta[];
}) {
    const { pendiente, correr } = useAccion();
    const [q, setQ] = useState("");
    const [promoviendo, setPromoviendo] = useState<InvitadoResumen | null>(null);
    const [fusionando, setFusionando] = useState<InvitadoResumen | null>(null);
    // El link recién generado, para copiarlo o mandarlo por WhatsApp.
    const [link, setLink] = useState<{ invitado: InvitadoResumen; url: string } | null>(null);
    const [generando, setGenerando] = useState<string | null>(null);

    const generarLink = (i: InvitadoResumen) => {
        setGenerando(i.userId);
        generarLinkDeActivacion(i.userId)
            .then((r) => {
                if (r.ok) setLink({ invitado: i, url: r.data.url });
                else toast.error(r.error);
            })
            .finally(() => setGenerando(null));
    };

    const filtrados = useMemo(
        () => invitados.filter((i) => i.nombre.toLowerCase().includes(q.trim().toLowerCase())),
        [invitados, q]
    );

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                <header>
                    <Link
                        href="/gestionDesafio"
                        className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Gestión de desafíos
                    </Link>
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-4 h-4 text-celeste" />
                        <span className="label-tech text-[8px] text-celeste">Jugadores sin cuenta</span>
                    </div>
                    <h1 className="heading-sport text-3xl text-foreground">Invitados</h1>
                    <p className="text-[12px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        Juegan y suman puntos como cualquiera, pero no pueden entrar a la app ni aparecen en los
                        listados generales. Cuando abran su cuenta, el alta conserva todo lo que jugaron.
                    </p>
                </header>

                {invitados.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                        <UserPlus className="w-10 h-10 text-subtle mx-auto mb-3" />
                        <h2 className="heading-sport text-lg text-muted-foreground">Todavía no hay invitados</h2>
                        <p className="text-[12px] text-subtle mt-1.5 max-w-sm mx-auto">
                            Se agregan desde el panel de un desafío, en "Inscribir jugador".
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Buscar invitado..."
                                className="w-full bg-muted border border-hairline rounded-xl h-10 pl-9 pr-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
                        </div>

                        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden">
                            {filtrados.map((i) => (
                                <div key={i.userId} className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-0">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-bold text-foreground truncate">{i.nombre}</div>
                                        <div className="label-tech text-[7px] text-subtle mt-0.5">
                                            Cat {i.categoria || "—"}
                                            {i.lado && ` · ${ETIQUETA_LADO[i.lado as Lado] ?? i.lado}`}
                                            {i.telefono && ` · ${i.telefono}`}
                                            {" · "}{i.desafios} {i.desafios === 1 ? "desafío" : "desafíos"} · {i.puntos} pts
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => generarLink(i)}
                                        disabled={generando === i.userId}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-celeste text-carbon-950 label-tech text-[8px] hover:bg-celeste-light transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                        title="Link para que active su cuenta"
                                    >
                                        <Link2 className="w-3 h-3" />
                                        {generando === i.userId ? "Generando..." : "Link de activación"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPromoviendo(i)}
                                        disabled={pendiente}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                    >
                                        <UserCheck className="w-3 h-3" />
                                        Dar de alta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFusionando(i)}
                                        disabled={pendiente}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:text-foreground hover:border-celeste/40 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                        title="Ya tiene cuenta propia: pasarle todo lo que jugó"
                                    >
                                        <Merge className="w-3 h-3" />
                                        Fusionar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!confirm(`¿Eliminar a "${i.nombre}"? Sólo se puede si todavía no jugó partidos.`)) return;
                                            correr(() => eliminarInvitado(i.userId), "Invitado eliminado.");
                                        }}
                                        disabled={pendiente}
                                        className="text-subtle hover:text-rojo transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {filtrados.length === 0 && (
                                <p className="text-[11px] text-subtle px-4 py-6 text-center">Ningún invitado coincide.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {promoviendo && (
                <ModalPromover
                    invitado={promoviendo}
                    pendiente={pendiente}
                    onCerrar={() => setPromoviendo(null)}
                    onConfirmar={(email) =>
                        correr(
                            () => promoverInvitado(promoviendo.userId, email),
                            `${promoviendo.nombre} ya es jugador con cuenta.`,
                            () => setPromoviendo(null)
                        )
                    }
                />
            )}

            {link && <ModalLink invitado={link.invitado} url={link.url} onCerrar={() => setLink(null)} />}

            {fusionando && (
                <ModalFusionar
                    invitado={fusionando}
                    cuentas={cuentas}
                    pendiente={pendiente}
                    onCerrar={() => setFusionando(null)}
                    onConfirmar={(cuentaId) =>
                        correr(
                            () => fusionarInvitado(fusionando.userId, cuentaId),
                            "Historial fusionado en la cuenta elegida.",
                            () => setFusionando(null)
                        )
                    }
                />
            )}
        </div>
    );
}

function ModalPromover({
    invitado, pendiente, onCerrar, onConfirmar,
}: {
    invitado: InvitadoResumen;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (email: string) => void;
}) {
    const [email, setEmail] = useState("");

    return (
        <Modal titulo={`Dar de alta a ${invitado.nombre}`} onCerrar={onCerrar}>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                Deja de ser invitado y pasa a ser un jugador más, conservando sus {invitado.puntos} puntos y los{" "}
                {invitado.desafios} desafíos que jugó.
            </p>

            <label className="block mb-3">
                <span className="label-tech text-[7px] text-subtle block mb-1.5">Email real</span>
                <input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jugador@email.com"
                    className="w-full bg-muted border border-hairline rounded-xl h-11 px-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                />
            </label>

            <p className="text-[10px] text-subtle mb-3 leading-relaxed">
                Esto es para cargarle vos el email. Si preferís que lo elija él y se ponga su propia contraseña,
                cerrá esto y usá "Link de activación". Si esa persona ya tiene cuenta propia, usá "Fusionar".
            </p>

            <button
                type="button"
                onClick={() => onConfirmar(email)}
                disabled={pendiente || email.trim().length === 0}
                className="w-full py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            >
                Dar de alta
            </button>
        </Modal>
    );
}

function ModalFusionar({
    invitado, cuentas, pendiente, onCerrar, onConfirmar,
}: {
    invitado: InvitadoResumen;
    cuentas: Cuenta[];
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (cuentaId: string) => void;
}) {
    const [q, setQ] = useState("");
    const filtradas = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return cuentas.slice(0, 30);
        return cuentas.filter((c) => c.nombre.toLowerCase().includes(t) || c.email.toLowerCase().includes(t)).slice(0, 30);
    }, [cuentas, q]);

    return (
        <Modal titulo={`Fusionar a ${invitado.nombre}`} onCerrar={onCerrar}>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                Todo lo que jugó como invitado pasa a la cuenta que elijas y el invitado se elimina.{" "}
                <span className="text-foreground font-bold">No se puede deshacer.</span>
            </p>

            <div className="relative mb-3">
                <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar la cuenta..."
                    className="w-full bg-muted border border-hairline rounded-xl h-10 pl-9 pr-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            </div>

            <ul className="space-y-1 max-h-72 overflow-y-auto">
                {filtradas.map((c) => (
                    <li key={c.userId} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted">
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-bold text-foreground truncate">{c.nombre}</div>
                            <div className="text-[9px] text-subtle truncate">Cat {c.categoria || "—"} · {c.email}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (!confirm(`¿Pasar todo lo de "${invitado.nombre}" a la cuenta de ${c.nombre}?`)) return;
                                onConfirmar(c.userId);
                            }}
                            disabled={pendiente}
                            className="px-2.5 py-1.5 rounded-lg bg-celeste text-carbon-950 label-tech text-[8px] hover:bg-celeste-light transition-all disabled:opacity-40 cursor-pointer shrink-0"
                        >
                            Fusionar
                        </button>
                    </li>
                ))}
                {filtradas.length === 0 && <li className="text-[11px] text-subtle px-2 py-3">Ninguna cuenta coincide.</li>}
            </ul>
        </Modal>
    );
}

/**
 * El link recién generado. Se muestra una sola vez con qué hacer con él: dura
 * 24 horas y se consume al usarse, así que si se pierde hay que generar otro.
 */
function ModalLink({ invitado, url, onCerrar }: { invitado: InvitadoResumen; url: string; onCerrar: () => void }) {
    const texto = `Hola ${invitado.nombre}! Activá tu cuenta de A.C.A.P. acá (el link dura 24 horas): ${url}`;

    return (
        <Modal titulo={`Link para ${invitado.nombre}`} onCerrar={onCerrar}>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
                Mandaselo. Cuando lo abra, elige su email y su contraseña, y su cuenta queda activa con todo lo que
                ya jugó. <span className="text-foreground font-bold">Dura 24 horas y se usa una sola vez.</span>
            </p>

            <div className="rounded-xl bg-muted border border-hairline p-3 mb-3">
                <p className="text-[11px] text-foreground break-all leading-relaxed">{url}</p>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado.");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground hover:border-celeste/40 transition-all active:scale-95 cursor-pointer"
                >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                </button>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95"
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                </a>
            </div>
        </Modal>
    );
}
