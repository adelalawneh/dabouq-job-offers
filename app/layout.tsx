import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مولّد العروض الوظيفية | أدوات دابوق",
  description: "إنشاء وإرسال عروض العمل ضمن منصة أدوات دابوق",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${arabic.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
