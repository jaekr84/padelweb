"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Trophy, User } from "lucide-react";
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

const triggerStyles = "w-full rounded-2xl border border-border/70 bg-muted/90 px-4 py-3 text-sm font-semibold uppercase tracking-tight text-foreground outline-none transition-colors shadow-sm hover:border-azul-primary/30 focus:border-azul-primary focus:ring-4 focus:ring-azul-primary/10 flex items-center justify-between gap-2";
const contentStyles = "z-50 overflow-hidden rounded-3xl border border-border/80 bg-background shadow-2xl min-w-[var(--radix-select-trigger-width)] animate-in fade-in zoom-in-95 duration-200";
const viewportStyles = "p-1";
const itemStyles = "relative flex cursor-default select-none items-center rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold normal-case tracking-tight text-foreground outline-none transition-colors data-[highlighted]:bg-azul-primary/5 data-[highlighted]:text-azul-primary data-[state=checked]:bg-azul-primary/10 data-[state=checked]:text-azul-primary";

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

    return (
        <div className="flex flex-col gap-6 mb-8">
            {userId && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
                    <button
                        type="button"
                        onClick={() => updateQuery("filter", "mios")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                            currentFilter === "mios"
                                ? "bg-azul-primary text-white border-azul-primary shadow-xl shadow-azul-primary/20 scale-[1.02]"
                                : "bg-white/50 backdrop-blur-sm border-border text-muted-foreground hover:border-azul-primary/50 hover:text-azul-primary"
                        }`}
                    >
                        <User className="w-3.5 h-3.5" />
                        Mis Torneos
                    </button>
                    {userClubId && (
                        <button
                            type="button"
                            onClick={() => updateQuery("filter", "mi_club")}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                currentFilter === "mi_club"
                                    ? "bg-celeste text-white border-celeste shadow-xl shadow-celeste/20 scale-[1.02]"
                                    : "bg-white/50 backdrop-blur-sm border-border text-muted-foreground hover:border-celeste/50 hover:text-celeste"
                            }`}
                        >
                            <Trophy className="w-3.5 h-3.5" />
                            Mi Club
                        </button>
                    )}
                    {currentFilter !== "todos" && (
                        <button
                            type="button"
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set("filter", "todos");
                                params.set("category", "todas");
                                params.set("club", "todos");
                                router.push(`${pathname}?${params.toString()}`, { scroll: false });
                            }}
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rojo transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end">
                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Estado</span>
                    <Select.Root value={currentFilter} onValueChange={(value) => updateQuery("filter", value)}>
                        <Select.Trigger className={triggerStyles} aria-label="Seleccionar estado">
                            <Select.Value placeholder="Todos" />
                            <Select.Icon>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                                <Select.Viewport className={viewportStyles}>
                                    {[
                                        { value: "todos", label: "Todos" },
                                        { value: "abiertas", label: "Inscripción" },
                                        { value: "envivo", label: "En Vivo" },
                                        { value: "clubes", label: "Clubes" },
                                        ...(userId ? [{ value: "mios", label: "Mis Torneos" }] : []),
                                        { value: "terminados", label: "Finalizados" },
                                    ].map((item) => (
                                        <Select.Item key={item.value} value={item.value} className={itemStyles}>
                                            <Select.ItemText>{item.label}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                                <Check className="w-4 h-4" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>

                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Categoría</span>
                    <Select.Root value={selectedCategory} onValueChange={(value) => updateQuery("category", value)}>
                        <Select.Trigger className={triggerStyles} aria-label="Seleccionar categoria">
                            <Select.Value placeholder="Todas las Categorías" />
                            <Select.Icon>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                                <Select.Viewport className={viewportStyles}>
                                    <Select.Item value="todas" className={itemStyles}>
                                        <Select.ItemText>Todas las Categorías</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                            <Check className="w-4 h-4" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                    {availableCategories.map((cat) => (
                                        <Select.Item key={cat.id} value={cat.name} className={itemStyles}>
                                            <Select.ItemText>{cat.name}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                                <Check className="w-4 h-4" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>

                {/* Filtro de Localidad comentado
                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Localidad</span>
                    <Select.Root value={selectedLocation} onValueChange={(value) => updateQuery("location", value)}>
                        <Select.Trigger className={triggerStyles} aria-label="Seleccionar localidad">
                            <Select.Value placeholder="Todas las Localidades" />
                            <Select.Icon>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                                <Select.Viewport className={viewportStyles}>
                                    <Select.Item value="todas" className={itemStyles}>
                                        <Select.ItemText>Todas las Localidades</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                            <Check className="w-4 h-4" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                    {availableLocations.map((loc) => (
                                        <Select.Item key={loc} value={loc} className={itemStyles}>
                                            <Select.ItemText>{loc}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                                <Check className="w-4 h-4" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>
                */}

                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Club</span>
                    <Select.Root value={selectedClub} onValueChange={(value) => updateQuery("club", value)}>
                        <Select.Trigger className={triggerStyles} aria-label="Seleccionar club">
                            <Select.Value placeholder="Todos los Clubes" />
                            <Select.Icon>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                                <Select.Viewport className={viewportStyles}>
                                    <Select.Item value="todos" className={itemStyles}>
                                        <Select.ItemText>Todos los Clubes</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                            <Check className="w-4 h-4" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                    {availableClubs.map((club) => (
                                        <Select.Item key={club.id} value={club.id} className={itemStyles}>
                                            <Select.ItemText>{club.name}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-azul-primary">
                                                <Check className="w-4 h-4" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>

                <button
                    type="button"
                    onClick={() => router.push(`${pathname}?${searchParams.toString()}`)}
                    className="w-full rounded-2xl bg-azul-primary hover:bg-azul-dark px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98] shadow-xl shadow-azul-primary/20"
                >
                    Filtrar
                </button>
            </div>
        </div>
    );
}
