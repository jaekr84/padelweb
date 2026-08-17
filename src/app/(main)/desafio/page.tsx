import { Swords } from "lucide-react";
import { datosLista } from "./actions/publico";
import { rankingGeneral } from "./actions/ranking";
import ListaDesafiosClient from "./ListaDesafiosClient";
import RankingGeneral from "./RankingGeneral";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Desafío",
    description: "Desafíos individuales: te inscribís solo o en pareja, y cada desafío tiene su propia tabla de posiciones.",
};

export default async function DesafioPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
    const { p } = await searchParams;
    const [datos, general] = await Promise.all([datosLista(Number(p) || 1), rankingGeneral()]);

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
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

                {/*
                  Los desafíos ocupan la columna principal y el acumulado va a la
                  derecha, estirado al alto de la página de desafíos: las dos
                  columnas terminan a la misma altura y la lista de jugadores
                  scrollea adentro. En mobile baja al final: primero lo
                  accionable, después la foto histórica.
                */}
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                        <ListaDesafiosClient datos={datos} />
                    </div>
                    {/*
                      La celda vacía se estira al alto de la fila — que lo fija la
                      columna de desafíos — y el ranking va absoluto adentro. Si
                      fuera parte del flujo, con muchos jugadores sería él quien
                      estiraría la fila, que es justo lo contrario de lo buscado.
                      El mínimo evita que con un solo desafío quede aplastado.
                    */}
                    <div className="relative lg:min-h-[420px]">
                        <RankingGeneral filas={general} userId={datos.userId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
