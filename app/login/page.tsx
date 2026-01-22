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
    
    if (!botName) {
      console.error("NEXT_PUBLIC_TELEGRAM_BOT_NAME is not defined in .env");
      return;
    }

    if (currentWidgetRef) {
      currentWidgetRef.innerHTML = '';
    }

    // Присвоюємо функцію ДО додавання скрипта і робимо її максимально видимою
    const authCallback = async (user: unknown) => {
      console.log("!!! CALLBACK TRIGGERED !!! Data received from Telegram:", user);
      // alert("Callback triggered!"); // Раскомментируйте для дебага на мобилках
      
      const toastId = toast.loading("Авторизація через Telegram...");
      
      try {
        console.log("Auth: calling loginWithWidget...");
        const responseData = await loginWithWidget(user);
        console.log("Auth: response received", responseData);

        if (responseData && responseData.user && responseData.access_token) {
          setUser(responseData.user, responseData.access_token);
          toast.success("Успішно!", { id: toastId });
          
          // Даем небольшую паузу для записи в стор перед редиректом
          setTimeout(() => {
            router.push('/');
          }, 100);
        } else {
          throw new Error("Invalid response structure from server");
        }
      } catch (error) {
        console.error("Auth error detail:", error);
        let status = "Network Error";
        if (axios.isAxiosError(error)) {
          status = `API Error: ${error.response?.status || "Unknown"} ${error.message}`;
          console.error("Axios Error Response:", error.response?.data);
        } else if (error instanceof Error) {
          status = error.message;
        }
        toast.error(`Помилка авторизації: ${status}`, { id: toastId });
        setUser(null, null);
      }
    };

    // Привязываем к window максимально надежно
    window.onTelegramAuth = authCallback;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth");
    script.setAttribute("data-request-access", "write");

    currentWidgetRef?.appendChild(script);

    return () => {
      // Не удаляем коллбэк сразу, чтобы избежать проблем при быстрых перерендерах
      // delete (window as any).onTelegramAuth; 
    };
  }, [router, setUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div ref={widgetRef} style={{ minHeight: '40px' }}></div>
      <p style={{ marginTop: '10px', fontSize: '10px', color: '#ccc' }}>
        Widget initialized for: {process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME}
      </p>
    </div>
  );
};

export default function LoginPage() {
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0088cc' }}>Вхід в систему</h1>
      
      <div style={{ maxWidth: '500px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
          Зайдіть через Telegram для доступу до системи.
        </p>
        
        <TelegramLoginWidget />

        <div style={{ marginTop: '30px', textAlign: 'left', fontSize: '13px', lineHeight: '1.6', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>🏁 Діагностика (перевірте ці пункти):</h3>
          
          <ul style={{ paddingLeft: '20px', color: '#555' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Назва бота:</strong> <code style={{ backgroundColor: '#f4f4f4', padding: '2px 5px', borderRadius: '4px' }}>{botName || 'НЕ ВКАЗАНО'}</code> 
              {!botName && <span style={{ color: 'red' }}> — Додайте NEXT_PUBLIC_TELEGRAM_BOT_NAME у Vercel!</span>}
              {botName?.startsWith('@') && <span style={{ color: 'red' }}> — Видаліть символ @ із назви!</span>}
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Домен у @BotFather:</strong> Має бути рівно <code>{typeof window !== 'undefined' ? window.location.hostname : '...'}</code>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Де шукати код:</strong> У чаті <span style={{ color: '#0088cc', fontWeight: 'bold' }}>Telegram</span> (синя галочка), а не в чаті з ботом.
            </li>
          </ul>

          <div style={{ backgroundColor: '#e8f4fd', padding: '12px', borderRadius: '8px', marginTop: '15px', color: '#006699' }}>
            <strong>Важливо:</strong> Якщо ви змінили домен у BotFather щойно, Telegram може &quot;думати&quot; до 5-10 хвилин. Спробуйте оновити сторінку через деякий час.
          </div>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#999' }}>
        Якщо повідомлення все одно не приходить — спробуйте відключити борт у налаштуваннях Telegram (Пристрої → Підключені сайти) і спробувати ще раз.
      </p>
    </div>
  );
}
