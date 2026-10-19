"use server";

import { db } from "@/db";
import { clubs, tournaments, users } from "@/db/schema";
import { checkSuperadmin } from "@/lib/auth";
import { getSession, hashPassword } from "@/lib/auth-server";
import { freeClubId, hasRole } from "@/lib/managed-club";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Texto de un campo del form: recortado, y `null` si quedó vacío. */
const field = (formData: FormData, key: string) => ((formData.get(key) as string) || "").trim() || null;

/**
 * Contraseña temporal para la cuenta del club. Más larga que la del reset de
 * Usuarios (ACAP + 4 dígitos) porque esta cuenta crea torneos y maneja socios:
 * 8 caracteres al azar, sin los que se confunden al dictarlos (0/O, 1/I/L).
 */
function generateTempPassword() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return "ACAP-" + Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

function revalidateClubViews() {
    revalidatePath("/admin/clubs");
    revalidatePath("/admin/users");
    revalidatePath("/directory");
    revalidatePath("/profiles/club");
}

/** Clubes con su responsable y la cantidad de socios, para el panel de admin. */
export async function listClubs() {
    if (!(await checkSuperadmin())) return [];

    const rows = await db
        .select({
            id: clubs.id,
            name: clubs.name,
            location: clubs.location,
            address: clubs.address,
            phone: clubs.phone,
            whatsapp: clubs.whatsapp,
            instagram: clubs.instagram,
            website: clubs.website,
            bio: clubs.bio,
            verified: clubs.verified,
            logoUrl: clubs.logoUrl,
            createdAt: clubs.createdAt,
            ownerId: clubs.ownerId,
            ownerEmail: users.email,
            ownerFirstName: users.firstName,
            ownerLastName: users.lastName,
            members: sql<number>`(select count(*) from users m where m.club_id = ${clubs.id} and coalesce(m.is_guest, false) = false)`,
        })
        .from(clubs)
        .leftJoin(users, eq(users.id, clubs.ownerId))
        .orderBy(desc(clubs.createdAt));

    return rows.map(r => ({ ...r, members: Number(r.members || 0) }));
}

/**
 * Alta de un club nuevo junto con la cuenta de su responsable.
 *
 * Es la única vía para crear un club desde cero: el registro público y las
 * invitaciones siempre crean jugadores (ver register/actions.ts). La cuenta
 * nace con rol "club" y aprobada, sin datos de jugador (no juega ni rankea), y
 * el club se crea en la misma transacción: no puede quedar una cuenta de club
 * sin club ni un club sin dueño.
 *
 * La contraseña temporal se devuelve una sola vez para que el admin se la pase
 * al club; no se guarda en claro en ningún lado.
 */
export async function createClubWithOwner(formData: FormData) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }

    const name = field(formData, "name") || "";
    const location = field(formData, "location");
    const email = (field(formData, "email") || "").toLowerCase();
    const firstName = field(formData, "firstName");
    const lastName = field(formData, "lastName");
    const phone = field(formData, "phone");

    if (name.length < 2) return { error: "Poné el nombre del club" };
    if (name.length > 256) return { error: "El nombre del club es demasiado largo" };
    if (!looksLikeEmail(email)) return { error: "El email del responsable no es válido" };

    const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    if (existingUser) {
        return {
            error: "Ya hay una cuenta con ese email. Si es el responsable, dale el rol Club desde Usuarios: el club se crea en ese momento.",
        };
    }

    const [sameName] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(sql`lower(${clubs.name}) = ${name.toLowerCase()}`)
        .limit(1);
    if (sameName) return { error: "Ya existe un club con ese nombre" };

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Misma convención que el resto de la app: id de usuario = email.
    const userId = email;
    let clubId = userId;

    try {
        await db.transaction(async (tx) => {
            await tx.insert(users).values({
                id: userId,
                email,
                passwordHash,
                role: "club",
                firstName,
                lastName,
                phone,
                approvalStatus: "approved",
            });

            clubId = await freeClubId(tx, userId);
            await tx.insert(clubs).values({
                id: clubId,
                ownerId: userId,
                name,
                type: "club",
                location,
                phone,
                amenities: [],
            });
        });
    } catch (e) {
        console.error("[createClubWithOwner]", e);
        if ((e as { code?: string } | null)?.code === "ER_DUP_ENTRY") {
            return { error: "Ya existe una cuenta o un club con esos datos" };
        }
        return { error: "No se pudo crear el club" };
    }

    revalidateClubViews();

    return {
        success: true,
        club: { id: clubId, name },
        credentials: { email, password: tempPassword },
    };
}

/**
 * Edición de los datos públicos de un club por un admin. El dueño sigue
 * pudiendo editarlos desde "Mi Club"; esto es para corregir o completar sin
 * depender de él. El logo y las comodidades quedan del lado del dueño.
 */
