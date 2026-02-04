import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const CFDS_ROOT = path.join(process.cwd(), '../CFDs');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    const { uuid } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'xml'; // xml or pdf
    const ext = type === 'pdf' ? '.pdf' : '.xml';
    const contentType = type === 'pdf' ? 'application/pdf' : 'application/xml';

    // Búsqueda Recursiva
    // Los CFDs están organizados por AÑO/TIPO (Emitidos/Recibidos) a veces, o planos.
    // Buscaremos en todo el árbol de CFDs.
    let foundPath: string | null = null;

    // Función auxiliar recursiva
    function findFile(dir: string) {
        if (foundPath) return; // Ya encontramos

        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    findFile(fullPath);
                } else if (file.toLowerCase().includes(uuid.toLowerCase()) && file.toLowerCase().endsWith(ext)) {
                    // Match por UUID en el nombre
                    foundPath = fullPath;
                    return;
                }
            }
        } catch (e) {
            // Ignorar errores de permiso
        }
    }

    findFile(CFDS_ROOT);

    if (!foundPath) {
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(foundPath);
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${uuid}${ext}"`,
            },
        });
    } catch (e) {
        console.error("Error serving file:", e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
