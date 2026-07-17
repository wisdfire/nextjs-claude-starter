# 기술 스택

> 의존성 추가·교체, 날짜/시간 처리, 라이브러리 사용법 관련 작업 전에 이 문서를 확인할 것.
> 라이브러리 사용법이 헷갈리면 추측하지 말고 **Context7 MCP**로 최신 공식 문서를 먼저 조회한다.

## 프레임워크 · 언어

- **Next.js 16.2.9** (App Router) — Turbopack 기본 사용. `node_modules/next/dist/docs/` 가이드를 먼저 확인할 것. 훈련 데이터와 다를 수 있는 breaking change가 있음
  - **주의**: Next.js 16에서 `middleware.ts` → **`proxy.ts`**로 명칭/규약 변경됨 (루트 `proxy.ts`, `export function proxy()` + `export const config`). **템플릿에는 `proxy.ts`가 없다** — 필요해질 때(i18n 라우팅 등) 루트에 만든다. 프록시는 **매 요청마다** 돌므로 하는 일이 없으면 두지 않는다
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

- **Neon Postgres** — 서버리스 Postgres. **DB 접근 경로는 Drizzle 하나뿐이다**(아래 참조)
  - **연결 문자열이 두 개다.** 호스트명의 `-pooler` 유무가 유일한 차이이고, 용도가 다르다:

    | 변수           | 호스트             | 용도                                        | 배포 환경 등록   |
    | -------------- | ------------------ | ------------------------------------------- | ---------------- |
    | `DATABASE_URL` | `-pooler` **있음** | 앱 런타임·빌드                              | ✅ 등록          |
    | `DIRECT_URL`   | `-pooler` 없음     | `drizzle-kit`(generate/migrate/push/studio) | ❌ **로컬 전용** |

    pooled는 PgBouncer transaction 모드라 DDL을 흘리면 오류가 날 수 있어 분리한다.

  - ⚠️ **연결 문자열은 CLI/콘솔 출력을 그대로 붙여넣는다.** 손으로 조립하면 틀린다 —
    호스트에 `.c-N.` 세그먼트가 들어가고 `channel_binding=require`가 붙는다.
  - **scale-to-zero**: 유휴 5분 후 컴퓨트가 0으로 내려가고 다음 요청에 ~500ms로 깨어난다.
    **이게 비용 모델의 전제다** — 아래 "scale-to-zero를 지켜라" 참조.
  - 리전: 아시아는 **싱가포르**(`aws-ap-southeast-1`)가 가장 가깝다(서울·도쿄 없음).

- **Drizzle ORM** (`drizzle-orm` + `postgres` 드라이버, `drizzle-kit` dev) — 타입 안전한 Postgres 쿼리/마이그레이션
  - `lib/db/schema.ts` — `pgTable`로 테이블·관계 정의 (현재 `example` 테이블은 플레이스홀더)
  - `lib/db/index.ts` — **서버 전용** `db` 클라이언트. `postgres-js`로 연결하며 pooled 엔드포인트 대비 `prepare: false` 설정. **클라이언트 컴포넌트에서 import 금지**
  - `drizzle.config.ts` — 루트 설정. `dialect: "postgresql"`, 스키마 `./lib/db/schema.ts`, 산출물 `./drizzle/`. drizzle-kit이 `.env.local`을 못 읽으므로 `@next/env`의 `loadEnvConfig`로 환경 변수를 로드한다. **`DIRECT_URL`을 쓴다**
  - 명령어: `npm run db:generate`(스키마 → 마이그레이션 SQL) · `npm run db:migrate`(마이그레이션 적용) · `npm run db:push`(**로컬 프로토타이핑 전용**) · `npm run db:studio`(GUI)
  - **배포 시 스키마 반영 절차는 [db-operations.md](./db-operations.md)** — `db:push`를 운영에 쓰지 않는 이유가 거기 있다
  - **사용법은 추측하지 말고 Context7(`/drizzle-team/drizzle-orm-docs`)로 최신 문서를 조회**할 것

### ★ DB는 외부에 노출되지 않는다 — 그래서 RLS가 없다

브라우저가 DB에 직접 붙는 경로가 **없다.** 모든 접근은 `lib/db`를 거치는 **서버 사이드 단일 경로**이고,
공개 데이터는 서버에서 읽어 **ISR로 내보낸다.** 그래서 행 수준 보안(RLS) 같은 계층이 필요 없다.

⚠️ **뒤집어 말하면, "무엇을 공개할지"를 걸러 줄 계층이 DB에 없다.**
공개 조건(예: `published = true`)은 **쿼리의 `where` 절이 책임진다.** 그 필터를 빠뜨리면
미공개 데이터가 그대로 나간다 — DB가 막아 주지 않는다.

> 인증이 필요한 프로젝트가 생기면 그때 별도로 설계한다. 미리 깔아 두지 않는다 —
> 인증 없는 사이트에 인증 계층을 두면 **매 요청마다 아무것도 안 하는 왕복만 늘어난다.**

### ★ scale-to-zero를 지켜라 — 조용히 새는 비용의 주범

Neon 비용은 **컴퓨트가 실제로 깨어 있던 시간**으로 매겨진다. 유휴 5분이면 0으로 내려간다.
그런데 **매 요청 DB를 건드리는 라우트가 하나라도 있으면 컴퓨트는 영영 정지하지 못한다.**

```ts
// ❌ 이 한 줄이 컴퓨트를 24시간 깨워 둔다
export const dynamic = "force-dynamic"; // 헬스체크·모니터링 라우트에서 특히 위험
```

