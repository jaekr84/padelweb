"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Verificación del dominio del módulo Desafío.
//
// Corre sobre el MISMO código que van a usar las server actions (importado
// desde @/lib/desafio). No toca la base de datos. Ruta: /dev/desafio
//
// Dos partes:
//   1. Casos: aserciones sobre las reglas cerradas de la spec.
//   2. Simulación: un desafío entero de punta a punta, sin DB.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    // estados y máquinas
    ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO, LADO,
    chequearTransicionPartido, chequearTransicionInscripcion, chequearTransicionDesafio,
    chequearCierre, puedeCargarResultado, puedeEditarCategoria, recomputarPosiciones,
    normalizarLado, ETIQUETA_LADO,
    // categorías
    chequearCategoria, categoriasHabilitadas, buscarCategoria, juegaParaArriba,
    type CategoriaRef,
    // puntaje
    PUNTAJE_DEFAULT, entradaParticipacion, entradasDePartido, calcularResultado, formatearSets,
    type EntradaLedger, type SetPartido,
    // lados
    costoPareja, avisoPareja, agruparPorLado, sugerirCompaneros,
    // ranking
    calcularRanking, efectividad,
} from "@/lib/desafio";

type Estado = "pass" | "fail";
type Caso = { nombre: string; estado: Estado; detalle?: string };
type Grupo = { titulo: string; casos: Caso[] };

const check = (nombre: string, pasa: boolean, detalle?: string): Caso => ({
    nombre,
    estado: pasa ? "pass" : "fail",
    detalle,
});

// Las categorías tal como están en la base de este proyecto:
// orden mayor = categoría mejor (al revés de la spec).
const CATS: CategoriaRef[] = [
    { nombre: "C", orden: 1 },
    { nombre: "B", orden: 2 },
    { nombre: "A", orden: 3 },
    { nombre: "A+", orden: 4 },
];
const cat = (n: string) => CATS.find((c) => c.nombre === n)!;

// ── Casos ───────────────────────────────────────────────────────────────────

