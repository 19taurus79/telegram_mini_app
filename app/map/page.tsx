"use client";

import dynamic from 'next/dynamic';
// import { useState } from 'react';
import { GeocodedAddress } from '@/types/types';

// Динамический импорт компонента карты
const MapFeature = dynamic(
    () => import('@/components/MapModule/MapFeature'), // Укажите правильный путь
    {
        ssr: false,
        loading: () => <p>Загрузка карты...</p>
    }
);

export default function Page() {
    const handleAddressSelect = (addressData: GeocodedAddress) => {
        console.log("Выбранный адрес:", addressData);
        // Здесь вы можете сохранить данные в форму, стейт или отправить на сервер
    };

    return (
        <main>
            {/* <h1>Интеграция карты</h1> */}

            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <MapFeature onAddressSelect={handleAddressSelect} />
            </div>
        </main>
    );
}