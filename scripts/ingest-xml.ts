import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const prisma = new PrismaClient();
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

const CFDS_DIR = path.resolve(__dirname, '../../CFDs');

async function main() {
    console.log(`🔍 Buscando XMLs en: ${CFDS_DIR}`);

    // Buscar recursivamente archivos .xml
    const xmlFiles = await glob(`${CFDS_DIR}/**/*.xml`);
    console.log(`📄 Encontrados ${xmlFiles.length} archivos XML.`);

    // Obtener storeId por defecto
    const defaultStore = await prisma.store.findFirst();
    if (!defaultStore) {
        throw new Error("No se encontró ninguna tienda (Store) en la base de datos. Ejecuta el seed primero.");
    }
    const storeId = defaultStore.id;

    console.log(`🏪 Usando Store ID por defecto: ${storeId}`);

    let processed = 0;
    let errors = 0;

    for (const file of xmlFiles) {
        try {
            await processXml(file, storeId);
            processed++;
        } catch (e) {
            console.error(`❌ Error procesando ${path.basename(file)}:`, e);
            errors++;
        }

        if (processed % 50 === 0) {
            console.log(`🚀 Procesados: ${processed} / ${xmlFiles.length}`);
        }
    }

    console.log(`✅ Finalizado. Procesados: ${processed}. Errores: ${errors}`);
}

async function processXml(filePath: string, storeId: string) {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const jsonObj = parser.parse(xmlData);

    // Determinar estructura (puede variar según versión CFDI 3.2, 3.3, 4.0)
    // Nota: Aspel SAE 6.0 usa comunmente CFDI 3.2 o 3.3
    const comprobante = jsonObj['cfdi:Comprobante'];
    if (!comprobante) {
        // Intentar sin prefijo cfdi si falla
        // throw new Error("No es un Comprobante válido");
        return; // Skip si no es factura
    }

    const emisor = comprobante['cfdi:Emisor'];
    const receptor = comprobante['cfdi:Receptor'];
    const conceptos = comprobante['cfdi:Conceptos']?.['cfdi:Concepto'];

    // Datos principales
    const uuid = comprobante['cfdi:Complemento']?.['tfd:TimbreFiscalDigital']?.['@_UUID'] ||
        comprobante['cfdi:Complemento']?.['tfd:TimbreFiscalDigital']?.['@_uuid'];

    if (!uuid) return; // Si no tiene UUID no lo guardamos

    // Upsert Cliente
    const rfcReceptor = receptor['@_rfc'] || receptor['@_RFC'];
    const nombreReceptor = receptor['@_nombre'] || receptor['@_Nombre'] || "SIN NOMBRE";

    const customer = await prisma.customer.upsert({
        where: {
            storeId_rfc: {
                storeId: storeId,
                rfc: rfcReceptor
            }
        },
        update: { razonSocial: nombreReceptor },
        create: {
            rfc: rfcReceptor,
            razonSocial: nombreReceptor,
            storeId: storeId
        }
    });

    // Prepare conceptos (puede ser array o objeto único)
    const items = Array.isArray(conceptos) ? conceptos : [conceptos];
    const itemsData = items.map((item: any) => ({
        descripcion: item['@_descripcion'] || item['@_Descripcion'] || "Sin descripción",
        cantidad: parseFloat(item['@_cantidad'] || item['@_Cantidad'] || 0),
        valorUnitario: parseFloat(item['@_valorUnitario'] || item['@_ValorUnitario'] || 0),
        importe: parseFloat(item['@_importe'] || item['@_Importe'] || 0),
        unidad: item['@_unidad'] || item['@_Unidad'],
        storeId: storeId
    })).filter((i: any) => i.importe > 0);

    // Upsert Factura
    await prisma.invoice.upsert({
        where: { uuid: uuid },
        update: {},
        create: {
            uuid: uuid,
            serie: comprobante['@_serie'] || comprobante['@_Serie'],
            folio: comprobante['@_folio'] || comprobante['@_Folio'],
            fechaEmision: new Date(comprobante['@_fecha'] || comprobante['@_Fecha']),
            subtotal: parseFloat(comprobante['@_subTotal'] || comprobante['@_subtotal'] || 0),
            total: parseFloat(comprobante['@_total'] || comprobante['@_Total'] || 0),
            moneda: comprobante['@_Moneda'] || comprobante['@_moneda'] || "MXN",
            tipoComprobante: comprobante['@_tipoDeComprobante'] || comprobante['@_TipoDeComprobante'],
            xmlPath: path.relative(CFDS_DIR, filePath),
            customerId: customer.id,
            storeId: storeId,
            items: {
                create: itemsData
            }
        }
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