function construirGrupos(): Grupo[] {
    const grupos: Grupo[] = [];

    // Categorías — membresía estricta contra el conjunto admitido
    {
        const casos: Caso[] = [];
        casos.push(check(
            "Un A entra a un desafío que admite A",
            chequearCategoria({ jugador: cat("A"), desafio: [cat("A")] }).ok
        ));
        casos.push(check(
            "Un C entra a un desafío que admite C y B",
            chequearCategoria({ jugador: cat("C"), desafio: [cat("C"), cat("B")] }).ok
        ));
        const arriba = chequearCategoria({ jugador: cat("C"), desafio: [cat("A")] });
        casos.push(check(
            "Un C NO entra a un desafío sólo de A (ya no hay 'para arriba' implícito)",
            !arriba.ok && arriba.motivo === "fuera_de_categoria",
            !arriba.ok ? arriba.error : undefined
        ));
        const abajo = chequearCategoria({ jugador: cat("A+"), desafio: [cat("C"), cat("B")] });
        casos.push(check(
            "Un A+ NO puede bajar a un desafío de C y B",
            !abajo.ok && abajo.motivo === "fuera_de_categoria",
            !abajo.ok ? abajo.error : undefined
        ));
        const vacio = chequearCategoria({ jugador: cat("B"), desafio: [] });
        casos.push(check(
            "Un desafío sin categorías no admite a nadie",
            !vacio.ok && vacio.motivo === "fuera_de_categoria",
            !vacio.ok ? vacio.error : undefined
        ));
        const sinCat = chequearCategoria({ jugador: null, desafio: [cat("A")] });
        casos.push(check(
            "Sin categoría en el perfil se rechaza",
            !sinCat.ok && sinCat.motivo === "sin_categoria"
        ));
        casos.push(check(
            "El admin puede saltear la validación (excepción)",
            chequearCategoria({ jugador: cat("A+"), desafio: [cat("C")], esExcepcion: true }).ok
        ));
        const habilitadas = categoriasHabilitadas(cat("B"), CATS).map((c) => c.nombre);
        casos.push(check(
            "Un B ve habilitadas B, A y A+",
            JSON.stringify(habilitadas) === JSON.stringify(["B", "A", "A+"]),
            habilitadas.join(", ")
        ));
        casos.push(check(
            'Categoría basura del perfil ("5ta") no matchea ninguna',
            buscarCategoria("5ta", CATS) === null
        ));
        casos.push(check(
            "buscarCategoria ignora mayúsculas y espacios",
            buscarCategoria("  a+  ", CATS)?.nombre === "A+"
        ));
        casos.push(check(
            "En un desafío de C y A, el C juega para arriba y el A no",
            juegaParaArriba(cat("C"), [cat("C"), cat("A")]) && !juegaParaArriba(cat("A"), [cat("C"), cat("A")])
        ));
        grupos.push({ titulo: "Categorías (membresía estricta)", casos });
    }

    // Máquina del partido
    {
        const casos: Caso[] = [];
        casos.push(check(
            "en_curso → resultado_cargado",
            chequearTransicionPartido(ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.RESULTADO_CARGADO).ok
        ));
        casos.push(check(
            "resultado_cargado → confirmado",
            chequearTransicionPartido(ESTADO_PARTIDO.RESULTADO_CARGADO, ESTADO_PARTIDO.CONFIRMADO).ok
        ));
        casos.push(check(
            "en_curso NO salta directo a confirmado",
            !chequearTransicionPartido(ESTADO_PARTIDO.EN_CURSO, ESTADO_PARTIDO.CONFIRMADO).ok
        ));
        casos.push(check(
            "confirmado es terminal",
            !chequearTransicionPartido(ESTADO_PARTIDO.CONFIRMADO, ESTADO_PARTIDO.EN_CURSO).ok
        ));
        casos.push(check(
            "rechazado vuelve a admitir carga",
            chequearTransicionPartido(ESTADO_PARTIDO.RECHAZADO, ESTADO_PARTIDO.RESULTADO_CARGADO).ok
        ));
        casos.push(check(
            "Un ajeno no puede cargar el resultado",
            !puedeCargarResultado({ estado: ESTADO_PARTIDO.EN_CURSO, userId: "x", jugadores: ["a", "b", "c", "d"] }).ok
        ));
        casos.push(check(
            "Un jugador del partido sí puede",
            puedeCargarResultado({ estado: ESTADO_PARTIDO.EN_CURSO, userId: "b", jugadores: ["a", "b", "c", "d"] }).ok
        ));
        casos.push(check(
            "El admin puede cargar aunque no juegue",
            puedeCargarResultado({ estado: ESTADO_PARTIDO.EN_CURSO, userId: "x", jugadores: ["a", "b"], esAdmin: true }).ok
        ));
        grupos.push({ titulo: "Máquina de estados — Partido", casos });
    }

    // Máquina de la inscripción y del desafío
    {
        const casos: Caso[] = [];
        casos.push(check(
            "disponible → emparejado",
            chequearTransicionInscripcion(ESTADO_INSCRIPCION.DISPONIBLE, ESTADO_INSCRIPCION.EMPAREJADO).ok
        ));
        const bajaJugando = chequearTransicionInscripcion(ESTADO_INSCRIPCION.JUGANDO, ESTADO_INSCRIPCION.BAJA);
        casos.push(check(
            "No se puede dar de baja a alguien que está jugando",
            !bajaJugando.ok,
            !bajaJugando.ok ? bajaJugando.error : undefined
        ));
        casos.push(check(
            "borrador → abierto",
            chequearTransicionDesafio(ESTADO_DESAFIO.BORRADOR, ESTADO_DESAFIO.ABIERTO).ok
        ));
        casos.push(check(
            "Un desafío cerrado no vuelve a borrador",
            !chequearTransicionDesafio(ESTADO_DESAFIO.CERRADO, ESTADO_DESAFIO.BORRADOR).ok
        ));
        casos.push(check(
            "Se puede reabrir un cerrado",
            chequearTransicionDesafio(ESTADO_DESAFIO.CERRADO, ESTADO_DESAFIO.ABIERTO).ok
        ));
        casos.push(check(
            "La categoría se edita en borrador, no en abierto con inscriptos",
            puedeEditarCategoria(ESTADO_DESAFIO.BORRADOR, 5) && !puedeEditarCategoria(ESTADO_DESAFIO.ABIERTO, 5)
        ));

        const cierreOk = chequearCierre([{ id: "1", estado: ESTADO_PARTIDO.CONFIRMADO }]);
        casos.push(check("Cierra si todo está confirmado", cierreOk.ok));
        const cierreMal = chequearCierre([
            { id: "1", estado: ESTADO_PARTIDO.EN_CURSO },
            { id: "2", estado: ESTADO_PARTIDO.RESULTADO_CARGADO },
            { id: "3", estado: ESTADO_PARTIDO.CONFIRMADO },
        ]);
        casos.push(check(
            "Los resultado_cargado bloquean el cierre igual que los en_curso",
            !cierreMal.ok,
            !cierreMal.ok ? cierreMal.error : undefined
        ));

        const pos = recomputarPosiciones([{ id: "a" }, { id: "b" }, { id: "c" }]);
        casos.push(check(
            "La cola se renumera 1..n",
            JSON.stringify(pos.map((p) => p.position)) === "[1,2,3]"
        ));
        grupos.push({ titulo: "Máquina de estados — Inscripción, Desafío y Cola", casos });
    }

    // Puntaje y ledger
    {
        const casos: Caso[] = [];
        const part = entradaParticipacion("u1");
        casos.push(check(
            "Participación: 1 punto sin partido asociado",
            part.puntos === 1 && part.matchId === "" && part.tipo === "participacion"
        ));

        const entradas = entradasDePartido({
            matchId: "m1",
            equipos: { equipo1: ["a", "b"], equipo2: ["c", "d"] },
            ganador: 1,
        });
        casos.push(check("Un partido escribe 4 filas", entradas.length === 4));
        casos.push(check(
            "3 puntos a cada ganador, 0 a cada perdedor",
            entradas.filter((e) => e.puntos === 3).length === 2 &&
            entradas.filter((e) => e.puntos === 0).length === 2
        ));
        casos.push(check(
            "La derrota se registra igual (para contar jugados)",
            entradas.filter((e) => e.tipo === "derrota").length === 2
        ));

        const r = calcularResultado([{ t1: 6, t2: 4 }, { t1: 3, t2: 6 }, { t1: 7, t2: 5 }]);
        casos.push(check(
            "6-4 3-6 7-5 → gana el 1 por 16-15 en games",
            r.ok && r.resultado.ganador === 1 && r.resultado.gamesEquipo1 === 16 && r.resultado.gamesEquipo2 === 15,
            r.ok ? `sets ${r.resultado.setsEquipo1}-${r.resultado.setsEquipo2}` : r.error
        ));
        casos.push(check("Un set empatado se rechaza", !calcularResultado([{ t1: 6, t2: 6 }]).ok));
        casos.push(check("Sin sets se rechaza", !calcularResultado([]).ok));
        casos.push(check(
            "Empate en sets se rechaza",
            !calcularResultado([{ t1: 6, t2: 4 }, { t1: 4, t2: 6 }]).ok
        ));
        casos.push(check("Games negativos se rechazan", !calcularResultado([{ t1: -1, t2: 6 }]).ok));
        casos.push(check("formatearSets", formatearSets([{ t1: 6, t2: 4 }, { t1: 7, t2: 5 }]) === "6-4 7-5"));
        grupos.push({ titulo: "Puntaje y resultado", casos });
    }

    // Lados
    {
        const casos: Caso[] = [];
        casos.push(check(
            "drive + revés es la mejor combinación",
            costoPareja(LADO.DRIVE, LADO.REVES) < costoPareja(LADO.AMBOS, LADO.AMBOS)
        ));
        casos.push(check(
            "drive + drive es peor que revés + revés",
            costoPareja(LADO.DRIVE, LADO.DRIVE) > costoPareja(LADO.REVES, LADO.REVES)
        ));
        casos.push(check(
            "Dos del mismo lado avisan pero no bloquean",
            avisoPareja(LADO.DRIVE, LADO.DRIVE).nivel === "aviso"
        ));
        casos.push(check(
            "Con un comodín no hay aviso",
            avisoPareja(LADO.AMBOS, LADO.DRIVE).nivel === "ok"
        ));
        casos.push(check(
            'normalizarLado tolera "Revés", vacío y basura',
            normalizarLado("Revés") === LADO.REVES &&
            normalizarLado("") === LADO.AMBOS &&
            normalizarLado(null) === LADO.AMBOS
        ));
        const pool = agruparPorLado([
            { userId: "1", lado: "drive" }, { userId: "2", lado: "reves" },
            { userId: "3", lado: null }, { userId: "4", lado: "drive" },
        ]);
        casos.push(check(
            "El pool se parte en revés / drive / ambos",
            pool.drive.length === 2 && pool.reves.length === 1 && pool.ambos.length === 1
        ));
        const sug = sugerirCompaneros(
            { userId: "x", lado: "drive" },
            [{ userId: "a", lado: "drive" }, { userId: "b", lado: "reves" }, { userId: "c", lado: "ambos" }]
        );
        casos.push(check(
            "El revés se sugiere primero para un drive",
            sug[0].userId === "b" && sug[sug.length - 1].userId === "a",
            sug.map((s) => s.userId).join(" → ")
        ));
        grupos.push({ titulo: "Lados de cancha", casos });
    }

    // Ranking
    {
        const casos: Caso[] = [];
        const entradas: EntradaLedger[] = [
            entradaParticipacion("a"), entradaParticipacion("b"),
            entradaParticipacion("c"), entradaParticipacion("d"),
            ...entradasDePartido({ matchId: "m1", equipos: { equipo1: ["a", "b"], equipo2: ["c", "d"] }, ganador: 1 }),
            ...entradasDePartido({ matchId: "m2", equipos: { equipo1: ["a", "c"], equipo2: ["b", "d"] }, ganador: 2 }),
        ];
        const partidos = [
            { equipo1: ["a", "b"] as [string, string], equipo2: ["c", "d"] as [string, string], gamesEquipo1: 12, gamesEquipo2: 6 },
            { equipo1: ["a", "c"] as [string, string], equipo2: ["b", "d"] as [string, string], gamesEquipo1: 5, gamesEquipo2: 12 },
        ];
        const tabla = calcularRanking(entradas, partidos);

        casos.push(check("Los 4 jugadores entran en la tabla", tabla.length === 4));
        const b = tabla.find((f) => f.userId === "b")!;
        casos.push(check(
            "b ganó los dos: 1 + 3 + 3 = 7 puntos",
            b.puntos === 7 && b.ganados === 2 && b.jugados === 2,
            `${b.puntos} pts · ${b.ganados}/${b.jugados}`
        ));
        const d = tabla.find((f) => f.userId === "d")!;
        casos.push(check(
            "d perdió una y ganó una: 1 + 3 + 0 = 4",
            d.puntos === 4 && d.ganados === 1 && d.perdidos === 1
        ));
        casos.push(check("b encabeza la tabla", tabla[0].userId === "b"));
        casos.push(check(
            "Diferencia de games desempata: a (17-18) vs c (11-24)",
            tabla.find((f) => f.userId === "a")!.difGames > tabla.find((f) => f.userId === "c")!.difGames,
            `a: ${tabla.find((f) => f.userId === "a")!.difGames} · c: ${tabla.find((f) => f.userId === "c")!.difGames}`
        ));
        casos.push(check("Efectividad de b = 100%", efectividad(b) === 100));

        // Empate exacto en puntos y ganados, se define por games
        const empate = calcularRanking(
            [
                ...entradasDePartido({ matchId: "x", equipos: { equipo1: ["p", "q"], equipo2: ["r", "s"] }, ganador: 1 }),
            ],
            [{ equipo1: ["p", "q"], equipo2: ["r", "s"], gamesEquipo1: 12, gamesEquipo2: 3 }]
        );
        casos.push(check(
            "Con puntos y ganados iguales, ordena por diferencia de games",
            empate[0].difGames >= empate[1].difGames
        ));
        grupos.push({ titulo: "Ranking y desempates", casos });
    }

    return grupos;
}

