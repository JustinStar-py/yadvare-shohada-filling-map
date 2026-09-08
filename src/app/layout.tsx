import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const shabnam = localFont({
  src: [
    {
      path: "./fonts/Shabnam-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Shabnam.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Shabnam-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Shabnam-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-shabnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "پویش معنوی یادواره ۷۶ شهید شهیدیه میبد | هر صلوات، یک قدم تا پرواز",
  description: "پویش مردمی و مشارکتی گرامیداشت یادواره ۷۶ شهید والامقام شهیدیه میبد - ثبت صلوات روزانه و تکمیل پرواز معنوی",
  keywords: ["یادواره شهدا", "صلوات", "پویش معنوی", "شهدا", "شهیدیه میبد", "دفاع مقدس"],
  icons: {
    icon: [
      { url: "/images/shohada/Yadvarh Shohada Logo.webp", type: "image/webp" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${shabnam.variable} dark`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-[#090d16] text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
