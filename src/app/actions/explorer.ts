'use server';

import fs from 'fs';
import path from 'path';

const BASE_PATH = '/development/aspel-dany';

export async function listDirectory(relativeContext: string = '') {
    try {
        const fullPath = path.join(BASE_PATH, relativeContext);

        // Seguridad: no permitir salir del base path
        if (!fullPath.startsWith(BASE_PATH)) {
            throw new Error('Acceso denegado');
        }

        if (!fs.existsSync(fullPath)) {
            return { files: [], directories: [], currentPath: relativeContext, error: 'Ruta no encontrada' };
        }

        const items = fs.readdirSync(fullPath, { withFileTypes: true });

        const directories = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort();

        const files = items
            .filter(item => item.isFile())
            .map(item => {
                const stats = fs.statSync(path.join(fullPath, item.name));
                return {
                    name: item.name,
                    size: stats.size,
                    mtime: stats.mtime
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            directories,
            files,
            currentPath: relativeContext
        };
    } catch (error: any) {
        return { files: [], directories: [], currentPath: relativeContext, error: error.message };
    }
}
