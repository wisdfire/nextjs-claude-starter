"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * 다크모드 테마 제공자 컴포넌트
 *
 * next-themes 의 ThemeProvider 를 감싸 앱 전체에 테마 컨텍스트를 제공한다.
 * `attribute="class"` 방식으로 <html> 에 `dark` 클래스를 토글하여 Tailwind 다크모드와 연동한다.
 *
 * @param children - 테마 컨텍스트를 적용할 하위 컴포넌트
 * @param props - next-themes ThemeProvider 가 받는 나머지 속성
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
