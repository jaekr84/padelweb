"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, X } from "lucide-react";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Category = {
    id: string;
    name: string;
};

type Props = {
    userId: string | null;
    userClubId?: string | null;
    currentFilter: string;
    selectedCategory: string;
    selectedLocation: string;
    selectedClub: string;
    availableCategories: Category[];
    availableLocations: string[];
    availableClubs: { id: string; name: string }[];
};

const STATUS_TABS = [
    { value: "todos",      label: "Todos" },
    { value: "abiertas",   label: "Inscripción" },
    { value: "envivo",     label: "En Vivo" },
    { value: "clubes",     label: "Clubes" },
    { value: "terminados", label: "Cerrados" },
];

const selectTrigger =
    "flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-[9px] font-black uppercase tracking-widest outline-none hover:border-volt/40 hover:text-volt transition-all min-w-[110px] max-w-[160px]";
const selectContent =
    "z-50 overflow-hidden rounded-xl border border-white/10 bg-carbon-900 shadow-2xl shadow-black/50 min-w-[var(--radix-select-trigger-width)] animate-in fade-in zoom-in-95 duration-150";
const selectItem =
    "relative flex cursor-default select-none items-center rounded-lg pl-3 pr-8 py-2 text-[10px] font-bold text-slate-300 outline-none transition-colors data-[highlighted]:bg-white/10 data-[highlighted]:text-white data-[state=checked]:bg-volt/15 data-[state=checked]:text-volt";

export default function TournamentFiltersClient({
    userId,
    userClubId,
    currentFilter,
    selectedCategory,
    selectedLocation,
    selectedClub,
    availableCategories,
    availableLocations,
    availableClubs,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateQuery = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    const clearAll = () => {
        const params = new URLSearchParams();
        params.set("filter", "todos");
        params.set("category", "todas");
        params.set("club", "todos");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const hasActiveFilters =
        currentFilter !== "todos" ||
        selectedCategory !== "todas" ||
        selectedClub !== "todos";

    const allTabs = [
        ...STATUS_TABS,
        ...(userId ? [{ value: "mios", label: "Mis Torneos" }] : []),
        ...(userClubId ? [{ value: "mi_club", label: "Mi Club" }] : []),
    ];

    const getTabStyle = (value: string) => {
        const isActive = currentFilter === value;
        if (!isActive) return "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white";
        if (value === "envivo")   return "bg-rojo text-white border-transparent shadow-lg shadow-rojo/30";
        if (value === "mi_club")  return "bg-celeste text-white border-transparent shadow-lg shadow-celeste/30";
        if (value === "abiertas") return "bg-volt text-carbon-950 border-transparent shadow-lg shadow-volt/30";
        return "bg-azul-primary text-white border-transparent shadow-lg shadow-azul-primary/30";
    };

    return (
        <div className="space-y-2.5 mb-5">

            {/* ── Status pill strip ── */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {allTabs.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => updateQuery("filter", tab.value)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-200 h-8 border ${getTabStyle(tab.value)}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Secondary filters row ── */}
            <div className="flex flex-wrap items-center gap-2">

                {/* Category */}
                <Select.Root value={selectedCategory} onValueChange={(v) => updateQuery("category", v)}>
                    <Select.Trigger className={selectTrigger} aria-label="Categoría">
                        <Select.Value placeholder="Categoría" />
                        <Select.Icon className="ml-auto">
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                        </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content className={selectContent} position="popper" sideOffset={6}>
                            <Select.Viewport className="p-1">
                                <Select.Item value="todas" className={selectItem}>
                                    <Select.ItemText>Todas las categorías</Select.ItemText>
                                    <Select.ItemIndicator className="absolute right-3 text-volt">
                                        <Check className="w-3 h-3" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                                {availableCategories.map((cat) => (
                                    <Select.Item key={cat.id} value={cat.name} className={selectItem}>
                                        <Select.ItemText>{cat.name}</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 text-volt">
                                            <Check className="w-3 h-3" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                ))}
                            </Select.Viewport>
                        </Select.Content>
                    </Select.Portal>
                </Select.Root>

                {/* Club */}
                {availableClubs.length > 0 && (
                    <Select.Root value={selectedClub} onValueChange={(v) => updateQuery("club", v)}>
                        <Select.Trigger className={selectTrigger} aria-label="Club">
                            <Select.Value placeholder="Club" />
                            <Select.Icon className="ml-auto">
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={selectContent} position="popper" sideOffset={6}>
                                <Select.Viewport className="p-1">
                                    <Select.Item value="todos" className={selectItem}>
                                        <Select.ItemText>Todos los clubes</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 text-volt">
                                            <Check className="w-3 h-3" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                    {availableClubs.map((club) => (
                                        <Select.Item key={club.id} value={club.id} className={selectItem}>
                                            <Select.ItemText>{club.name}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-3 text-volt">
                                                <Check className="w-3 h-3" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                )}

                {/* Clear */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-white/10 bg-transparent text-slate-400 text-[9px] font-black uppercase tracking-widest hover:border-live/60 hover:text-live hover:bg-live/5 transition-all"
                    >
                        <X className="w-3 h-3" />
                        Limpiar
                    </button>
                )}
            </div>
        </div>
    );
}
