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

## 데이터 수집·크롤링 (Python) — 크롤링 워커 애플리케이션(MAS)

> 이 스택은 위의 Next.js 웹앱과 **분리된 별도 Python 서비스**다. npm 의존성이 아니며, `scraping-pipeline-build` 하네스(오케스트레이터 스킬 `scraping-pipeline-build-orchestrator`, 구현담당 에이전트 `crawl-worker-engineer`)로 구현·확장한다. 크롤링 실행 인프라(AWS EC2 단일 노드 + K3s, Valkey 브로커, KEDA 오토스케일링, Browserless 원격 브라우저 풀, OTel Collector→Grafana Cloud)는 **별도 인프라 저장소**에서 구축·운영되며, 이 저장소는 그 위에서 실행될 워커 에이전트를 구현해 도커 이미지로 배포하는 것만 담당한다. 계약 상세는 `celery-crawl-worker` 스킬. 목표 워크로드: 약 100개 사이트 · 하루 약 200개 크론 스케줄.
>
> 기존 배치 파이프라인 트랙(K8s CronJob 직접 실행 + BeautifulSoup·Instructor 추출 + 클러스터 직접 배포)은 **2026-07-08 이 워커 트랙으로 단일화하며 폐기**했다.
- **패키지 매니저: uv** — `pyproject.toml`(의존성 선언) + `uv.lock`(잠금), `uv sync`(설치)·`uv run`(실행). pip 대비 빠른 설치와 락 기반 재현성을 확보해 Docker 빌드 캐시·CI 속도에 유리하므로 pip/requirements.txt 대신 uv로 통일한다
- **언어·런타임**: Python 3.14.x (ScrapeGraphAI가 3.14 미지원이면 3.13로 조정)
- **작업 큐: Celery 5.6.x + Valkey(브로커, Redis 프로토콜) + Celery Beat(스케줄러)** — 에이전트당 전용 큐 `crawl:<agent>`(+`result:`/`dead:`), `acks_late`·JSON 직렬화·prefetch 1. at-least-once이므로 결과 저장은 job_id 기준 Upsert(멱등성 필수)
- **브라우저: Playwright 1.61.x sync API + Browserless 원격 CDP** — 이미지에 브라우저 바이너리를 설치하지 않고 `connect_over_cdp`로 원격 접속. 태스크 1건당 세션 1개(finally로 close). 동시성은 코드가 아니라 KEDA Pod 스케일링으로 확보
- **파싱: 하이브리드 80/20** — Playwright Locator(CSS/XPath) 직접 파싱이 메인(80%, 속도·비용), ScrapeGraphAI(LLM)는 DOM 변경으로 깨졌을 때의 폴백 전용(20%). 폴백 트리거는 예외 + **Pydantic 검증 실패**(silent breakage 감지)이며, 폴백 결과도 동일 Pydantic 모델로 재검증한다
- **검증: Pydantic v2 + pydantic-settings** — 태스크 페이로드(CrawlJob)·결과(CrawlResult)·환경변수 전부 검증
- **관측: OpenTelemetry SDK (OTLP gRPC)** — 태스크당 `crawl.job` span, 성공/실패 카운터·소요시간 히스토그램·LLM 폴백 카운터 `crawl.parse.fallback`(폴백 지속 발생 = 셀렉터 수리 신호), 구조화 JSON 로그
- **이미지·배포**: python:3.14-slim 기반 2단 구성(base 공통 런타임 이미지 → 에이전트별 `FROM` 상속). GitHub Actions로 `ghcr.io/<org>/worker-<agent>:<agent>-<git-sha>` 빌드·push(latest 금지) 후 **인프라 저장소의 k8s 매니페스트 태그를 갱신하는 PR 자동 생성(cross-repo GitOps)** — 클러스터 직접 접근 금지
- **로컬 개발**: docker-compose(Valkey + Browserless chromium)로 인프라 계약과 동일한 환경변수 규격(`VALKEY_URL`·`BROWSERLESS_WS`·`BROWSERLESS_TOKEN`·`OTEL_EXPORTER_OTLP_ENDPOINT`)을 재현
- **품질**: pytest(파싱 fixture·폴백 트리거·계약 스키마 테스트), ruff(lint+format), mypy — CI에서 pytest 게이트 통과가 이미지 빌드·push의 `needs:` 전제
- **설계 패턴: Factory** — base 패키지(공통 런타임: Celery 앱·모델·Browserless 연결·OTel·파싱 프레임)는 그대로 두고, 새 에이전트/사이트는 에이전트 모듈(셀렉터·파싱·스키마)·Beat 스케줄·에이전트 이미지·테스트만 추가한다
- **IaC: OpenTofu (최신 안정 1.12.x, `tofu` CLI)** — 이 프로젝트의 IaC 표준 도구. Terraform 대신 OpenTofu를 쓴다. 인프라 프로비저닝은 별도 인프라 저장소가 담당하며, IaC 작업이 필요하면 `opentofu-infra` 스킬 규약(S3 remote state + `use_lockfile` 락, state 암호화, plan→승인→apply)을 따른다

> 상세 규약은 하네스 스킬에 있다: `celery-crawl-worker`(워커 계약), `playwright-scraping`(셀렉터·Anti-Bot 참고), `supabase-upsert-load`(결과 DB 적재 시), `python-test-ci`(테스트·CI 게이트), `opentofu-infra`(IaC).

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
