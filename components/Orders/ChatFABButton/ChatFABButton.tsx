"use client";

import { useQuery } from '@tanstack/react-query';
import { getChatMessages } from '@/lib/api';
import { MessageSquare } from 'lucide-react';

interface ChatFABButtonProps {
  orderRef: string;
  onClick: () => void;
  initData: string;
}

export default function ChatFABButton({ orderRef, onClick, initData }: ChatFABButtonProps) {
  // Отримати кількість повідомлень
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', orderRef],
    queryFn: () => getChatMessages(orderRef, initData),
    enabled: !!initData && !!orderRef,
    staleTime: 30000,
    refetchInterval: 30000, // Оновлювати кожні 30 секунд для бейджу
  });

  const messageCount = messages.length;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--primary-color)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.3s',
        zIndex: 1000
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--primary-hover-color)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--primary-color)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={`Чат заявки ${orderRef}${messageCount > 0 ? ` (${messageCount})` : ''}`}
    >
      <MessageSquare size={24} />
      {messageCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {messageCount > 99 ? '99+' : messageCount}
        </span>
      )}
    </button>
  );
}
