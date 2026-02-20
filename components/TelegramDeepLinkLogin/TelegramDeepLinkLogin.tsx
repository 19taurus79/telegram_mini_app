"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { generateLoginToken, checkLoginToken } from "@/lib/api";

export default function TelegramDeepLinkLogin() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "waiting" | "loading">("idle");
  const [deepLink, setDeepLink] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    intervalRef.current = null;
    timerRef.current = null;
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleLogin = async () => {
    setState("loading");
    try {
      const { token: t, deep_link, expires_in } = await generateLoginToken();
      setToken(t);
      setDeepLink(deep_link);
      setTimeLeft(expires_in);
      setState("waiting");

      // Countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopPolling();
            setState("idle");
            toast.error("Час вийшов. Спробуйте ще раз.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling every 2 seconds
      intervalRef.current = setInterval(async () => {
        try {
          const result = await checkLoginToken(t);
          if (result.status === "confirmed" && result.init_data) {
            stopPolling();
            setState("loading");

            const expires = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem("tg_init_data", result.init_data);
            localStorage.setItem("tg_init_data_expires", expires.toString());

            const expiresDate = new Date(expires).toUTCString();
            document.cookie = `tg_init_data=${encodeURIComponent(result.init_data)}; path=/; expires=${expiresDate}; SameSite=Lax`;

            toast.success("Вхід виконано!");
            router.replace("/");
          } else if (
            result.status === "expired" ||
            result.status === "not_found"
          ) {
            stopPolling();
            setState("idle");
            toast.error("Час вийшов. Спробуйте ще раз.");
          } else if (result.status === "forbidden") {
            stopPolling();
            setState("idle");
            toast.error("Доступ заборонено. Зверніться до адміністратора.");
          }
        } catch {
          // Ignore polling errors, keep waiting
        }
      }, 2000);
    } catch {
      setState("idle");
      toast.error("Помилка сервера. Спробуйте пізніше.");
    }
  };

  const handleCancel = () => {
    stopPolling();
    setState("idle");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button onClick={handleLogin} style={styles.button}>
        <span style={styles.icon}>✈️</span> Войти через Telegram (бот)
      </button>
    );
  }

  if (state === "loading") {
    return <div style={styles.hint}>Завантаження...</div>;
  }

  return (
    <div style={styles.waiting}>
      <p style={styles.instruction}>
        Натисніть кнопку нижче, щоб відкрити Telegram і натисніть{" "}
        <b>Start</b> у боті:
      </p>
      <a href={deepLink} target="_blank" rel="noopener noreferrer" style={styles.tgButton}>
        📱 Відкрити Telegram
      </a>
      <p style={styles.hint}>
        Або перейдіть за посиланням на телефоні:
      </p>
      <code style={styles.link}>{deepLink}</code>
      <p style={styles.timer}>
        ⏳ Очікування підтвердження... {formatTime(timeLeft)}
      </p>
      <button onClick={handleCancel} style={styles.cancel}>
        Скасувати
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    marginTop: "12px",
    padding: "10px 20px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    color: "#aaa",
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  waiting: {
    marginTop: "16px",
    padding: "16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    textAlign: "center" as const,
    fontSize: "14px",
    color: "#ccc",
  },
  instruction: {
    marginBottom: "12px",
    color: "#ddd",
  },
  tgButton: {
    display: "inline-block",
    padding: "10px 20px",
    background: "#2AABEE",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  hint: {
    fontSize: "12px",
    color: "#888",
    marginTop: "8px",
  },
  link: {
    display: "block",
    fontSize: "11px",
    color: "#888",
    wordBreak: "break-all" as const,
    margin: "4px 0 12px",
    padding: "6px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "6px",
  },
  timer: {
    fontSize: "13px",
    color: "#aaa",
    margin: "8px 0",
  },
  cancel: {
    background: "transparent",
    border: "none",
    color: "#888",
    fontSize: "12px",
    cursor: "pointer",
    textDecoration: "underline",
    marginTop: "4px",
  },
};
