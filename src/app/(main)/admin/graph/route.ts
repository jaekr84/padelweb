import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { checkSuperadmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sirve el grafo de conocimiento generado por graphify (graphify-out/graph.html).
// El proxy ya bloquea /admin para no logueados, pero también deja pasar al rol
// "club": acá exigimos superadmin explícitamente.
export async function GET() {
    if (!(await checkSuperadmin())) {
        return new NextResponse("No autorizado", { status: 403 });
    }

    const filePath = path.join(process.cwd(), "graphify-out", "graph.html");

    try {
        const html = await readFile(filePath, "utf-8");
        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return new NextResponse(
            "El grafo todavía no fue generado. Ejecutá /graphify en el proyecto para crear graphify-out/graph.html",
            { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
    }
}
