"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Category = {
    id: string;
    name: string;
};

type Props = {
    currentFilter: string;
    selectedCategory: string;
    selectedLocation: string;
    availableCategories: Category[];
    availableLocations: string[];
};

const triggerStyles = "w-full rounded-2xl border border-border/70 bg-muted/90 px-4 py-3 text-sm font-semibold uppercase tracking-tight text-foreground outline-none transition-colors shadow-sm hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 flex items-center justify-between gap-2";
const contentStyles = "z-50 overflow-hidden rounded-3xl border border-border/80 bg-background shadow-lg min-w-[var(--radix-select-trigger-width)]";
const viewportStyles = "p-1";
const itemStyles = "relative flex cursor-default select-none items-center rounded-xl pl-4 pr-10 py-2 text-sm font-medium normal-case tracking-[0.01em] text-foreground outline-none transition-colors data-[highlighted]:bg-slate-100 data-[highlighted]:text-foreground data-[state=checked]:bg-slate-200 data-[state=checked]:text-slate-950";

export default function TournamentFiltersClient({
    currentFilter,
    selectedCategory,
    selectedLocation,
    availableCategories,
    availableLocations,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateQuery = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router, searchParams]);

    return (
        <div className="grid gap-3 mb-6 sm:grid-cols-[1fr_1fr_1fr_auto] items-end">
            <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Estado</span>
                <Select.Root value={currentFilter} onValueChange={(value) => updateQuery("filter", value)}>
                    <Select.Trigger className={triggerStyles} aria-label="Seleccionar estado">
                        <Select.Value placeholder="Activos" />
                        <Select.Icon>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                            <Select.Viewport className={viewportStyles}>
                                {[
                                    { value: "todos", label: "Activos" },
                                    { value: "abiertas", label: "Inscripcion" },
                                    { value: "envivo", label: "En Vivo" },
                                    { value: "terminados", label: "Finalizados" },
                                ].map((item) => (
                                    <Select.Item key={item.value} value={item.value} className={itemStyles}>
                                        <Select.ItemText>{item.label}</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                ))}
                            </Select.Viewport>
                        </Select.Content>
                    </Select.Portal>
                </Select.Root>
            </div>

            <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Categoria</span>
                <Select.Root value={selectedCategory} onValueChange={(value) => updateQuery("category", value)}>
                    <Select.Trigger className={triggerStyles} aria-label="Seleccionar categoria">
                        <Select.Value placeholder="Todas las Categorias" />
                        <Select.Icon>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                        <Select.Content className={contentStyles} position="popper" sideOffset={8}>
                            <Select.Viewport className={viewportStyles}>
                                <Select.Item value="todas" className={itemStyles}>
                                    <Select.ItemText>Todas las Categorias</Select.ItemText>
                                    <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-emerald-500">
                                        <Check className="w-3.5 h-3.5" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                                {availableCategories.map((cat) => (
                                    <Select.Item key={cat.id} value={cat.name} className={itemStyles}>
                                        <Select.ItemText>{cat.name}</Select.ItemText>
                                        <Select.ItemIndicator className="absolute left-3 inline-flex items-center text-emerald-500">
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
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Localidad</span>
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
                                    <Select.ItemIndicator className="absolute right-3 inline-flex items-center text-emerald-500">
                                        <Check className="w-3.5 h-3.5" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                                {availableLocations.map((loc) => (
                                    <Select.Item key={loc} value={loc} className={itemStyles}>
                                        <Select.ItemText>{loc}</Select.ItemText>
                                        <Select.ItemIndicator className="absolute left-3 inline-flex items-center text-emerald-500">
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
                className="w-full rounded-2xl bg-emerald-500 px-6 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-white transition hover:bg-emerald-600"
            >
                Aplicar
            </button>
        </div>
    );
}
