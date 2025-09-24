"use client";

import { useEffect, useState } from "react";

// Компонент-кнопка для закрытия окна Mini App
export default function CloseButton() {
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);

  useEffect(() => {
    // Проверяем, доступен ли API Telegram на стороне клиента
    if (
      typeof window !== "undefined" &&
      window.Telegram &&
      window.Telegram.WebApp
    ) {
      setIsTelegramAvailable(true);
    }
  }, []);

  const handleClose = () => {
    if (isTelegramAvailable) {
      window.Telegram?.WebApp?.close();
    }
  };

  return (
    <button
      onClick={handleClose}
      disabled={!isTelegramAvailable} // Кнопка неактивна, если API недоступен
      style={{
        padding: "10px 20px",
        fontSize: "16px",
        cursor: isTelegramAvailable ? "pointer" : "not-allowed",
        opacity: isTelegramAvailable ? 1 : 0.5,
      }}
    >
      Закрыть окно
    </button>
  );
}
