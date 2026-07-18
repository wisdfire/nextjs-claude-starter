"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * 라이트/다크 모드 전환 버튼 컴포넌트
 *
 * next-themes 의 useTheme 훅으로 현재 테마를 읽고 토글한다.
 * 해/달 아이콘은 CSS 트랜지션으로 부드럽게 교차 표시한다.
 *
 * 아이콘만 있는 버튼이라 화면에 보이는 글자가 없으므로, 스크린리더용
 * aria-label 을 번역 파일에서 읽는다 — 여기에 한국어를 하드코딩하면
 * 영어 화면에서도 한국어 레이블이 그대로 읽힌다.
 *
 * @returns 테마 전환 아이콘 버튼
 */
export function ThemeToggle() {
  const t = useTranslations("ThemeToggle");
  const { setTheme, resolvedTheme } = useTheme();

  // 현재 테마의 반대값으로 전환 (light ↔ dark)
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={t("label")}
    >
      {/* 라이트 모드일 때 해, 다크 모드일 때 달 아이콘 표시 */}
      <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
