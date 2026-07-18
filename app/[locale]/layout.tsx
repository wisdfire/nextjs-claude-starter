import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

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

/**
 * 지원 로케일 목록을 빌드 시점에 정적 생성한다.
 *
 * 이게 없으면 모든 페이지가 요청 시 동적 렌더링돼 성능(Lighthouse)이 떨어진다.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 로케일별 메타데이터 생성
 *
 * - title/description: 해당 언어의 messages 에서 읽어 언어에 맞게 노출한다.
 * - alternates.languages: 언어별 대체 URL(hreflang). 검색엔진이 같은 문서의
 *   다른 언어 버전임을 알아야 중복 콘텐츠로 판정하지 않는다 —
 *   애드센스 심사에서 저가치·복제 콘텐츠 리스크를 없애는 핵심 장치다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    // 상대 경로 메타데이터(canonical·hreflang·OG)를 절대 URL로 바꾸는 기준 도메인.
    // 구글은 hreflang에 절대 URL을 요구하므로 이 값이 없으면 무시될 수 있다.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: t("title"),
    description: t("description"),
    alternates: {
      // 기본 로케일(ko)은 접두사가 없고, 나머지는 /<locale> 접두사를 가진다
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: {
        ko: "/",
        en: "/en",
      },
    },
  };
}

/**
 * 로케일 루트 레이아웃
 *
 * 처리 흐름:
 *   1. URL의 [locale] 값을 읽어 지원 목록에 있는지 검증한다 → 없으면 404
 *      (검증을 빼면 /xx 같은 임의 경로가 빈 페이지로 렌더돼 애드센스 저가치 화면이 된다)
 *   2. setRequestLocale 로 현재 요청의 로케일을 고정해 정적 렌더링을 활성화한다
 *   3. <html lang>에 실제 로케일을 넣는다 — 스크린리더·검색엔진이 언어를 인식하는 근거
 *   4. NextIntlClientProvider 로 클라이언트 컴포넌트에도 번역 메시지를 전달한다
 *
 * - suppressHydrationWarning: next-themes 가 <html> 클래스를 클라이언트에서 바꾸므로
 *   서버/클라이언트 마크업 불일치 경고를 의도적으로 무시한다.
 * - Toaster: sonner 토스트 알림 컨테이너.
 * - Analytics / SpeedInsights: Vercel 분석·성능 계측.
 */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // 지원하지 않는 로케일 경로는 404로 처리한다 (빈 화면 노출 방지)
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // 정적 렌더링 활성화 — 이 호출이 없으면 페이지가 동적 렌더링으로 강등된다
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
