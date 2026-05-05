"use client";

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Хук для подключения к WebSocket бэкенда и автоматической инвалидации кеша TanStack Query.
 */
export const useWebsocket = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Получаем базовый URL API и меняем протокол на ws/wss
    const apiUri = process.env.NEXT_PUBLIC_URL_API || 'http://localhost:8000';
    const wsUri = apiUri.replace(/^http/, 'ws') + '/ws';

    const connect = () => {
      console.log('🔌 Connecting to WebSocket:', wsUri);
      const socket = new WebSocket(wsUri);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 Received WS message:', data);

          // Список событий, требующих обновления списка доставок
          const deliveryEvents = [
            'DELIVERY_CREATED',
            'DELIVERY_UPDATED',
            'DELIVERY_DELETED',
            'DELIVERIES_BATCH_UPDATED'
          ];

          if (deliveryEvents.includes(data.type)) {
            console.log(`🔄 Event ${data.type} received. Invalidating deliveries query...`);
            // Инвалидируем кеш для доставок, что вызовет автоматический рефетч
            queryClient.invalidateQueries({ queryKey: ['deliveries'] });
          }
        } catch (error) {
          console.error('❌ Error parsing WS message:', error);
        }
      };

      socket.onclose = () => {
        console.log('🔌 WebSocket disconnected. Retrying in 5s...');
        // Рекурсивная попытка переподключения через 5 секунд
        setTimeout(connect, 5000);
      };

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        socket.close();
      };
    };

    connect();

    // Закрываем соединение при размонтировании компонента
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [queryClient]);

  return socketRef.current;
};
