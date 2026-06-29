# 아키텍처 가이드

> 컴포넌트·라우트·Supabase 클라이언트·테마·경로 별칭 관련 작업 전에 이 문서를 확인할 것.

## 디렉토리 구조

```
.
├── app/                    # Next.js App Router 라우트
│   ├── layout.tsx          # 루트 레이아웃 (ThemeProvider · Toaster · Analytics 마운트)
│   ├── page.tsx            # 랜딩 페이지 (스타터킷 소개 — 클론 후 교체 대상)
│   └── globals.css         # Tailwind v4 + shadcn 디자인 토큰(CSS 변수)
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트 (base-nova) — 직접 수정 지양, CLI로 관리
│   ├── theme-provider.tsx  # next-themes 컨텍스트 제공자
│   ├── theme-toggle.tsx    # 라이트/다크 전환 버튼
│   └── __tests__/          # 컴포넌트 단위 테스트
├── lib/
│   ├── utils.ts            # cn() 클래스 병합 헬퍼
│   ├── supabase/
│   │   ├── client.ts       # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts       # 서버용 Supabase 클라이언트
│   │   └── middleware.ts   # updateSession() — 세션 갱신 헬퍼
│   └── db/                 # Drizzle ORM (Postgres)
│       ├── index.ts        # 서버 전용 db 클라이언트 (postgres-js)
│       └── schema.ts       # 테이블 스키마 (pgTable)
├── drizzle.config.ts       # drizzle-kit 설정 (generate/migrate/push/studio)
├── drizzle/                # 생성된 마이그레이션 SQL (db:generate 시 생성)
├── proxy.ts                # Next.js 16 미들웨어(구 middleware.ts) — 세션 갱신
├── tests/setup.ts          # Vitest 전역 셋업
└── docs/                   # 프로젝트 문서 (이 디렉토리)
```

## 경로 별칭

- `@/*` → 프로젝트 루트. `tsconfig.json`과 `vitest.config.ts` 양쪽에 설정되어 있다.
  - 예: `import { cn } from "@/lib/utils"`

## Supabase 클라이언트 선택 규칙

| 실행 위치                                 | 사용할 클라이언트                                | 비고                          |
| ----------------------------------------- | ------------------------------------------------ | ----------------------------- |
| 클라이언트 컴포넌트(`"use client"`)       | `lib/supabase/client.ts`의 `createClient()`      | 동기 함수                     |
| 서버 컴포넌트 · 라우트 핸들러 · 서버 액션 | `lib/supabase/server.ts`의 `createClient()`      | `await` 필요 (cookies 비동기) |
| 미들웨어(proxy)                           | `lib/supabase/middleware.ts`의 `updateSession()` | 토큰 갱신 전용                |

- **중요**: `server.ts`의 `createServerClient`와 `getUser()` 사이에 다른 비동기 로직을 끼워 넣지 말 것. 세션 갱신 타이밍이 어긋나 사용자가 무작위로 로그아웃될 수 있다.

## 데이터 접근 규칙 (Supabase vs Drizzle)

같은 Supabase Postgres를 두 경로로 다룬다. 목적에 따라 골라 쓴다.

| 목적                                | 사용할 것                          | 비고                                 |
| ----------------------------------- | ---------------------------------- | ------------------------------------ |
| 인증·세션·로그인/로그아웃           | `lib/supabase/*`                   | RLS·쿠키 기반 세션은 Supabase가 담당 |
| RLS·Storage·Realtime·Edge Functions | `lib/supabase/*`                   | Supabase 전용 기능                   |
| 타입 안전한 테이블 CRUD·복잡한 쿼리 | `lib/db`의 `db` (Drizzle)          | **서버에서만** import                |
| 스키마 정의·마이그레이션            | `lib/db/schema.ts` + `drizzle-kit` | `db:generate` → `db:migrate`         |

- **Drizzle `db`는 서버 전용**이다. 서버 컴포넌트·라우트 핸들러·서버 액션에서만 `import { db } from "@/lib/db"`. 클라이언트 컴포넌트에서 import 금지(DB 자격증명·드라이버가 번들에 들어가면 안 됨).
- Drizzle로 직접 쿼리하면 Supabase RLS의 보호를 받지 않는 연결(`postgres` 역할)을 쓸 수 있으니, 권한 검증은 애플리케이션 레벨에서 직접 처리한다.
- 마이그레이션 워크플로우: `lib/db/schema.ts` 수정 → `npm run db:generate`(SQL 생성) → 검토 → `npm run db:migrate`(적용). 빠른 프로토타이핑은 `npm run db:push`.

## 테마(다크모드)

- `app/layout.tsx`의 `<html>`에 `suppressHydrationWarning`이 설정되어 있다 (next-themes가 클라이언트에서 클래스를 바꾸기 때문).
- 테마 토글은 `components/theme-toggle.tsx`. `useTheme()`의 `resolvedTheme`을 기준으로 토글한다.

## shadcn/ui 디자인 토큰 규칙

- **금지**: `app/globals.css`의 `:root`·`.dark` CSS 변수 및 `@theme inline` 블록을 임의로 추가·변경하지 말 것.
- 스타일은 Tailwind 유틸리티 클래스로만 적용한다.
- 새 컴포넌트는 손으로 짜기보다 `npx shadcn@latest add <name>`로 추가하는 것을 우선한다.
