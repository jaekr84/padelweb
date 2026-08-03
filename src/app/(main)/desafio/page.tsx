import { Swords } from "lucide-react";
import { datosPublicos } from "./actions/publico";
import DesafioPublicoClient from "./DesafioPublicoClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Desafío",
    description: "Desafíos individuales: te inscribís solo o en pareja, y cada desafío tiene su propia tabla de posiciones.",
};

export default async function DesafioPage() {
    const datos = await datosPublicos();

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                <header>
                    <div className="flex items-center gap-2 mb-1">
                        <Swords className="w-4 h-4 text-volt-ink" />
                        <span className="label-tech text-[8px] text-volt-ink">Modalidad individual</span>
                    </div>
                    <h1 className="heading-sport text-3xl sm:text-4xl text-foreground">Desafío</h1>
                    <p className="text-[12px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
                        Te inscribís solo, armás pareja con quien quieras y la podés cambiar cuando quieras. Los puntos
                        son <span className="text-foreground font-bold">siempre tuyos</span>, no de la pareja, y cada desafío
                        tiene su propia tabla de posiciones.
                    </p>
                </header>

                <DesafioPublicoClient datos={datos} />
            </div>
        </div>
    );
}
