import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Padel App",
  description: "La plataforma de pádel",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let currentRole = "jugador";

  try {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, clerkUser.id)).limit(1);
      if (dbUser) currentRole = dbUser.role;
    }
  } catch {
    // DB cold start or connection issue — use default role
  }

  // Set role as a JS-readable cookie via an inline script (cookies().set() not allowed in Server Components)
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <script
              dangerouslySetInnerHTML={{
                __html: `document.cookie="__padel_role=${currentRole};path=/;max-age=86400;samesite=lax"`,
              }}
            />
            {children}
            {process.env.NODE_ENV === "development" && <DevRoleSwitcher currentRole={currentRole} />}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
