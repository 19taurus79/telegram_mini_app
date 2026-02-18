interface TelegramWebAppBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
}

interface TelegramWebApp {
  initData?: string;
  close: () => void;
  BackButton: TelegramWebAppBackButton;
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
