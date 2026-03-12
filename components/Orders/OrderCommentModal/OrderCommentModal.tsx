"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit2, Trash2, Check } from 'lucide-react';
import { getOrderComments, createOrderComment, updateOrderComment, deleteOrderComment } from '@/lib/api';
import { OrderComment, CreateOrderCommentPayload } from '@/types/types';
import { useInitData } from '@/lib/useInitData';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/store/User';
import styles from './OrderCommentModal.module.css';

interface OrderCommentModalProps {
  orderRef: string;
  commentType: 'order' | 'product';
  productId?: string;
  productName?: string;
  onClose: () => void;
  readOnly?: boolean; // Режим тільки для перегляду (для BI)
}

export default function OrderCommentModal({
  orderRef,
  commentType,
  productId,
  productName,
  onClose,
  readOnly = false,
}: OrderCommentModalProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<'order' | 'product'>(commentType);
  const initData = useInitData();
  const userData = useUser((state) => state.userData);
  const isGuest = userData?.is_guest;
  const effectiveReadOnly = readOnly || isGuest;

  // Завантаження коментарів через TanStack Query
  const { data: allComments = [], isLoading } = useQuery({
    queryKey: ['orderComments', orderRef],
    queryFn: () => getOrderComments(orderRef),
    staleTime: 30000, // 30 секунд
  });

  // Фільтруємо коментарі
  const comments = useMemo(() => {
    return allComments.filter(comment => {
      // Завжди показуємо коментарі рівня заявки
      if (comment.comment_type === 'order') {
        return true;
      }
      // Якщо це коментар до товару
      if (comment.comment_type === 'product') {
        return productName && comment.product_name === productName;
      }
      return false;
    });
  }, [allComments, productName]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Мутація створення коментаря
  const createMutation = useMutation<OrderComment, Error, CreateOrderCommentPayload>({
    mutationFn: (payload) => createOrderComment(payload, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderComments', orderRef] });
      setNewComment('');
      toast.success('Коментар додано');
      window.dispatchEvent(new Event('commentUpdated'));
    },
    onError: (error: Error) => {
      console.error('Error creating comment:', error);
      toast.error('Помилка при додаванні коментаря');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const payload = {
      comment_type: selectedCommentType,
      order_ref: orderRef,
      product_id: selectedCommentType === 'product' ? productId : undefined,
      product_name: selectedCommentType === 'product' ? productName : undefined,
      comment_text: newComment.trim(),
    };
    
    createMutation.mutate(payload);
  };

  const handleEdit = (comment: OrderComment) => {
    setEditingId(comment.id);
    setEditText(comment.comment_text);
  };

  // Мутація оновлення коментаря
  const updateMutation = useMutation<OrderComment, Error, { commentId: string; commentText: string }>({
    mutationFn: ({ commentId, commentText }) => 
      updateOrderComment(commentId, commentText, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderComments', orderRef] });
      setEditingId(null);
      setEditText('');
      toast.success('Коментар оновлено');
      window.dispatchEvent(new Event('commentUpdated'));
    },
    onError: (error: Error) => {
      console.error('Error updating comment:', error);
      toast.error('Помилка при оновленні коментаря');
    },
  });

  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return;
    updateMutation.mutate({ commentId, commentText: editText.trim() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Мутація видалення коментаря
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (commentId) => deleteOrderComment(commentId, initData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderComments', orderRef] });
      toast.success('Коментар видалено');
      window.dispatchEvent(new Event('commentUpdated'));
    },
    onError: (error: Error) => {
      console.error('Error deleting comment:', error);
      toast.error('Помилка при видаленні коментаря');
    },
  });

  const handleDelete = (commentId: string) => {
    deleteMutation.mutate(commentId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {commentType === 'product' ? (
              <>
                Коментарі до товару: <span style={{ color: '#3b82f6' }}>{productName}</span>
              </>
            ) : (
              <>
                Коментарі до заявки: <span style={{ color: '#3b82f6' }}>{orderRef}</span>
              </>
            )}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {!effectiveReadOnly && (
            <>
              {/* Форма додавання коментаря */}
              <form onSubmit={handleSubmit} className={styles.form}>
                {productId && (
                  <div style={{ marginBottom: '12px', display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="order"
                        checked={selectedCommentType === 'order'}
                        onChange={(e) => setSelectedCommentType(e.target.value as 'order')}
                      />
                      <span>Коментар до заявки</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="product"
                        checked={selectedCommentType === 'product'}
                        onChange={(e) => setSelectedCommentType(e.target.value as 'product')}
                      />
                      <span>Коментар до товару</span>
                    </label>
                  </div>
                )}
                <textarea
                  className={styles.textarea}
                  placeholder="Введіть коментар..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  disabled={createMutation.isPending}
                />
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={!newComment.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Додавання...' : 'Додати коментар'}
                </button>
              </form>
            </>
          )}

          {effectiveReadOnly && (
            <div className={styles.readOnlyNotice}>
              {isGuest ? '📖 Режим "Тільки читання". Ваші права доступу не дозволяють залишати коментарі.' : '📖 Режим перегляду. Для редагування коментарів перейдіть в розділ "Заявки"'}
            </div>
          )}

          {/* Список коментарів */}
          <div className={styles.commentsList}>
            {isLoading ? (
              <div className={styles.loading}>Завантаження...</div>
            ) : comments.length === 0 ? (
              <div className={styles.empty}>Коментарів поки немає</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.commentAuthor}>
                        {comment.created_by_name}
                      </span>
                      {comment.comment_type === 'order' && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          fontWeight: '600'
                        }}>
                          ЗАЯВКА
                        </span>
                      )}
                      {comment.comment_type === 'product' && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          fontWeight: '600'
                        }}>
                          ТОВАР
                        </span>
                      )}
                    </div>
                    <div className={styles.commentActions}>
                      <span className={styles.commentDate}>
                        {formatDate(comment.created_at)}
                      </span>
                      {!effectiveReadOnly && editingId !== comment.id && (
                        <>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleEdit(comment)}
                            title="Редагувати"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleDelete(comment.id)}
                            title="Видалити"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId === comment.id ? (
                    <div className={styles.editForm}>
                      <textarea
                        className={styles.textarea}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className={styles.editActions}>
                        <button
                          className={styles.saveButton}
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editText.trim()}
                        >
                          <Check size={16} /> Зберегти
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={handleCancelEdit}
                        >
                          Скасувати
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.commentText}>{comment.comment_text}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
