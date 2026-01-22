"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/Auth";
import { loginWithWidget } from "@/lib/api";
import axios from "axios";

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
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    const currentWidgetRef = widgetRef.current;
    
    if (currentWidgetRef) {
      currentWidgetRef.innerHTML = '';
    }

    // Присвоюємо функцію ДО додавання скрипта
    const authCallback = async (user: unknown) => {
      console.log("!!! CALLBACK TRIGGERED !!! Data received from Telegram:", user);
      const toastId = toast.loading("Авторизація через Telegram...");
      
      try {
        const responseData = await loginWithWidget(user);
        if (responseData && responseData.user && responseData.access_token) {
          setUser(responseData.user, responseData.access_token);
          toast.success("Успішно!", { id: toastId });
          router.push('/');
        } else {
          throw new Error("Invalid response");
        }
      } catch (error) {
        console.error("Auth error:", error);
        let status = "Network Error";
        if (axios.isAxiosError(error)) {
          status = error.response?.status?.toString() || "Network Error";
        }
        toast.error(`Помилка авторизації: ${status}`, { id: toastId });
        setUser(null, null);
      }
    };

    window.onTelegramAuth = authCallback;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName || "");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth");
    script.setAttribute("data-request-access", "write");

    currentWidgetRef?.appendChild(script);

    return () => {
      if (currentWidgetRef) currentWidgetRef.innerHTML = '';
      delete window.onTelegramAuth;
    };
  }, [router, setUser]);

  return <div ref={widgetRef} style={{ minHeight: '40px' }}></div>;
};

export default function LoginPage() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <h1>Вхід в систему</h1>
      <p style={{ maxWidth: '400px', margin: '0 auto' }}>
        Зайдіть через Telegram для доступу до системи. 
        Якщо кнопка не з&apos;являється — перевірте з&apos;єднання або спробуйте в іншому браузері.
      </p>
      <TelegramLoginWidget />
      
      {!process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          ⚠️ Змінна NEXT_PUBLIC_TELEGRAM_BOT_NAME не знайдена! Перевірте налаштування Vercel.
        </p>
      )}

      <p style={{ fontSize: '14px', color: '#666', marginTop: '20px', backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '8px' }}>
        <strong>Порада:</strong> Повідомлення для підтвердження приходить від системного акаунта 
        <span style={{ color: '#0088cc', fontWeight: 'bold' }}> Telegram</span> (не від бота!), 
        шукайте його у самому верху списку чатів.
      </p>

      <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
        Бот: {process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'не вказано'} | 
        Домен у @BotFather має бути: {typeof window !== 'undefined' ? window.location.hostname : '...'}
      </p>
    </div>
  );
}
