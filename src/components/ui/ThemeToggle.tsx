"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

type Props = {
    /** `icon` es un botón cuadrado suelto; `nav` es un ítem más de la barra lateral. */
    variant?: "icon" | "nav";
    /** Sólo para `nav`: oculta el texto cuando la barra está colapsada. */
    collapsed?: boolean;
    className?: string;
};

export function ThemeToggle({ variant = "icon", collapsed = false, className = "" }: Props) {
    const { resolvedTheme, setTheme } = useTheme();
    // El servidor no conoce el tema elegido: renderizar el estado activo antes
    // de montar produciría un mismatch de hidratación.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === "dark";
    const toggle = () => setTheme(isDark ? "light" : "dark");

    if (variant === "nav") {
        // El ícono y el texto describen el modo actual, no el destino.
        const Icon = isDark ? Moon : Sun;
        return (
            <button
                type="button"
                onClick={toggle}
                title={collapsed ? `Modo ${isDark ? "oscuro" : "claro"}` : ""}
                aria-label={`Modo ${isDark ? "oscuro" : "claro"}. Cambiar a ${isDark ? "claro" : "oscuro"}`}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border-l-2 border-transparent text-muted-foreground hover:bg-surface hover:text-foreground transition-all font-semibold text-[13px] ${collapsed ? "justify-center px-0" : ""} ${className}`}
            >
                {mounted
                    ? <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    : <span className="w-3.5 h-3.5 shrink-0" />}
                {!collapsed && (
                    <span className="tracking-tight truncate flex-1 text-left">
                        {mounted ? `Modo ${isDark ? "Oscuro" : "Claro"}` : "Tema"}
                    </span>
                )}
            </button>
        );
    }

    const Icon = isDark ? Sun : Moon;
    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
            className={`h-9 w-9 grid place-items-center rounded-xl border border-hairline bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors ${className}`}
        >
            {mounted ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4" />}
        </button>
    );
}
