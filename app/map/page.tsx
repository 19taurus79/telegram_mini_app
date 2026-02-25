"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import Loader from '@/components/Loader/Loader';

// Динамический импорт MapDashboard (ssr: false — требуется для Leaflet)
const MapDashboard = dynamic(
    () => import('@/components/MapModule/MapDashboard/MapDashboard'),
    {
        ssr: false,
        loading: () => <Loader />,
    }
);

export default function Page() {
    useEffect(() => {
        document.body.style.paddingTop = '0';
        return () => {
            document.body.style.paddingTop = '';
        };
    }, []);

    return (
        <main style={{ paddingTop: 'var(--header-height, 60px)', minHeight: '100vh', overflow: 'hidden' }}>
            <MapDashboard />
        </main>
    );
}