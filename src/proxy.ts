import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/login(.*)', '/register(.*)', '/']);
const isOnboardingRoute = createRouteMatcher(['/onboarding']);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth();

    if (userId && !isPublicRoute(req)) {
        const metadata = sessionClaims?.metadata as { role?: string } | undefined;
        const hasRoleCookie = req.cookies.get('has_role')?.value === 'true';
        let hasRole = !!metadata?.role || hasRoleCookie;

        // Fallback: If not in claims and no cookie, fetch from Clerk API once
        if (!hasRole) {
            try {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);
                if (user.publicMetadata?.role) {
                    hasRole = true;
                }
            } catch (error) {
                console.error("Error fetching user from Clerk in middleware:", error);
            }
        }

        // Check if there's no role in the JWT AND no fallback cookie AND no role in API
        if (!hasRole && !isOnboardingRoute(req)) {
            const onboardingUrl = new URL('/onboarding', req.url);
            return NextResponse.redirect(onboardingUrl);
        }

        // If user has a role and tries to access onboarding, redirect them to home
        if (hasRole && isOnboardingRoute(req)) {
            const homeUrl = new URL('/feed', req.url);
            const response = NextResponse.redirect(homeUrl);
            if (!hasRoleCookie) {
                response.cookies.set('has_role', 'true', { maxAge: 60 * 60 * 24 * 365, path: '/' });
            }
            return response;
        }

        // If they have a role but no cookie on a normal route, set the cookie to avoid future API hits
        if (hasRole && !hasRoleCookie && !isOnboardingRoute(req)) {
            const response = NextResponse.next();
            response.cookies.set('has_role', 'true', { maxAge: 60 * 60 * 24 * 365, path: '/' });
            return response;
        }
    }

    // By default, protect everything except public routes
    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
