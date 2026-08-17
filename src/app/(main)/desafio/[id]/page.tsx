import { notFound } from "next/navigation";
import { datosDesafio } from "../actions/publico";
import DesafioDetalleClient from "./DesafioDetalleClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const datos = await datosDesafio(id);
    return { title: datos ? `${datos.desafio.nombre} · Desafío` : "Desafío" };
}

export default async function DesafioDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const datos = await datosDesafio(id);
    // Un desafío en borrador todavía no existe para el jugador.
    if (!datos) notFound();

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <DesafioDetalleClient datos={datos} />
            </div>
        </div>
    );
}
