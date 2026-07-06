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

## 데이터 수집·크롤링 (Python) — 스크래핑 파이프라인

> 이 스택은 위의 Next.js 웹앱과 **분리된 별도 Python 서비스**다. npm 의존성이 아니며, `scraping-pipeline-build` 하네스(오케스트레이터 스킬 `scraping-pipeline-build-orchestrator`)로 구현·확장한다. 아래는 크롤링 파이프라인을 구현할 때 사용하는 표준 스택이다. 실제 구현·확장은 하네스를 통해 진행한다.

파이프라인 단계: **Trigger → Scraping → Cleaning → Extracting → Load**

- **언어·런타임**: Python 3.12+
- **패키지 매니저: uv** — `pyproject.toml`(의존성 선언) + `uv.lock`(잠금), `uv sync`(설치)·`uv run`(실행). pip 대비 빠른 설치와 락 기반 재현성을 확보해 Docker 빌드 캐시·CI 속도에 유리하므로 pip/requirements.txt 대신 uv로 통일한다
- **동적 렌더링 스크래핑: Playwright (Python)** — JS 렌더링 완료 대기(`networkidle`/셀렉터), Anti-Bot 우회(Stealth 속성·랜덤 딜레이·필요 시 Proxy 로테이션). **메모리 누수 방지**를 위해 브라우저·컨텍스트 객체는 `try/finally`로 반드시 `close()`한다. 네트워크 타임아웃·재시도(Retry) 로직으로 실행 예산(예: 컨테이너/Lambda 제한시간) 내 완료를 보장한다
- **HTML 정제: BeautifulSoup4** — `<script>`·`<style>`·`SVG` 등 렌더링 무관 태그를 제거해 순수 텍스트만 남긴다. LLM 입력 토큰 비용을 최소화하기 위함이다
- **구조화 추출: LLM API + Instructor + Pydantic** — 정제 텍스트를 LLM에 넘기되, Instructor + Pydantic 모델로 사전 정의한 JSON 스키마 형태로만 반환하도록 강제한다
- **적재: Supabase (PostgreSQL)** — 고유 식별 키 기준 **Upsert(`on_conflict`)** 로 크론 반복 실행 시의 데이터 중복을 원천 차단하고 무결성을 보장한다 (위 '데이터·백엔드'의 Supabase와 동일 Postgres를 공유 가능)
- **테스트: pytest** — 고정 HTML **fixture** 기반 파서 단위테스트 + Pydantic 스키마 검증으로 타겟 사이트 DOM 변경에 의한 조용한 회귀(silent failure)를 배포 전에 잡는다. 실제 사이트 접속 테스트는 `@pytest.mark.integration`으로 분리하고, CI 게이트에서는 단위테스트(`uv run pytest -m "not integration"`) 통과를 배포 전제로 강제한다
- **설계 패턴: Factory** — 공통 `BaseScraper`·공통 추출 파이프라인은 그대로 두고, 새 타겟 사이트는 사이트별 파서·Pydantic 스키마·테스트만 추가한다
- **인프라·배포**:
  - **Docker** — Playwright 브라우저 포함 이미지. uv 멀티스테이지 빌드(`uv sync --frozen --no-dev`)로 락파일을 먼저 COPY해 레이어 캐시를 살린다
  - **GitHub Actions** — pytest 게이트 → 이미지 빌드 → 레지스트리 push → **EC2/K8s 자동 배포**. pytest 실패 시 배포가 차단되도록 job을 `needs:`로 체이닝한다
  - **AWS EC2 · 쿠버네티스** — 컨테이너 실행. K8s `Deployment`(상시)·`CronJob`(스케줄 수집)
  - **Redis** — 작업 큐·중복 방지 캐시·분산 락
  - **Terraform (IaC)** — EC2/보안그룹/K8s 클러스터/Redis 등 **인프라 프로비저닝**만 담당(remote state + lock). **앱 배포(이미지 빌드·롤아웃)는 GitHub Actions**가 담당하며 두 레이어를 섞지 않는다. 단일 EC2 호스트 규모면 K8s 없이 docker-compose로 단순화할 수 있다

> 각 단계의 상세 구현 규약은 하네스 스킬에 있다: `playwright-scraping`(스크래핑), `html-clean-llm-extract`(정제·추출), `supabase-upsert-load`(적재), `python-test-ci`(테스트·CI 게이트), `docker-cicd-deploy`(컨테이너·배포), `terraform-infra`(IaC).

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
