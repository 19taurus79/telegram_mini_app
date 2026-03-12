"use client";

import React, { useEffect, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { getOrderComments } from '@/lib/api';
import styles from './OrderCommentBadge.module.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCommentsContext } from '../CommentsContext';

interface OrderCommentBadgeProps {
  orderRef: string;
  productId?: string;
  productName?: string;
  onClick: () => void;
  onCommentCountChange?: (count: number) => void;
  initData?: string;
  preloadedComments?: any[]; // Коментарі, передані ззовні (напр. з батч-запиту)
  isBatchLoading?: boolean;   // Прапорець, що триває завантаження батчу
}

export default function OrderCommentBadge({
  orderRef,
  productId,
  productName,
  onClick,
  onCommentCountChange,
  initData,
  preloadedComments: propsComments,
  isBatchLoading: propsBatchLoading,
}: OrderCommentBadgeProps) {
  const queryClient = useQueryClient();
  const { commentsMap, isLoading: contextBatchLoading, isFetched: contextBatchFetched } = useCommentsContext();

  const preloadedComments = propsComments || (commentsMap && commentsMap[orderRef]);
  const isBatchLoading = propsBatchLoading || contextBatchLoading;
  const isBatchFetched = contextBatchFetched; // Ми знаємо, що батч-запит взагалі відбувся (успішно чи ні)

  // Використовуємо React Query для отримання коментарів
  const { data: fetchComments } = useQuery({
    queryKey: ["comments", orderRef],
    queryFn: () => getOrderComments(orderRef, productName, initData),
    staleTime: 60000, 
    // Запит вмикається ТІЛЬКИ якщо:
    // 1. Є orderRef
    // 2. Немає переданих коментарів
    // 3. Батч-запит НЕ триває ЗАРАЗ
    // 4. БАТЧ-ЗАПИТ ЩЕ НЕ ВІДБУВСЯ (якщо відбувся і нема даних - значить коментів нема)
    enabled: !!orderRef && !preloadedComments && !isBatchLoading && !isBatchFetched,
  });

  const allComments = preloadedComments || fetchComments;

  // Фільтруємо коментарі локально
  const filteredComments = useMemo(() => {
    if (!allComments) return [];
    
    return allComments.filter(comment => {
      // Завжди показуємо коментарі рівня заявки
      if (comment.comment_type === 'order') {
        return true;
      }
      // Якщо є фільтр по товару, показуємо коментарі тільки по ІМЕНІ товару
      if (comment.comment_type === 'product') {
        return productName && comment.product_name === productName;
      }
      return false;
    });
  }, [allComments, productName]);

  const commentCount = filteredComments.length;

  // Повідомляємо про зміну кількості коментарів
  useEffect(() => {
    onCommentCountChange?.(commentCount);
  }, [commentCount, onCommentCountChange]);

  // Слухаємо подію оновлення коментарів для інвалідації кешу
  useEffect(() => {
    const handleCommentUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["comments", orderRef] });
      // Також інвалідуємо батч-запит, якщо він є
      queryClient.invalidateQueries({ queryKey: ["batchComments"] });
    };

    window.addEventListener('commentUpdated', handleCommentUpdate);
    return () => {
      window.removeEventListener('commentUpdated', handleCommentUpdate);
    };
  }, [queryClient, orderRef]);

  return (
    <div className={styles.badge} onClick={onClick} title="Коментарі">
      <MessageSquare size={18} />
      {commentCount > 0 && (
        <span className={styles.count}>{commentCount}</span>
      )}
    </div>
  );
}
