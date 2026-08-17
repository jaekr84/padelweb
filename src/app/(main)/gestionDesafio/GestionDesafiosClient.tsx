"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, Settings2, Swords,
    Trash2, Trophy, Unlock, UserPlus, X,
} from "lucide-react";
import { ESTADO_DESAFIO, ETIQUETA_ESTADO_DESAFIO, type EstadoDesafio } from "@/lib/desafio";
import {
    abrirDesafio, cerrarDesafio, crearDesafio, editarDesafio, eliminarDesafio, reabrirDesafio,
    type DatosDesafio, type DesafioResumen,
} from "../desafio/actions/desafios";

type Categoria = { id: string; nombre: string; orden: number };

export default function GestionDesafiosClient({
    desafios,
    categorias,
}: {
    desafios: DesafioResumen[];
    categorias: Categoria[];
}) {
    const router = useRouter();
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState<string | null>(null);
    const [pendiente, iniciar] = useTransition();
    const [estado, setEstado] = useState<EstadoDesafio | "todos">("todos");
    const [mes, setMes] = useState("todos");
    const [orden, setOrden] = useState<Orden>({ campo: "fecha", desc: true });

    // Clic en la misma columna alterna la dirección; en otra, empieza
    // descendente, que es lo que uno espera de fechas y de cantidades.
    const ordenarPor = (campo: Campo) =>
        setOrden((o) => (o.campo === campo ? { campo, desc: !o.desc } : { campo, desc: true }));

    // Los meses del selector salen de los desafíos que hay, no de un calendario
    // fijo: no tiene sentido ofrecer meses vacíos. Se agrupa por fecha de inicio.
    const meses = useMemo(() => {
        const vistos = new Map<string, string>();
        for (const d of desafios) {
            const clave = d.fechaInicio ? d.fechaInicio.slice(0, 7) : "sin-fecha";
            if (!vistos.has(clave)) vistos.set(clave, clave === "sin-fecha" ? "Sin fecha" : etiquetaDeMes(clave));
        }
        // Más nuevo primero; "Sin fecha" siempre al final.
        return [...vistos.entries()]
            .sort((a, b) => (a[0] === "sin-fecha" ? 1 : b[0] === "sin-fecha" ? -1 : b[0].localeCompare(a[0])))
            .map(([valor, etiqueta]) => ({ valor, etiqueta }));
    }, [desafios]);

    const visibles = useMemo(() => {
        const filtrados = desafios.filter((d) => {
            if (estado !== "todos" && d.estado !== estado) return false;
            if (mes === "todos") return true;
            return (d.fechaInicio ? d.fechaInicio.slice(0, 7) : "sin-fecha") === mes;
        });

        const valor = (d: DesafioResumen) => {
            switch (orden.campo) {
                // Las fechas son "YYYY-MM-DD": ordenan bien como texto. Las que
                // faltan van siempre al fondo, no al principio.
                case "fecha": return d.fechaInicio ?? "";
                case "nombre": return d.nombre.toLowerCase();
                case "inscriptos": return d.inscriptos;
                case "partidos": return d.partidos;
            }
        };

        return [...filtrados].sort((a, b) => {
            const va = valor(a);
            const vb = valor(b);
            const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb));
            return orden.desc ? -cmp : cmp;
        });
    }, [desafios, estado, mes, orden]);

    const enEdicion = desafios.find((d) => d.id === editando) ?? null;

    const acciones = (d: DesafioResumen) => ({
        pendiente,
        onEditar: () => setEditando(d.id),
        onAbrir: () => correr(() => abrirDesafio(d.id), "Desafío abierto: ya se pueden inscribir."),
        onCerrar: () => correr(() => cerrarDesafio(d.id), "Desafío cerrado."),
        onReabrir: () => correr(() => reabrirDesafio(d.id), "Desafío reabierto."),
        onEliminar: () => eliminar(d),
    });

    const contar = (e: EstadoDesafio | "todos") =>
        e === "todos" ? desafios.length : desafios.filter((d) => d.estado === e).length;

    const correr = (
        fn: () => Promise<{ ok: boolean; error?: string }>,
        exito: string,
        despues?: () => void
    ) => {
        iniciar(async () => {
            const r = await fn();
            if (r.ok) {
                toast.success(exito);
                despues?.();
                router.refresh();
            } else {
                toast.error(r.error || "No se pudo completar la acción");
            }
        });
    };

    /**
     * Borrado con confirmación. Con partidos jugados se van también el historial
     * y los puntos, así que ahí pide una segunda confirmación: es la que habilita
     * el borrado del lado del servidor.
     */
    const eliminar = (d: DesafioResumen, despues?: () => void) => {
        const detalle = [
            d.inscriptos > 0 ? `${d.inscriptos} inscriptos` : null,
            d.partidos > 0 ? `${d.partidos} partidos con sus puntos` : null,
        ].filter(Boolean).join(" y ");
        if (!confirm(`¿Eliminar "${d.nombre}"?${detalle ? ` Se borran también ${detalle}.` : ""}`)) return;
        if (
            d.partidos > 0 &&
            !confirm(`Esto no se puede deshacer: se pierden los ${d.partidos} partidos de "${d.nombre}" y su tabla de posiciones. ¿Seguro?`)
        ) return;
        correr(() => eliminarDesafio(d.id, d.partidos > 0), "Desafío eliminado.", despues);
    };

    return (
        <div className="min-h-screen bg-grid-carbon">
            {/* Más ancho que el resto: la tabla tiene nueve columnas. */}
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/desafio"
                                className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Swords className="w-3 h-3" />
                                Ver la página pública
                            </Link>
                            <Link
                                href="/gestionDesafio/invitados"
                                className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <UserPlus className="w-3 h-3" />
                                Invitados
                            </Link>
                        </div>
                        <h1 className="heading-sport text-2xl sm:text-3xl text-foreground">Gestión de Desafíos</h1>
                        <p className="text-[11px] text-subtle mt-1">
                            Cada desafío tiene su categoría, sus canchas y su propia tabla de posiciones.
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-muted border border-celeste/30 flex items-center justify-center shrink-0">
                        <Settings2 className="w-5 h-5 text-celeste" />
                    </div>
                </header>

                <button
                    type="button"
                    onClick={() => setCreando(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Crear un desafío
                </button>

                {creando && (
                    <ModalFormulario onCerrar={() => setCreando(false)}>
                        <Formulario
                            titulo="Crear un desafío"
                            accion="Crear desafío"
                            categorias={categorias}
                            pendiente={pendiente}
                            onCancelar={() => setCreando(false)}
                            onGuardar={(datos) =>
                                correr(() => crearDesafio(datos), "Desafío creado en borrador.", () => setCreando(false))
                            }
                        />
                    </ModalFormulario>
                )}

                {desafios.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                            {([
                                ["todos", "Todos"],
                                [ESTADO_DESAFIO.ABIERTO, "Abiertos"],
                                [ESTADO_DESAFIO.CERRADO, "Cerrados"],
                                [ESTADO_DESAFIO.BORRADOR, "Borradores"],
                            ] as const).map(([valor, rotulo]) => {
                                const n = contar(valor as EstadoDesafio | "todos");
                                return (
                                    <button
                                        key={valor}
                                        type="button"
                                        aria-pressed={estado === valor}
                                        onClick={() => setEstado(valor as EstadoDesafio | "todos")}
                                        className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${estado === valor
                                            ? "bg-celeste text-carbon-950 border-celeste shadow-lg shadow-celeste/20"
                                            : "bg-muted border-hairline text-muted-foreground hover:text-foreground hover:border-celeste/40"
                                            }`}
                                    >
                                        {rotulo} <span className="opacity-60">{n}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <select
                            value={mes}
                            onChange={(e) => setMes(e.target.value)}
                            className="ml-auto h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                        >
                            <option value="todos">Todos los meses</option>
                            {meses.map((m) => (
                                <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
                            ))}
                        </select>
                    </div>
                )}

                {desafios.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                        <Swords className="w-10 h-10 text-subtle mx-auto mb-3" />
                        <h2 className="heading-sport text-lg text-muted-foreground">Todavía no hay desafíos</h2>
                        <p className="text-[12px] text-subtle mt-1.5">Creá el primero para empezar a recibir inscripciones.</p>
                    </div>
                ) : desafios.length > 0 && visibles.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                        <Swords className="w-10 h-10 text-subtle mx-auto mb-3" />
                        <h2 className="heading-sport text-lg text-muted-foreground">Ningún desafío coincide</h2>
                        <p className="text-[12px] text-subtle mt-1.5">Probá con otro estado u otro mes.</p>
                    </div>
                ) : (
                    <>
                        <TablaDesafios desafios={visibles} orden={orden} onOrdenar={ordenarPor} acciones={acciones} />
                        <div className="space-y-2">
                            {visibles.map((d) => (
                                <FilaCompacta key={d.id} desafio={d} acciones={acciones(d)} />
                            ))}
                        </div>
                    </>
                )}

                {enEdicion && (
                    <ModalFormulario onCerrar={() => setEditando(null)}>
                        <Formulario
                            titulo={`Editar "${enEdicion.nombre}"`}
                            accion="Guardar cambios"
                            categorias={categorias}
                            pendiente={pendiente}
                            inicial={enEdicion}
                            onCancelar={() => setEditando(null)}
                            onEliminar={() => eliminar(enEdicion, () => setEditando(null))}
                            onGuardar={(datos) =>
                                correr(() => editarDesafio(enEdicion.id, datos), "Desafío actualizado.", () => setEditando(null))
                            }
                        />
                    </ModalFormulario>
                )}
            </div>
        </div>
    );
}

// ── Tabla ───────────────────────────────────────────────────────────────────
//
// Es una pantalla de gestión: importa cuántos desafíos ves de una y qué podés
// hacer con cada uno, no lo lindo que se ve cada tarjeta. En mobile la tabla no
// entra, así que ahí van filas compactas con la misma información.

type Campo = "fecha" | "nombre" | "inscriptos" | "partidos";
type Orden = { campo: Campo; desc: boolean };

/** Acciones que expone cada fila, iguales en la tabla y en mobile. */
type AccionesFila = {
    pendiente: boolean;
    onEditar: () => void;
    onAbrir: () => void;
    onCerrar: () => void;
    onReabrir: () => void;
    onEliminar: () => void;
};

function TablaDesafios({
    desafios, orden, onOrdenar, acciones,
}: {
    desafios: DesafioResumen[];
    orden: Orden;
    onOrdenar: (campo: Campo) => void;
    acciones: (d: DesafioResumen) => AccionesFila;
}) {
    return (
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40">
            <table className="w-full">
                <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                        <th className="py-2.5 pl-4 pr-2 text-left w-28">Estado</th>
                        <Encabezado campo="nombre" orden={orden} onOrdenar={onOrdenar} className="py-2.5 px-2 text-left">Desafío</Encabezado>
                        <th className="py-2.5 px-2 text-left w-24">Cat</th>
                        <Encabezado campo="fecha" orden={orden} onOrdenar={onOrdenar} className="py-2.5 px-2 text-left w-32">Período</Encabezado>
                        <th className="py-2.5 px-2 text-left">Hora · Lugar</th>
                        <Encabezado campo="inscriptos" orden={orden} onOrdenar={onOrdenar} className="py-2.5 px-2 text-center w-20">Inscr.</Encabezado>
                        <Encabezado campo="partidos" orden={orden} onOrdenar={onOrdenar} className="py-2.5 px-2 text-center w-20">Partidos</Encabezado>
                        <th className="py-2.5 px-2 text-center w-16">Puntos</th>
                        <th className="py-2.5 pr-4 pl-2 text-right w-64">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {desafios.map((d) => {
                        const a = acciones(d);
                        return (
                            <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-muted/60 transition-colors">
                                <td className="py-2 pl-4 pr-2"><Estado estado={d.estado} /></td>
                                <td className="py-2 px-2 max-w-0">
                                    {/* La descripción no tiene columna propia: vive en el title del nombre. */}
                                    <div className="text-[12px] font-bold text-foreground truncate" title={d.descripcion || undefined}>
                                        {d.nombre}
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-[10px] font-black uppercase text-celeste-light truncate">
                                    {d.categorias.map((c) => c.nombre).join("/") || "—"}
                                </td>
                                <td className="py-2 px-2 text-[11px] text-muted-foreground whitespace-nowrap">
                                    {periodo(d.fechaInicio, d.fechaFin)}
                                </td>
                                <td className="py-2 px-2 text-[11px] text-muted-foreground truncate max-w-0">
                                    {[d.hora, d.lugar].filter(Boolean).join(" · ") || "—"}
                                </td>
                                <td className={`py-2 px-2 text-center text-[12px] tabular-nums ${d.cupo > 0 && d.inscriptos >= d.cupo ? "text-rojo" : "text-foreground"}`}>
                                    {d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""}
                                </td>
                                <td className="py-2 px-2 text-center text-[12px] tabular-nums text-muted-foreground">{d.partidos}</td>
                                <td className="py-2 px-2 text-center text-[10px] tabular-nums text-subtle whitespace-nowrap">
                                    {d.puntos.participacion}+{d.puntos.victoria}+{d.puntos.derrota}
                                </td>
                                <td className="py-2 pr-4 pl-2">
                                    <Acciones desafio={d} acciones={a} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/** Encabezado ordenable: el mismo clic alterna la dirección. */
function Encabezado({
    campo, orden, onOrdenar, className, children,
}: {
    campo: Campo;
    orden: Orden;
    onOrdenar: (campo: Campo) => void;
    className: string;
    children: React.ReactNode;
}) {
    const activo = orden.campo === campo;
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => onOrdenar(campo)}
                className={`inline-flex items-center gap-1 uppercase tracking-widest transition-colors cursor-pointer ${activo ? "text-foreground" : "hover:text-foreground"}`}
            >
                {children}
                {activo && (orden.desc ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />)}
            </button>
        </th>
    );
}

function Estado({ estado }: { estado: EstadoDesafio }) {
    const abierto = estado === ESTADO_DESAFIO.ABIERTO;
    const cerrado = estado === ESTADO_DESAFIO.CERRADO;
    return (
        <span className="flex items-center gap-1.5">
            {abierto ? <span className="live-dot" /> : cerrado ? <Trophy className="w-3 h-3 text-gold-ink" /> : <Swords className="w-3 h-3 text-muted-foreground" />}
            <span className={`label-tech text-[7px] ${abierto ? "text-volt-ink" : cerrado ? "text-gold-ink" : "text-muted-foreground"}`}>
                {ETIQUETA_ESTADO_DESAFIO[estado]}
            </span>
        </span>
    );
}

/**
 * La acción que corresponde al estado va con texto; el resto en iconos con
 * tooltip, para que la fila no se convierta en una botonera.
 */
function Acciones({ desafio: d, acciones: a }: { desafio: DesafioResumen; acciones: AccionesFila }) {
    const borrador = d.estado === ESTADO_DESAFIO.BORRADOR;
    const abierto = d.estado === ESTADO_DESAFIO.ABIERTO;
    const icono =
        "w-7 h-7 rounded-lg bg-muted border border-hairline flex items-center justify-center text-muted-foreground transition-all active:scale-95 disabled:opacity-30 cursor-pointer shrink-0";

    return (
        <div className="flex items-center justify-end gap-1.5">
            {borrador ? (
                <button type="button" onClick={a.onAbrir} disabled={a.pendiente} className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer">
                    <Unlock className="w-3 h-3" />
                    Abrir
                </button>
            ) : abierto ? (
                <button type="button" onClick={a.onCerrar} disabled={a.pendiente} className={`${icono} w-auto px-2.5 gap-1.5 label-tech text-[8px] hover:border-rojo/40 hover:text-rojo`} title="Cerrar el desafío">
                    <Lock className="w-3 h-3" />
                    Cerrar
                </button>
            ) : (
                <button type="button" onClick={a.onReabrir} disabled={a.pendiente} className={`${icono} w-auto px-2.5 gap-1.5 label-tech text-[8px] hover:border-celeste/40 hover:text-foreground`} title="Reabrir para corregir resultados">
                    Reabrir
                </button>
            )}

            {!borrador && (
                <Link href={`/gestionDesafio/${d.id}`} className={`${icono} hover:border-celeste/40 hover:text-celeste`} title="Panel en vivo">
                    <Settings2 className="w-3.5 h-3.5" />
                </Link>
            )}

            <button type="button" onClick={a.onEditar} disabled={a.pendiente} className={`${icono} hover:border-celeste/40 hover:text-foreground`} title="Editar">
                <Pencil className="w-3.5 h-3.5" />
            </button>

            <button type="button" onClick={a.onEliminar} disabled={a.pendiente} className={`${icono} hover:border-rojo/40 hover:text-rojo`} title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

/** La misma fila para mobile, donde la tabla no entra. */
function FilaCompacta({ desafio: d, acciones: a }: { desafio: DesafioResumen; acciones: AccionesFila }) {
    return (
        <div className="md:hidden rounded-xl border border-hairline bg-card p-3">
            <div className="flex items-center justify-between gap-2">
                <Estado estado={d.estado} />
                <span className="text-[10px] font-black uppercase text-celeste-light">
                    {d.categorias.map((c) => c.nombre).join("/") || "—"}
                </span>
            </div>

            <h2 className="heading-sport text-base text-foreground truncate mt-1.5">{d.nombre}</h2>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                <span>{periodo(d.fechaInicio, d.fechaFin)}</span>
                {d.hora && <span>{d.hora}</span>}
                {d.lugar && <span className="truncate">{d.lugar}</span>}
                <span>{d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""} inscr.</span>
                <span>{d.partidos} part.</span>
            </div>

            <div className="mt-2.5">
                <Acciones desafio={d} acciones={a} />
            </div>
        </div>
    );
}

/**
 * El cuadrito de categoría. Con varias categorías admitidas las muestra juntas
 * ("C/B") y achica la tipografía para que sigan entrando.
 */
export function ChipCategoria({ nombres, size = "md" }: { nombres: string[]; size?: "md" | "lg" }) {
    const caja = size === "lg" ? "w-16 h-16" : "w-14 h-14";
    const nombre = nombres.join("/");
    const valor =
        nombres.length <= 1 ? (size === "lg" ? "text-2xl" : "text-xl")
            : nombre.length <= 4 ? (size === "lg" ? "text-lg" : "text-base")
                : nombre.length <= 7 ? "text-[11px]"
                    : "text-[9px]";

    if (nombres.length === 0) {
        return (
            <div className={`${caja} shrink-0 clip-notch bg-muted border border-hairline flex flex-col items-center justify-center`}>
                <span className="label-tech text-[6px] text-subtle leading-none">Cat</span>
                <span className={`heading-sport ${valor} text-muted-foreground leading-none mt-1`}>—</span>
            </div>
        );
    }
    return (
        <div className={`${caja} shrink-0 clip-notch bg-celeste/15 border border-celeste/35 flex flex-col items-center justify-center shadow-lg shadow-celeste/10`}>
            <span className="label-tech text-[6px] text-celeste/70 leading-none">Cat</span>
            <span className={`heading-sport ${valor} text-celeste leading-none mt-1 px-1 text-center`}>{nombre}</span>
        </div>
    );
}

function fechaLocal(s: string) {
    if (s.length === 10 && s.includes("-")) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/** "agosto 2026" a partir de un "YYYY-MM", para el selector de mes. */
function etiquetaDeMes(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    const texto = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "12 de agosto" para un día, "12 ago – 30 ago" para un período. */
export function periodo(inicio: string | null, fin: string | null) {
    const a = inicio ? fechaLocal(inicio) : null;
    const b = fin ? fechaLocal(fin) : null;
    if (!a) return "Sin fecha";
    const largo = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    const corto = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    if (!b || inicio === fin) return largo(a);
    return `${corto(a)} – ${corto(b)}`;
}

/** Caja modal para el formulario: la tabla queda atrás, sin perder el scroll. */
function ModalFormulario({ children, onCerrar }: { children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-xl my-0 sm:my-6">{children}</div>
        </div>
    );
}

// ── Formulario ──────────────────────────────────────────────────────────────

function Formulario({
    titulo,
    accion,
    categorias,
    inicial,
    pendiente,
    onGuardar,
    onCancelar,
    onEliminar,
}: {
    titulo: string;
    accion: string;
    categorias: Categoria[];
    inicial?: DesafioResumen;
    pendiente: boolean;
    onGuardar: (datos: DatosDesafio) => void;
    onCancelar: () => void;
    /** Sólo al editar: crear todavía no tiene nada que borrar. */
    onEliminar?: () => void;
}) {
    const [form, setForm] = useState<DatosDesafio>({
        nombre: inicial?.nombre ?? "",
        categoriaIds: inicial?.categorias.map((c) => c.id) ?? [],
        descripcion: inicial?.descripcion ?? "",
        fechaInicio: inicial?.fechaInicio ?? "",
        fechaFin: inicial?.fechaFin ?? "",
        hora: inicial?.hora ?? "",
        lugar: inicial?.lugar ?? "",
        inscripcion: inicial?.inscripcion ?? null,
        cupo: inicial?.cupo ?? 0,
        puntosParticipacion: inicial?.puntos.participacion ?? 1,
        puntosVictoria: inicial?.puntos.victoria ?? 3,
        puntosDerrota: inicial?.puntos.derrota ?? 0,
    });

    const set = <K extends keyof DatosDesafio>(k: K, v: DatosDesafio[K]) => setForm((p) => ({ ...p, [k]: v }));
    const periodoInvalido = !!form.fechaInicio && !!form.fechaFin && form.fechaFin < form.fechaInicio;
    const listo = !!form.nombre?.trim() && form.categoriaIds.length > 0 && !periodoInvalido;

    const alternarCategoria = (id: string) =>
        setForm((p) => ({
            ...p,
            categoriaIds: p.categoriaIds.includes(id)
                ? p.categoriaIds.filter((x) => x !== id)
                : [...p.categoriaIds, id],
        }));

    // Para el texto de ayuda: los nombres elegidos, de la más baja a la más alta.
    const elegidas = categorias.filter((c) => form.categoriaIds.includes(c.id)).map((c) => c.nombre);

    return (
        <section className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-5">
            <h2 className="heading-sport text-lg text-foreground mb-4">{titulo}</h2>

            <div className="space-y-3">
                <Campo rotulo="Nombre">
                    <input
                        value={form.nombre}
                        onChange={(e) => set("nombre", e.target.value)}
                        placeholder="Desafío de Agosto"
                        className={entrada}
                    />
                </Campo>

                <Campo rotulo="Categorías (al menos una)">
                    {categorias.length === 0 ? (
                        <p className="text-[11px] text-rojo">
                            No hay categorías activas. Creá una en Admin → Categorías antes de seguir.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {categorias.map((c) => {
                                const elegida = form.categoriaIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        aria-pressed={elegida}
                                        onClick={() => alternarCategoria(c.id)}
                                        className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${elegida
                                            ? "bg-celeste text-carbon-950 border-celeste shadow-lg shadow-celeste/20"
                                            : "bg-muted border-hairline text-muted-foreground hover:text-foreground hover:border-celeste/40"
                                            }`}
                                    >
                                        {c.nombre}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-[10px] text-subtle mt-1.5">
                        {elegidas.length === 0
                            ? "Sólo se van a poder inscribir los jugadores de las categorías que marques."
                            : `Se pueden inscribir únicamente los de ${elegidas.join(", ")}. Para que jueguen "para arriba", marcá también su categoría.`}
                    </p>
                </Campo>

                <Campo rotulo="Descripción (opcional)">
                    <textarea
                        value={form.descripcion ?? ""}
                        onChange={(e) => set("descripcion", e.target.value)}
                        rows={2}
                        placeholder="Cómo se juega, qué llevar, etc."
                        className={`${entrada} h-auto py-2.5 resize-none`}
                    />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Fecha de inicio">
                        <input type="date" value={form.fechaInicio ?? ""} onChange={(e) => set("fechaInicio", e.target.value)} className={entrada} />
                    </Campo>
                    <Campo rotulo="Fecha de fin">
                        <input
                            type="date"
                            value={form.fechaFin ?? ""}
                            min={form.fechaInicio || undefined}
                            onChange={(e) => set("fechaFin", e.target.value)}
                            className={periodoInvalido ? entradaError : entrada}
                        />
                    </Campo>
                </div>
                {periodoInvalido && <p className="text-[10px] text-rojo -mt-1">La fecha de fin no puede ser anterior a la de inicio.</p>}

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Hora">
                        <input type="time" value={form.hora ?? ""} onChange={(e) => set("hora", e.target.value)} className={entrada} />
                    </Campo>
                    <Campo rotulo="Lugar">
                        <input value={form.lugar ?? ""} onChange={(e) => set("lugar", e.target.value)} placeholder="Club, dirección..." className={entrada} />
                    </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Monto de inscripción ($)">
                        <input
                            type="number"
                            min={0}
                            value={form.inscripcion ?? ""}
                            onChange={(e) => set("inscripcion", e.target.value ? Number(e.target.value) : null)}
                            placeholder="0 = gratis"
                            className={entrada}
                        />
                    </Campo>
                    <Campo rotulo="Cupo (0 = sin límite)">
                        <input
                            type="number"
                            min={0}
                            value={form.cupo ?? 0}
                            onChange={(e) => set("cupo", e.target.value ? Number(e.target.value) : 0)}
                            className={entrada}
                        />
                    </Campo>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Campo rotulo="Pts participación">
                        <input type="number" min={0} value={form.puntosParticipacion ?? 1} onChange={(e) => set("puntosParticipacion", Number(e.target.value))} className={entrada} />
                    </Campo>
                    <Campo rotulo="Pts victoria">
                        <input type="number" min={0} value={form.puntosVictoria ?? 3} onChange={(e) => set("puntosVictoria", Number(e.target.value))} className={entrada} />
                    </Campo>
                    <Campo rotulo="Pts derrota">
                        <input type="number" min={0} value={form.puntosDerrota ?? 0} onChange={(e) => set("puntosDerrota", Number(e.target.value))} className={entrada} />
                    </Campo>
                </div>
            </div>

            <div className="flex gap-2 mt-5">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all active:scale-95 cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={() => onGuardar(form)}
                    disabled={pendiente || !listo}
                    className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-30 cursor-pointer"
                >
                    <Check className="w-3.5 h-3.5" />
                    {accion}
                </button>
            </div>

            {onEliminar && (
                <button
                    type="button"
                    onClick={onEliminar}
                    disabled={pendiente}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-hairline text-subtle text-[9px] font-black uppercase tracking-widest hover:text-rojo hover:border-rojo/30 transition-all disabled:opacity-40 cursor-pointer"
                >
                    <Trash2 className="w-3 h-3" />
                    Eliminar desafío
                </button>
            )}
        </section>
    );
}

const entrada =
    "w-full bg-muted border border-hairline rounded-xl h-11 px-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40 transition-all";
const entradaError =
    "w-full bg-muted border border-rojo/60 rounded-xl h-11 px-3 text-[12px] font-bold text-foreground focus:outline-none transition-all";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="label-tech text-[7px] text-subtle block mb-1.5">{rotulo}</span>
            {children}
        </label>
    );
}
