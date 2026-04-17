import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose"; // Usamos jose para ambas tareas por compatibilidad con Edge

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "padel_master_secret_key_change_me_in_prod");

const PUBLIC_ROUTES = [
    "/",
    "/login",
    "/register",
    "/profiles/centro",
];

// Función auxiliar para firmar el JWT (equivalente a tu signJWT)
async function extendToken(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Excluir rutas estáticas y API inmediatamente
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // 2. Verificar Rutas Públicas
    const isPublic = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));

    // 3. Obtener Token y Validar Sesión
    const token = req.cookies.get("session")?.value;
    let session: any = null;

    if (token) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            session = payload;
        } catch (e) {
            console.error("Session verification failed", e);
        }
    }

    // 4. Proteger Rutas Privadas
    if (!session && !isPublic) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 5. Protección de Rutas ADMIN
    if (pathname.startsWith("/admin")) {
        const activeRoleCookie = req.cookies.get("active_role")?.value;
        const effectiveRole = activeRoleCookie || session?.role;

        const rolesPermitidos = ["superadmin", "admin", "club"];
        if (!session || !rolesPermitidos.includes(effectiveRole)) {
            return NextResponse.redirect(new URL("/home", req.url));
        }
    }

    // 6. Extender Sesión (Solo si le queda menos de la mitad de vida)
    // Evitamos actualizar en CADA request para no generar loops con Server Actions
    const response = NextResponse.next();
    if (session) {
        try {
            const exp = session.exp as number | undefined;
            const now = Math.floor(Date.now() / 1000);
            const halfLife = 60 * 60 * 24 * 3.5; // 3.5 días en segundos

            // Solo renovar si expira en menos de 3.5 días
            if (exp && (exp - now) < halfLife) {
                const newToken = await extendToken(session);
                response.cookies.set("session", newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 24 * 7, // 7 días
                });
            }
        } catch (error) {
            console.error("Error extending token", error);
        }
    }

    return response;
}

// Configuración del Matcher unificado
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};