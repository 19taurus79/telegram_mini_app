"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getInitData } from "@/lib/getInitData";

// Сторінки доступні без авторизації
const PUBLIC_PATHS = ["/login"];

export default function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // В режимі DEV — нічого не робимо
    if (process.env.NEXT_PUBLIC_DEV === "true") return;

    // Якщо ми вже на публічній сторінці — нічого не робимо
    if (PUBLIC_PATHS.includes(pathname)) return;

    // Перевіряємо чи є MiniApp
    const isMiniApp = Boolean(
      typeof window !== "undefined" && window.Telegram?.WebApp?.initData
    );
    if (isMiniApp) return;

    // Перевіряємо наявність initData (localStorage / cookie)
    const initData = getInitData();
    if (!initData) {
      router.replace("/login");
    }
  }, [pathname, router]);

  return null;
}
