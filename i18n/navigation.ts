import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * 로케일을 자동으로 인식하는 내비게이션 API
 *
 * next/link·next/navigation 대신 **반드시 여기서 export한 것을 쓴다.**
 * 이유: 이 API들은 현재 로케일을 읽어 경로에 접두사를 자동으로 붙인다.
 * 영어(/en)에서 next/link의 <Link href="/about">를 쓰면 접두사가 빠져
 * 한국어 페이지로 튕기거나 404가 난다.
 *
 * - Link: 로케일 접두사가 자동 적용되는 링크 컴포넌트
 * - redirect: 서버에서 로케일을 유지한 채 리다이렉트
 * - usePathname: 로케일 접두사를 **제거한** 순수 경로를 반환 (언어 전환에 사용)
 * - useRouter: router.replace(pathname, { locale }) 로 언어 전환 가능
 * - getPathname: 특정 로케일 기준의 실제 URL 문자열 생성 (sitemap·hreflang용)
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
