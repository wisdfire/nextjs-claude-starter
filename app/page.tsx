import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// 스타터킷에 포함된 핵심 기술 목록 (랜딩 카드에 표시)
const FEATURES = [
  {
    title: "Next.js 16 · App Router",
    description: "Server Components · Turbopack · proxy.ts 규약",
  },
  {
    title: "Tailwind CSS v4 · shadcn/ui",
    description: "base-nova 프리셋 · base-ui 프리미티브 · lucide 아이콘",
  },
  {
    title: "Supabase (@supabase/ssr)",
    description: "클라이언트/서버 분리 · 미들웨어 세션 갱신",
  },
  {
    title: "Vitest · Testing Library",
    description: "jsdom 환경 단위 테스트 · jest-dom 매처",
  },
  {
    title: "다크모드 · next-themes",
    description: "class 방식 테마 토글 · 시스템 설정 연동",
  },
  {
    title: "Vercel Analytics · Speed Insights",
    description: "방문 분석 · Core Web Vitals 계측",
  },
];

/**
 * 스타터킷 랜딩 페이지
 *
 * 포함된 기술 스택을 카드로 보여주고, 다크모드 토글과 시작 안내를 제공한다.
 * 클론 후 이 페이지를 요구사항에 맞게 교체하여 개발을 시작한다.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      {/* 헤더: 제목 + 다크모드 토글 */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Next.js Starter Kit
          </h1>
          <p className="text-muted-foreground max-w-xl text-base">
            클론 후 요구사항 문서를 넣고 바로 개발을 시작하기 위한 템플릿입니다.
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* 기술 스택 카드 그리드 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* 시작 안내 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>시작하기</CardTitle>
          <CardDescription>
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              .env.example
            </code>{" "}
            을{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              .env.local
            </code>{" "}
            로 복사하고 Supabase 키를 채운 뒤{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              npm run dev
            </code>{" "}
            를 실행하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* base-ui Button 은 asChild 대신 render prop 으로 다른 요소(<a>)를 합성한다 */}
          <Button
            render={
              <a
                href="https://github.com/wisdfire/next-js-starter-kit"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            저장소 보기
          </Button>
          <Button
            variant="outline"
            render={
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Next.js 문서
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
