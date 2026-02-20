"use client";

import { useState, useEffect, useRef } from "react";

import toast from "react-hot-toast";
import { generateLoginToken, checkLoginToken } from "@/lib/api";

const TelegramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.29 13.67l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.858.889z"/>
  </svg>
);

export default function TelegramDeepLinkLogin() {
  const [state, setState] = useState<"idle" | "waiting" | "loading">("idle");
  const [deepLink, setDeepLink] = useState<string>("");
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
            window.location.replace("/");
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
        <TelegramIcon />
        Увійти через Telegram
      </button>
    );
  }

  if (state === "loading") {
    return (
      <button style={{ ...styles.button, opacity: 0.7, cursor: "default" }} disabled>
        <TelegramIcon />
        Завантаження...
      </button>
    );
  }

  return (
    <div style={styles.waiting}>
      <p style={styles.instruction}>
        Відкрийте Telegram і натисніть <b>Start</b> у боті:
      </p>
      <a href={deepLink} target="_blank" rel="noopener noreferrer" style={styles.tgButton}>
        <TelegramIcon />
        Відкрити Telegram
      </a>
      <details style={styles.details}>
        <summary style={styles.summary}>Посилання для копіювання</summary>
        <code style={styles.link}>{deepLink}</code>
      </details>
      <p style={styles.timer}>⏳ {formatTime(timeLeft)}</p>
      <button onClick={handleCancel} style={styles.cancel}>
        Скасувати
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 20px",
    background: "#54a9eb",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.2s",
  },
  waiting: {
    marginTop: "4px",
    padding: "16px",
    background: "rgba(84,169,235,0.08)",
    border: "1px solid rgba(84,169,235,0.25)",
    borderRadius: "6px",
    textAlign: "center" as const,
    fontSize: "14px",
    color: "#ccc",
  },
  instruction: {
    marginBottom: "12px",
    color: "#ddd",
    lineHeight: 1.5,
  },
  tgButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "#54a9eb",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "4px",
    fontWeight: 500,
    fontSize: "15px",
    marginBottom: "12px",
  },
  details: {
    textAlign: "left" as const,
    marginTop: "8px",
  },
  summary: {
    fontSize: "12px",
    color: "#888",
    cursor: "pointer",
    marginBottom: "4px",
  },
  link: {
    display: "block",
    fontSize: "11px",
    color: "#888",
    wordBreak: "break-all" as const,
    padding: "6px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "4px",
  },
  timer: {
    fontSize: "13px",
    color: "#aaa",
    margin: "10px 0 4px",
  },
  cancel: {
    background: "transparent",
    border: "none",
    color: "#888",
    fontSize: "12px",
    cursor: "pointer",
    textDecoration: "underline",
  },
};
