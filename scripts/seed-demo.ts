import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding DEMO data...');

    const store = await prisma.store.findUnique({ where: { id: 'default-store' } });
    const user = await prisma.user.findUnique({ where: { email: 'user1@gmail.com' } });

    if (!store || !user) {
        console.error('❌ Default user or store not found. Run seed-initial.ts first.');
        process.exit(1);
    }

    const common = {
        storeId: store.id,
        userId: user.id
    };

    // 1. Products
    console.log('📦 Creating Products...');
    const productsData = [
        { sku: 'LAPTOP-001', description: 'Laptop Gamer 15"', price: 25000, stock: 10, claveSat: '43211503', unidadSat: 'H87', line: 'COMPUTO' },
        { sku: 'MOUSE-LOG', description: 'Mouse Inalámbrico Logitech', price: 450, stock: 50, claveSat: '43211708', unidadSat: 'H87', line: 'ACCESORIOS' },
        { sku: 'SERV-MANT', description: 'Mantenimiento General', price: 800, stock: 9999, claveSat: '81111812', unidadSat: 'E48', line: 'SERVICIOS' },
        { sku: 'MONITOR-24', description: 'Monitor IPS 24 Pulgadas', price: 3200, stock: 15, claveSat: '43211902', unidadSat: 'H87', line: 'COMPUTO' },
    ];

    for (const p of productsData) {
        await prisma.product.upsert({
            where: { storeId_sku: { storeId: store.id, sku: p.sku } },
            update: {},
            create: { ...p, ...common }
        });
    }

    // 2. Customers
    console.log('👥 Creating Customers...');
    const customersData = [
        { rfc: 'XAXX010101000', razonSocial: 'PUBLICO EN GENERAL', email: 'contacto@ejemplo.com' },
        { rfc: 'GOME8001015U2', razonSocial: 'EMPRESA EJEMPLO S.A. DE C.V.', email: 'facturacion@empresa.com' },
        { rfc: 'RODR9002021I1', razonSocial: 'CLIENTE FRECUENTE SA', email: 'compras@frecuente.com' },
    ];

    for (const c of customersData) {
        await prisma.customer.upsert({
            where: { storeId_rfc: { storeId: store.id, rfc: c.rfc } },
            update: {},
            create: { ...c, ...common }
        });
    }

    // 3. Invoices (History)
    console.log('📄 Creating Invoices...');
    const customer = await prisma.customer.findFirst({ where: { storeId: store.id, rfc: 'GOME8001015U2' } });

    if (customer) {
        // Invoice 1
        await prisma.invoice.create({
            data: {
                uuid: uuidv4(),
                serie: 'F',
                folio: '1001',
                fechaEmision: new Date(Date.now() - 86400000 * 2), // 2 days ago
                subtotal: 25000,
                total: 29000,
                status: 'EMITIDA',
                tipoComprobante: 'I',
                customerId: customer.id,
                ...common,
                items: {
                    create: [
                        { descripcion: 'Laptop Gamer 15"', cantidad: 1, valorUnitario: 25000, importe: 25000, unidad: 'H87' }
                    ]
                }
            }
        });

        // Invoice 2
        await prisma.invoice.create({
            data: {
                uuid: uuidv4(),
                serie: 'F',
                folio: '1002',
                fechaEmision: new Date(),
                subtotal: 900,
                total: 1044,
                status: 'EMITIDA',
                tipoComprobante: 'I',
                customerId: customer.id,
                ...common,
                items: {
                    create: [
                        { descripcion: 'Mouse Inalámbrico Logitech', cantidad: 2, valorUnitario: 450, importe: 900, unidad: 'H87' }
                    ]
                }
            }
        });
    }

    // 4. Quotes
    console.log('📝 Creating Quotes...');
    if (customer) {
        await prisma.quote.create({
            data: {
                folio: 'COT-DEMO-001',
                fechaEmision: new Date(),
                subtotal: 3200,
                total: 3712,
                status: 'BORRADOR',
                customerId: customer.id,
                ...common,
                items: {
                    create: [
                        { descripcion: 'Monitor IPS 24 Pulgadas', cantidad: 1, valorUnitario: 3200, importe: 3200, unidad: 'H87', sku: 'MONITOR-24' }
                    ]
                }
            }
        });
    }

    console.log('✅ Demo data created successfully.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
