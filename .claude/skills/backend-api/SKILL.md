---
name: backend-api
description: "API route·서버 액션·Supabase 연동·Drizzle 스키마를 구현할 때 사용한다. 데이터 모델링, 엔드포인트 작성, 인증/RLS, 마이그레이션, 그리고 응답 shape을 프론트 훅과 계약으로 관리해야 하는 백엔드 구현 순간에 반드시 켠다."
---

# Backend API — Route + Supabase + Drizzle

화면이 요구하는 데이터를 서버에서 구현하고, **응답 shape을 프론트와의 계약으로 명시**한다. 계약이 흐릿하면 프론트 훅 타입과 어긋나 런타임에서 깨진다.

## 왜 계약(contract-first)인가

`fetchJson<T>()` 같은 제네릭은 런타임 응답이 타입과 달라도 컴파일을 통과한다. 그래서 `npm run build` 성공이 정상 동작을 보장하지 못한다. 응답 shape을 **문서로 고정**하고 프론트가 그대로 따르게 해야 경계면 버그를 예방한다.

## 응답 계약 관리 (핵심)

모든 엔드포인트를 `_workspace/04_api_contract.md`에 기록한다. 이것이 프론트 훅 타입의 SSOT다.

```markdown
### GET /api/posts
- 요청: 쿼리 `?page=1`
- 응답(200): { items: Post[], total: number, page: number }
  - Post = { id: string, title: string, createdAt: string /* ISO */ }
- 래핑: items로 감쌈 → 훅에서 `.items` unwrap 필요
- 케이스: camelCase (DB의 created_at → API에서 createdAt으로 변환)
```

계약 작성 규칙:

- **래핑 여부를 명시한다**: 배열을 바로 주는지 `{ items: [] }`로 감싸는지. 프론트가 unwrap해야 하는지 한 줄로 적는다.
- **필드 케이스를 명시한다**: DB는 snake_case여도 API 응답은 하나의 케이스로 통일하고(보통 camelCase), 변환 지점을 밝힌다. 한 엔드포인트 안에서 케이스를 섞지 않는다.
- **상태코드와 shape의 관계**: 즉시 응답(202)과 최종 결과의 shape이 다르면 각각 적는다. 프론트가 즉시 응답에서 최종 결과 필드에 접근하면 크래시한다.
- **shape을 바꾸면 즉시 프론트에 통지한다**: 계약은 양 당사자의 합의물이다.

## API Route 구현

- 위치: `app/api/**/route.ts`. HTTP 메서드별로 `export async function GET/POST/...`.
- 반환: `NextResponse.json(data, { status })`. `data`의 shape을 계약과 일치시킨다.
- 작성 전 `node_modules/next/dist/docs/`의 route handler 문서를 확인한다. Next.js 16 breaking change 주의. 불확실하면 Context7 MCP로 조회하고 지어내지 않는다.
- 에러는 일관된 shape으로 반환한다(예: `{ error: string }` + 4xx/5xx). 프론트가 분기할 수 있게 계약에 적는다.

## Supabase 연동

- **서버(route/서버 컴포넌트/서버 액션)**: `lib/supabase/server.ts`의 `createClient()`(async). 쿠키 기반 세션을 읽는다.
- **클라이언트**: `lib/supabase/client.ts`.
- **미들웨어(세션 갱신)**: `lib/supabase/middleware.ts` 헬퍼를 `proxy.ts`에서 사용(Next.js 16은 `middleware.ts`가 아니라 `proxy.ts`).
- 인증이 필요한 엔드포인트는 `supabase.auth.getUser()`로 검증하고, 데이터 접근은 RLS 정책을 신뢰하되 서버에서도 소유권을 확인한다.

## Drizzle 스키마 & 마이그레이션

- 스키마: `lib/db/schema.ts`. 클라이언트: `lib/db/index.ts`.
- 변경 흐름: 스키마 수정 → `npm run db:generate`(마이그레이션 SQL 생성) → `npm run db:migrate`(적용). 개발 중 빠른 반영은 `npm run db:push`.
- DB 필드명(snake_case 허용)과 API 응답 필드명의 매핑 규칙을 정하고 계약에 명시한다.
- 직접 SQL을 짜기 전에 Drizzle 쿼리 빌더 기능을 먼저 쓴다. 날짜는 `date-fns`.

## 서버 액션

- 폼 제출 등은 서버 액션으로 구현할 수 있다. 반환 shape도 계약에 기록한다(프론트가 결과를 분기하므로).
- `"use server"` 지시와 재검증(revalidate) 패턴은 Next.js 16 문서를 확인한다.

## 엔드포인트 ↔ 훅 커버리지

- 새 엔드포인트를 만들면 프론트가 호출할 훅이 있는지 확인한다. **호출되지 않는 엔드포인트는 계약에 "호출 예정/미사용"으로 표시**하여 QA가 누락인지 의도인지 판단하게 한다.

## 단위 테스트 (Vitest) — 응답 shape을 계약으로 고정

