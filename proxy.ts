import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * 로케일 라우팅 프록시 (Next.js 16에서 middleware.ts → proxy.ts 로 명칭 변경됨)
 *
 * 매 요청마다 실행되며 다음을 처리한다:
 *   - URL의 로케일 접두사를 해석해 [locale] 세그먼트로 연결한다
 *     (localePrefix "as-needed" 이므로 /about → ko, /en/about → en)
 *   - 접두사가 없는 요청은 쿠키(NEXT_LOCALE) → Accept-Language 헤더 순으로
 *     사용자 선호 언어를 추론하고, 기본 로케일(ko)로 폴백한다
 *   - 언어를 전환하면 선택값을 NEXT_LOCALE 쿠키에 저장해 다음 방문에 유지한다
 */
export default createMiddleware(routing);

export const config = {
  /**
   * 프록시를 적용할 경로.
   *
   * 다음은 **제외**한다 — 로케일 처리가 필요 없는데 매 요청 지연만 늘리기 때문:
   *   - /api, /trpc      : API 라우트 (로케일 접두사를 붙이면 엔드포인트가 깨진다)
   *   - /_next, /_vercel : 프레임워크·플랫폼 내부 경로
   *   - 점(.)이 포함된 경로 : favicon.ico·robots.txt·이미지 등 정적 파일
   */
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
