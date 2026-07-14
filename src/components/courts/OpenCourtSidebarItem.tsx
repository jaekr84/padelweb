"use client";

import React, { memo } from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

interface OpenCourtQuickView {
  id: string;
  name: string;
  date: string;
  time: string;
  totalSlots: number | null;
  clubName: string | null;
  registrationCount: number;
}

interface OpenCourtSidebarItemProps {
  oc: OpenCourtQuickView;
  formatDateAR: (date: string | null) => string;
}

export const OpenCourtSidebarItem = memo(function OpenCourtSidebarItem({
  oc,
  formatDateAR,
}: OpenCourtSidebarItemProps) {
  const available = (oc.totalSlots || 0) - (oc.registrationCount || 0);
  const isFull = available <= 0;

  return (
    <Link
      href={`/cancha-abierta`}
      className="group flex flex-col gap-1.5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-white/5 transition-colors px-2 -mx-2 rounded-xl"
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-xs font-black uppercase italic tracking-tighter text-white leading-tight line-clamp-1 group-hover:text-azul-primary transition-colors">
          {oc.name}
        </h3>
        <div
          className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${
            isFull ? "bg-rojo/10 text-rojo" : "bg-azul-primary/10 text-azul-primary"
          }`}
        >
          {oc.registrationCount || 0}/{oc.totalSlots}
        </div>
      </div>
      <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDateAR(oc.date)} {oc.time}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{oc.clubName || "Club"}</span>
        </div>
      </div>

      {oc.totalSlots && oc.totalSlots > 0 && (
        <div className="w-full mt-1">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            {(() => {
              const percentage = Math.min(((oc.registrationCount || 0) / oc.totalSlots) * 100, 100);
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
    </Link>
  );
});
