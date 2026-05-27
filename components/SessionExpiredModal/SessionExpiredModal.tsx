"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { loginWithTelegramWidget } from "@/lib/api";
import { useInitData } from "@/store/InitData";
import { TelegramWidgetUser } from "@/types/types";
import css from "./SessionExpiredModal.module.css";

export default function SessionExpiredModal() {
  const { isSessionExpired, setSessionExpired, setInitData } = useInitData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      setIsLoading(true);
      const toastId = toast.loading("Оновлення сесії...");
      try {
        const { init_data } = await loginWithTelegramWidget(user);

        // Сохраняем токен на 30 дней
        const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem("tg_init_data", init_data);
        localStorage.setItem("tg_init_data_expires", expires.toString());

        const expiresDate = new Date(expires).toUTCString();
        document.cookie = `tg_init_data=${encodeURIComponent(init_data)}; path=/; expires=${expiresDate}; SameSite=Lax`;

        // Обновляем состояние в приложении
        setInitData(init_data);
        setSessionExpired(false);
        setIsLoading(false);

        toast.success("Сесію успішно оновлено!", { id: toastId });
      } catch (err) {
        console.error("Session refresh auth error:", err);
        toast.error("Помилка авторизації. Спробуйте ще раз.", { id: toastId });
        setIsLoading(false);
      }
    },
    [setInitData, setSessionExpired]
  );

  useEffect(() => {
    if (!isSessionExpired) return;

    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    if (!botName) {
      toast.error("Bot name не налаштовано");
      return;
    }

    // Регистрируем глобальный коллбек
    window.onTelegramAuth = handleAuth;

    // Вставляем скрипт виджета
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [isSessionExpired, handleAuth]);

  if (!isSessionExpired) return null;

  return (
    <div className={css.overlay}>
      <div className={css.modal}>
        <div className={css.header}>
          <div className={css.iconContainer}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={css.lockIcon}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Сесія закінчилася</h2>
        </div>
        <p className={css.description}>
          Термін дії вашої авторизації закінчився. Будь ласка, увійдіть знову через Telegram, 
          щоб зберегти ваші введені дані та продовжити роботу.
        </p>

        <div className={css.widgetContainer}>
          {isLoading ? (
            <div className={css.loader}>Оновлення сесії...</div>
          ) : (
            <div ref={containerRef} />
          )}
        </div>
      </div>
    </div>
  );
}
