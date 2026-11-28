"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeliveryChatMessages,
  createDeliveryChatMessage,
  updateDeliveryChatMessage,
  deleteDeliveryChatMessage,
  markDeliveryChatRead,
} from '@/lib/api';
import { useInitData } from '@/lib/useInitData';
import { useUser } from '@/store/User';
import { DeliveryChatMessage } from '@/types/types';
import {
  Send,
  Edit2,
  Trash2,
  X,
  Reply,
  ArrowDown,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import css from './DeliveryChatPanel.module.css';

interface DeliveryChatPanelProps {
  deliveryId: number;
  mode?: 'chat' | 'history';
  managerName?: string;
}

const QUICK_TEMPLATES: { label: string; text: string }[] = [
  { label: '🕒 Уточнити час', text: 'Підкажіть, будь ласка, точний час приймання у клієнта?' },
  { label: '📞 Контакт', text: 'Перевірте, будь ласка, чи актуальний контактний телефон отримувача.' },
  { label: '🚚 Виїзд авто', text: 'Товар скомплектовано, машина виїжджає на маршрут.' },
  { label: '📅 Перенос дати', text: 'Просимо погодити перенесення дати доставки.' },
];

function formatDayLabel(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isSameDay) return 'Сьогодні';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Вчора';

  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeOnly(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatFullTimestamp(dateString: string): string {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('uk-UA')} ${d.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

export default function DeliveryChatPanel({
  deliveryId,
  mode = 'chat',
  managerName,
}: DeliveryChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<DeliveryChatMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSystemInChat, setShowSystemInChat] = useState(mode === 'history');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMarkedCountRef = useRef<number>(0);

  const queryClient = useQueryClient();
  const initData = useInitData();
  const userData = useUser((state) => state.userData);
  const isGuest = Boolean(userData?.is_guest);
  const isAdmin = Boolean(userData?.is_admin);
  const currentUserTgId = userData?.telegram_id ?? null;

  useEffect(() => {
    setShowSystemInChat(mode === 'history');
  }, [mode]);

  const { data: thread, isLoading, isError } = useQuery({
    queryKey: ['deliveryChat', deliveryId, initData],
    queryFn: () => getDeliveryChatMessages(deliveryId, initData),
    enabled: Boolean(initData) && Boolean(deliveryId),
    staleTime: 10000,
    refetchInterval: 30000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const allMessages = useMemo(() => thread?.messages ?? [], [thread?.messages]);

  const visibleMessages = useMemo(() => {
    if (mode === 'history' || showSystemInChat) {
      return allMessages;
    }
    return allMessages.filter((m) => m.source !== 'system');
  }, [allMessages, mode, showSystemInChat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Автоматично позначаємо переписку прочитаною при відкритті та нових повідомленнях
  useEffect(() => {
    if (!initData || !deliveryId || !thread) return;
    if (allMessages.length === 0) return;
    if (lastMarkedCountRef.current === allMessages.length) return;

    lastMarkedCountRef.current = allMessages.length;
    markDeliveryChatRead(deliveryId, initData)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['deliveryChatSummaries'] });
      })
      .catch(() => {
        /* ignore background read sync failure */
      });
  }, [allMessages.length, deliveryId, initData, queryClient, thread]);

  useEffect(() => {
    lastMarkedCountRef.current = 0;
  }, [deliveryId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 90;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (visibleMessages.length === 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages.length]);

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      createDeliveryChatMessage(
        deliveryId,
        {
          message_text: text,
          reply_to_message_id: replyToMessage?.id,
        },
        initData
      ),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['deliveryChat', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['deliveryChatSummaries'] });
      setNewMessage('');
      setReplyToMessage(null);
      if (created.telegram_delivery_status === 'delivered_tg') {
        toast.success('Повідомлення надіслано в Telegram');
      } else if (created.telegram_delivery_status === 'failed_tg') {
        toast('Збережено в історію (Telegram не доставлено)', { icon: '⚠️' });
      } else {
        toast.success('Повідомлення збережено');
      }
      setTimeout(scrollToBottom, 80);
    },
    onError: () => {
      toast.error('Помилка відправки повідомлення');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      updateDeliveryChatMessage(deliveryId, messageId, { message_text: text }, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryChat', deliveryId] });
      setEditingId(null);
      setEditText('');
      toast.success('Повідомлення оновлено');
    },
    onError: () => {
      toast.error('Помилка оновлення повідомлення');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => deleteDeliveryChatMessage(deliveryId, messageId, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryChat', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['deliveryChatSummaries'] });
      toast.success('Повідомлення видалено');
    },
    onError: () => {
      toast.error('Помилка видалення повідомлення');
    },
  });

  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newMessage.trim();
      if (!trimmed) return;
      createMutation.mutate(trimmed);
    },
    [createMutation, newMessage]
  );

  const handleTemplateClick = useCallback((tplText: string) => {
    setNewMessage(tplText);
  }, []);

  if (isLoading && !thread) {
    return <div className={css.stateBox}>Завантаження історії переписки...</div>;
  }

  if (isError && !thread) {
    return (
      <div className={css.stateBox} style={{ color: 'var(--alert-color)' }}>
        Не вдалося завантажити чат доставки. Спробуйте оновити сторінку.
      </div>
    );
  }

  const resolvedManagerName = thread?.manager_name || managerName || 'Менеджер не вказаний';
  const isTgLinked = thread?.manager_telegram_linked ?? false;

  return (
    <div className={css.chatContainer}>
      {/* Контекстна шапка переписки */}
      <div className={css.contextBar}>
        <div className={css.managerStatus}>
          <span className={css.managerTitle}>
            <MessageSquare size={14} />
            <span>{resolvedManagerName}</span>
          </span>
          {isTgLinked ? (
            <span className={css.tgLinkedBadge} title="Повідомлення доставляються менеджеру в Telegram-бот">
              ✓ TG підключено{thread?.manager_username ? ` (@${thread.manager_username})` : ''}
            </span>
          ) : (
            <span
              className={css.tgUnlinkedBadge}
              title="Менеджер ще не активував Telegram-бота; повідомлення зберігаються лише в історії заявки"
            >
              ⚠️ TG не прив&apos;язано
            </span>
          )}
        </div>

        {mode === 'chat' && (
          <button
            type="button"
            className={`${css.filterToggleBtn} ${showSystemInChat ? css.filterToggleActive : ''}`}
            onClick={() => setShowSystemInChat((prev) => !prev)}
            title="Показувати або приховувати системні зміни статусу та дати у чаті"
          >
            <Clock size={12} />
            <span>{showSystemInChat ? 'Всі події' : 'Лише чат'}</span>
          </button>
        )}
      </div>

      {/* Стрічка повідомлень */}
      <div className={css.messagesContainer} ref={messagesContainerRef}>
        {visibleMessages.length === 0 ? (
          <div className={css.emptyState}>
            Поки що немає повідомлень по цій доставці. Напишіть менеджеру перше повідомлення!
          </div>
        ) : (
          visibleMessages.map((msg, idx) => {
            const prev = idx > 0 ? visibleMessages[idx - 1] : null;
            const currentDay = formatDayLabel(msg.created_at);
            const prevDay = prev ? formatDayLabel(prev.created_at) : null;
            const showDateDivider = currentDay !== prevDay;

            const quoted = msg.reply_to_message_id
              ? allMessages.find((m) => m.id === msg.reply_to_message_id)
              : null;

            const isOwn =
              msg.source !== 'system' &&
              currentUserTgId !== null &&
              msg.author_telegram_id === currentUserTgId;

            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className={css.dateDivider}>
                    <span>{currentDay}</span>
                  </div>
                )}

                {msg.source === 'system' ? (
                  <div className={css.systemEventRow} id={`dchat-msg-${msg.id}`}>
                    <span className={css.systemEventPill} title={formatFullTimestamp(msg.created_at)}>
                      <Clock size={12} />
                      <strong>{formatTimeOnly(msg.created_at)}</strong>
                      <span>• {msg.author_name}: {msg.message_text}</span>
                    </span>
                  </div>
                ) : (
                  <div
                    id={`dchat-msg-${msg.id}`}
                    className={`${css.messageRow} ${isOwn ? css.messageRowOwn : css.messageRowOther}`}
                  >
                    {editingId === msg.id ? (
                      <div className={css.editContainer}>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={css.editTextarea}
                          rows={2}
                        />
                        <div className={css.editActions}>
                          <button
                            type="button"
                            onClick={() =>
                              editText.trim() &&
                              updateMutation.mutate({ messageId: msg.id, text: editText.trim() })
                            }
                            className={css.saveButton}
                            disabled={updateMutation.isPending}
                          >
                            Зберегти
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditText('');
                            }}
                            className={css.cancelButton}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${css.messageBubble} ${
                          isOwn ? css.bubbleOwn : css.bubbleOther
                        } ${msg.source === 'telegram' ? css.bubbleTelegram : ''}`}
                      >
                        <div className={css.messageHeader}>
                          <div className={css.authorInfo}>
                            <span className={css.authorName}>{msg.author_name}</span>
                            <span className={css.roleBadge}>{msg.author_role}</span>
                            <span
                              className={`${css.sourceBadge} ${
                                msg.source === 'telegram' ? css.sourceTg : css.sourceWeb
                              }`}
                            >
                              {msg.source === 'telegram' ? 'Telegram' : 'Web'}
                            </span>
                          </div>
                          <span
                            className={css.messageTime}
                            title={formatFullTimestamp(msg.created_at)}
                          >
                            {formatTimeOnly(msg.created_at)}
                            {msg.is_edited && <span className={css.editedLabel}> (ред.)</span>}
                          </span>
                        </div>

                        {quoted && (
                          <div
                            className={css.quotedBox}
                            onClick={() => {
                              const el = document.getElementById(`dchat-msg-${quoted.id}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <div className={css.quotedAuthor}>{quoted.author_name}</div>
                            <div className={css.quotedText}>{quoted.message_text}</div>
                          </div>
                        )}

                        <div className={css.messageText}>{msg.message_text}</div>

                        <div className={css.messageFooter}>
                          <div className={css.tgStatus}>
                            {msg.telegram_delivery_status === 'delivered_tg' && (
                              <span className={css.tgDelivered} title="Доставлено в Telegram">
                                <CheckCheck size={13} /> TG
                              </span>
                            )}
                            {msg.telegram_delivery_status === 'saved' && (
                              <span className={css.tgSaved} title="Збережено в історії">
                                <Check size={13} /> Збережено
                              </span>
                            )}
                            {msg.telegram_delivery_status === 'failed_tg' && (
                              <span
                                className={css.tgFailed}
                                title={msg.telegram_error || 'Не доставлено в Telegram'}
                              >
                                <AlertCircle size={13} /> Не в TG
                              </span>
                            )}
                          </div>

                          {!isGuest && (
                            <div className={css.messageActions}>
                              <button
                                type="button"
                                onClick={() => setReplyToMessage(msg)}
                                className={css.actionBtn}
                                title="Цитувати"
                              >
                                <Reply size={13} />
                              </button>
                              {isOwn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(msg.id);
                                    setEditText(msg.message_text);
                                  }}
                                  className={css.actionBtn}
                                  title="Редагувати"
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {(isOwn || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(msg.id)}
                                  className={css.actionBtn}
                                  title="Видалити"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className={css.scrollToBottomButton}
          title="Прокрутити вниз"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Нижня панель вводу */}
      <div className={css.bottomSection}>
        {isGuest ? (
          <div className={css.guestBanner}>
            📖 Режим &quot;Тільки читання&quot;. Гостьовий акаунт не може надсилати повідомлення.
          </div>
        ) : (
          <>
            <div className={css.templatesRow}>
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  className={css.templateChip}
                  onClick={() => handleTemplateClick(tpl.text)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {replyToMessage && (
              <div className={css.replyPreview}>
                <div className={css.replyPreviewContent}>
                  <div className={css.replyPreviewAuthor}>
                    Відповідь на {replyToMessage.author_name}
                  </div>
                  <div className={css.replyPreviewText}>{replyToMessage.message_text}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
                  className={css.replyPreviewClose}
                  title="Скасувати цитування"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className={css.inputContainer}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Написати менеджеру (піде в Telegram + збережеться в історії)..."
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
                title="Надіслати в Telegram"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>

      {deleteConfirmId && (
        <div className={css.deleteModal} onClick={() => setDeleteConfirmId(null)}>
          <div className={css.deleteModalContent} onClick={(e) => e.stopPropagation()}>
            <h4>Видалити повідомлення?</h4>
            <p>Ця дія незворотна</p>
            <div className={css.deleteModalActions}>
              <button
                type="button"
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className={css.deleteConfirmButton}
                disabled={deleteMutation.isPending}
              >
                Видалити
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
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
