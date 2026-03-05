import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

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

  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <head>
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-sans antialiased`}>
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
            <Toaster position="bottom-right" theme="dark" closeButton richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
