"use client";

import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import OrderChatPanel from '@/components/Orders/OrderChatPanel/OrderChatPanel';
import css from './DraggableChatModal.module.css';

interface DraggableChatModalProps {
  orderRef: string;
  onClose: () => void;
  openedFromLink?: boolean;
  isMobileProp?: boolean;
}

export default function DraggableChatModal({
  orderRef,
  onClose,
  openedFromLink = false,
  isMobileProp
}: DraggableChatModalProps) {
  // Desktop dragging state
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Mobile minimized state
  const [isMinimized, setIsMinimized] = useState(false);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(isMobileProp !== undefined ? isMobileProp : false);

  // Touch handling
  const touchStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Detect mobile/desktop
  useEffect(() => {
    if (isMobileProp !== undefined) {
      setIsMobile(isMobileProp);
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileProp]);

  // Desktop drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Обмеження в межах viewport
      const modalWidth = 400;
      const modalHeight = 600;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Swipe down для згортання (більше 50px)
    if (diff > 50 && !isMinimized) {
      setIsMinimized(true);
      touchStartY.current = currentY;
    }
    // Swipe up для розгортання (більше 50px вгору)
    else if (diff < -50 && isMinimized) {
      setIsMinimized(false);
      touchStartY.current = currentY;
    }
  };

  // ESC для закриття
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [openedFromLink]);

  const handleClose = () => {
    onClose();

    // Закрити Mini App якщо відкрито через посилання
    if (openedFromLink && typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className={`${css.backdrop} ${isMinimized ? css.minimized : ''}`}
          onClick={() => !isMinimized && handleClose()}
        />
      )}

      {/* Modal */}
      <div
        ref={modalRef}
        className={`${css.modal} ${isDragging ? css.dragging : ''} ${isMinimized ? css.minimized : ''}`}
        style={!isMobile ? {
          left: `${position.x}px`,
          top: `${position.y}px`
        } : {}}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header */}
        <div
          className={css.header}
          onMouseDown={handleMouseDown}
        >
          <h3 className={css.title}>
            Чат заявки {orderRef}
          </h3>

          <div className={css.actions}>
            {isMobile && (
              <button
                className={css.minimizeButton}
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? "Розгорнути" : "Згорнути"}
              >
                {isMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}

            <button
              className={css.closeButton}
              onClick={handleClose}
              aria-label="Закрити"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={css.content}>
          <OrderChatPanel orderRef={orderRef} />
        </div>
      </div>
    </>
  );
}
