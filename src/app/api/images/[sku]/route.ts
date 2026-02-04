import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Ruta absoluta a la carpeta de imágenes (fuera de app/)
const IMAGES_DIR = path.join(process.cwd(), '../Imagenes');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sku: string }> }
) {
    const { sku } = await params;

    // Decodificar SKU (puede contener espacios o caracteres especiales)
    let decodedSku = decodeURIComponent(sku);

    // Eliminar comillas simples o dobles al inicio/final si existen por error
    decodedSku = decodedSku.replace(/^['"]|['"]$/g, '');

    // Intentar encontrar la imagen con varias extensiones
    const extensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG', '.gif', '.GIF'];
    let imagePath = null;
    let contentType = 'image/jpeg';

    // 1. Búsqueda exacta primero
    console.log(`[ImageAPI] Request for SKU: "${sku}" (Decoded: "${decodedSku}")`);
    for (const ext of ['', ...extensions]) {
        const p = path.join(IMAGES_DIR, `${decodedSku}${ext}`);
        // console.log(`[ImageAPI] Checking: ${p}`);
        if (fs.existsSync(p)) {
            console.log(`[ImageAPI] Found at: ${p}`);
            imagePath = p;
            if (ext.toLowerCase().includes('png')) contentType = 'image/png';
            if (ext.toLowerCase().includes('gif')) contentType = 'image/gif';
            break;
        }
    }

    if (!imagePath) {
        // Retornar imagen placeholder o 404
        // Por ahora retornamos 404 para manejarlo en el frontend
        return new NextResponse('Image not found', { status: 404 });
    }

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        console.error("Error reading image:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
