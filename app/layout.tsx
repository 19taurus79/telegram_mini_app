import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Header from "@/components/Header/Header";
import TanStackProvider from "@/components/TanStackProvider/TanStackProvider";
import { FilterProvider } from "@/context/FilterContext";
import { ScrollToTopButton } from "@/components/ScrollToTopButton/ScrollToTopButton";
import { DeliveryProvider } from "@/context/DeliveryContext";
import Script from "next/script";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?58"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <TanStackProvider>
          <FilterProvider>
            <DeliveryProvider>
              <Header />
              {children}
              {/* {modal} */}
              <ScrollToTopButton />
            </DeliveryProvider>
          </FilterProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </TanStackProvider>
      </body>
    </html>
  );
}
