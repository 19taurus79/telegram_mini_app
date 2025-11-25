"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { GeocodedAddress } from '@/types/types';

// Динамический импорт компонента карты
const MapFeature = dynamic(
    () => import('@/components/MapModule/MapFeature'),
    {
        ssr: false,
        loading: () => <p>Загрузка карты...</p>
    }
);

export default function Page() {
    useEffect(() => {
        // Remove body padding for map page
        document.body.style.paddingTop = '0';
        
        return () => {
            // Restore padding when leaving page
            document.body.style.paddingTop = '';
        };
    }, []);

    const handleAddressSelect = (addressData: GeocodedAddress) => {
        console.log("Выбранный адрес:", addressData);
    };

    return (
        <main style={{ paddingTop: 'calc(var(--header-height, 60px) + 10px)', minHeight: '100vh' }}>
            <div style={{ height: 'calc(100vh - var(--header-height, 60px) - 10px)', width: '100%', position: 'relative' }}>
                <MapFeature onAddressSelect={handleAddressSelect} />
            </div>
        </main>
    );
}