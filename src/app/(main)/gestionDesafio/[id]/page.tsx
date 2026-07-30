import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { obtenerDesafio } from "../../desafio/actions/desafios";
import { listarCanchas } from "../../desafio/actions/canchas";
import { jugadoresParaInscribir, listarInscriptos } from "../../desafio/actions/inscripciones";
import { listarParejas, poolDisponibles } from "../../desafio/actions/parejas";
import { listarPartidos, partidosAConfirmar, partidosEnCurso } from "../../desafio/actions/partidos";
import { listarCola } from "../../desafio/actions/cola";
import { rankingDelDesafio } from "../../desafio/actions/ranking";
import PanelClient from "./PanelClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PanelDesafioPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await getSession();
    if (session?.role !== "admin" && session?.role !== "superadmin") redirect("/desafio");

    const desafio = await obtenerDesafio(id);
    if (!desafio) notFound();

    // Todo en paralelo: el panel muestra el estado completo del desafío.
    const [canchas, inscriptos, parejas, pool, enCurso, aConfirmar, historial, cola, ranking, candidatos] =
        await Promise.all([
            listarCanchas(id),
            listarInscriptos(id),
            listarParejas(id),
            poolDisponibles(id),
            partidosEnCurso(id),
            partidosAConfirmar(id),
            listarPartidos(id),
            listarCola(id),
            rankingDelDesafio(id),
            jugadoresParaInscribir(id).catch(() => []),
        ]);

    return (
        <PanelClient
            desafio={desafio}
            canchas={canchas}
            inscriptos={inscriptos}
            parejas={parejas}
            pool={pool}
            enCurso={enCurso}
            aConfirmar={aConfirmar}
            historial={historial}
            cola={cola}
            ranking={ranking}
            candidatos={candidatos}
        />
    );
}
