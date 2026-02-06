"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInitData } from "@/lib/useInitData";

export default function TelegramRouter() {
  const router = useRouter();
  const initData = useInitData();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Отримуємо Telegram SDK
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // Deep Linking: Обробка параметра startapp
    // Формат посилання: https://t.me/bot_name/app_name?startapp=contract_id
    const startParam = tg.initDataUnsafe?.start_param;

    if (startParam) {
      console.log("Deep link detected, startParam:", startParam);
      
      // Якщо параметр містить префікс contract_ або просто ID
      const contractId = startParam.replace("contract_", "");
      
      if (contractId) {
        // Використовуємо replace, щоб не засмічувати історію переходів
        router.replace(`/detail/${contractId}?openChat=true`);
      }
    }
  }, [router]);

  // Цей компонент нічого не рендерить, він лише керує навігацією
  return null;
}