// ── Simulación de un desafío entero ─────────────────────────────────────────

type SimJugador = { userId: string; nombre: string; lado: string; categoria: string };

const NOMBRES = [
    "Martín", "Lucas", "Sofía", "Diego", "Valentina", "Nicolás", "Camila", "Julián",
    "Rocío", "Tomás", "Paula", "Iván", "Milena", "Bruno", "Delfina", "Facundo",
];

function simular(cantJugadores: number, cantPartidos: number, semilla: number) {
    // Random determinista, para que la misma semilla dé el mismo desafío.
    let s = semilla;
    const rnd = () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };

    const lados = [LADO.DRIVE, LADO.REVES, LADO.AMBOS];
    const jugadores: SimJugador[] = Array.from({ length: cantJugadores }, (_, i) => ({
        userId: `u${i + 1}`,
        nombre: NOMBRES[i % NOMBRES.length] + (i >= NOMBRES.length ? ` ${Math.floor(i / NOMBRES.length) + 1}` : ""),
        lado: lados[Math.floor(rnd() * 3)],
        categoria: "A",
    }));

    // Inscripción: cada uno suma su punto de participación.
    const ledger: EntradaLedger[] = jugadores.map((j) => entradaParticipacion(j.userId));

    // Armado de parejas: se toma el primero disponible y se le busca el mejor
    // compañero según el costo por lado.
    const sinPareja = [...jugadores];
    const parejas: { a: SimJugador; b: SimJugador; aviso: string; nivel: string }[] = [];
    while (sinPareja.length >= 2) {
        const a = sinPareja.shift()!;
        const [mejor] = sugerirCompaneros(a, sinPareja);
        const idx = sinPareja.findIndex((x) => x.userId === mejor.userId);
        const b = sinPareja.splice(idx, 1)[0];
        const av = avisoPareja(a.lado, b.lado);
        parejas.push({ a, b, aviso: av.mensaje, nivel: av.nivel });
    }

    // Partidos: se cruzan parejas al azar y se cargan resultados.
    const partidos: {
        n: number; eq1: string; eq2: string; sets: SetPartido[]; detalle: string; ganador: 1 | 2;
    }[] = [];
    const resumenes: { equipo1: [string, string]; equipo2: [string, string]; gamesEquipo1: number; gamesEquipo2: number }[] = [];

    if (parejas.length >= 2) {
        for (let n = 0; n < cantPartidos; n++) {
            let i = Math.floor(rnd() * parejas.length);
            let j = Math.floor(rnd() * parejas.length);
            if (i === j) j = (j + 1) % parejas.length;
            const p1 = parejas[i];
            const p2 = parejas[j];

            const sets: SetPartido[] = [];
            const g1 = 6, g2 = Math.floor(rnd() * 5);
            const gana1 = rnd() > 0.5;
            sets.push(gana1 ? { t1: g1, t2: g2 } : { t1: g2, t2: g1 });
            const b1 = 6, b2 = Math.floor(rnd() * 5);
            sets.push(gana1 ? { t1: b1, t2: b2 } : { t1: b2, t2: b1 });

            const calc = calcularResultado(sets);
            if (!calc.ok) continue;

            const equipo1: [string, string] = [p1.a.userId, p1.b.userId];
            const equipo2: [string, string] = [p2.a.userId, p2.b.userId];

            ledger.push(...entradasDePartido({
                matchId: `m${n + 1}`,
                equipos: { equipo1, equipo2 },
                ganador: calc.resultado.ganador,
            }));
            resumenes.push({
                equipo1, equipo2,
                gamesEquipo1: calc.resultado.gamesEquipo1,
                gamesEquipo2: calc.resultado.gamesEquipo2,
            });
            partidos.push({
                n: n + 1,
                eq1: `${p1.a.nombre} / ${p1.b.nombre}`,
                eq2: `${p2.a.nombre} / ${p2.b.nombre}`,
                sets,
                detalle: formatearSets(sets),
                ganador: calc.resultado.ganador,
            });
        }
    }

    const tabla = calcularRanking(ledger, resumenes);
    const nombrePorId = new Map(jugadores.map((j) => [j.userId, j.nombre]));
    const pool = agruparPorLado(jugadores.map((j) => ({ userId: j.userId, lado: j.lado, nombre: j.nombre })));

    return { jugadores, parejas, partidos, tabla, nombrePorId, ledger, pool, sueltos: sinPareja };
}

