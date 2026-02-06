import { useState, useEffect } from 'react';
import { getInitData } from './getInitData';

export function useInitData() {
  const [initData, setInitData] = useState<string>(getInitData());

  useEffect(() => {
    // Якщо initData вже є, нічого не робимо
    if (initData) return;

    // Спробуємо отримати дані ще раз через невеликий інтервал
    // (на випадок якщо скрипт Telegram ще не завантажився)
    const interval = setInterval(() => {
      const data = getInitData();
      if (data) {
        setInitData(data);
        clearInterval(interval);
      }
    }, 100);

    // Очистка інтервалу через 3 секунди (timeout)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [initData]);

  return initData;
}
