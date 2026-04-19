import React from 'react';
import styles from './BottomSheet.module.css';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isFullHeight?: boolean;
}

export default function BottomSheet({ isOpen, onClose, title, children, footer, isFullHeight }: BottomSheetProps) {
  const { offsetY, handlers } = useSwipeToClose({ onClose, threshold: 120 });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.sheet} ${isFullHeight ? styles.fullHeight : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{ 
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
          transition: offsetY === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      >
        <div className={styles.dragHandleWrapper} {...handlers}>
          <div className={styles.dragHandle} />
        </div>
        
        {title && (
          <div className={styles.header} {...handlers}>
            <h3 className={styles.title}>{title}</h3>
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
