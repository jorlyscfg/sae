import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import ClientDetailTabs from './ClientDetailTabs';
import { auth } from '@/auth';

const prisma = new PrismaClient();

export default async function CustomerDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
        where: { id, userId },
        include: {
            invoices: {
                orderBy: { fechaEmision: 'desc' }
            }
        }
    });

    if (!customer) {
        notFound();
    }

    // KPIs
    const totalInvoices = (customer as any).invoices.length;
    const totalSpent = (customer as any).invoices.reduce((acc: number, inv: any) => acc + Number(inv.total), 0);
    const lastPurchase = (customer as any).invoices[0]?.fechaEmision;
    const avgTicket = totalInvoices > 0 ? totalSpent / totalInvoices : 0;

    return (
        <div className="container" style={{ maxWidth: '100%' }}>
            <ClientDetailTabs
                customerId={id}
                invoices={customer.invoices}
                initialStats={{ totalInvoices, totalSpent, avgTicket, lastPurchase }}
                customerInfo={{
                    razonSocial: customer.razonSocial,
                    rfc: customer.rfc,
                    email: customer.email
                }}
            />
        </div>
    );
}
