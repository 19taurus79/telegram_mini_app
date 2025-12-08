import { ReactNode, useEffect } from 'react';
import css from './MobileDrawer.module.css';
import useSwipe from '@/hooks/useSwipe';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position: 'left' | 'right';
  children: ReactNode;
  title?: string;
}

export default function MobileDrawer({ isOpen, onClose, position, children, title }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Swipe to close: left drawer closes on swipe left, right drawer closes on swipe right
  const swipeHandlers = useSwipe({
    onSwipedLeft: position === 'left' ? onClose : undefined,
    onSwipedRight: position === 'right' ? onClose : undefined,
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${css.backdrop} ${isOpen ? css.open : ''}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`${css.drawer} ${css[position]} ${isOpen ? css.open : ''}`}
        {...swipeHandlers}
      >
        <div className={css.header}>
          {title && <h3 className={css.title}>{title}</h3>}
          <button className={css.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={css.content}>
          {children}
        </div>
      </div>
    </>
  );
}
