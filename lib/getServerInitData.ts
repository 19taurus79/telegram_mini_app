import { cookies } from "next/headers";
import { getInitData } from "./getInitData";

/**
 * Функція для Server Components
 * searchParams можна передати з page.tsx для підтримки першого входу за посиланням
 */
export async function getServerInitData(searchParams?: any): Promise<string> {
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";
  if (isDev) return getInitData();

  // 1. Пріоритет - параметри URL (для першого входу)
  if (searchParams) {
    const fromUrl = searchParams.initData || searchParams.tgWebAppInitData;
    if (fromUrl) return fromUrl;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get("tg_init_data")?.value || "";
  } catch {
    return "";
  }
}
