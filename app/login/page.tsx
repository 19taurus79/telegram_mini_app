"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/Auth";
import { loginWithWidget } from "@/lib/api";

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
    console.log("LoginPage: Initializing widget for bot:", botName);
    
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    }

    // Присвоюємо функцію ДО додавання скрипта
    const authCallback = async (user: any) => {
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
        toast.error("Помилка авторизації. Перевірте Bot Token на бекенді.", { id: toastId });
        setUser(null, null);
      }
    };

    (window as any).onTelegramAuth = authCallback;
    console.log("LoginPage: window.onTelegramAuth is now defined:", typeof (window as any).onTelegramAuth);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName || "");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth");
    script.setAttribute("data-request-access", "write");

    widgetRef.current?.appendChild(script);

    return () => {
      if (widgetRef.current) widgetRef.current.innerHTML = '';
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
        Якщо кнопка не з'являється — перевірте з'єднання або спробуйте в іншому браузері.
      </p>
      <TelegramLoginWidget />
      <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        Важливо: Ваш домен має бути зареєстрований у @BotFather (команда /setdomain)
      </p>
    </div>
  );
}
