"use server";

// Canchas del desafío. Son el recurso escaso: cada partido ocupa una y la
// libera al cargarse el resultado.
//
// Ojo con `currentMatchId`: acá NUNCA se escribe. Es el candado de concurrencia
// (UNIQUE) y sólo lo tocan las acciones de partido, dentro de su transacción.

import { db } from "@/db";
import { challengeCourts, challengeMatches, challenges } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { ESTADO_CANCHA, type EstadoCancha } from "@/lib/desafio";
import { ErrorDesafio, ejecutar, limpiar, nuevoId, requerirAdmin, revalidarDesafio } from "./_helpers";

export type CanchaResumen = {
    id: string;
    desafioId: string;
    numero: number;
    nombre: string | null;
    estado: EstadoCancha;
    partidoActualId: string | null;
};

const filaACancha = (r: typeof challengeCourts.$inferSelect): CanchaResumen => ({
    id: r.id,
    desafioId: r.challengeId,
    numero: r.number,
    nombre: r.name,
    estado: r.status as EstadoCancha,
    partidoActualId: r.currentMatchId,
});

export async function listarCanchas(desafioId: string): Promise<CanchaResumen[]> {
    const filas = await db
        .select()
        .from(challengeCourts)
        .where(eq(challengeCourts.challengeId, desafioId))
        .orderBy(asc(challengeCourts.number));
    return filas.map(filaACancha);
}

async function traerCancha(id: string) {
    const [c] = await db.select().from(challengeCourts).where(eq(challengeCourts.id, id)).limit(1);
    if (!c) throw new ErrorDesafio("La cancha no existe.");
    return c;
}

async function existeDesafio(desafioId: string) {
    const [d] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, desafioId)).limit(1);
    if (!d) throw new ErrorDesafio("El desafío no existe.");
}

/**
 * Agrega una cancha. Sin número explícito toma el siguiente libre, así el admin
 * puede tocar "agregar" repetidamente sin pensar en la numeración.
 */
export async function agregarCancha(desafioId: string, datos?: { numero?: number; nombre?: string | null }) {
    return ejecutar("agregarCancha", async () => {
        await requerirAdmin();
        await existeDesafio(desafioId);

        let numero = datos?.numero;
        if (numero == null) {
            const [{ max }] = await db
                .select({ max: sql<number>`COALESCE(MAX(${challengeCourts.number}), 0)` })
                .from(challengeCourts)
                .where(eq(challengeCourts.challengeId, desafioId));
            numero = Number(max) + 1;
        }
        if (!Number.isInteger(numero) || numero < 1) {
            throw new ErrorDesafio("El número de cancha tiene que ser un entero mayor a cero.");
        }

        const [repetida] = await db
            .select({ id: challengeCourts.id })
            .from(challengeCourts)
            .where(and(eq(challengeCourts.challengeId, desafioId), eq(challengeCourts.number, numero)))
            .limit(1);
        if (repetida) throw new ErrorDesafio(`Ya existe la cancha ${numero} en este desafío.`);

        const id = nuevoId();
        await db.insert(challengeCourts).values({
            id,
            challengeId: desafioId,
            number: numero,
            name: limpiar(datos?.nombre),
            status: ESTADO_CANCHA.LIBRE,
        });

        revalidarDesafio(desafioId);
        return { id, numero };
    });
}

export async function renombrarCancha(id: string, nombre: string | null) {
    return ejecutar("renombrarCancha", async () => {
        await requerirAdmin();
        const cancha = await traerCancha(id);

        await db.update(challengeCourts).set({ name: limpiar(nombre) }).where(eq(challengeCourts.id, id));

        revalidarDesafio(cancha.challengeId);
        return { id };
    });
}

/**
 * Habilita o inhabilita una cancha. No se puede tocar una ocupada: primero hay
 * que resolver el partido que está adentro.
 */
export async function cambiarEstadoCancha(id: string, habilitada: boolean) {
    return ejecutar("cambiarEstadoCancha", async () => {
        await requerirAdmin();
        const cancha = await traerCancha(id);

        if (cancha.status === ESTADO_CANCHA.OCUPADA || cancha.currentMatchId) {
            throw new ErrorDesafio("La cancha está ocupada: cerrá el partido antes de cambiarle el estado.");
        }

        await db
            .update(challengeCourts)
            .set({ status: habilitada ? ESTADO_CANCHA.LIBRE : ESTADO_CANCHA.INHABILITADA })
            .where(eq(challengeCourts.id, id));

        revalidarDesafio(cancha.challengeId);
        return { id };
    });
}

/**
 * Elimina una cancha. Se bloquea si está ocupada o si tiene historial: los
 * partidos jugados la referencian y borrarla dejaría el historial colgado
 * (el schema no usa foreign keys).
 */
export async function eliminarCancha(id: string) {
    return ejecutar("eliminarCancha", async () => {
        await requerirAdmin();
        const cancha = await traerCancha(id);

        if (cancha.status === ESTADO_CANCHA.OCUPADA || cancha.currentMatchId) {
            throw new ErrorDesafio("La cancha está ocupada: cerrá el partido antes de eliminarla.");
        }

        const [{ n }] = await db
            .select({ n: sql<number>`count(*)` })
            .from(challengeMatches)
            .where(eq(challengeMatches.courtId, id));

        if (Number(n) > 0) {
            throw new ErrorDesafio(
                `No se puede eliminar: la cancha ${cancha.number} tiene ${n} partidos en el historial. Inhabilitala en vez de borrarla.`
            );
        }

        await db.delete(challengeCourts).where(eq(challengeCourts.id, id));

        revalidarDesafio(cancha.challengeId);
        return { id };
    });
}

/**
 * Alta rápida de N canchas al crear el desafío. Numera desde la última
 * existente, así se puede llamar más de una vez.
 */
export async function agregarCanchas(desafioId: string, cantidad: number) {
    return ejecutar("agregarCanchas", async () => {
        await requerirAdmin();
        await existeDesafio(desafioId);

        const n = Number(cantidad);
        if (!Number.isInteger(n) || n < 1 || n > 30) {
            throw new ErrorDesafio("Cantidad de canchas inválida (1 a 30).");
        }

        const [{ max }] = await db
            .select({ max: sql<number>`COALESCE(MAX(${challengeCourts.number}), 0)` })
            .from(challengeCourts)
            .where(eq(challengeCourts.challengeId, desafioId));

        const desde = Number(max) + 1;
        await db.insert(challengeCourts).values(
            Array.from({ length: n }, (_, i) => ({
                id: nuevoId(),
                challengeId: desafioId,
                number: desde + i,
                status: ESTADO_CANCHA.LIBRE,
            }))
        );

        revalidarDesafio(desafioId);
        return { creadas: n, desde };
    });
}
