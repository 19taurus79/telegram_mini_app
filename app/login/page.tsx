"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/Auth";
import { loginWithWidget } from "@/lib/api";

const TelegramLoginWidget = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      console.log("Telegram authentication successful. Raw user data:", user);
      
      try {
        const responseData = await loginWithWidget(user);
        console.log("Backend response (Full data):", responseData);

        if (responseData && responseData.user && responseData.access_token) {
          console.log("User data to be stored:", responseData.user);
          console.log("Access token to be stored:", responseData.access_token);
          setUser(responseData.user, responseData.access_token); // <-- Исправлено: передаем user и access_token
          toast.success("Успішна аутентифікація!");
          router.push('/');
        } else {
          throw new Error("Некоректні дані користувача або токен від сервера.");
        }

      } catch (error: any) {
        console.error("Authentication error:", error);
        let errorMessage = "Помилка аутентифікації. Спробуйте пізніше.";
        if (error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            errorMessage = "Доступ заборонено. Перевірте свої права.";
          } else if (error.response.data && error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else {
            errorMessage = `Помилка аутентифікації (статус: ${error.response.status}).`;
          }
        } else if (error.request) {
          errorMessage = "Немає відповіді від сервера. Перевірте підключення.";
        } else {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
        setUser(null, null); // Сбрасываем пользователя и токен в случае ошибки
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    script.dataset.size = "large";
    script.dataset.onauth = "onTelegramAuth(user)";
    script.dataset.requestAccess = "write";

    widgetRef.current?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [router, setUser]);

  return <div ref={widgetRef}></div>;
};

export default function LoginPage() {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Вхід в систему</h1>
      <p>Будь ласка, авторизуйтесь за допомогою Telegram:</p>
      <TelegramLoginWidget />
    </div>
  );
}
