import { useEffect, useRef, useState } from 'react';

interface UseSwipeToCloseProps {
  onClose: () => void;
  threshold?: number;
}

export function useSwipeToClose({ onClose, threshold = 100 }: UseSwipeToCloseProps) {
  const [offsetY, setOffsetY] = useState(0);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Позволяем тянуть только вниз
    if (deltaY > 0) {
      setOffsetY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (startY.current !== null && currentY.current !== null) {
      const deltaY = currentY.current - startY.current;
      if (deltaY > threshold) {
        onClose();
      }
    }
    // Возвращаем на место с анимацией
    setOffsetY(0);
    startY.current = null;
    currentY.current = null;
  };

  return {
    offsetY,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }
  };
}
