import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

// 랜딩 카드에 표시할 기술 목록의 번역 키. 실제 문구는 messages/<locale>.json 에 있다
const FEATURE_KEYS = ["next", "ui", "db", "test", "theme", "i18n"] as const;

/**
 * 스타터킷 랜딩 페이지
 *
 * 포함된 기술 스택을 카드로 보여주고, 언어·다크모드 전환과 시작 안내를 제공한다.
 * 모든 문구는 useTranslations 로 messages/<locale>.json 에서 읽는다 —
 * 화면에 한국어를 하드코딩하면 영어 전환 시 그대로 남는다.
 * 클론 후 이 페이지를 요구사항에 맞게 교체하여 개발을 시작한다.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 정적 렌더링 활성화 (레이아웃과 마찬가지로 페이지에서도 호출해야 한다)
  setRequestLocale(locale);

  return <HomeContent />;
}

/**
 * 랜딩 페이지 본문
 *
 * useTranslations 는 훅이라 async 컴포넌트에서 직접 호출할 수 없으므로,
 * 로케일을 고정한 뒤 동기 컴포넌트로 분리해 호출한다.
 */
function HomeContent() {
  const t = useTranslations("Home");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      {/* 헤더: 제목 + 언어 선택 + 다크모드 토글 */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-base">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* 기술 스택 카드 그리드 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-lg">
                {t(`features.${key}.title`)}
              </CardTitle>
              <CardDescription>
                {t(`features.${key}.description`)}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* 시작 안내 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("getStarted.title")}</CardTitle>
          <CardDescription>
            {/*
              번역문 안의 <code>…</code> 태그를 실제 <code> 요소로 렌더한다.
              문구와 마크업을 함께 번역 파일에 두면 언어마다 단어 순서가 달라도
              강조 위치가 정확히 따라온다(영어는 명령어가 문장 끝에 온다).
              chunks 에는 태그 사이의 텍스트가 들어온다.
            */}
            {t.rich("getStarted.description", {
              code: (chunks) => (
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
                  {chunks}
                </code>
              ),
            })}
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
            {t("getStarted.repo")}
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
            {t("getStarted.docs")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
