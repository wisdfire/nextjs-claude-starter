"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * 언어 선택 드롭다운 컴포넌트
 *
 * 현재 보고 있는 화면을 유지한 채 언어만 바꾼다.
 *
 * 동작 흐름:
 *   1. useLocale 로 현재 로케일을 읽어 라디오 항목의 선택 상태로 표시한다.
 *   2. 사용자가 다른 언어를 고르면 onSelect 가 실행된다.
 *   3. i18n/navigation 의 usePathname 은 **로케일 접두사를 뺀** 경로를 준다.
 *      (예: /en/about 에서 "/about") 그래서 같은 경로를 다른 로케일로
 *      다시 요청하면 같은 화면의 번역판으로 이동한다.
 *   4. router.replace(pathname, { locale }) 로 이동한다.
 *      - push 가 아니라 replace 인 이유: 언어 전환은 새로운 방문 지점이 아니라
 *        같은 화면의 표현 변경이므로, 뒤로가기 시 이전 언어로 되돌아가는
 *        히스토리 오염을 만들지 않는다.
 *      - next-intl 이 선택한 언어를 NEXT_LOCALE 쿠키에 저장해 다음 방문에도 유지된다.
 *   5. useTransition 으로 이동이 끝날 때까지 버튼을 비활성화해
 *      전환 중 중복 클릭을 막는다.
 *
 * 쿼리스트링(?q=...)은 렌더 중이 아니라 클릭 시점에 window.location.search 로 읽어
 * 그대로 이어붙인다. useSearchParams 를 쓰면 정적 렌더링이 해제되기 때문이다.
 *
 * @returns 언어 선택 아이콘 버튼과 드롭다운 메뉴
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // 선택한 언어로 현재 경로를 다시 요청한다 (쿼리스트링 유지)
  const handleChange = (nextLocale: string) => {
    if (nextLocale === locale) return;

    startTransition(() => {
      const search =
        typeof window === "undefined" ? "" : window.location.search;
      router.replace(`${pathname}${search}`, {
        locale: nextLocale as AppLocale,
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("label")}
            disabled={isPending}
          >
            <Languages className="h-5 w-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {routing.locales.map((item) => (
            <DropdownMenuRadioItem key={item} value={item}>
              {t(item)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
