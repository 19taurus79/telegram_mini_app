"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { loginWithTelegramWidget } from "@/lib/api";
import { TelegramWidgetUser } from "@/types/types";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

export default function TelegramLoginWidget() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      setIsLoading(true);
      const toastId = toast.loading("Авторизація...");
      try {
        const { init_data } = await loginWithTelegramWidget(user);

        // Зберігаємо в ті самі ключі що використовує getInitData.ts
        const expires = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem("tg_init_data", init_data);
        localStorage.setItem("tg_init_data_expires", expires.toString());

        const expiresDate = new Date(expires).toUTCString();
        document.cookie = `tg_init_data=${encodeURIComponent(init_data)}; path=/; expires=${expiresDate}; SameSite=Lax`;

        toast.success("Вхід виконано!", { id: toastId });
        console.log("[Widget] init_data saved, length:", init_data?.length, "| first 80:", init_data?.slice(0, 80));
        console.log("[Widget] localStorage check:", localStorage.getItem("tg_init_data")?.slice(0, 40));
        router.replace("/");
      } catch (err) {
        console.error("Widget auth error:", err);
        toast.error("Помилка авторизації. Спробуйте ще раз.", { id: toastId });
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    if (!botName) {
      toast.error("Bot name не налаштовано");
      return;
    }

    // Реєструємо глобальний callback до вставки скрипту
    window.onTelegramAuth = handleAuth;

    // Вставляємо скрипт Telegram Widget
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
      container.innerHTML = "";
    };
  }, [handleAuth]);

  return (
    <div>
      {isLoading ? (
        <div style={{ padding: "12px", color: "#888", fontSize: "14px" }}>
          Виконується вхід...
        </div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  );
}
