import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 매 요청마다 Supabase 세션을 갱신하는 헬퍼 함수
 *
 * 서버 컴포넌트는 쿠키를 쓸 수 없으므로, 만료 직전 토큰 갱신은 미들웨어(proxy)에서 수행한다.
 * 데이터 흐름: 요청 쿠키 읽기 → getUser()로 세션 검증/갱신 → 갱신된 쿠키를 응답에 기록.
 *
 * @param request - 들어온 Next.js 요청 객체
 * @returns 갱신된 세션 쿠키가 포함된 NextResponse
 */
export async function updateSession(request: NextRequest) {
  // 기본 응답 생성 (이후 setAll 에서 쿠키를 덧붙인다)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 요청에 포함된 모든 쿠키 반환 (세션 복원)
        getAll() {
          return request.cookies.getAll();
        },
        // 갱신된 세션 쿠키를 요청·응답 양쪽에 기록
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 중요: createServerClient 와 getUser() 사이에 다른 로직을 넣지 말 것.
  // 세션 갱신 타이밍이 어긋나 사용자가 무작위로 로그아웃될 수 있다.
  await supabase.auth.getUser();

  return supabaseResponse;
}
