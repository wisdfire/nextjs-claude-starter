import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(서버 컴포넌트·라우트 핸들러·서버 액션)용 Supabase 클라이언트를 생성하는 함수
 *
 * Next.js 의 cookies() 를 통해 요청별 세션 쿠키를 읽고 쓴다.
 * 서버 컴포넌트에서는 쿠키 쓰기가 불가능하므로, 세션 갱신은 proxy.ts(미들웨어)에서 담당한다.
 *
 * @returns 요청 컨텍스트에 묶인 Supabase 서버 클라이언트 인스턴스
 */
export async function createClient() {
  // Next.js 15+ 부터 cookies() 는 비동기 함수이므로 await 로 받는다.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 현재 요청에 포함된 모든 쿠키를 반환 (세션 복원에 사용)
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase 가 갱신한 세션 쿠키를 응답에 기록
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 setAll 이 호출되면 예외가 발생할 수 있다.
            // proxy.ts 에서 세션을 갱신하고 있다면 이 예외는 무시해도 안전하다.
          }
        },
      },
    },
  );
}
