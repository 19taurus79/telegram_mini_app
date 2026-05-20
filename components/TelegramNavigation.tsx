"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Routes where the back button should be hidden.
// These are considered top-level "tab" screens.
const homeRoutes = [
  "/bi",
  "/orders",
  "/remains",
  "/events",
  "/tasks",
  "/map",
  "/delivery",
  "/av_stock",
];

export default function TelegramNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  // This effect sets up the back button's click handler once for the app's lifetime.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      return;
    }
    const handleBack = () => {
      router.back();
    };
    tg.BackButton.onClick(handleBack);

    // Отключаем свайп вниз для сворачивания (доступно в TG v7.7+)
    if (typeof tg.disableVerticalSwipes === "function") {
      tg.disableVerticalSwipes();
    }

    // Включаем подтверждение закрытия, чтобы свайпы назад не закрывали приложение случайно
    if (typeof tg.enableClosingConfirmation === "function") {
      tg.enableClosingConfirmation();
    }
  }, [router]);

  // This effect shows or hides the back button based on the current path.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      return;
    }
    // The root path '/' is always a home route.
    if (pathname === "/" || homeRoutes.includes(pathname)) {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
    }
  }, [pathname]);

  return null; // This is a logic-only component
}
