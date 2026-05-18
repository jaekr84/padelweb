"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PaddleLoading } from "./PaddleLoading";

export function GlobalNavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Monitor path and query param changes to hide loader
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Find closest anchor element
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Intercept only internal, valid navigation links
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/#") &&
        targetAttr !== "_blank" &&
        !anchor.hasAttribute("download")
      ) {
        try {
          // Construct fully qualified target and current URLs to compare
          const targetUrl = new URL(href, window.location.href);
          const currentUrl = new URL(window.location.href);

          // Only trigger loading state if we are actually navigating to a new route path
          if (
            targetUrl.pathname !== currentUrl.pathname ||
            targetUrl.search !== currentUrl.search
          ) {
            setIsLoading(true);
          }
        } catch (err) {
          console.error("Navigation parser error:", err);
        }
      }
    };

    // Intercept backward/forward popstate browser navigations
    const handlePopState = () => {
      setIsLoading(true);
    };

    window.addEventListener("click", handleAnchorClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto"
        >
          {/* Radial accent neon light glow in center */}
          <div className="absolute inset-0 bg-azul-primary/5 pointer-events-none" />

          {/* Core HUD loader container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-slate-900/90 border border-white/10 p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 relative overflow-hidden max-w-[280px]"
          >
            {/* Corner Tech bracket alignments */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
            
            {/* The brand new glowing HUD radar spinner */}
            <PaddleLoading size="lg" className="relative z-10 scale-95" />
            
            <div className="flex flex-col items-center gap-2 relative z-10 text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                Sincronizando
              </span>
              <span className="text-[7.5px] text-celeste font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5 animate-pulse">
                Accediendo a ACAP Cloud
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
