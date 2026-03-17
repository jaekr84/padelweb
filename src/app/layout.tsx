import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser, checkSuperadmin } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "A.C.A.P. | Asociación Coreana Argentina de Pádel",
    template: "%s | A.C.A.P."
  },
  description: "La plataforma definitiva para la comunidad del pádel en Argentina. Inscribite en torneos, seguí el ranking y conectá con los mejores clubes de la A.C.A.P.",
  keywords: ["pádel", "argentina", "acap", "torneos de pádel", "ranking de pádel", "clubes de pádel", "padel amateur", "padel profesional"],
  authors: [{ name: "A.C.A.P. Team" }],
  creator: "A.C.A.P.",
  publisher: "Asociación Coreana Argentina de Pádel",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://acap.ar",
    title: "A.C.A.P. | Asociación Coreana Argentina de Pádel",
    description: "Inscribite, competí y subí en el ranking nacional de pádel. El ecosistema digital para jugadores y clubes de Argentina.",
    siteName: "A.C.A.P.",
    images: [
      {
        url: "/img/favicon.png",
        width: 1200,
        height: 630,
        alt: "A.C.A.P. - Asociación Coreana Argentina de Pádel"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A.C.A.P. | Asociación Coreana Argentina de Pádel",
    description: "La plataforma líder para el pádel amateur y profesional en Argentina.",
    images: ["/img/stickers 1.jpg"],
    creator: "@acap_padel"
  },
  icons: {
    icon: [
      { url: "/img/favicon.png" },
      { url: "/img/favicon.png", sizes: "32x32" },
    ],
    apple: [
      { url: "/img/favicon.png", sizes: "180x180" }
    ],
  },
  manifest: "/manifest.json",
  category: "sports",
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
