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
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  isVerticalSwipesEnabled?: boolean;
  isClosingConfirmationEnabled?: boolean;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
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
