interface TelegramWebApp {
  initData?: string;
  close: () => void;
  // Добавьте другие свойства, если нужно
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
