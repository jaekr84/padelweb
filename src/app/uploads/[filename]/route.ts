import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    // Lógica de rutas idéntica a la usada en api/upload/route.ts
    const uploadDir = process.env.NODE_ENV === 'production'
        ? '/home/u957097802/domains/acap.ar/public_html/uploads'
        : path.join(process.cwd(), "public", "uploads");

    const filePath = path.join(uploadDir, filename);

    try {
        const fileBuffer = await readFile(filePath);

        // Detección básica de tipo MIME según extensión
        let contentType = "application/octet-stream";
        const ext = filename.split(".").pop()?.toLowerCase();

        if (ext === "png") contentType = "image/png";
        else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "webp") contentType = "image/webp";
        else if (ext === "gif") contentType = "image/gif";
        else if (ext === "svg") contentType = "image/svg+xml";

        // Devolvemos la imagen con cabeceras de caché para optimizar
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (err) {
        // Si no se encuentra en la carpeta persistente, devolvemos 404
        return new NextResponse("File not found", { status: 404 });
    }
}
