import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "padel_master_secret_key_change_me_in_prod");

const PUBLIC_ROUTES = [
    "/",
    "/login",
    "/register",
    "/profiles/centro",
    "/profiles/profe",
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check if it's a public route
    const isPublic = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));

    // Static assets and internal routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") || // We handle API protection inside actions/routes usually, but can also protect here
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get("session")?.value;

    let session = null;
    if (token) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            session = payload;
        } catch (e) {
            console.error("Session verification failed", e);
        }
    }

    // Redirect authenticated users away from login/register
    if (session && (pathname === "/login" || pathname === "/register")) {
        return NextResponse.redirect(new URL("/home", req.url));
    }

    // Protect private routes
    if (!session && !isPublic) {
        const loginUrl = new URL("/login", req.url);
        // Save targeted URL to redirect back after login?
        return NextResponse.redirect(loginUrl);
    }

    // Admin route protection
    if (pathname.startsWith("/admin")) {
        if (!session || session.role !== "superadmin") {
            return NextResponse.redirect(new URL("/home", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    ],
};
