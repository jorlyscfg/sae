'use client';

import { useState } from 'react';

interface ProductImageProps {
    src: string;
    alt: string;
}

export default function ProductImage({ src, alt }: ProductImageProps) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src="https://placehold.co/400x400/1e1e1e/FFF?text=Sin+Imagen"
                alt={alt}
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            />
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            onError={() => setError(true)}
        />
    );
}