API route 핸들러·서버 액션 로직을 구현하면 **같은 단계에서 Vitest 단위 테스트를 함께 작성**한다. 핵심 목적은 **응답 shape이 `04_api_contract.md` 계약과 일치하는지 테스트로 봉인**하는 것이다. 이유: 경계면(응답 shape ↔ 프론트 훅 타입)이 조용히 어긋나면 `npm run build`는 통과해도 런타임에서 깨진다. 계약을 테스트로 고정하면 shape이 바뀔 때 테스트가 즉시 실패해 프론트 훅과의 불일치를 막는다.

- **테스트 파일 위치**: 소스 옆 `__tests__/` 또는 `*.test.ts`. 예: `app/api/posts/route.ts` → `app/api/posts/__tests__/route.test.ts`. `npm run test`로 실행하며 설정은 `vitest.config.ts`(`globals: true`라 import 없이 `describe/it/expect`, `@/*` 별칭 동작).
- **Supabase 클라이언트는 모킹**한다: 실제 DB 없이 로직만 검증하기 위해 `vi.mock("@/lib/supabase/server")`로 `createClient()`를 스텁하고, `.from().select()` 등이 고정 데이터를 반환하도록 체이너를 목으로 구성한다. 네트워크·DB에 의존하지 않게 한다.
- **응답 shape 계약 고정 테스트**: 핸들러(또는 서버 액션)를 호출해 반환된 응답 본문의 **키·래핑·필드 케이스**가 계약과 정확히 일치하는지 단언한다.
  ```ts
  import { vi, describe, it, expect } from "vitest";

  // Supabase 서버 클라이언트를 모킹해 DB 없이 핸들러 로직만 검증
  vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      from: () => ({
        select: () => ({ data: [{ id: "1", created_at: "2026-01-01T00:00:00Z" }], error: null }),
      }),
    }),
  }));

  import { GET } from "../route";

  it("응답이 계약 shape과 일치한다(items 래핑 + camelCase)", async () => {
    const res = await GET(new Request("http://test/api/posts?page=1"));
    const body = await res.json();
    // 계약: { items: Post[], total, page }, Post.createdAt(camel)로 변환됨
    expect(res.status).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]).toHaveProperty("createdAt"); // created_at → createdAt 변환 고정
    expect(body).toHaveProperty("total");
  });
  ```
- **에러 경로도 테스트**한다: 인증 실패·검증 실패 시 계약에 적은 에러 shape(`{ error: string }`)과 상태코드(4xx/5xx)를 단언한다.
- 계약을 바꾸면 **테스트와 `04_api_contract.md`를 함께 갱신**하고 프론트에 통지한다. 테스트가 계약의 실행 가능한 사본 역할을 한다.

## 코드 규칙

- 요청 → 처리 → 결과 반영의 데이터 흐름을 단계별 한국어 주석으로 설명한다.
- 최소·외과적 변경(`karpathy-guidelines`). 미사용 코드를 남기지 않는다.

## 산출물

- 코드: `app/api/**/route.ts`, 서버 액션, `lib/db/schema.ts`, 마이그레이션.
- 테스트: 소스 옆 `__tests__/` 또는 `*.test.ts`(응답 shape 계약 고정). `npm run test` 통과 필수.
- `_workspace/04_api_contract.md`: 엔드포인트별 메서드·경로·요청·**응답 shape**·상태코드·래핑·케이스.

## 하지 말 것

- 응답 shape을 문서화하지 않고 넘기지 않는다(프론트가 추측하게 만들면 경계면 버그가 난다).
- 한 API 안에서 필드 케이스를 섞지 않는다.
- 래핑 여부를 애매하게 두지 않는다.
- 응답 shape을 고정하는 테스트 없이 엔드포인트를 완료 처리하지 않는다(계약↔훅 불일치가 런타임까지 새어 나간다).
- Next.js/Supabase/Drizzle API를 추측으로 쓰지 않는다 — 문서/Context7로 확인.
- 비밀·키(Supabase 서비스 키·`DATABASE_URL`)를 코드에 하드코딩하지 않는다 — 환경 변수로만. `lib/db`의 `db`가 클라이언트로 새어나가게 하지 않는다.
- 빈 `catch {}`로 예외를 삼키지 않는다 — 적절한 4xx/5xx로 변환하거나 상위로 던진다.
- `drizzle/`의 생성 마이그레이션 SQL을 손으로 고치지 않는다 — 스키마 수정 후 `npm run db:generate`로 재생성.
- 응답 shape을 `any`로 뭉개거나 무분별한 `as`로 덮지 않는다.
- `console.log`·주석 처리 코드를 남기거나 담당 밖 파일 리포맷을 커밋에 섞지 않는다.
- 테스트에서 `.only`/`.skip`으로 실패를 덮지 않고, 모킹은 Supabase·네트워크 등 외부 경계에만 하며(검증 대상 핸들러 로직 자체는 실제 실행), 실패 시 기대값만 바꿔 통과시키지 않는다.
