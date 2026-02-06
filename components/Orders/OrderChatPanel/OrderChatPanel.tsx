"use client";

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChatMessages,  createChatMessage,
  updateChatMessage,
  deleteChatMessage,
  sendChatNotification,
} from '@/lib/api';
import { useInitData } from '@/lib/useInitData';
import { ChatMessage } from '@/types/types';
import { Send, Edit2, Trash2, X, Reply, ArrowDown } from 'lucide-react';
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
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const initData = useInitData();

  // Отримання повідомлень з реал-тайм оновленням
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: ['chatMessages', orderRef, initData],
    queryFn: () => getChatMessages(orderRef, initData),
    enabled: !!initData && !!orderRef,
    staleTime: 30000, // Дані актуальні 30 секунд
    refetchInterval: 10000, // Оновлювати кожні 10 секунд
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

  // Створення повідомлення з підтримкою відповідей
  const createMutation = useMutation({
    mutationFn: async (messageText: string) => {
      // Створити повідомлення
      const message = await createChatMessage(
        {
          order_ref: orderRef,
          message_text: messageText,
          reply_to_message_id: replyToMessage?.id,
        },
        initData
      );
      
      // Відправити Telegram сповіщення
      try {
        await sendChatNotification(orderRef, message.id, initData);
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Не блокуємо створення повідомлення
      }
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', orderRef] });
      setNewMessage('');
      setReplyToMessage(null);
      toast.success('Повідомлення відправлено');
      setTimeout(() => scrollToBottom(), 100);
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

  // Відстеження скролінгу для показу кнопки "Прокрутити вниз"
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Автоскролінг тільки для нових власних повідомлень або при першому завантаженні
  useEffect(() => {
    if (messages.length === 0) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Скролити вниз якщо користувач біля низу або це перше завантаження
    if (isNearBottom || previousMessageCount === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    setPreviousMessageCount(messages.length);
  }, [messages, previousMessageCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    createMutation.mutate(newMessage.trim());
  };

  const handleReply = (message: ChatMessage) => {
    setReplyToMessage(message);
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
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

  if (isLoading && !messages.length) {
    return <div className={css.loading}>Завантаження чату...</div>;
  }

  if (!initData && !isLoading) {
    return <div className={css.loading}>Очікування авторизації Telegram...</div>;
  }

  if (isError && !messages.length) {
    return <div className={css.loading} style={{ color: 'var(--error-color, #f44336)' }}>
      Помилка завантаження чату. Спробуйте оновити сторінку.
    </div>;
  }

  return (
    <div className={css.chatContainer}>
      <div className={css.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={css.emptyState}>
            Поки що немає повідомлень. Напишіть перше!
          </div>
        ) : (
          messages.map((message) => {
            // Знайти цитоване повідомлення якщо є
            const quotedMessage = message.reply_to_message_id
              ? messages.find(m => m.id === message.reply_to_message_id)
              : null;

            return (
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
                    {/* Відображення цитованого повідомлення */}
                    {quotedMessage && (
                      <div 
                        className={css.quotedMessage}
                        onClick={() => {
                          // Можна додати скролінг до цитованого повідомлення
                          const element = document.getElementById(`message-${quotedMessage.id}`);
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <div className={css.quotedMessageAuthor}>
                          {quotedMessage.user_name}
                        </div>
                        <div className={css.quotedMessageText}>
                          {quotedMessage.message_text}
                        </div>
                      </div>
                    )}

                    <div className={css.messageHeader}>
                      <span className={css.userName}>{message.user_name}</span>
                      <span className={css.messageTime}>
                        {formatTime(message.created_at)}
                        {message.is_edited && (
                          <span className={css.editedLabel}> (ред.)</span>
                        )}
                      </span>
                    </div>
                    <div className={css.messageText} id={`message-${message.id}`}>
                      {message.message_text}
                    </div>
                    <div className={css.messageActions}>
                      <button
                        onClick={() => handleReply(message)}
                        className={css.actionButton}
                        title="Відповісти"
                      >
                        <Reply size={14} />
                      </button>
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
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Кнопка прокрутки вниз */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className={css.scrollToBottomButton}
          title="Прокрутити вниз"
        >
          <ArrowDown size={20} />
          {messages.length > previousMessageCount && (
            <span className={css.newMessagesIndicator}>
              {messages.length - previousMessageCount}
            </span>
          )}
        </button>
      )}

      <div className={css.bottomSection}>
        {/* Reply Preview */}
        {replyToMessage && (
          <div className={css.replyPreview}>
            <div className={css.replyPreviewContent}>
              <div className={css.replyPreviewAuthor}>
                Відповідь на {replyToMessage.user_name}
              </div>
              <div className={css.replyPreviewText}>
                {replyToMessage.message_text}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelReply}
              className={css.replyPreviewClose}
              title="Скасувати відповідь"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
      </div>

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
