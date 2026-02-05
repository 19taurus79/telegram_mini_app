"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChatMessages, createChatMessage, updateChatMessage, deleteChatMessage } from '@/lib/api';
import { getInitData } from '@/lib/getInitData';
import { ChatMessage } from '@/types/types';
import { Send, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import css from './OrderChatPanel.module.css';

interface OrderChatPanelProps {
  orderRef: string;
}

export default function OrderChatPanel({ orderRef }: OrderChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const initData = getInitData() || '';

  // Отримання повідомлень
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', orderRef],
    queryFn: () => getChatMessages(orderRef, initData),
    enabled: !!initData && !!orderRef,
    staleTime: 30000, // Дані актуальні 30 секунд
    retry: 1, // Тільки одна спроба повтору при помилці
    refetchOnWindowFocus: false, // Не робити запит при фокусі вікна
    placeholderData: [], // Показувати порожній масив до завантаження
  });

  // Створення повідомлення
  const createMutation = useMutation({
    mutationFn: (messageText: string) =>
      createChatMessage(
        {
          order_ref: orderRef,
          message_text: messageText,
        },
        initData
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderRef] });
      setNewMessage('');
      toast.success('Повідомлення відправлено');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Помилка відправки повідомлення');
    },
  });

  // Редагування повідомлення
  const updateMutation = useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      updateChatMessage(orderRef, messageId, { message_text: text }, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderRef] });
      setEditingId(null);
      setEditText('');
      toast.success('Повідомлення оновлено');
    },
    onError: (error) => {
      console.error('Error updating message:', error);
      toast.error('Помилка оновлення повідомлення');
    },
  });

  // Видалення повідомлення
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      deleteChatMessage(orderRef, messageId, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderRef] });
      toast.success('Повідомлення видалено');
    },
    onError: (error) => {
      console.error('Error deleting message:', error);
      toast.error('Помилка видалення повідомлення');
    },
  });

  // Автоскрол до останнього повідомлення
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    createMutation.mutate(newMessage.trim());
  };

  const handleEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditText(message.message_text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    updateMutation.mutate({ messageId: editingId, text: editText.trim() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (messageId: string) => {
    setDeleteConfirmId(messageId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className={css.loading}>Завантаження чату...</div>;
  }

  return (
    <div className={css.chatContainer}>
      <div className={css.chatHeader}>
        <h3>Чат заявки {orderRef}</h3>
      </div>

      <div className={css.messagesContainer}>
        {messages.length === 0 ? (
          <div className={css.emptyState}>
            Поки що немає повідомлень. Напишіть перше!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={css.messageWrapper}>
              {editingId === message.id ? (
                <div className={css.editContainer}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className={css.editTextarea}
                    rows={3}
                  />
                  <div className={css.editActions}>
                    <button
                      onClick={handleSaveEdit}
                      className={css.saveButton}
                      disabled={updateMutation.isPending}
                    >
                      Зберегти
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={css.cancelButton}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={css.message}>
                  <div className={css.messageHeader}>
                    <span className={css.userName}>{message.user_name}</span>
                    <span className={css.messageTime}>
                      {formatTime(message.created_at)}
                      {message.is_edited && (
                        <span className={css.editedLabel}> (ред.)</span>
                      )}
                    </span>
                  </div>
                  <div className={css.messageText}>{message.message_text}</div>
                  <div className={css.messageActions}>
                    <button
                      onClick={() => handleEdit(message)}
                      className={css.actionButton}
                      title="Редагувати"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(message.id)}
                      className={css.actionButton}
                      title="Видалити"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={css.inputContainer}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Напишіть повідомлення..."
          className={css.messageInput}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button
          type="submit"
          className={css.sendButton}
          disabled={!newMessage.trim() || createMutation.isPending}
        >
          <Send size={20} />
        </button>
      </form>

      {/* Модальне вікно підтвердження видалення */}
      {deleteConfirmId && (
        <div className={css.deleteModal}>
          <div className={css.deleteModalContent}>
            <h4>Видалити повідомлення?</h4>
            <p>Ця дія незворотна</p>
            <div className={css.deleteModalActions}>
              <button
                onClick={confirmDelete}
                className={css.deleteConfirmButton}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Видалення...' : 'Видалити'}
              </button>
              <button
                onClick={cancelDelete}
                className={css.deleteCancelButton}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
