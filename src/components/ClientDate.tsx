'use client';

import { useState, useEffect } from 'react';

interface ClientDateProps {
    date: Date | string | null;
    fallback?: string;
    options?: Intl.DateTimeFormatOptions;
    includeTime?: boolean;
}

export default function ClientDate({ date, fallback = '-', options, includeTime }: ClientDateProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !date) {
        return <span>{fallback}</span>;
    }

    try {
        const d = new Date(date);
        if (includeTime) {
            return <span suppressHydrationWarning>{d.toLocaleString('es-MX', options || {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</span>;
        }
        return <span suppressHydrationWarning>{d.toLocaleDateString('es-MX', options)}</span>;
    } catch (e) {
        return <span>{fallback}</span>;
    }
}
