"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { getOrderComments } from '@/lib/api';
import styles from './OrderCommentBadge.module.css';

interface OrderCommentBadgeProps {
  orderRef: string;
  productId?: string;
  productName?: string;
  onClick: () => void;
  onCommentCountChange?: (count: number) => void;
}

export default function OrderCommentBadge({
  orderRef,
  productId,
  productName,
  onClick,
  onCommentCountChange,
}: OrderCommentBadgeProps) {
  const [commentCount, setCommentCount] = useState<number>(0);

  useEffect(() => {
    const loadComments = async () => {
      try {
        // Завантажуємо всі коментарі для заявки
        const allComments = await getOrderComments(orderRef);
        
        // Фільтруємо: показуємо коментарі заявки + коментарі конкретного товару (якщо productId вказаний)
        const filteredComments = allComments.filter(comment => {
          // Завжди показуємо коментарі рівня заявки
          if (comment.comment_type === 'order') {
            return true;
          }
          // Якщо є фільтр по товару, показуємо тільки коментарі цього товару
          if (comment.comment_type === 'product') {
            const matchId = productId && (comment.product_id === productId || comment.product_name === productId);
            const matchName = productName && (comment.product_name === productName || comment.product_id === productName);
            return matchId || matchName;
          }
          return false;
        });
        
        setCommentCount(filteredComments.length);
        onCommentCountChange?.(filteredComments.length);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();

    // Слухаємо подію оновлення коментарів
    const handleCommentUpdate = () => {
      loadComments();
    };

    window.addEventListener('commentUpdated', handleCommentUpdate);

    return () => {
      window.removeEventListener('commentUpdated', handleCommentUpdate);
    };
  }, [orderRef, productId]);

  return (
    <div className={styles.badge} onClick={onClick} title="Коментарі">
      <MessageSquare size={18} />
      {commentCount > 0 && (
        <span className={styles.count}>{commentCount}</span>
      )}
    </div>
  );
}
