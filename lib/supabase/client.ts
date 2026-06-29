import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트를 생성하는 함수
 *
 * 클라이언트 컴포넌트에서 호출하며, 세션은 쿠키 기반으로 자동 관리된다.
 * 환경 변수(NEXT_PUBLIC_*)는 브라우저 번들에 포함되므로 anon/publishable 키만 사용한다.
 *
 * @returns 브라우저 환경에서 동작하는 Supabase 클라이언트 인스턴스
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
