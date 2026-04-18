import { getSession } from "./auth-server";

export async function checkAdmin() {
    const session = await getSession();
    if (!session) return false;

    const allowedRoles = ["superadmin", "admin"];
    if (allowedRoles.includes(session.role as string)) return true;

    // Also check email whitelist if any
    const superadminEmails = process.env.SUPERADMIN_EMAIL?.split(',').map(e => e.trim().toLowerCase()) || [];
    const email = (session.email as string)?.toLowerCase();
    if (email && superadminEmails.includes(email)) return true;

    return false;
}

export async function checkSuperadmin() {
    const session = await getSession();
    if (!session) return false;

    // 1. Check database role
    if (session.role === 'superadmin') return true;

    // 2. Check email against whitelist
    const superadminEmails = process.env.SUPERADMIN_EMAIL?.split(',').map(e => e.trim().toLowerCase()) || [];
    const email = (session.email as string)?.toLowerCase();

    if (email && superadminEmails.includes(email)) return true;

    return false;
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;

    return {
        id: session.userId as string,
        email: session.email as string,
        role: session.role as string,
    };
}
