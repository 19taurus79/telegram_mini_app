import { ReactNode, useEffect } from 'react';
import css from './MobileDrawer.module.css';

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

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${css.backdrop} ${isOpen ? css.open : ''}`} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`${css.drawer} ${css[position]} ${isOpen ? css.open : ''}`}>
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
