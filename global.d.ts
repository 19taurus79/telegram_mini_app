interface TelegramWebApp {
  initData?: string;
  close: () => void;
  ready: () => void;
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
