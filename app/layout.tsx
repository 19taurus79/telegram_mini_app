import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header/Header";
import TanStackProvider from "@/components/TanStackProvider/TanStackProvider";
import { FilterProvider } from "@/context/FilterContext";
import { ScrollToTopButton } from "@/components/ScrollToTopButton/ScrollToTopButton";
import { DeliveryProvider } from "@/context/DeliveryContext";
import Script from "next/script";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast"; // Import Toaster
import TelegramRouter from "@/components/TelegramRouter/TelegramRouter";
import TelegramNavigation from "../components/TelegramNavigation";
import AuthGuard from "@/components/AuthGuard/AuthGuard";
import ThemeProvider from "@/components/ThemeProvider/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bot",
  description: "Bot for Kharkiv subdivision Eridon",
};

export default function RootLayout({
  children,
  // modal,
}: Readonly<{
  children: React.ReactNode;
  // modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?58"
          strategy="beforeInteractive"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('theme-storage');
                if (theme) {
                  theme = JSON.parse(theme).state.theme;
                }
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else if (theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TanStackProvider>
          <FilterProvider>
            <DeliveryProvider>
              <AuthGuard />
              <ThemeProvider />
              <Header />
              <TelegramRouter />
              <TelegramNavigation />
              {children}
              {/* {modal} */}
              <ScrollToTopButton />
            </DeliveryProvider>
          </FilterProvider>
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          <Toaster 
            containerStyle={{
              zIndex: 10001,
            }}
          /> {/* Add Toaster component here */}
        </TanStackProvider>
      </body>
    </html>
  );
}
