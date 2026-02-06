import { cookies } from "next/headers";
import { getInitData } from "./getInitData";

/**
 * Функція для Server Components
 */
export async function getServerInitData(): Promise<string> {
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";
  if (isDev) return getInitData();

  try {
    const cookieStore = await cookies();
    return cookieStore.get("tg_init_data")?.value || "";
  } catch {
    return "";
  }
}
