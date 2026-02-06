import { cookies } from "next/headers";

export function getInitData(): string {
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";
  
  if (isDev) {
    // Тестові дані для розробки
    return "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9";
  }

  if (typeof window === "undefined") return "";

  // 1. Спроба отримати з Telegram SDK
  const sdkData = window.Telegram?.WebApp?.initData;
  if (sdkData) {
    saveInitDataToCookie(sdkData);
    return sdkData;
  }

  // 2. Спроба отримати з URL (fallback для посилань поза Mini App)
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get("tgWebAppInitData") || urlParams.get("initData");
  if (fromUrl) {
    saveInitDataToCookie(fromUrl);
    return fromUrl;
  }

  // 3. Спроба отримати з Cookie (Session persistence)
  const fromCookie = getCookie("tg_init_data");
  if (fromCookie) {
    return fromCookie;
  }

  return "";
}

/**
 * Функція для Server Components
 */
export async function getServerInitData(): Promise<string> {
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";
  if (isDev) return getInitData();

  try {
    const cookieStore = await cookies();
    return cookieStore.get("tg_init_data")?.value || "";
  } catch (e) {
    return "";
  }
}

// Helpers for client-side cookies
function saveInitDataToCookie(data: string) {
  if (typeof document === "undefined") return;
  // Зберігаємо на 24 години (стандартний час життя initData)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `tg_init_data=${encodeURIComponent(data)}; path=/; expires=${expires}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
}
