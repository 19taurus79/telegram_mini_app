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

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css';
