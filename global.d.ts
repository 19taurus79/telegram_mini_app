interface TelegramWebApp {
  initData?: string;
  // Добавьте другие свойства, если нужно
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
