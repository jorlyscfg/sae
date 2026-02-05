import { getQuotes } from '@/app/actions/quotes';
import { getCustomers } from '@/app/actions/customers'; // Need customers for the form
import QuotesClient from './QuotesClient';

export const metadata = {
    title: 'Cotizaciones | Aspel Dany',
};

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; status?: string }>;
}) {
    const params = await searchParams;
    const quotesData = await getQuotes(params);
    const customersData = await getCustomers(); // Fetch customers for creating new quotes

    return (
        <QuotesClient
            initialData={quotesData.success ? (quotesData.data ?? []) : []}
            customers={customersData.success ? (customersData.data ?? []) : []}
        />
    );
}
