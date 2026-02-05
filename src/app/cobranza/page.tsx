import { getReceivables } from '@/app/actions/receivables';
import ReceivablesClient from './ReceivablesClient';

export const metadata = {
    title: 'Cuentas por Cobrar | Aspel Dany',
};

export default async function CobranzaPage({
    searchParams,
}: {
    searchParams: Promise<{ customer?: string; status?: string }>;
}) {
    const params = await searchParams;
    const initialData = await getReceivables(params);

    return (
        <ReceivablesClient
            initialData={initialData.success ? (initialData.data ?? []) : []}
            summary={initialData.success ? (initialData.summary ?? { totalPortfolio: 0 }) : { totalPortfolio: 0 }}
        />
    );
}
