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

> 이 스택은 위의 Next.js 웹앱과 **분리된 별도 Python 서비스**다. npm 의존성이 아니며, `scraping-pipeline-build` 하네스(오케스트레이터 스킬 `scraping-pipeline-build-orchestrator`, 구현담당 에이전트 `crawl-worker-engineer`)로 구현·확장한다. 크롤링 실행 인프라(**AWS EC2 t4g.small 단일 노드 · ARM64 Graviton2 · 2 vCPU/2 GiB · Ubuntu LTS · Docker Compose · Valkey 브로커 · ECR · Grafana Alloy→Grafana Cloud**)는 **별도 인프라 저장소 `crawling-node-infra`** 에서 구축·운영되며, 이 저장소는 그 위에서 실행될 워커 에이전트를 구현해 arm64 도커 이미지로 배포하는 것만 담당한다. 계약 상세는 `celery-crawl-worker` 스킬. 목표 워크로드: 약 100개 사이트 · 하루 약 200개 크론 스케줄.
>
> **폐기 이력**: 배치 파이프라인 트랙(K8s CronJob 직접 실행 + BeautifulSoup·Instructor 추출)은 2026-07-08 워커 트랙으로 단일화하며 폐기했고, **K3s·KEDA·Browserless·GHCR·ArgoCD GitOps 트랙은 2026-07-10 폐기**했다(인프라가 단일 EC2 + Docker Compose로 확정). 2 GiB 노드에서 K8s 컨트롤플레인 메모리가 정당화되지 않았다.
- **패키지 매니저: uv** — `pyproject.toml`(의존성 선언) + `uv.lock`(잠금), `uv sync`(설치)·`uv run`(실행). pip 대비 빠른 설치와 락 기반 재현성을 확보해 Docker 빌드 캐시·CI 속도에 유리하므로 pip/requirements.txt 대신 uv로 통일한다
- **아키텍처: linux/arm64 전용** — t4g는 Graviton(ARM64)이다. amd64 이미지를 배포하면 서버에서 `exec format error`로 컨테이너가 뜨지 않는다. CI는 `ubuntu-24.04-arm` 네이티브 러너를 쓴다(x86 러너 + QEMU는 5~10배 느리다)
- **언어·런타임**: Python **3.14** — 인프라 지정. ★ 공식 Playwright 이미지에는 **Python 3.12가 내장**돼 있어 그냥 쓰면 3.12로 돌아간다. Dockerfile에서 `uv python install 3.14 && uv sync --frozen --no-dev --python 3.14` 후 `ENV PATH="/app/.venv/bin:$PATH"`로 uv 가상환경을 앞에 둔다. **`UV_SYSTEM_PYTHON=1`을 걸면 안 된다.** `pyproject.toml`의 `requires-python = ">=3.14"`와 어긋나면 `uv sync`가 거부한다. ⚠️ **Celery 5.6.3은 3.14를 공식 분류자에 선언하지 않았다**(인프라가 arm64에서 Python 3.14.6·uv 0.11.28·Celery 5.6.3·Chromium 149로 실동작 검증했으나 공식 보증은 없음) — prefork 스모크 테스트를 CI 게이트에 필수로 두고, 깨지면 3.13으로 내린다
- **작업 큐: Celery 5.6.x + Valkey(브로커, Redis 프로토콜) + Celery Beat(스케줄러)** — **기본 큐 `celery` 하나만 쓴다.** 인프라 redis_exporter가 `celery`·`unacked`·`unacked_index`만 추적하므로(check-keys 고정) 커스텀 큐로 라우팅하면 `CeleryQueueBacklog`가 안 울리고 `CeleryQueueIdle`이 오탐한다. 필수 설정: `task_acks_late`(← `CeleryUnackedStuck` 알림의 전제) · `worker_prefetch_multiplier=1` · **`task_ignore_result=True`**(끄면 `celery-task-meta-*`가 24시간 쌓여 512MB maxmemory를 잠식 → noeviction이 새 태스크를 거부) · JSON 직렬화 · concurrency 1 · `visibility_timeout: 3600`. at-least-once이므로 결과 저장은 job_id 기준 Upsert(멱등성 필수). Valkey는 `noeviction`이라 메모리가 차면 **쓰기를 거부**하므로(잡을 조용히 버리지 않으려는 설계) `OOM command not allowed` 에러를 삼키면 안 된다. 데드레터는 워커가 `dead:<agent>`에 직접 LPUSH한다 — **Celery는 브로커에 실패 큐를 두지 않는다**
- **브라우저: Playwright `1.61.0` sync API + 이미지 내장 Chromium** — 베이스는 인프라가 지정한 **`mcr.microsoft.com/playwright/python:v1.61.0-noble`**(arm64 멀티아키, 브라우저·시스템 라이브러리 포함). **pip `playwright` 버전과 이미지 태그를 정확히 일치**시킨다(어긋나면 `Executable doesn't exist`). 브라우저 바이너리는 `/ms-playwright`에 있어 파이썬 버전과 무관하므로 uv로 3.14를 깔아도 그대로 재사용된다. 런타임엔 **Chromium 하나만** 띄운다 — `--disable-dev-shm-usage`가 Chromium 전용 플래그이고(Docker 기본 `/dev/shm`이 64MB라 없으면 크래시), 스텔스 도구가 Chromium을 겨냥하며, 대상 사이트가 Chrome 기준으로 렌더링되기 때문이다. 태스크 1건당 세션 1개(finally로 close). 동시성은 `--concurrency=1`(인프라 "2 이하 권장" 범위 안 — 700M 예산과 `/metrics` 포트 단일 바인딩 때문), 확장은 인스턴스 타입 상향(scale-up). **이미지는 약 4GB**(브라우저 3종 + 파이썬 2개)라 배포마다 pull 부담이 크다 — `docker image prune` 필수
- **파싱: 하이브리드 80/20** — Playwright Locator(CSS/XPath) 직접 파싱이 메인(80%, 속도·비용), ScrapeGraphAI(LLM)는 DOM 변경으로 깨졌을 때의 폴백 전용(20%). 폴백 트리거는 예외 + **Pydantic 검증 실패**(silent breakage 감지)이며, 폴백 결과도 동일 Pydantic 모델로 재검증한다
- **검증: Pydantic v2 + pydantic-settings** — 태스크 페이로드(CrawlJob)·결과(CrawlResult)·환경변수 전부 검증
- **관측: prometheus_client (pull 방식 `/metrics`, 포트 9464)** — 인프라의 Grafana Alloy가 scrape해 Grafana Cloud로 remote_write한다(OTLP 리시버 없음). **Celery는 브로커에 실패 큐가 없어 실패율을 워커가 직접 노출하지 않으면 영원히 알 수 없다** — 계측은 선택이 아니다. prefork가 자식을 fork하므로 메트릭 서버는 `worker_process_init` 시그널에서 1회 바인딩한다(모듈 import 시점에 열면 포트 충돌). concurrency를 2 이상 올릴 때에만 `PROMETHEUS_MULTIPROC_DIR` + `MultiProcessCollector`가 필요하다. 계약 메트릭(인프라 알림 규칙과 이름이 일치해야 함): `crawl_items_extracted_total`(0 → 셀렉터 붕괴)·`crawl_task_total`/`crawl_task_failures_total`(실패율)·`crawl_http_status_total`(429 → IP 차단)·`crawl_task_duration_seconds`·`crawl_parse_fallback_total`(폴백 지속 = 셀렉터 수리 신호, 워커 고유). 추가로 Healthchecks.io **dead man's switch**(잡 성공 시 ping)를 반드시 건다 — 크롤링 장애는 조용해서 스케줄러가 죽으면 에러 로그조차 없다. 로그는 구조화 JSON stdout
- **메모리 예산: 컨테이너 700M** — 2 GiB − Valkey(768M) − OS/Docker(~500M). Valkey를 굶기면 OOM Killer가 **Valkey를 먼저 죽여 큐에 쌓인 잡이 통째로 사라진다.** compose에 `stop_grace_period: 300s`(기본 10초면 배포마다 태스크가 잘린다)와 로그 로테이션을 건다
- **이미지·배포(CI/CD)**: 2단 구성(base 공통 런타임 이미지 → 에이전트별 `FROM` 상속). 트리거는 `on: { push: { branches: [main] }, workflow_dispatch: {} }`이며 PR에서는 테스트 게이트만 돈다. 흐름은 **`pytest·ruff·mypy` 게이트 → `ubuntu-24.04-arm` 러너에서 arm64 빌드 → ECR push**(커밋 SHA 태그로 배포, `latest`는 수동 편의용) **→ `aws ssm send-command`**(서버에서 `.env`의 `IMAGE_TAG` 치환 → `docker compose pull && up -d` → `docker image prune`) **→ 배포 결과 폴링 확인**을 `needs:` 체인으로 잇는다. 인증은 **GitHub OIDC**(액세스 키 저장 안 함, `permissions: { id-token: write, contents: read }` 필수), SSH·인바운드 포트 미사용. `concurrency: { group: deploy-<ref>, cancel-in-progress: true }`로 중복 배포를 막는다. GitHub **Variables**(Secrets 아님): `AWS_ROLE_ARN`·`ECR_REPOSITORY_URL`·`EC2_INSTANCE_ID` — 인프라의 `tofu output`으로 얻는다. ★ **`send-command` 성공은 "큐에 넣었다"는 뜻일 뿐**이라 `get-command-invocation` 폴링(10초×90)으로 실제 성공을 확인해야 하고, **`aws ssm wait command-executed`는 금지**다(약 100초 한계 → 약 4GB 이미지 pull 중 정상 배포를 실패로 오탐). ECR 수명주기가 최근 10개만 보관하므로 그 이전으로는 롤백 불가
- **로컬 개발**: docker-compose(Valkey)로 인프라 계약과 동일한 환경변수·네트워크 규격을 재현한다. 변수명은 인프라 compose 규격을 따른다 — `CELERY_BROKER_URL`(db 0)·`CELERY_RESULT_BACKEND`(db 1)·`PYTHONUNBUFFERED=1`·`HEALTHCHECK_URL`·`METRICS_PORT`. **kombu에 `valkey://` 스킴은 없다** — Redis 프로토콜 호환이므로 `redis://`를 쓴다. 워커 compose는 인프라가 만든 external network `crawling-infra_crawling-net`에 합류해 `valkey:6379`로 닿는다. 태스크 UI는 **Flower**(루프백 바인딩 + SSM 터널) — 워커 CMD에 `-E`가 있어야 이벤트가 발행된다
- **품질**: pytest(파싱 fixture·폴백 트리거·계약 스키마·Prometheus multiprocess 테스트), ruff(lint+format), mypy — CI에서 pytest 게이트 통과가 이미지 빌드·push의 `needs:` 전제
- **설계 패턴: Factory** — base 패키지(공통 런타임: Celery 앱·모델·브라우저 수명주기·계측·파싱 프레임)는 그대로 두고, 새 에이전트/사이트는 에이전트 모듈(셀렉터·파싱·스키마)·Beat 스케줄·에이전트 이미지·테스트만 추가한다
- **IaC: OpenTofu (최신 안정 1.12.x, `tofu` CLI)** — 이 프로젝트의 IaC 표준 도구. Terraform 대신 OpenTofu를 쓴다. 인프라 프로비저닝은 별도 인프라 저장소가 담당하며, IaC 작업이 필요하면 `opentofu-infra` 스킬 규약(S3 remote state + `use_lockfile` 락, state 암호화, plan→승인→apply)을 따른다

> **인프라 저장소와의 접점**: `crawling-node-infra`는 2026-07-10 Celery(Python) 기준으로 정렬됐다(CLAUDE.md의 "워커 스택" 표가 이 저장소의 스택을 명시한다). 다만 워커 `/metrics` 스크레이프 job(`worker:9464`)이 아직 주석 상태라 켜야 `crawling_app` 알림 그룹이 동작하고, `crawl_parse_fallback_total` 알림 규칙도 아직 없다. 이런 항목은 직접 고치지 말고 "인프라 저장소 요청 사항"으로 정리해 전달한다.

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
