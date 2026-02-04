import Firebird from 'node-firebird';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const options: Firebird.Options = {
    host: '127.0.0.1',
    port: 3050,
    database: '/firebird/data/RESTORED.fdb',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: false,
    role: undefined,
    pageSize: 4096
};

async function migrate() {
    console.log('🔌 Conectando a Firebird...');

    Firebird.attach(options, async (err, db) => {
        if (err) {
            console.error('❌ Error conectando a Firebird:', err);
            process.exit(1);
        }

        console.log('✅ Conexión exitosa. Leyendo inventario...');

        // Intentar leer de INVE01 (Tabla estándar de inventarios en SAE)
        const query = `
      SELECT 
        CVE_ART, 
        DESCR, 
        LIN_PROD, 
        EXIST, 
        PRECIO1 
      FROM INVE01
    `;

        db.query(query, [], async (err, result) => {
            if (err) {
                console.error('❌ Error consultando INVE01:', err);
                db.detach();
                process.exit(1);
            }

            // Obtener storeId por defecto
            const defaultStore = await prisma.store.findFirst();
            if (!defaultStore) {
                console.error("❌ No se encontró ninguna tienda (Store). Ejecuta el seed primero.");
                db.detach();
                process.exit(1);
                return;
            }
            const storeId = defaultStore.id;
            console.log(`🏪 Usando Store ID por defecto: ${storeId}`);

            console.log(`📦 Encontrados ${result.length} productos. Iniciando migración...`);

            let processed = 0;
            let errors = 0;

            for (const row of result) {
                try {
                    // Convertir buffer a string si es necesario (node-firebird a veces devuelve buffers para textos)
                    const sku = row.CVE_ART.toString().trim();
                    const description = row.DESCR ? row.DESCR.toString().trim() : 'Sin Descripción';
                    const line = row.LIN_PROD ? row.LIN_PROD.toString().trim() : null;
                    const stock = row.EXIST ? Number(row.EXIST) : 0;
                    const price = row.PRECIO1 ? Number(row.PRECIO1) : 0;

                    if (!sku) continue;

                    await prisma.product.upsert({
                        where: {
                            storeId_sku: {
                                storeId: storeId,
                                sku: sku
                            }
                        },
                        update: {
                            description,
                            line,
                            stock,
                            price,
                            lastSync: new Date()
                        },
                        create: {
                            sku,
                            description,
                            line,
                            stock,
                            price,
                            storeId: storeId
                        }
                    });
                    processed++;
                    if (processed % 100 === 0) process.stdout.write(`.`);
                } catch (e) {
                    console.error(`\n❌ Error importando ${row.CVE_ART}:`, e);
                    errors++;
                }
            }

            console.log(`\n\n✅ Migración completada.`);
            console.log(`📊 Procesados: ${processed}`);
            console.log(`⚠️ Errores: ${errors}`);

            db.detach();
            await prisma.$disconnect();
        });
    });
}

migrate();