**규칙: 헬스체크·모니터링·상태 엔드포인트는 반드시 시간 기반 캐시를 건다.**

```ts
// ✅ 1시간에 한 번만 DB를 깨운다
export const revalidate = 3600;
```

외부 모니터링(UptimeRobot 등)을 DB 조회 라우트에 걸어 두는 것도 같은 문제다 —
**1분 간격 핑 = 컴퓨트 상시 가동.** 정적 라우트를 핑하거나 간격을 늘린다.

> 확인 방법: Neon 콘솔 Monitoring, 또는 Neon MCP `list_branch_computes`의
> `current_state`(`idle`/`active`)와 `last_active` → `suspended_at` 간격.

## 분석 · 계측

- **@vercel/analytics** + **@vercel/speed-insights** — Vercel 분석/성능 계측 (`app/layout.tsx`에서 마운트)

## 날짜/시간

- **date-fns v4** + **date-fns-tz v3** — 날짜/시간 유틸리티
  - **원칙**: 날짜 파싱·비교·차이·포맷 등 모든 날짜 계산은 가능한 한 `date-fns` / `date-fns-tz`를 **우선 사용**하고, 네이티브 `Date` 산술(`getTime()` 직접 빼기 등)은 피한다
  - `parseISO`(ISO 8601 파싱), `compareAsc`·`differenceInDays`·`isPast`·`isAfter`(비교/차이), `getYear`(연도 추출)
  - `date-fns-tz`: 타임존 변환 시 `toZonedTime`, `formatInTimeZone` 사용
  - 로케일: `import { ko } from "date-fns/locale"` — 한국어 포맷팅 시 사용

## 국제화(i18n) — 옵션

- **next-intl** 패키지가 설치되어 있으나 기본 라우팅에는 연결되어 있지 않다(의존성만 있다). 다국어가 필요하면 `i18n/routing.ts`를 만들고 **루트에 `proxy.ts`를 새로 만들어** next-intl 미들웨어를 넣는다 — 템플릿에는 `proxy.ts`가 없다 (자세한 내용은 next-intl 공식 문서 / Context7 참고).

## 데이터 수집·크롤링·백엔드 배치 (Python) — 이 저장소의 범위 밖

> **이 저장소에서 구현하지 않는다.** 크롤링·스크래핑 워커, Python REST API, 크론잡/배치 등 **Python 백엔드 전반은 별도 모노레포 [`wisdfire/jobhub-jobs`](https://github.com/wisdfire/jobhub-jobs)** 가 소유한다. 관련 에이전트·스킬(크롤링 워커 구현, 데이터 파이프라인 설계)은 2026-07-14 이 스타터킷에서 제거됐다.
>
> 이 스타터킷은 **Next.js 웹서비스**만 담당한다. 데이터 수집·적재 로직, Celery/Playwright 워커, ETL·스키마·모니터링 설계가 필요하면 이 저장소에서 구현하지 말고 **`jobhub-jobs` 모노레포에서 작업하라**. 사용자가 이 저장소에서 크롤러·파이썬 배치 작업을 요청하면, 먼저 모노레포 소관임을 알리고 그쪽에서 진행할 것을 안내한다.

**단, 수집 "요구사항"은 이 저장소가 소유한다.** 무슨 데이터가 왜 필요한지 아는 쪽은 제품(PRD)이기 때문이다.

- 수집 요구가 생기면 **`docs/DATA-JOBS.md`(인계 문서)** 를 만들어 모노레포가 읽고 구현하게 한다 (`data-jobs-spec` 스킬 · `data-jobs-spec-author` 에이전트, research-to-spec 하네스 Phase 4.5).
- 그 문서에는 **요구사항만** 쓴다: 무슨 데이터를·왜·어느 주기로·어떤 필드로·얼마나 신선하게·무엇이 같은 레코드인가(유일성)·적재 스키마 제안·웹앱이 더할 편집 부가가치.
- ⚠️ **구현 계약은 쓰지 않는다**: `run()` 진입점·이미지(slim/browser)·`jobs.yml` 크론 표현식(UTC)·`on_conflict` 구현·재시도·SSM은 **`jobhub-jobs`가 결정**한다. 추측해 적으면 틀린 지시가 된다.

**웹앱이 수집 데이터를 소비하는 경계**만 이 저장소의 구현 범위다:

- 수집 결과는 **Neon(PostgreSQL)에 이미 적재된 상태**로 도착한다고 가정하고, 웹앱은 이를 **읽어서 렌더링**한다.
- 웹앱에서 필요한 것은 **읽기 쿼리·타입·캐싱 전략**뿐이다 (`docs/guides/architecture.md`의 데이터 접근 규약 참고).
- ⚠️ **수집 잡이 쓰는 테이블의 UNIQUE 제약을 함부로 바꾸지 않는다** — 잡의 멱등키(`ON CONFLICT`)가 그것을 가리킨다. 변경 시 그쪽 영향 검토가 먼저다([db-operations.md](./db-operations.md) A-1.4).
- 수집 스키마가 바뀌어야 하면 `jobhub-jobs` 쪽에 변경을 요청하고, 웹앱은 그 결과 스키마에 맞춘다.
- ⚠️ **애드센스 주의**: 수집·크롤링한 데이터를 **원본 그대로 게시하면 저품질·복제 콘텐츠로 애드센스 심사에서 거절**된다. 웹앱은 반드시 구조화·요약·큐레이션·해설 등 **편집적 부가가치**를 더해 노출한다 (`adsense-readiness` 스킬).

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
