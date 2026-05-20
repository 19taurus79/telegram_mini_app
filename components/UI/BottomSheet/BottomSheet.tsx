import React, { useState, useRef, useEffect } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isFullHeight?: boolean;
}

export default function BottomSheet({ isOpen, onClose, title, children, footer, isFullHeight }: BottomSheetProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  // Сбрасываем смещение при изменении isOpen
  useEffect(() => {
    if (isOpen) {
      setOffsetY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Функция плавного закрытия (сначала съезжает вниз, потом размонтируется)
  const triggerClose = () => {
    setIsDragging(false);
    setOffsetY(window.innerHeight || 800);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startYRef.current;

    // Разрешаем тянуть только вниз
    if (diffY > 0) {
      setOffsetY(diffY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Если сдвинули вниз больше чем на 100px — плавно закрываем
    if (offsetY > 100) {
      triggerClose();
    } else {
      setOffsetY(0);
    }
  };

  const sheetStyle = {
    transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
  };

  return (
    <div className={styles.overlay} onClick={triggerClose}>
      <div 
        className={`${styles.sheet} ${isFullHeight ? styles.fullHeight : ''}`} 
        style={sheetStyle}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div 
          className={styles.dragHandleWrapper} 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={triggerClose}
          title="Закрити"
        >
          <div className={styles.dragHandle} />
        </div>
        
        {title && (
          <div 
            className={styles.header}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <h3 className={styles.title}>{title}</h3>
            <span className={styles.swipeHint}>потягніть вниз, щоб закрити</span>
          </div>
        )}
        
        <div className={styles.content}>
          {children}
        </div>
        
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
