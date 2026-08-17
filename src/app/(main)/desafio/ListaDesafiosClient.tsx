"use client";

// La lista de /desafio. Tarjetas de escaneo: lo justo para decidir si entrás.
// Todo lo pesado (inscriptos, sin pareja, tabla de posiciones) vive en el
// detalle, /desafio/[id].

import { useState } from "react";
import Link from "next/link";
import {
    AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, MapPin,
    Plus, Radio, Settings2, Swords, Trophy, Users,
} from "lucide-react";
import { ESTADO_DESAFIO, ETIQUETA_LADO, LADO } from "@/lib/desafio";
import { ChipCategoria, periodo } from "../gestionDesafio/GestionDesafiosClient";
import type { DatosLista, ItemLista, MiPartidoActivo } from "./actions/publico";
import { inscribirme } from "./actions/inscripciones";
import { cargarResultado } from "./actions/partidos";
import { Modal, ModalResultado, useAccion } from "./piezas";

export default function ListaDesafiosClient({ datos }: { datos: DatosLista }) {
    const { pendiente, correr } = useAccion();
    const [eligiendoLado, setEligiendoLado] = useState<ItemLista | null>(null);

    const anotarse = (desafioId: string, lado?: string) =>
        correr(() => inscribirme(desafioId, lado), "¡Estás inscripto!", () => setEligiendoLado(null));

    return (
        <div className="space-y-4">
            {/* Lo primero: si tenés un partido abierto, no se busca — te aparece. */}
            {datos.misPartidos.map((p) => (
                <PartidoActivo key={p.id} partido={p} pendiente={pendiente} correr={correr} />
            ))}

            {datos.esAdmin && (
                <Link
                    href="/gestionDesafio"
                    className="group flex items-center gap-3 rounded-xl border border-celeste/30 bg-card px-4 py-2.5 hover:border-celeste/50 hover:bg-celeste/10 transition-all active:scale-[0.99]"
                >
                    <Settings2 className="w-4 h-4 text-celeste shrink-0" />
                    <span className="label-tech text-[8px] text-celeste flex-1">Gestión de desafíos</span>
                    <ChevronRight className="w-4 h-4 text-celeste shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            )}

            {datos.items.length === 0 ? (
                <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                    <Swords className="w-10 h-10 text-subtle mx-auto mb-3" />
                    <h2 className="heading-sport text-lg text-muted-foreground">Sin desafíos activos</h2>
                    <p className="text-[12px] text-subtle mt-1.5 max-w-sm mx-auto">
                        Todavía no hay ningún desafío abierto. Cuando se publique uno, vas a poder inscribirte desde acá.
                    </p>
                    {datos.esAdmin && (
                        <Link
                            href="/gestionDesafio"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 clip-notch bg-celeste text-carbon-950 text-[10px] font-black uppercase tracking-widest"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Crear un desafío
                        </Link>
                    )}
                </div>
            ) : (
                datos.items.map((t) => (
                    <TarjetaCompacta
                        key={t.desafio.id}
                        t={t}
                        pendiente={pendiente}
                        onInscribirme={() => (datos.necesitaLado ? setEligiendoLado(t) : anotarse(t.desafio.id))}
                    />
                ))
            )}

            {datos.paginas > 1 && <Paginacion pagina={datos.pagina} paginas={datos.paginas} total={datos.total} />}

            {eligiendoLado && (
                <Modal titulo="¿De qué lado jugás?" onCerrar={() => setEligiendoLado(null)}>
                    <p className="text-[12px] text-muted-foreground mb-3">
                        Lo necesitamos para armar las parejas. Queda guardado en tu perfil.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {([LADO.DRIVE, LADO.REVES, LADO.AMBOS] as const).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => anotarse(eligiendoLado.desafio.id, l)}
                                disabled={pendiente}
                                className="py-3 rounded-xl bg-muted border border-hairline text-[11px] font-black uppercase tracking-widest text-foreground hover:border-celeste/50 hover:bg-celeste/10 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                                {ETIQUETA_LADO[l]}
                            </button>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Tarjeta de la lista ─────────────────────────────────────────────────────

function TarjetaCompacta({
    t, pendiente, onInscribirme,
}: {
    t: ItemLista;
    pendiente: boolean;
    onInscribirme: () => void;
}) {
    const d = t.desafio;
    const abierto = d.estado === ESTADO_DESAFIO.ABIERTO;
    const cerrado = d.estado === ESTADO_DESAFIO.CERRADO;
    const lleno = d.cupo > 0 && d.inscriptos >= d.cupo;

    return (
        <article className="group rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden transition-all hover:border-celeste/40">
            {/* La tarjeta entera lleva al detalle; los botones de abajo son la excepción. */}
            <Link href={`/desafio/${d.id}`} className="block p-4">
                <div className="flex items-start gap-3">
                    <ChipCategoria nombres={d.categorias.map((c) => c.nombre)} />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {abierto ? <span className="live-dot" /> : cerrado ? <Trophy className="w-3 h-3 text-gold-ink" /> : null}
                            <span className={`label-tech text-[7px] ${abierto ? "text-volt-ink" : cerrado ? "text-gold-ink" : "text-muted-foreground"}`}>
                                {cerrado ? "Finalizado" : "Inscripción abierta"}
                            </span>
                            {t.inscripto && (
                                <span className="flex items-center gap-1 label-tech text-[7px] text-volt-ink">
                                    <Check className="w-2.5 h-2.5" />
                                    Anotado
                                </span>
                            )}
                        </div>

                        <h2 className="heading-sport text-lg text-foreground truncate leading-tight">{d.nombre}</h2>

                        {/* Los datos como una línea de texto: en una lista se escanean mejor que en cajitas. */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3 text-subtle" />
                                {periodo(d.fechaInicio, d.fechaFin)}
                            </span>
                            {d.hora && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-subtle" />
                                    {d.hora}
                                </span>
                            )}
                            {d.lugar && (
                                <span className="flex items-center gap-1 min-w-0">
                                    <MapPin className="w-3 h-3 text-subtle shrink-0" />
                                    <span className="truncate">{d.lugar}</span>
                                </span>
                            )}
                            <span className={`flex items-center gap-1 ${lleno ? "text-rojo" : ""}`}>
                                <Users className="w-3 h-3 text-subtle" />
                                {d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""}
                            </span>
                        </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-subtle shrink-0 mt-1 group-hover:text-celeste group-hover:translate-x-0.5 transition-all" />
                </div>
            </Link>

            <div className="flex items-center gap-2 px-4 pb-4">
                {t.inscripto ? (
                    <Link
                        href={`/desafio/${d.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground hover:border-celeste/40 transition-all active:scale-95"
                    >
                        Ver el desafío
                    </Link>
                ) : t.puedeInscribirse ? (
                    <button
                        type="button"
                        onClick={onInscribirme}
                        disabled={pendiente}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-30 cursor-pointer"
                    >
                        {pendiente ? "Inscribiendo..." : "Inscribirme"}
                    </button>
                ) : (
                    <Link
                        href={`/desafio/${d.id}`}
                        title={t.motivo ?? undefined}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground hover:border-celeste/40 transition-all active:scale-95"
                    >
                        {cerrado ? "Ver posiciones" : "Ver el desafío"}
                    </Link>
                )}
            </div>
        </article>
    );
}

// ── Franja de partido en curso ──────────────────────────────────────────────

function PartidoActivo({
    partido, pendiente, correr,
}: {
    partido: MiPartidoActivo;
    pendiente: boolean;
    correr: (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) => void;
}) {
    const [cargando, setCargando] = useState(false);
    const rechazado = partido.estado === "rechazado";

    return (
        <>
            <div className={`rounded-2xl border p-4 ${rechazado ? "border-rojo/40 bg-rojo/[0.06]" : "border-live/40 bg-live/[0.06]"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                    <Radio className={`w-3.5 h-3.5 ${rechazado ? "text-rojo" : "text-live"}`} />
                    <span className={`label-tech text-[8px] ${rechazado ? "text-rojo" : "text-live"}`}>
                        {rechazado ? "Resultado rechazado" : "Estás jugando"}
                        {partido.canchaNumero != null && ` · Cancha ${partido.canchaNumero}`}
                    </span>
                    <span className="label-tech text-[7px] text-subtle truncate ml-auto">{partido.desafioNombre}</span>
                </div>

                <p className="text-[12px] text-foreground">
                    Con <span className="font-bold">{partido.compañero}</span> vs {partido.rivales.join(" / ")}
                </p>

                {partido.motivoRechazo && (
                    <p className="flex items-start gap-1.5 text-[11px] text-rojo mt-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {partido.motivoRechazo}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => setCargando(true)}
                    className="w-full mt-3 py-2.5 clip-notch bg-live text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                >
                    Cargar resultado
                </button>
            </div>

            {cargando && (
                <ModalResultado
                    compañero={partido.compañero}
                    rivales={partido.rivales}
                    pendiente={pendiente}
                    onCerrar={() => setCargando(false)}
                    onGuardar={(sets) =>
                        correr(
                            () => cargarResultado(partido.id, sets),
                            "Resultado enviado: el admin lo va a confirmar.",
                            () => setCargando(false)
                        )
                    }
                />
            )}
        </>
    );
}

// ── Paginación ──────────────────────────────────────────────────────────────

/**
 * Paginación por URL (`?p=2`): links de verdad, así el navegador conserva el
 * historial y la página se puede compartir.
 */
function Paginacion({ pagina, paginas, total }: { pagina: number; paginas: number; total: number }) {
    const boton =
        "flex items-center gap-1.5 px-4 py-2.5 clip-notch bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest transition-all active:scale-95";
    const activo = "text-muted-foreground hover:text-foreground hover:border-celeste/40";
    const inerte = "text-subtle opacity-40 pointer-events-none";

    return (
        <nav className="flex items-center justify-between gap-3 pt-1">
            {pagina > 1 ? (
                <Link href={`/desafio?p=${pagina - 1}`} className={`${boton} ${activo}`}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anteriores
                </Link>
            ) : (
                <span className={`${boton} ${inerte}`}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anteriores
                </span>
            )}

            <span className="label-tech text-[8px] text-subtle text-center">
                Página {pagina} de {paginas} · {total} desafíos
            </span>

            {pagina < paginas ? (
                <Link href={`/desafio?p=${pagina + 1}`} className={`${boton} ${activo}`}>
                    Siguientes
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            ) : (
                <span className={`${boton} ${inerte}`}>
                    Siguientes
                    <ChevronRight className="w-3.5 h-3.5" />
                </span>
            )}
        </nav>
    );
}
