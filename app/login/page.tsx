"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/Auth";
import { loginWithWidget, getUser } from "@/lib/api";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const TelegramLoginWidget = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    if (!botName) return;

    // Глобальная функция должна быть доступна СРАЗУ
    window.onTelegramAuth = async (user: TelegramUser) => {
      console.log("!!! TELEGRAM CALLBACK !!!", user);
      const tid = toast.loading("Спроба входу...");
      
      try {
        const res = await loginWithWidget(user);
        console.log("Server response:", res);
        if (res?.access_token) {
          setUser(res.user, res.access_token);
          toast.success("Ви увійшли!", { id: tid });
          setTimeout(() => window.location.href = '/', 500);
        } else {
          toast.error("Сервер не повернув токен", { id: tid });
        }
      } catch (e: unknown) {
        console.error("Login call failed", e);
        const errorMessage = e instanceof Error ? e.message : "Undefined error";
        toast.error(`Помилка API: ${errorMessage}`, { id: tid });
      }
    };

    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth");
    script.setAttribute("data-request-access", "write");
    if (widgetRef.current) {
        widgetRef.current.appendChild(script);
    }
    }
  }, [setUser]);

  const testApi = async () => {
    const tid = toast.loading("Перевірка зв'язку з API...");
    try {
      // Простой запрос к getUser (он упадет с 401, если всё ок, или с CORS/Network, если нет)
      await getUser();
      toast.success("API доступний (ви вже в системі?)", { id: tid });
    } catch (e: unknown) {
      const error: any = e;
      if (error.response?.status === 401) {
        toast.success("Зв'язок з API є (вимагає авторизації)", { id: tid });
      } else {
        const msg = error.message || "Unknown connectivity error";
        toast.error(`API недоступний: ${msg}. Можливо, CORS?`, { id: tid });
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <div ref={widgetRef} style={{ minHeight: '40px' }}></div>
      <button 
        onClick={testApi}
        style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #0088cc', background: 'transparent', color: '#0088cc', cursor: 'pointer', fontSize: '12px' }}
      >
        Перевірити зв'язок з сервером (API)
      </button>
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

        {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && process.env.NEXT_PUBLIC_URL_API?.includes('127.0.0.1') && (
          <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '8px', marginTop: '20px', border: '1px solid #ffeeba' }}>
            <strong>⚠️ Увага!</strong> Ви на домені <code>{window.location.hostname}</code>, але ваша API налаштована на <code>{process.env.NEXT_PUBLIC_URL_API}</code>.
            Запити до локальної API не працюватимуть з віддаленого сервера. Перевірте змінні в панелі Vercel.
          </div>
        )}

        <div style={{ marginTop: '30px', textAlign: 'left', fontSize: '13px', lineHeight: '1.6', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>🏁 Діагностика (перевірте ці пункти):</h3>
          
          <ul style={{ paddingLeft: '20px', color: '#555' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>API URL:</strong> <code style={{ backgroundColor: '#f4f4f4', padding: '2px 5px', borderRadius: '4px' }}>{process.env.NEXT_PUBLIC_URL_API}</code>
            </li>
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
