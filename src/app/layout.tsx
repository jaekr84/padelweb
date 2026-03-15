import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser, checkSuperadmin } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "A.C.A.P. | Asociación Coreana Argentina de Pádel",
  description: "La plataforma definitiva para la comunidad del pádel en Argentina. Inscribite en torneos, seguí el ranking y conectá con los mejores clubes.",
  keywords: ["pádel", "argentina", "acap", "torneos de pádel", "ranking de pádel", "clubes de pádel"],
  authors: [{ name: "A.C.A.P. Team" }],
  robots: "index, follow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const isSuperadmin = await checkSuperadmin();
  const currentRole = isSuperadmin ? "superadmin" : (user?.role || "jugador");

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          <script
            dangerouslySetInnerHTML={{
              __html: `document.cookie="__padel_role=${currentRole};path=/;max-age=86400;samesite=lax"`,
            }}
          />
          {children}
          <Toaster position="bottom-right" theme="system" closeButton richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
