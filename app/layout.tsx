import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header/Header";
import TanStackProvider from "@/components/TanStackProvider/TanStackProvider";
import { FilterProvider } from "@/context/FilterContext";
import { ScrollToTopButton } from "@/components/ScrollToTopButton/ScrollToTopButton";
import { DeliveryProvider } from "@/context/DeliveryContext";
import Script from "next/script";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard"; // Импортируем AuthGuard

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?58"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TanStackProvider>
          <FilterProvider>
            <DeliveryProvider>
              <AuthGuard>
                <Header />
                {children}
                <ScrollToTopButton />
              </AuthGuard>
            </DeliveryProvider>
          </FilterProvider>
          <ReactQueryDevtools initialIsOpen={false} />
          <Toaster 
            containerStyle={{
              zIndex: 10001,
            }}
          />
        </TanStackProvider>
      </body>
    </html>
  );
}
