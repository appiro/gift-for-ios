import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PushNotificationInit from "@/components/PushNotificationInit";
import { SearchProvider } from "@/components/SearchProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gift for | 失敗しない成功体験を共有",
  description: "実体験に基づいた「成功したギフト体験」を可視化・共有するサービスです。先輩からの知恵でギフト選びの迷いを無くします。",
  // PWA
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gift for",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: "https://giftfor.info",
    title: "Gift for",
    description: "実体験に基づいた「成功したギフト体験」を可視化・共有するサービス",
    images: [{ url: "https://giftfor.info/icons/icon-512.png" }],
  },
  twitter: {
    card: "summary",
    title: "Gift for",
    description: "実体験に基づいた「成功したギフト体験」を可視化・共有するサービス",
    images: ["https://giftfor.info/icons/icon-512.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#FFB6B9",
    "msapplication-TileImage": "/icons/icon-144.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFB6B9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SearchProvider>
          <Header />
          <main className="flex flex-col flex-1 w-full mx-auto px-2 sm:px-6 mt-1 sm:mt-4 max-w-[1400px] pb-24 md:pb-6">
            {children}
          </main>
          <Footer />
          <MobileNav />
          <ServiceWorkerRegister />
          <PushNotificationInit />
        </SearchProvider>
      </body>
    </html>
  );
}
