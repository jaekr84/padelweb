import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    '/login(.*)',
    '/sign-in(.*)',
    '/onboarding(.*)',            // Role selection for new users
    '/',                         // Landing page
    '/profiles/centro/(.*)',     // Perfiles públicos de centros
    '/profiles/profe/(.*)',      // Perfiles públicos de instructores
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding']);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth();

    // Allow access to /sign-up ONLY if it's an invitation link (has __clerk_ticket)
    const isSignUpRoute = req.nextUrl.pathname.startsWith('/sign-up');
    const isInvitation = req.nextUrl.searchParams.has('__clerk_ticket');

    if (isSignUpRoute && isInvitation) {
        // Skip protection for invitation links so unauthenticated users can accept them
        return NextResponse.next();
    }

    if (userId && !isPublicRoute(req) && !isSignUpRoute) {
        const metadata = sessionClaims?.metadata as { role?: string } | undefined;
        const hasRoleCookie = req.cookies.get('has_role')?.value === 'true';
        let hasRole = !!metadata?.role || hasRoleCookie;

        // Fallback: If not in claims and no cookie, fetch from Clerk API once
        if (!hasRole) {
            try {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);

                // HYBRID SUPERADMIN STRATEGY
                const superadminEmails = process.env.SUPERADMIN_EMAIL?.split(',').map(e => e.trim().toLowerCase()) || [];
                const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase();

                if (!user.publicMetadata?.role && userEmail && superadminEmails.includes(userEmail)) {
                    await client.users.updateUserMetadata(userId, {
                        publicMetadata: { role: 'superadmin' }
                    });
                    hasRole = true;
                    console.log(`Assigned superadmin role to ${userEmail}`);
                } else if (user.publicMetadata?.role) {
                    hasRole = true;
                }
            } catch (error) {
                console.error("Error fetching/updating user in proxy:", error);
            }
        }

        // Check if there's no role in the JWT AND no fallback cookie AND no role in API
        if (!hasRole && !isOnboardingRoute(req)) {
            const onboardingUrl = new URL('/onboarding', req.url);
            return NextResponse.redirect(onboardingUrl);
        }

        // If user has a role and tries to access onboarding, auth pages, or the landing page
        const isAuthRoute = req.nextUrl.pathname.startsWith('/sign-in') || req.nextUrl.pathname.startsWith('/sign-up');
        const isLandingRoute = req.nextUrl.pathname === '/';

        if (hasRole && (isOnboardingRoute(req) || isAuthRoute || isLandingRoute)) {
            // Determine redirect URL based on role
            let targetPath = '/tournaments'; // Default fallback

            const role = metadata?.role as string | undefined;

            if (role === 'superadmin') {
                targetPath = '/admin';
            } else if (role === 'club') {
                targetPath = '/club/dashboard'; // Or /tournaments depending on the complete structure
            }

            const homeUrl = new URL(targetPath, req.url);
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
