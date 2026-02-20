import TelegramLoginWidget from "@/components/TelegramLoginWidget/TelegramLoginWidget";
import TelegramDeepLinkLogin from "@/components/TelegramDeepLinkLogin/TelegramDeepLinkLogin";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🌾</div>
        <h1 className={styles.title}>Eridon Харків</h1>
        <p className={styles.subtitle}>
          Увійдіть через Telegram для доступу до додатку
        </p>
        <div className={styles.widgetWrapper}>
          <TelegramLoginWidget />
        </div>
        <div className={styles.widgetWrapper}>
          <TelegramDeepLinkLogin />
        </div>
        <p className={styles.hint}>
          Доступ надається лише авторизованим користувачам
        </p>
      </div>
    </div>
  );
}
