import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Geist 산세리프 폰트 — 본문 기본 글꼴
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Geist Mono 폰트 — 코드/숫자 등 고정폭 글꼴
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next.js Starter Kit",
  description:
    "Next.js + Tailwind + shadcn/ui + Neon Postgres 빠른 시작 템플릿",
};

/**
 * 앱 전역 루트 레이아웃
 *
 * - ThemeProvider 로 다크모드 컨텍스트를 주입한다.
 * - suppressHydrationWarning: next-themes 가 <html> 클래스를 클라이언트에서 바꾸므로
 *   서버/클라이언트 마크업 불일치 경고를 의도적으로 무시한다.
 * - Toaster: sonner 토스트 알림 컨테이너.
 * - Analytics / SpeedInsights: Vercel 분석·성능 계측.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
