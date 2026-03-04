"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button
                style={{
                    background: "none",
                    border: "1px solid var(--surface-border)",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                }}
            >
                <div style={{ width: "20px", height: "20px" }} />
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            style={{
                background: "none",
                border: "1px solid var(--surface-border)",
                borderRadius: "0.5rem",
                padding: "0.5rem",
                color: "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
            {theme === "dark" ? (
                <Sun size={20} />
            ) : (
                <Moon size={20} />
            )}
        </button>
    );
}
