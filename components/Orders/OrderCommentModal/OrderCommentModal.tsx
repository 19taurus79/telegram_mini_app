"use client";

import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Check } from 'lucide-react';
import { getOrderComments, createOrderComment, updateOrderComment, deleteOrderComment } from '@/lib/api';
import { OrderComment } from '@/types/types';
import { getInitData } from '@/lib/getInitData';
import toast from 'react-hot-toast';
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
  const [comments, setComments] = useState<OrderComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<'order' | 'product'>(commentType);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      // Завантажуємо всі коментарі для заявки
      const allComments = await getOrderComments(orderRef);
      
      // Фільтруємо: показуємо коментарі заявки + коментарі конкретного товару (якщо productId вказаний)
      const filteredComments = allComments.filter(comment => {
        // Завжди показуємо коментарі рівня заявки
        if (comment.comment_type === 'order') {
          return true;
        }
        // Якщо є productId, показуємо тільки коментарі цього товару
        if (productId && comment.comment_type === 'product') {
          // Порівнюємо по product_name (назва товару) для сумісності з BI та дашбордом
          return comment.product_name === productId || comment.product_id === productId;
        }
        return false;
      });
      
      setComments(filteredComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [orderRef, productId, loadComments]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const initData = getInitData();
      const payload = {
        comment_type: selectedCommentType,
        order_ref: orderRef,
        product_id: selectedCommentType === 'product' ? productId : undefined,
        product_name: selectedCommentType === 'product' ? productName : undefined,
        comment_text: newComment.trim(),
      };
      
      console.log('📝 Створення коментаря - payload:', payload);
      
      await createOrderComment(payload, initData!);

      await loadComments();
      setNewComment('');
      toast.success('Коментар додано');
      
      // Повідомляємо про оновлення коментарів
      window.dispatchEvent(new Event('commentUpdated'));
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Помилка при додаванні коментаря');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: OrderComment) => {
    setEditingId(comment.id);
    setEditText(comment.comment_text);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const initData = getInitData();
      await updateOrderComment(commentId, editText.trim(), initData!);
      
      await loadComments();
      setEditingId(null);
      setEditText('');
      toast.success('Коментар оновлено');
      
      // Повідомляємо про оновлення коментарів
      window.dispatchEvent(new Event('commentUpdated'));
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Помилка при оновленні коментаря');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (commentId: string) => {
    try {
      const initData = getInitData();
      await deleteOrderComment(commentId, initData!);
      
      await loadComments();
      toast.success('Коментар видалено');
      
      // Повідомляємо про оновлення коментарів
      window.dispatchEvent(new Event('commentUpdated'));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Помилка при видаленні коментаря');
    }
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
          {!readOnly && (
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
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Додавання...' : 'Додати коментар'}
                </button>
              </form>
            </>
          )}

          {readOnly && (
            <div className={styles.readOnlyNotice}>
              📖 Режим перегляду. Для редагування коментарів перейдіть в розділ &quot;Заявки&quot;
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
                      {!readOnly && editingId !== comment.id && (
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
