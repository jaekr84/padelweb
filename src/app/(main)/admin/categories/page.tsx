import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import CategoriesManager from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const categories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight">Configuración de Categorías</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Define los niveles de juego y rangos de puntos</p>
                </div>

                <CategoriesManager initialCategories={categories} />
            </div>
        </div>
    );
}
