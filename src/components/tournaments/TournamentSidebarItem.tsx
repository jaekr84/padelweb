"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Send, Users } from "lucide-react";

interface TournamentQuickView {
  id: string;
  name: string;
  startDate: string | null;
  status: string;
  imageUrl: string | null;
  clubName: string | null;
  createdByUserId: string | null;
  categories: any;
  modalidad: any;
  type: string;
  registrationsCount: number;
  registrants: { name: string; imageUrl: string | null }[];
}

interface TournamentSidebarItemProps {
  t: TournamentQuickView;
  isOngoing?: boolean;
  formatDateAR: (date: string | null) => string;
}

export const TournamentSidebarItem = memo(function TournamentSidebarItem({
  t,
  isOngoing = false,
  formatDateAR,
}: TournamentSidebarItemProps) {
  const modal = typeof t.modalidad === "string" ? JSON.parse(t.modalidad) : t.modalidad;
  let cats = [];
  try {
    cats = typeof t.categories === "string" ? JSON.parse(t.categories) : t.categories || [];
  } catch (e) {}
  const catLabel =
    Array.isArray(cats) && cats.length > 0
      ? cats[0] === "libre"
        ? "Libre"
        : cats.join(", ")
      : "N/A";

  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="group flex flex-col gap-2 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-100 transition-colors px-2 -mx-2 rounded-xl overflow-hidden relative"
    >
      <div className="relative z-10 flex justify-between items-start gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-xs font-black text-slate-900 leading-tight line-clamp-1 group-hover:text-azul-primary transition-colors uppercase italic tracking-tighter">
            {t.name}
          </h3>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
            <span>{t.clubName || "Acap"}</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span className={t.type === "americano" ? "text-azul-primary/70" : "text-celeste/70"}>
              {t.type === "americano" ? "Americano" : "Libre"}
            </span>
          </div>
        </div>
        <div className="p-1.5 text-slate-300 group-hover:text-azul-primary transition-all">
          <Send className="w-3 h-3 rotate-45" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-1">
        <div className="flex items-center gap-3 text-slate-400 text-[9px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-1">
            {isOngoing ? <Clock className="w-3 h-3 text-rojo" /> : <Calendar className="w-3 h-3 text-azul-primary" />}
            <span className="group-hover:text-slate-700 transition-colors">
              {isOngoing ? (t.status === "en_curso" ? "Fase de Grupos" : "Playoffs") : formatDateAR(t.startDate)}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[8px] font-black px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-md group-hover:bg-azul-primary group-hover:text-white group-hover:border-azul-primary transition-all uppercase tracking-widest">
          {catLabel}
        </span>
      </div>

      {modal?.maxSlots > 0 && (
        <div className="relative z-10 w-full mt-1">
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            {(() => {
              const percentage = Math.min(((t.registrationsCount || 0) / modal.maxSlots) * 100, 100);
              let barColor = "bg-azul-primary";
              if (percentage >= 90) barColor = "bg-rojo";
              else if (percentage >= 70) barColor = "bg-celeste";
              return (
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Registrants Facepile */}
      <div className="relative z-10 flex items-center gap-2 mt-1">
        <div className="flex -space-x-1.5">
          {t.registrants && t.registrants.length > 0 ? (
            t.registrants.map((reg, idx) => (
              <div
                key={idx}
                className="w-5 h-5 rounded-full border border-white bg-slate-100 overflow-hidden relative shadow-sm"
              >
                {reg.imageUrl ? (
                  <Image src={reg.imageUrl} alt={reg.name} fill className="object-cover" sizes="20px" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 text-[6px] font-black text-slate-500 uppercase italic">
                    {reg.name.charAt(0)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="w-5 h-5 rounded-full border border-white bg-slate-50 flex items-center justify-center">
              <Users className="w-2.5 h-2.5 text-slate-300" />
            </div>
          )}
        </div>
        <span className="text-[9px] font-black text-slate-400 group-hover:text-azul-primary transition-colors uppercase tracking-widest">
          {t.registrationsCount || 0}/{modal?.maxSlots || 0}
        </span>
      </div>
    </Link>
  );
});
