"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MasterDataProvider } from "./MasterDataProvider";

/**
 * El tema dejó de tener modo "system". A quien lo tenga guardado de antes,
 * next-themes le pone `class="system"` en <html>, que no matchea ningún tema y
 * cae al claro por defecto. Esto lo normaliza una única vez, al valor que el
 * sistema operativo resolvía.
 */
function NormalizeLegacySystemTheme() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme !== "system") return;
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, [theme, setTheme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Use state to ensure a single instance per component tree life cycle
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Sólo claro y oscuro: `enableSystem` queda en false a propósito, así
          "system" no es un valor posible y el toggle alterna entre dos estados.
          `disableTransitionOnChange` evita que el `transition-colors` de 300ms
          del body arrastre un smear al cambiar de tema. */}
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <NormalizeLegacySystemTheme />
        <MasterDataProvider>
          {children}
        </MasterDataProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
