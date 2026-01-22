"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/Auth";
import { loginWithWidget } from "@/lib/api";

// Extend Window interface
declare global {
  interface Window {
    onTelegramAuth?: (user: unknown) => void;
  }
}

const TelegramLoginWidget = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user: unknown) => {
      console.log("Telegram authentication successful. Raw user data:", user);
      
      try {
        const responseData = await loginWithWidget(user);
        console.log("Backend response (Full data):", responseData);

        if (responseData && responseData.user && responseData.access_token) {
          console.log("User data to be stored:", responseData.user);
          console.log("Access token to be stored:", responseData.access_token);
          setUser(responseData.user, responseData.access_token);
          toast.success("Успішна аутентифікація!");
          router.push('/');
        } else {
          throw new Error("Некоректні дані користувача або токен від сервера.");
        }

      } catch (error: unknown) {
        console.error("Authentication error:", error);
        let errorMessage = "Помилка аутентифікації. Спробуйте пізніше.";
        
        // Type guard for axios error
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; request?: unknown; message?: string };
          if (axiosError.response) {
            if (axiosError.response.status === 401 || axiosError.response.status === 403) {
              errorMessage = "Доступ заборонено. Перевірте свої права.";
            } else if (axiosError.response.data?.detail) {
              errorMessage = axiosError.response.data.detail;
            } else {
              errorMessage = `Помилка аутентифікації (статус: ${axiosError.response.status}).`;
            }
          } else if (axiosError.request) {
            errorMessage = "Немає відповіді від сервера. Перевірте підключення.";
          } else if (axiosError.message) {
            errorMessage = axiosError.message;
          }
        }
        
        toast.error(errorMessage);
        setUser(null, null);
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
