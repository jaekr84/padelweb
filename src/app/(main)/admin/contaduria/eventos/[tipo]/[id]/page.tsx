import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { etiquetaDeTipoEvento } from "@/lib/contaduria";
import { obtenerDetalleEvento } from "../../actions";
import EventoDetalleClient from "./EventoDetalleClient";

export const dynamic = "force-dynamic";

type Params = { tipo: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
    const { tipo } = await params;
    return {
        title: `Contaduría · ${etiquetaDeTipoEvento(tipo)}`,
        description: "Ingresos, gastos y resultado del evento.",
    };
}

export default async function EventoContaduriaPage({ params }: { params: Promise<Params> }) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/home");

    const { tipo, id } = await params;
    const detalle = await obtenerDetalleEvento(tipo, decodeURIComponent(id));
    // `null` = el tipo no existe, o el evento se borró y tampoco dejó
    // movimientos. En los dos casos no hay nada que mostrar.
    if (!detalle) notFound();

    return (
        <div className="min-h-screen bg-grid-carbon">
            <EventoDetalleClient detalle={detalle} />
        </div>
    );
}
