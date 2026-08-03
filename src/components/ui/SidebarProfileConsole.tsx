"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { 
  User, 
  LogOut, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Shield, 
  Swords, 
  Activity, 
  Check, 
  Settings 
} from "lucide-react";

type UserData = {
  name: string;
  role: string;
  dbRole: string;
  imageUrl?: string | null;
};

interface SidebarProfileConsoleProps {
  userData: UserData | null;
  sponsorsVisible: boolean;
  setSponsorsVisible: (visible: boolean) => void;
  isCollapsed: boolean;
  handleLogout: () => Promise<void>;
  profileUrl: string;
  switchActiveRole: (role: string) => Promise<void>;
}

export function SidebarProfileConsole({
  userData,
  sponsorsVisible,
  setSponsorsVisible,
  isCollapsed,
  handleLogout,
  profileUrl,
  switchActiveRole,
}: SidebarProfileConsoleProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userData) {
    return (
      <div className="p-3.5 border-t border-hairline flex items-center gap-3 animate-pulse">
        <div className="w-9 h-9 bg-surface-raised rounded-full shrink-0" />
        {!isCollapsed && (
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3.5 w-24 bg-surface-raised rounded-full" />
            <div className="h-2.5 w-16 bg-surface rounded-full" />
          </div>
        )}
      </div>
    );
  }

  const userRoles = userData.dbRole?.split(",").map((r) => r.trim()) || [];
  const hasMultipleRoles = userRoles.length > 1 || userRoles.includes("superadmin");

  const getRoleConfig = (roleName: string) => {
    switch (roleName) {
      case "superadmin":
        return { label: "ADMIN", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: Shield };
      case "club":
        return { label: "CLUB", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: Swords };
      default:
        return { label: "JUGADOR", color: "text-celeste bg-celeste/10 border-celeste/20", icon: Activity };
    }
  };

  const currentRole = getRoleConfig(userData.role);
  const CurrentIcon = currentRole.icon;

  const handleRoleSelect = async (newRole: string) => {
    setIsDropdownOpen(false);
    await switchActiveRole(newRole);
    window.location.href = "/home";
  };

  return (
    <div ref={dropdownRef} className="mt-auto border-t border-hairline relative">
      {/* ── EXPANDED SIDEBAR CONSOLE ── */}
      {!isCollapsed ? (
        <div className="p-3.5 flex flex-col gap-3.5 bg-surface">
          {/* Top Info section */}
          <div className="flex items-center gap-3">
            <Link
              href={profileUrl}
              className="relative w-9 h-9 rounded-full overflow-hidden border border-hairline bg-surface flex items-center justify-center shrink-0 hover:ring-2 hover:ring-volt/30 transition-all active:scale-95 group/avatar"
            >
              {userData.imageUrl ? (
                <Image src={userData.imageUrl} alt={userData.name} fill className="object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground group-hover/avatar:scale-110 transition-transform" />
              )}
              {/* Pulsing online badge indicator */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-carbon-950 rounded-full animate-pulse z-10" />
            </Link>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-black text-foreground tracking-tight leading-none mb-1.5 truncate">
                {userData.name}
              </span>
              
              {/* Clickable Role Switcher Pill */}
              {hasMultipleRoles ? (
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all select-none hover:bg-surface-raised active:scale-95 ${currentRole.color}`}
                >
                  <CurrentIcon className="w-2.5 h-2.5 shrink-0" />
                  <span>{currentRole.label}</span>
                  {isDropdownOpen ? (
                    <ChevronUp className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                  )}
                </button>
              ) : (
                <span className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${currentRole.color}`}>
                  <CurrentIcon className="w-2.5 h-2.5 shrink-0" />
                  <span>{currentRole.label}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick diagnostics bar */}
          <div className="flex items-center justify-between pt-2 border-t border-hairline">
            {/* Sponsors diagnostic view toggle (Only for Superadmins) */}
            {userData.role === "superadmin" ? (
              <button
                onClick={() => setSponsorsVisible(!sponsorsVisible)}
                className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${
                  sponsorsVisible
                    ? "text-celeste-light border-celeste/30 bg-celeste/10 hover:bg-celeste/20"
                    : "text-subtle border-hairline bg-transparent hover:text-foreground hover:bg-surface"
                }`}
                title={sponsorsVisible ? "Ocultar Banners Publicitarios" : "Mostrar Banners Publicitarios"}
              >
                {sponsorsVisible ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-celeste-light" />
                    <span>Banners On</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Banners Off</span>
                  </>
                )}
              </button>
            ) : (
              <div className="label-tech text-[8px] text-subtle">
                ACAP PADEL APP
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 border border-transparent hover:border-red-500/10 hover:bg-red-500/5 transition-all active:scale-95 flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider"
              title="Cerrar Sesión de la Plataforma"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── COLLAPSED SIDEBAR CONSOLE ── */
        <div className="p-3.5 flex flex-col items-center gap-4 bg-surface">
          {/* Clickable Profile Avatar that opens dropdown menu */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative w-9 h-9 rounded-full overflow-hidden border border-hairline bg-surface flex items-center justify-center hover:ring-2 hover:ring-volt/40 transition-all active:scale-95 group/avatar"
            title={`${userData.name} (${currentRole.label})`}
          >
            {userData.imageUrl ? (
              <Image src={userData.imageUrl} alt={userData.name} fill className="object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground group-hover/avatar:scale-110 transition-transform" />
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-carbon-950 rounded-full" />
          </button>
        </div>
      )}

      {/* ── FLOAT DROP-DOWN ROLE SELECTION POP-OVER ── */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: isCollapsed ? 10 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isCollapsed ? 10 : 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-[999] bg-background/95 backdrop-blur-xl border border-hairline rounded-[1.25rem] shadow-xl shadow-black/40 p-2 flex flex-col gap-1 w-48 ${
              isCollapsed 
                ? "left-16 bottom-4" 
                : "left-4 right-4 bottom-[calc(100%+8px)]"
            }`}
          >
            {/* Top tiny diagnostic header inside dropdown */}
            <div className="px-2.5 py-1.5 border-b border-hairline flex items-center justify-between">
              <span className="text-[7.5px] font-black tracking-[0.25em] text-subtle uppercase">
                {isCollapsed ? "Menú Usuario" : "Configurar Vista"}
              </span>
              <Settings className="w-2.5 h-2.5 text-subtle" />
            </div>

            {/* If collapsed, show basic user header details inside popover */}
            {isCollapsed && (
              <div className="px-2.5 py-2 border-b border-hairline flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-foreground truncate leading-none">
                  {userData.name}
                </span>
                <span className="text-[8px] font-medium text-subtle truncate">
                  Asociado ACAP
                </span>
              </div>
            )}

            {/* List of Switchable Roles */}
            {hasMultipleRoles && (
              <div className="flex flex-col gap-0.5 py-1">
                {["superadmin", "club", "jugador"]
                  .filter((r) => {
                    const rolesList = userData.dbRole?.split(",").map((ur) => ur.trim()) || [];
                    if (rolesList.includes("superadmin")) return true;
                    return rolesList.includes(r);
                  })
                  .map((r) => {
                    const config = getRoleConfig(r);
                    const Icon = config.icon;
                    const isSelected = userData.role === r;

                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleSelect(r)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[10px] font-bold uppercase tracking-wider transition-all active:scale-98 group/item ${
                          isSelected
                            ? "bg-celeste/10 text-celeste-light border border-celeste/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-celeste-light" : "text-subtle group-hover/item:text-muted-foreground"}`} />
                        <span className="flex-1 truncate">{config.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-celeste-light shrink-0 animate-scaleIn" />}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* If collapsed, inject quick action toggles inside popover */}
            {isCollapsed && (
              <div className="flex flex-col gap-1 border-t border-hairline pt-1 mt-1">
                {/* Banners diagnostic view toggle inside popover */}
                {userData.role === "superadmin" && (
                  <button
                    onClick={() => {
                      setSponsorsVisible(!sponsorsVisible);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[9px] font-black uppercase tracking-wider transition-all ${
                      sponsorsVisible
                        ? "text-celeste-light bg-celeste/10 border border-celeste/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent"
                    }`}
                  >
                    {sponsorsVisible ? (
                      <>
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>Banners On</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 shrink-0" />
                        <span>Banners Off</span>
                      </>
                    )}
                  </button>
                )}

                {/* Direct shortcut Link to profile */}
                <Link
                  href={profileUrl}
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent transition-all"
                >
                  <User className="w-3.5 h-3.5 shrink-0 text-subtle" />
                  <span>Mi Perfil</span>
                </Link>

                {/* Logout button inside popover */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[9px] font-black uppercase tracking-wider text-live hover:text-red-400 hover:bg-live/10 border border-transparent transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
