# 기술 스택

> 의존성 추가·교체, 날짜/시간 처리, 라이브러리 사용법 관련 작업 전에 이 문서를 확인할 것.
> 라이브러리 사용법이 헷갈리면 추측하지 말고 **Context7 MCP**로 최신 공식 문서를 먼저 조회한다.

## 프레임워크 · 언어

- **Next.js 16.2.9** (App Router) — Turbopack 기본 사용. `node_modules/next/dist/docs/` 가이드를 먼저 확인할 것. 훈련 데이터와 다를 수 있는 breaking change가 있음
  - **주의**: Next.js 16에서 `middleware.ts` → **`proxy.ts`**로 명칭/규약 변경됨 (루트 `proxy.ts`, `export function proxy()` + `export const config`). 본 프로젝트는 `proxy.ts`에서 Supabase 세션을 갱신한다
- **React 19.2.4** + **TypeScript 5**

## 스타일 · UI

- **Tailwind CSS v4** — `app/globals.css`에서 CSS 변수로 테마 정의, `@theme inline` 블록 사용. 설정은 `postcss.config.mjs`의 `@tailwindcss/postcss` 플러그인 방식 (별도 `tailwind.config` 없음)
- **shadcn/ui** (`style: "base-nova"`, baseColor `neutral`) — **`@base-ui/react` v1**을 primitive로 사용. 일반적인 Radix UI 기반 shadcn과 다름
  - **주의**: 컴포넌트 합성은 Radix의 `asChild`가 아니라 base-ui의 **`render` prop**을 사용한다. 예: `<Button render={<a href="..." />}>텍스트</Button>`
  - CLI는 npm 패키지 `shadcn` v4 사용. 컴포넌트 추가: `npx shadcn@latest add <name>`
- **lucide-react** — 아이콘 라이브러리 (`components.json` `iconLibrary: "lucide"`)
- **class-variance-authority** (`cva`) — 컴포넌트 variant 스타일 관리
- **tailwind-merge** + **clsx** — `lib/utils.ts`의 `cn()` 헬퍼로 클래스 병합
- **tw-animate-css** — Tailwind 애니메이션 유틸리티
- **next-themes** — 다크모드 (`class` attribute 방식). `components/theme-provider.tsx`로 주입
- **sonner** — 토스트 알림 (`components/ui/sonner.tsx`, 루트 레이아웃에 `<Toaster />` 마운트)

## 데이터 · 백엔드

- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — 클라이언트/서버 분리 구조
  - `lib/supabase/client.ts` — 브라우저(클라이언트 컴포넌트)용 `createBrowserClient`
  - `lib/supabase/server.ts` — 서버(서버 컴포넌트·라우트 핸들러·서버 액션)용 `createServerClient`
  - `lib/supabase/middleware.ts` — `updateSession()` 헬퍼. `proxy.ts`가 매 요청마다 호출해 세션 토큰 갱신
  - 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.example` 참고)

- **Drizzle ORM** (`drizzle-orm` + `postgres` 드라이버, `drizzle-kit` dev) — 타입 안전한 Postgres 쿼리/마이그레이션. Supabase의 Postgres에 직접 연결한다
  - `lib/db/schema.ts` — `pgTable`로 테이블·관계 정의 (현재 `example` 테이블은 플레이스홀더)
  - `lib/db/index.ts` — **서버 전용** `db` 클라이언트. `postgres-js`로 연결하며, Supabase 커넥션 풀러(Transaction 모드, 포트 6543) 대비 `prepare: false` 설정. 클라이언트 컴포넌트에서 import 금지
  - `drizzle.config.ts` — 루트 설정. `dialect: "postgresql"`, 스키마 `./lib/db/schema.ts`, 산출물 `./drizzle/`. drizzle-kit이 `.env.local`을 못 읽으므로 `@next/env`의 `loadEnvConfig`로 환경 변수를 로드한다
  - 환경 변수: `DATABASE_URL` (Supabase 대시보드 > Project Settings > Database > Connection string). `.env.example` 참고
  - 명령어: `npm run db:generate`(스키마 → 마이그레이션 SQL) · `npm run db:migrate`(마이그레이션 적용) · `npm run db:push`(개발용 즉시 반영) · `npm run db:studio`(GUI)
  - **Supabase와의 관계**: 인증·세션·RLS·스토리지·실시간은 Supabase 클라이언트(`lib/supabase/*`)로, 타입 안전한 테이블 CRUD·마이그레이션은 Drizzle(`lib/db/*`)로 다룬다. 둘은 같은 Postgres를 바라본다
  - **사용법은 추측하지 말고 Context7(`/drizzle-team/drizzle-orm-docs`)로 최신 문서를 조회**할 것

## 분석 · 계측

- **@vercel/analytics** + **@vercel/speed-insights** — Vercel 분석/성능 계측 (`app/layout.tsx`에서 마운트)

## 날짜/시간

- **date-fns v4** + **date-fns-tz v3** — 날짜/시간 유틸리티
  - **원칙**: 날짜 파싱·비교·차이·포맷 등 모든 날짜 계산은 가능한 한 `date-fns` / `date-fns-tz`를 **우선 사용**하고, 네이티브 `Date` 산술(`getTime()` 직접 빼기 등)은 피한다
  - `parseISO`(ISO 8601 파싱), `compareAsc`·`differenceInDays`·`isPast`·`isAfter`(비교/차이), `getYear`(연도 추출)
  - `date-fns-tz`: 타임존 변환 시 `toZonedTime`, `formatInTimeZone` 사용
  - 로케일: `import { ko } from "date-fns/locale"` — 한국어 포맷팅 시 사용

## 국제화(i18n) — 옵션

- **next-intl** 패키지가 설치되어 있으나 기본 라우팅에는 연결되어 있지 않다. 다국어가 필요하면 `i18n/routing.ts`를 만들고 `proxy.ts`에 next-intl 미들웨어를 합성한다 (자세한 내용은 next-intl 공식 문서 / Context7 참고).

---

## 테스트

- **Vitest v4** — 테스트 러너 (`npm run test` / `npm run test:watch` / `npm run test:ui`)
  - 설정 파일: `vitest.config.ts` (환경: `jsdom`, 전역 모드 활성화, `@/*` 별칭 해석)
  - 셋업 파일: `tests/setup.ts` — `@testing-library/jest-dom` 매처 전역 등록 + 테스트별 `cleanup()`
- **@testing-library/react** — 컴포넌트 테스트 (`render`, `screen`)
- **@testing-library/user-event** — 실제 유저 이벤트 시뮬레이션
- **@testing-library/jest-dom** — DOM 커스텀 매처 (`toBeInTheDocument` 등)
- **jsdom** — 브라우저 환경 시뮬레이션

테스트 파일 위치 규칙:

- 단위 테스트: 소스 파일 옆 `__tests__/` 디렉토리 또는 `*.test.ts(x)` 파일 (예: `components/__tests__/button.test.tsx`)
- 공통 셋업/픽스처: 프로젝트 루트 `tests/` 디렉토리

## 코드 포맷

- **Prettier** + **prettier-plugin-tailwindcss** — 클래스 자동 정렬. `npm run format` / `npm run format:check`
- **ESLint** (`eslint-config-next`) — `npm run lint`

## 패키지 매니저 주의

- 루트 `.npmrc`에 `legacy-peer-deps=true`가 설정되어 있다. `@vitejs/plugin-react`의 전이 의존성(`@rolldown/plugin-babel`)이 babel 8 optional peer를 요구해 기본 설치가 실패하기 때문이다. 클론 후 `npm install`이 무리 없이 동작하도록 의도적으로 둔 설정이다.
