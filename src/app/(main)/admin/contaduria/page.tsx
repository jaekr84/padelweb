import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { obtenerMeses, obtenerMovimientos, obtenerTotales } from "./actions";
import ContaduriaClient from "./ContaduriaClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Contaduría",
    description: "Ingresos, gastos y saldo de la caja.",
};

export default async function ContaduriaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/home");

    // El período vive en la URL y no en el estado del cliente: el listado se
    // recorta a 300 movimientos y los totales salen de un SUM del servidor, así
    // que cambiar de mes es volver a pedir la página, no filtrar en memoria.
    const { mes } = await searchParams;
    const periodo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : "todos";

    const [movimientos, totales, meses] = await Promise.all([
        obtenerMovimientos(periodo),
        obtenerTotales(periodo),
        obtenerMeses(),
    ]);

    return (
        <div className="min-h-screen bg-grid-carbon">
            <ContaduriaClient
                movimientos={movimientos}
                totales={totales}
                meses={meses}
                periodo={periodo}
            />
        </div>
    );
}
