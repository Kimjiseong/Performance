import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "스마트 견적 시스템",
  description: "스마트한 비용 산출 및 관리 시스템",
};

import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} font-sans antialiased bg-slate-50 text-slate-900 flex`}>
        <Sidebar />
        <div className="flex-1 ml-[260px] min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
