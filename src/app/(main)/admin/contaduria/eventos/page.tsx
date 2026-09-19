import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { obtenerMesesDeEventos, obtenerResumenEventos } from "./actions";
import EventosClient from "./EventosClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Contaduría por evento",
    description: "Cuánto dejó cada torneo, desafío y cancha abierta.",
};

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/home");

    const { mes } = await searchParams;
    // El período recorta *qué eventos se listan* por su fecha, no qué
    // movimientos suma cada uno: el resultado de un torneo son todos sus
    // movimientos, aunque el premio se haya pagado el mes siguiente.
    const periodo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : "todos";

    const [eventos, meses] = await Promise.all([
        obtenerResumenEventos(periodo),
        obtenerMesesDeEventos(),
    ]);

    return (
        <div className="min-h-screen bg-grid-carbon">
            <EventosClient eventos={eventos} meses={meses} periodo={periodo} />
        </div>
    );
}