export async function updateClubAdmin(clubId: string, formData: FormData) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }

    const name = field(formData, "name") || "";
    if (name.length < 2) return { error: "Poné el nombre del club" };
    if (name.length > 256) return { error: "El nombre del club es demasiado largo" };

    const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).limit(1);
    if (!club) return { error: "El club no existe" };

    const [sameName] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(sql`lower(${clubs.name}) = ${name.toLowerCase()}`, ne(clubs.id, clubId)))
        .limit(1);
    if (sameName) return { error: "Ya existe otro club con ese nombre" };

    await db.update(clubs).set({
        name,
        location: field(formData, "location"),
        address: field(formData, "address"),
        phone: field(formData, "phone"),
        whatsapp: field(formData, "whatsapp"),
        instagram: field(formData, "instagram"),
        website: field(formData, "website"),
        bio: field(formData, "bio"),
        verified: formData.get("verified") === "on",
    }).where(eq(clubs.id, clubId));

    revalidateClubViews();
    return { success: true };
}

/**
 * Cambia el responsable de un club.
 *
 * El club conserva su id: socios (`users.clubId`), torneos y canchas abiertas
 * apuntan a ese id y no se tocan. Lo que sí se mueve:
 *
 * - El nuevo responsable suma el rol "club" (conserva los que tenía). Si el
 *   email no tiene cuenta, se crea una de club con contraseña temporal.
 * - Los torneos que el responsable anterior creó para este club pasan al
 *   nuevo: casi todos los permisos de torneo (fixture, gestión, edición) miran
 *   `createdByUserId`, y sin esto el club no podría seguir manejándolos.
 * - El anterior pierde el rol "club". Si era una cuenta sólo de club se la
 *   desactiva en vez de dejarla como jugador sin datos; conserva el rol para
 *   no aparecer en los listados de jugadores. Un admin la puede reactivar.
 *
 * A los dos se les corta la sesión para que entren con el rol nuevo.
 */
export async function transferClubOwnership(clubId: string, formData: FormData) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }
    const session = await getSession();
    const adminId = session?.userId;

    const email = (field(formData, "email") || "").toLowerCase();
    if (!looksLikeEmail(email)) return { error: "El email del nuevo responsable no es válido" };

    const [club] = await db
        .select({ id: clubs.id, name: clubs.name, ownerId: clubs.ownerId })
        .from(clubs)
        .where(eq(clubs.id, clubId))
        .limit(1);
    if (!club) return { error: "El club no existe" };

    const [oldOwner] = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, club.ownerId))
        .limit(1);

    const [target] = await db
        .select({
            id: users.id,
            role: users.role,
            isGuest: users.isGuest,
            approvalStatus: users.approvalStatus,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (target) {
        if (target.id === club.ownerId) return { error: "Esa persona ya es la responsable de este club" };
        if (target.isGuest) return { error: "Ese email es de un jugador invitado sin cuenta propia" };
        if (target.approvalStatus === "pending") {
            return { error: "Esa cuenta está pendiente de aprobación. Aprobala primero en Solicitudes." };
        }
        const [otherClub] = await db
            .select({ name: clubs.name })
            .from(clubs)
            .where(eq(clubs.ownerId, target.id))
            .limit(1);
        if (otherClub) return { error: `Esa persona ya es responsable de ${otherClub.name}` };
    }

    // Cuenta nueva sólo si el email no existe.
    const credentials = target ? null : { email, password: generateTempPassword() };
    const passwordHash = credentials ? await hashPassword(credentials.password) : null;
    const newOwnerId = target?.id ?? email;

    let oldOwnerDeactivated = false;

    try {
        await db.transaction(async (tx) => {
            if (target) {
                const roles = target.role.split(",").map(r => r.trim()).filter(Boolean);
                if (!roles.includes("club")) roles.push("club");
                await tx.update(users).set({
                    role: roles.join(","),
                    ...(target.id !== adminId ? { sessionVersion: sql`session_version + 1` } : {}),
                }).where(eq(users.id, target.id));
            } else {
                await tx.insert(users).values({
                    id: newOwnerId,
                    email,
                    passwordHash,
                    role: "club",
                    firstName: field(formData, "firstName"),
                    lastName: field(formData, "lastName"),
                    phone: field(formData, "phone"),
                    approvalStatus: "approved",
                });
            }

            await tx.update(clubs).set({ ownerId: newOwnerId }).where(eq(clubs.id, club.id));

            await tx.update(tournaments)
                .set({ createdByUserId: newOwnerId })
                .where(and(eq(tournaments.clubId, club.id), eq(tournaments.createdByUserId, club.ownerId)));

            if (oldOwner && hasRole(oldOwner.role, "club")) {
                const remaining = oldOwner.role.split(",").map(r => r.trim()).filter(r => r && r.toLowerCase() !== "club");
                oldOwnerDeactivated = remaining.length === 0;
                await tx.update(users).set({
                    ...(oldOwnerDeactivated ? { isActive: false } : { role: remaining.join(",") }),
                    ...(oldOwner.id !== adminId ? { sessionVersion: sql`session_version + 1` } : {}),
                }).where(eq(users.id, oldOwner.id));
            }
        });
    } catch (e) {
        console.error("[transferClubOwnership]", e);
        if ((e as { code?: string } | null)?.code === "ER_DUP_ENTRY") {
            return { error: "Ya existe una cuenta con esos datos o esa persona ya tiene un club" };
        }
        return { error: "No se pudo cambiar el responsable" };
    }

    revalidateClubViews();

    return {
        success: true,
        clubName: club.name,
        oldOwnerEmail: oldOwner?.email ?? null,
        oldOwnerDeactivated,
        credentials,
    };
}
