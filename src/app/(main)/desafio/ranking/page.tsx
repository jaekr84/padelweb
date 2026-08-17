import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth-server";
import { rankingGeneral } from "../actions/ranking";
import TablaRankingGeneral from "./TablaRankingGeneral";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Ranking general · Desafío",
    description: "El acumulado de puntos de todos los desafíos.",
};

export default async function RankingGeneralPage() {
    const [filas, session] = await Promise.all([rankingGeneral(), getSession()]);
    const userId = session?.userId ?? null;

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                <header>
                    <Link
                        href="/desafio"
                        className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Volver a los desafíos
                    </Link>
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-gold-ink" />
                        <span className="label-tech text-[8px] text-gold-ink">Acumulado histórico</span>
                    </div>
                    <h1 className="heading-sport text-3xl text-foreground">Ranking general</h1>
                    <p className="text-[12px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        La suma de los puntos de todos los desafíos. Desempata por partidos ganados y, si sigue
                        empatado, por diferencia de games — el mismo criterio que la tabla de cada desafío.
                    </p>
                </header>

                <TablaRankingGeneral filas={filas} userId={userId} />
            </div>
        </div>
    );
}
