import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "La imagen no puede superar los 5MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        let ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        
        // Fix for browser-image-compression or other tools that might send generic "blob" name
        if (ext === "blob" || !["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
            if (file.type === "image/png") ext = "png";
            else if (file.type === "image/webp") ext = "webp";
            else if (file.type === "image/gif") ext = "gif";
            else ext = "jpg";
        }
        
        const filename = `up_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        
        // In Hostinger, we want to save to the persistent public_html/uploads folder
        // Outside the application folder so uploads are not lost on redeploy
        const uploadDir = process.env.NODE_ENV === 'production'
            ? '/home/u957097802/domains/acap.ar/public_html/uploads'
            : path.join(process.cwd(), "public", "uploads");

        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
    }
}
