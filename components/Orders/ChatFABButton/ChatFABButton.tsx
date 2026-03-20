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
        bottom: '30px',
        right: '30px',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(14, 241, 142, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--accent-green)',
        border: '1px solid rgba(14, 241, 142, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        zIndex: 1000
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--accent-green)';
        e.currentTarget.style.color = '#000';
        e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 241, 142, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(14, 241, 142, 0.15)';
        e.currentTarget.style.color = 'var(--accent-green)';
        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.3)';
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
