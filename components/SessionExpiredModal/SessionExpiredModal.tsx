"use client";

import { useInitData } from "@/store/InitData";
import TelegramDeepLinkLogin from "@/components/TelegramDeepLinkLogin/TelegramDeepLinkLogin";
import css from "./SessionExpiredModal.module.css";

export default function SessionExpiredModal() {
  const { isSessionExpired, setSessionExpired, setInitData } = useInitData();

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
          <TelegramDeepLinkLogin
            onSuccess={(initData) => {
              setInitData(initData);
              setSessionExpired(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
