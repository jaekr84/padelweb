import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { obtenerMeses, obtenerMovimientos, obtenerOpcionesDeEvento, obtenerTotales } from "./actions";
import ContaduriaClient from "./ContaduriaClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Contaduría",
    description: "Ingresos, gastos y saldo de la caja.",
};

type Params = { mes?: string; rubro?: string; evento?: string };

export default async function ContaduriaPage({ searchParams }: { searchParams: Promise<Params> }) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/home");

    // Los filtros viven en la URL y no en el estado del cliente: el listado se
    // recorta a 300 movimientos y los totales salen de un SUM del servidor, así
    // que filtrar es volver a pedir la página, no recortar en memoria. Si no
    // fuera así, el saldo dejaría de explicar las filas que se están viendo.
    const { mes, rubro, evento } = await searchParams;
    const periodo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : "todos";
    const filtros = { periodo, rubro, evento };

    const [movimientos, totales, meses, eventos] = await Promise.all([
        obtenerMovimientos(filtros),
        obtenerTotales(filtros),
        obtenerMeses(),
        obtenerOpcionesDeEvento(),
    ]);

    return (
        <div className="min-h-screen bg-grid-carbon">
            <ContaduriaClient
                movimientos={movimientos}
                totales={totales}
                meses={meses}
                eventos={eventos}
                periodo={periodo}
                rubro={rubro ?? "todos"}
                evento={evento ?? "todos"}
            />
        </div>
    );
}
