import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 프록시(구 미들웨어) 진입점
 *
 * 주의: Next.js 16 부터 `middleware.ts` 규약이 루트 `proxy.ts` 로 변경되었다.
 * (`export function proxy()` + `export const config`)
 *
 * 매 요청마다 Supabase 세션을 갱신해 만료 직전 토큰을 자동 리프레시한다.
 *
 * @param request - 들어온 Next.js 요청 객체
 * @returns 세션 쿠키가 갱신된 응답
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /**
   * matcher: 미들웨어를 실행할 경로 패턴.
   * 정적 파일·이미지·파비콘 등은 세션 갱신이 불필요하므로 제외한다.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