// ── UI ──────────────────────────────────────────────────────────────────────

export default function DevDesafioPage() {
    const grupos = useMemo(construirGrupos, []);
    const [cantJugadores, setCantJugadores] = useState(8);
    const [cantPartidos, setCantPartidos] = useState(6);
    const [semilla, setSemilla] = useState(7);
    const sim = useMemo(() => simular(cantJugadores, cantPartidos, semilla), [cantJugadores, cantPartidos, semilla]);

    const total = grupos.reduce((n, g) => n + g.casos.length, 0);
    const fallan = grupos.reduce((n, g) => n + g.casos.filter((c) => c.estado === "fail").length, 0);

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-5xl mx-auto space-y-8">
                <header>
                    <h1 className="text-2xl font-black uppercase italic">Dominio del Desafío</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Corre sobre <code className="text-celeste">@/lib/desafio</code>, el mismo código que van a usar las
                        server actions. No toca la base.
                    </p>
                    <div
                        className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest ${fallan === 0
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rojo/10 border-rojo/30 text-rojo"
                            }`}
                    >
                        {fallan === 0 ? `${total} casos · todos pasan` : `${fallan} de ${total} fallan`}
                    </div>
                </header>

                {grupos.map((g) => (
                    <section key={g.titulo}>
                        <h2 className="text-sm font-black uppercase italic text-celeste mb-2">{g.titulo}</h2>
                        <ul className="rounded-xl border border-hairline bg-surface divide-y divide-hairline">
                            {g.casos.map((c) => (
                                <li key={c.nombre} className="flex items-start gap-3 px-4 py-2">
                                    <span className={c.estado === "pass" ? "text-emerald-400" : "text-rojo"}>
                                        {c.estado === "pass" ? "✓" : "✕"}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[13px]">{c.nombre}</div>
                                        {c.detalle && <div className="text-[11px] text-subtle mt-0.5">{c.detalle}</div>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {/* ── Simulación ── */}
                <section className="pt-4 border-t border-hairline">
                    <h2 className="text-sm font-black uppercase italic text-volt-ink mb-1">Simulación de un desafío entero</h2>
                    <p className="text-[11px] text-subtle mb-4">
                        Inscripción → armado de parejas por lado → partidos → confirmación → tabla. Todo en memoria.
                    </p>

                    <div className="flex flex-wrap gap-4 mb-5">
                        {([
                            ["Jugadores", cantJugadores, setCantJugadores, 2, 16],
                            ["Partidos", cantPartidos, setCantPartidos, 0, 30],
                            ["Semilla", semilla, setSemilla, 1, 999],
                        ] as const).map(([label, valor, set, min, max]) => (
                            <label key={label} className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                                {label}
                                <input
                                    type="number"
                                    min={min}
                                    max={max}
                                    value={valor}
                                    onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
                                    className="w-16 bg-surface border border-hairline rounded px-2 py-1 text-foreground text-center"
                                />
                            </label>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mb-5">
                        {(["reves", "drive", "ambos"] as const).map((k) => (
                            <div key={k} className="rounded-xl border border-hairline bg-surface p-3">
                                <div className="text-[10px] uppercase tracking-widest text-subtle mb-2">
                                    {ETIQUETA_LADO[normalizarLado(k)]} · {sim.pool[k].length}
                                </div>
                                <ul className="space-y-1">
                                    {sim.pool[k].map((j: any) => (
                                        <li key={j.userId} className="text-[12px] text-muted-foreground">{j.nombre}</li>
                                    ))}
                                    {sim.pool[k].length === 0 && <li className="text-[11px] text-subtle">—</li>}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                        Parejas armadas ({sim.parejas.length})
                        {sim.sueltos.length > 0 && <span className="text-volt-ink ml-2">· {sim.sueltos.length} sin pareja</span>}
                    </h3>
                    <ul className="rounded-xl border border-hairline bg-surface divide-y divide-hairline mb-5">
                        {sim.parejas.map((p, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 px-4 py-2">
                                <span className="text-[13px]">
                                    {p.a.nombre} <span className="text-subtle">({ETIQUETA_LADO[normalizarLado(p.a.lado)]})</span>
                                    {" + "}
                                    {p.b.nombre} <span className="text-subtle">({ETIQUETA_LADO[normalizarLado(p.b.lado)]})</span>
                                </span>
                                <span className={`text-[10px] ${p.nivel === "aviso" ? "text-volt-ink" : "text-subtle"}`}>
                                    {p.aviso}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                        Partidos confirmados ({sim.partidos.length})
                    </h3>
                    <ul className="rounded-xl border border-hairline bg-surface divide-y divide-hairline mb-5">
                        {sim.partidos.map((p) => (
                            <li key={p.n} className="flex items-center gap-3 px-4 py-2 text-[12px]">
                                <span className="text-subtle w-6">#{p.n}</span>
                                <span className={p.ganador === 1 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>{p.eq1}</span>
                                <span className="text-subtle">vs</span>
                                <span className={p.ganador === 2 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>{p.eq2}</span>
                                <span className="ml-auto text-celeste tabular-nums">{p.detalle}</span>
                            </li>
                        ))}
                        {sim.partidos.length === 0 && <li className="px-4 py-3 text-[12px] text-subtle">Sin partidos.</li>}
                    </ul>

                    <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                        Tabla de posiciones · {sim.ledger.length} entradas en el ledger
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[9px] uppercase tracking-widest text-subtle border-b border-hairline">
                                    <th className="py-2 px-3 text-left">#</th>
                                    <th className="py-2 px-3 text-left">Jugador</th>
                                    <th className="py-2 px-3 text-center">PJ</th>
                                    <th className="py-2 px-3 text-center">PG</th>
                                    <th className="py-2 px-3 text-center">PP</th>
                                    <th className="py-2 px-3 text-center">Games</th>
                                    <th className="py-2 px-3 text-center">Dif</th>
                                    <th className="py-2 px-3 text-center">%</th>
                                    <th className="py-2 px-3 text-right">Puntos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sim.tabla.map((f) => (
                                    <tr key={f.userId} className="border-b border-hairline last:border-0">
                                        <td className="py-1.5 px-3 text-subtle">{f.posicion}</td>
                                        <td className="py-1.5 px-3">{sim.nombrePorId.get(f.userId)}</td>
                                        <td className="py-1.5 px-3 text-center text-muted-foreground">{f.jugados}</td>
                                        <td className="py-1.5 px-3 text-center text-emerald-400">{f.ganados}</td>
                                        <td className="py-1.5 px-3 text-center text-muted-foreground">{f.perdidos}</td>
                                        <td className="py-1.5 px-3 text-center text-subtle tabular-nums">{f.gamesFavor}-{f.gamesContra}</td>
                                        <td className={`py-1.5 px-3 text-center tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                            {f.difGames > 0 ? "+" : ""}{f.difGames}
                                        </td>
                                        <td className="py-1.5 px-3 text-center text-muted-foreground">{efectividad(f)}%</td>
                                        <td className="py-1.5 px-3 text-right text-volt-ink font-bold">{f.puntos}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-[11px] text-subtle mt-3">
                        Puntaje aplicado: {PUNTAJE_DEFAULT.participacion} por participar ·{" "}
                        {PUNTAJE_DEFAULT.victoria} por victoria · {PUNTAJE_DEFAULT.derrota} por derrota.
                    </p>
                </section>
            </div>
        </div>
    );
}
