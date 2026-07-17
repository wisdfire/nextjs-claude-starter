# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**프로젝트**: Next.js Starter Kit (`next-js-starter-kit`) — GitHub에서 클론한 뒤 요구사항 문서를 넣어 곧바로 개발을 시작하기 위한 Next.js 웹서비스 스타터킷. Next.js 16 · Tailwind v4 · shadcn/ui(base-nova) · Neon Postgres · Drizzle ORM · Vitest 기반.

이 파일은 **얇은 색인(라우터)** 입니다. 항상 적용되는 핵심 규칙만 여기 두고, 상세 지침은 작업 종류에 따라 `docs/guides/`의 문서를 **그때그때 읽어서** 적용합니다.

@AGENTS.md

## 명령어

```bash
npm run dev          # 개발 서버 실행 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (TypeScript 타입 체크 포함)
npm run lint         # ESLint 실행
npm run test         # 단위 테스트 전체 실행 (Vitest)
npm run test:watch   # 파일 변경 감지 + 자동 재실행
npm run format       # Prettier 자동 정렬

npm run db:generate  # Drizzle: 스키마 변경 → 마이그레이션 SQL 생성
npm run db:migrate   # Drizzle: 마이그레이션을 DB에 적용
npm run db:push      # Drizzle: 스키마를 DB에 즉시 반영 (개발용)
npm run db:studio    # Drizzle Studio (DB GUI)
```

## 핵심 규칙 (항상 적용)

- **🚨 구글 애드센스 심사 통과 (타협 불가 · 최우선)**: 이 스타터킷으로 만드는 웹서비스는 **반드시 구글 애드센스 심사를 통과해야 한다**. 화면·콘텐츠·라우팅·정책 페이지·광고 배치 작업 시 **`adsense-readiness` 스킬을 반드시 로드**하고 **공식 MUST 10항을 전부 충족**시킨다(= 통과 게이트). MUST를 하나라도 못 채운 구현은 **완료로 보지 않는다**.
  - 대표 위반(= 거절 사유): **개인정보처리방침 누락**(구글 지정 문구 포함 필수 — 유일한 공식 필수 페이지) · **수집/크롤링 데이터를 원본 그대로 게시**(복제·저가치 콘텐츠 → 반드시 요약·구조화·해설로 편집 부가가치 추가) · 사람 검토 없는 **대량 자동생성 콘텐츠** · **"준비 중" 플레이스홀더 화면** · 로그인/404/빈 목록 등 **저가치 화면에 광고 렌더** · **`Mediapartners-Google` 크롤러 차단** · HTTPS 미적용 · **깨진 링크(404)** · 광고가 콘텐츠보다 많은 배치
  - ⚠️ 구글은 통과를 **보장하지 않는다**(재량 심사). "글자수 300자·글 20개·About/Contact 필수" 같은 **근거 없는 기준을 지어내지 말 것** — 공식 최소 분량 기준은 존재하지 않는다
- **언어**: 응답·주석·커밋·문서는 한국어, 코드 식별자는 영어 (전역 규칙 — 상세는 `~/.claude/CLAUDE.md`)
- **주석**: 초보 개발자가 흐름을 파악할 수 있도록 함수·주요 로직·비동기 처리·사이드 이펙트에 한국어 주석을 충분히 단다
- **Next.js 16**: 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 먼저 확인할 것. 훈련 데이터와 다른 breaking change 있음. `middleware.ts` → **`proxy.ts`**로 변경됨
- **shadcn/ui = base-ui 기반**: 컴포넌트 합성은 Radix의 `asChild`가 아니라 base-ui의 **`render` prop**을 쓴다. 새 컴포넌트는 `npx shadcn@latest add <name>`로 추가
- **shadcn 디자인 토큰 수정 금지**: `app/globals.css`의 `:root`·`.dark` CSS 변수 및 `@theme inline` 블록을 임의로 변경하지 말 것. 스타일은 Tailwind 유틸리티 클래스로만 적용
- **날짜 계산**: 네이티브 `Date` 산술 대신 `date-fns` / `date-fns-tz`를 우선 사용
- **라이브러리 우선·환각 금지 (중요)**: 직접 짜기 전에 설치된 라이브러리 기능을 먼저 쓴다(로우코드 지양). API가 확실하지 않으면 추측하지 말고 **Context7 MCP**/공식 문서로 먼저 조회하며, **존재하지 않는 기능을 지어내지 않는다** (상세: `docs/guides/coding.md`)
- **UI 구현**: 화면/디자인 작업은 **`ui-ux-pro-max` 스킬**(+필요 시 frontend-design)을 적극 사용하고, 컴포넌트는 손으로 짜기 전에 **shadcn(`npx shadcn@latest add`) + shadcn MCP**로 추가한다 (상세: `docs/guides/coding.md`)
- **구현 중 행동 가이드**: 코드를 작성·수정·리팩터링할 때 **`karpathy-guidelines` 스킬**(안드레 카파시 가이드라인)을 켜고 최소·외과적 변경, 가정 드러내기, 검증 기준 우선 원칙을 따른다 (상세: `docs/guides/coding.md`)
- **구현 후 정리**: 작성·수정 뒤 **code-simplifier 스킬(`/simplify`)**로 불필요·중복 코드를 정리한다. 쓸모없는 코드(미사용 import/변수·죽은 분기)는 남기지 않는다
- **커밋 전 검증**: 구현 태스크는 `npm run lint` + `npm run build` → `npm run test` 순서로 통과해야 하며, **단위 테스트 작성은 필수**다. 화면 흐름이 바뀌면 **Playwright MCP**로 실제 브라우저에서 검증한다 (상세는 `docs/guides/verification.md`)

## 문서 색인 (작업 전 반드시 읽기)

작업을 시작하기 전에, 해당하는 문서를 **Read 도구로 먼저 읽고** 그 지침을 따를 것:

| 이런 작업을 시작하기 전에                          | 반드시 읽을 문서                 |
| -------------------------------------------------- | -------------------------------- |
| **화면·콘텐츠·정책 페이지·SEO (= 모든 웹서비스 작업)** | **`.claude/skills/adsense-readiness/SKILL.md`** (애드센스 심사 요건 단일 진실 공급원) |
| **크롤링·외부 API 수집 요구사항 문서화 (모노레포 인계)** | **`.claude/skills/data-jobs-spec/SKILL.md`** (`docs/DATA-JOBS.md` 작성 표준 · 요구사항만 쓰고 구현 계약은 쓰지 않음) |
| 처음 클론·환경 설정·실행                           | `docs/guides/getting-started.md` |
| 의존성 추가·교체, 기술 스택, 날짜/시간 처리        | `docs/guides/tech-stack.md`      |
| 컴포넌트·라우트·DB 접근(Drizzle)·테마·경로 별칭    | `docs/guides/architecture.md`    |
| 배포 시 스키마 반영·마이그레이션 절차              | `docs/guides/db-operations.md`   |
| UI·컴포넌트 구현, 코드 작성 (도구·라이브러리 규칙) | `docs/guides/coding.md`          |
| 태스크 완료·검증·커밋 직전                         | `docs/guides/verification.md`    |

## 문서 디렉토리 규약

- `docs/guides/` — 항상 유효한 기술/구조/검증 가이드
- `docs/archive/` — 보관 문서 (이전 버전 PRD·로드맵 등)
- `docs/workflow/` — (옵션) 기능 개발 워크플로우 문서
- 요구사항·기획 문서(PRD·ROADMAP 등)는 `docs/` 루트에 추가하고, 폐기 시 `docs/archive/`로 이동
- `docs/DATA-JOBS.md` — (수집 요구가 있을 때만) 크롤링·외부 API 잡 **요구사항 인계 문서**. 정본은 이 저장소가 소유하고, 모노레포 `wisdfire/jobhub-jobs`가 읽어 구현한다

## 이 스타터킷의 사용 흐름

1. 클론 → `npm install` → `.env.example`을 `.env.local`로 복사해 Neon 연결 문자열(`DATABASE_URL`·`DIRECT_URL`) 입력
2. 요구사항 문서를 `docs/`에 추가
3. `app/page.tsx`(랜딩)를 실제 화면으로 교체하며 개발 시작
4. 위 "문서 색인"에 따라 작업별 가이드를 먼저 읽고 진행

## 하네스 (에이전트 팀 오케스트레이터)

이 프로젝트에는 2개의 범용 하네스가 구성되어 있다. 해당 도메인 작업 요청 시 아래 오케스트레이터 스킬을 사용하라. 단순 질문은 직접 응답 가능하다. 에이전트/스킬 상세는 `.claude/agents/`·`.claude/skills/`에서 관리한다(여기 중복 기재하지 않음).

> **⚠️ 전제조건 — 실험적 플래그**: 두 하네스 모두 **에이전트 팀 조율 원시도구**(`TeamCreate`·`SendMessage`·`TaskCreate`)를 쓰며, 이는 실험적 기능으로 **`export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정된 셸에서 `claude`를 실행**해야만 제공된다. 미설정 시 팀이 **조용히 단일 에이전트로 폴백**되어(오류 없이 조율·병렬·`depends_on`이 소실) 하네스 가치가 사라진다. 각 오케스트레이터는 Phase 0에서 가용성을 확인하고 미설정 시 `Agent`(GA) 서브에이전트 폴백 모드로 분기한다.

| 하네스 | 목표 | 트리거 → 사용할 오케스트레이터 스킬 |
| ------ | ---- | ----------------------------------- |
| 풀스택 웹 개발 | 와이어프레임→디자인→프론트→백엔드→**애드센스 게이트**→QA(링크 경로 검증)를 파이프라인으로 조율 | 웹사이트/화면/풀스택 개발 요청 시 → `fullstack-web-orchestrator` |
| 리서치→PRD/ROADMAP/DATA-JOBS | 웹·학술·커뮤니티 교차검증 → PRD.md(**애드센스 100% 통과 필수**·유지보수 최소·Lighthouse 지표)·**DATA-JOBS.md(수집 요구 시 모노레포 인계 문서)**·ROADMAP.md 생성 | PRD/요구사항 정의/로드맵/시장조사/수집 요구사항 정리 요청 시 → `research-to-spec-orchestrator` |

### PRD 작성의 시작점 · 산출물

- **시드**: 이 프로젝트의 PRD는 보통 **`../auto-prd-vault/03_PRD_Docs/PRD-*.md`** 에서 파생된다. 시드는 **검증 대상 가설**로만 취급하고(그대로 복사 금지), 리서치·기술검증을 거쳐 이 저장소의 `docs/PRD.md`·`docs/ROADMAP.md`로 새로 쓴다.
- **수집 요구가 있으면 `docs/DATA-JOBS.md`를 반드시 만든다**: 크롤링·외부 API 주기 호출·배치 갱신 요구가 PRD에 하나라도 있으면, 그 **요구사항**(무슨 데이터·왜·주기·필드·신선도·유일성·적재 스키마·웹앱이 더할 편집 부가가치)을 별도 문서로 분리해 **모노레포 `wisdfire/jobhub-jobs`가 읽어 구현**하게 한다 (`data-jobs-spec` 스킬 · `data-jobs-spec-author` 에이전트).
  - ⚠️ 이 문서에 **구현 계약(`run()`·이미지 slim/browser·`jobs.yml` 크론 표현식·`on_conflict`)은 쓰지 않는다** — 모노레포가 결정한다. PRD·ROADMAP은 이 문서를 **링크·외부 의존성으로만 참조**하고 내용을 복제하지 않는다(복제 = drift).

> **🚫 Python 백엔드(크롤링·REST API·크론잡)는 이 저장소의 범위가 아니다.** 크롤링/스크래핑 워커, Python REST API, 배치·크론잡 등은 **별도 모노레포 [`wisdfire/jobhub-jobs`](https://github.com/wisdfire/jobhub-jobs)** 가 소유한다. 이 스타터킷은 **Next.js 웹서비스 전용**이다.
>
> 이 저장소에서 크롤러·파이썬 배치·ETL·데이터 파이프라인 구현을 요청받으면, **직접 구현하지 말고 `jobhub-jobs` 모노레포 소관임을 알리고 그쪽에서 작업하도록 안내**하라. 웹앱은 수집 결과가 **Neon Postgres에 이미 적재된 상태**로 도착한다고 가정하고 읽어서 렌더링하는 것까지만 담당한다 (경계 상세: `docs/guides/tech-stack.md`).
>
> **단, 요구사항은 이 저장소가 소유한다.** "무슨 데이터가 왜 필요한가"를 아는 쪽은 제품(PRD)이다. 수집 요구가 생기면 **`docs/DATA-JOBS.md`(인계 문서)** 를 만들어 모노레포가 읽고 구현하게 한다 — 요구사항은 여기, 구현은 거기.
>
> ⚠️ **제거됨(2026-07-14)**: 크롤링 워커 구현 하네스(`scraping-pipeline-build-orchestrator`·`crawl-worker-engineer`·`celery-crawl-worker`·`playwright-scraping`·`python-test-ci`·`supabase-upsert-load`·`opentofu-infra`)와 데이터 파이프라인 설계 하네스(`data-pipeline-design-orchestrator`·`pipeline-lead`·`schema-designer`·`etl-designer`·`validation-designer`·`monitoring-designer` + 스킬 4종). 재도입 요청이 오면 모노레포 이관 사실을 알려라.

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
| ---- | -------- | ---- | ---- |
| 2026-07-06 | 4개 범용 하네스 초기 구성 (에이전트 20 · 스킬 21) | 전체 | 스타터킷 자동화 체계 구축 |
| 2026-07-06 | 스크래핑 하네스에 uv 통일·pytest CI 게이트·Terraform IaC 반영 (스킬 `python-test-ci`·`terraform-infra` 신규) | scraping-pipeline-build 하네스 | 파이썬 크롤링 완성도(재현성·회귀 방지·인프라 관리) 보강 |
| 2026-07-06 | 파이썬 크롤링 기술스택 문서화 | `docs/guides/tech-stack.md`, CLAUDE.md | 크롤링 스택을 문서에 반영 요청 |
| 2026-07-07 | 테스트 규율·IaC 공통 규약을 나머지 3개 하네스에 확장 (스킬 `web-deploy-config` 신규, `terraform-infra` 재사용) | fullstack-web·data-pipeline-design·research-to-spec | 하네스별 성격에 맞춰 테스트/IaC 품질 바 전파 (코드=Vitest+vercel.ts, 문서=요구사항 명시) |
| 2026-07-07 | 크롤링 워커(MAS) 트랙 추가: 구현담당 에이전트 `crawl-worker-engineer` + 계약 스킬 `celery-crawl-worker` 신규, 오케스트레이터에 트랙 분기 반영 | scraping-pipeline-build 하네스, `docs/guides/tech-stack.md` | 별도 인프라(K3s+KEDA+Valkey+Browserless+OTel) 위 Celery 워커 구현 프롬프트를 구현담당 워커에 적용 요청 |
| 2026-07-08 | 배치 트랙 폐기·워커(MAS) 트랙 단일화: 에이전트 4종(infra·scraper·extraction·loader-engineer)·스킬 2종(docker-cicd-deploy·html-clean-llm-extract) 삭제, 오케스트레이터를 단일 구현담당(서브 에이전트) 구조로 재작성 | scraping-pipeline-build 하네스, `docs/guides/tech-stack.md` | 워커 트랙만 사용하기로 결정 |
| 2026-07-08 | IaC 표준 도구를 Terraform→OpenTofu 1.12.x로 전환 (스킬 `terraform-infra`→`opentofu-infra` 대체, 4개 하네스 참조 일괄 갱신) | 전체 하네스, `docs/guides/tech-stack.md` | IaC를 OpenTofu(topu)로 사용 요청 |
| 2026-07-08 | 4개 하네스 3회 반복 검증(28 에이전트) 후 우선순위 로드맵 전체 적용: 실험 플래그(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) 전제조건·Phase 0 프리플라이트·GA 폴백 문서화(팀 3종), `agent_type` 전용 타입명 통일, 검증 게이트 객관화, 루프 상한, cross-repo GitOps 토큰 전제, 파일번호 슬롯 주석 등 40개 편집. 검증 보고서 `docs/harness-verification-report.md` | 전체 하네스, CLAUDE.md | 하네스 검증·오류 수정 요청 |
| 2026-07-10 | 크롤링 워커 하네스를 실제 인프라 저장소(`crawling-node-infra`)에 정렬: **K3s·KEDA·Browserless·GHCR·ArgoCD GitOps·OTel/OTLP 폐기** → 단일 EC2(t4g.small, **arm64**) + Docker Compose + ECR + OIDC/SSM 배포 + prometheus_client pull 계측 + Healthchecks.io dead man's switch. 인프라 계약 8항→12항 확대(arm64·noeviction·700M 메모리·`stop_grace_period` 추가). 워커 언어는 Celery(Python) 유지 | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`·`python-test-ci`·`opentofu-infra`, `docs/guides/tech-stack.md`, CLAUDE.md | 인프라 저장소 CLAUDE.md 확인 후 하네스 정합 요청 |
| 2026-07-10 | 런타임을 **Python 3.14**로 확정. Celery 5.6.3이 3.14 미선언이므로 **prefork 스모크 테스트를 CI 게이트에 필수화**(실패 시 3.13 강등). Chromium 엔진 선택 근거(`--disable-dev-shm-usage` 전용 플래그·스텔스 도구·대상 사이트) 명문화 | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`, `docs/guides/tech-stack.md`, CLAUDE.md | Python 3.14 명시 요청 |
| 2026-07-10 | 인프라가 워커 Dockerfile까지 명시함에 따라 **버전 매트릭스를 인프라에서 파생**하도록 재정렬: 베이스 이미지를 slim→**공식 `mcr.../playwright/python:v1.61.0-noble` + `uv python install 3.14`**로 환원(이미지 내장 Python은 3.12 → **`UV_SYSTEM_PYTHON=1` 금지**로 규칙 반전), 환경변수명을 인프라 compose 규격(`CELERY_BROKER_URL` db0 / `CELERY_RESULT_BACKEND` db1 / `PYTHONUNBUFFERED`)으로 교체(기존 `VALKEY_URL`은 근거 없는 이름이었음), `-E` 이벤트 플래그(Flower 전제)·`--concurrency=1` 근거(700M 예산 + `/metrics` 단일 포트 바인딩) 명문화, uv `:latest` 금지, 이미지 실측 약 4GB 반영. 누락돼 있던 **CI 트리거(`on: push[main]` + `workflow_dispatch`, PR은 게이트만)** 보강 | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`, `docs/guides/tech-stack.md`, CLAUDE.md | 인프라 설계에 따른 워커 버전 설계 요청 |
| 2026-07-10 | 인프라 저장소가 Celery 기준으로 갱신된 뒤 2차 정렬: **큐를 `crawl:<agent>`→Celery 기본 큐 `celery`로 환원**(exporter `check-keys`가 `celery`·`unacked`·`unacked_index` 고정 — 커스텀 큐 시 `CeleryQueueBacklog` 침묵·`CeleryQueueIdle` 오탐), `task_ignore_result=True` 필수화(결과 백엔드 누적→Valkey OOM), 메트릭명을 인프라 알림 규칙에 맞춤(`crawl_task_duration_seconds`·`crawl_task_total`·`crawl_task_failures_total` 추가), 계측을 multiprocess→`worker_process_init` 1회 바인딩으로 수정 | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`, `docs/guides/tech-stack.md`, CLAUDE.md | 인프라 저장소 Celery 전환 반영 요청 |
| 2026-07-11 | **베이스 OS를 Ubuntu 24.04→26.04 LTS "Resolute Raccoon"으로 이동**: 베이스 이미지 `v1.61.0-noble`→**`v1.61.0-resolute`**(레지스트리에 `-arm64` 변형 실재 확인), CI 러너 `ubuntu-24.04-arm`→**`ubuntu-26.04-arm`**(현재 GitHub public preview — 문제 시 24.04로 임시 하향 가능). resolute는 **시스템 Python이 3.14**라, `uv python install 3.14`의 근거를 "내장 3.12 회피"→**"패치(3.14.6) uv.lock 고정으로 재현성 확보"**로 재구성하고 `UV_SYSTEM_PYTHON=1` 금지 사유·`파이썬 3.12로 되돌아감` 오류 문구를 전부 갱신. Python 3.14는 이전부터 확정 런타임이라 유지(CPython엔 LTS 등급 없음 — LTS는 OS인 Ubuntu 26.04). resolute 검증 조합·infra Dockerfile 방식은 인프라 `docs/03_cicd.md` §4-1로 재확인하도록 표기 | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`·`python-test-ci`, `docs/guides/tech-stack.md`, CLAUDE.md | Python 3.14 LTS·Ubuntu 26 환경 반영 요청 |
| 2026-07-14 | **크롤링·Python 백엔드를 모노레포 `wisdfire/jobhub-jobs`로 이관하고 하네스에서 제거** + **애드센스 심사 통과를 전 하네스의 타협 불가 게이트로 승격**. ①삭제: 에이전트 6종(`crawl-worker-engineer`·`pipeline-lead`·`schema-designer`·`etl-designer`·`validation-designer`·`monitoring-designer`), 스킬 11종(`scraping-pipeline-build-orchestrator`·`celery-crawl-worker`·`playwright-scraping`·`python-test-ci`·`supabase-upsert-load`·`opentofu-infra`·`data-pipeline-design-orchestrator`·`schema-design`·`etl-logic-design`·`data-validation-rules`·`pipeline-monitoring`) → 하네스 4개→**2개**(풀스택 웹·리서치→PRD). 검증 보고서는 `docs/archive/`로 보관 ②IaC(OpenTofu) 참조를 **배포 config-as-code(`vercel.ts`, `web-deploy-config`)** 로 대체 ③**애드센스**: `adsense-readiness` 스킬을 공식 문서 근거로 전면 재작성(**MUST 10항 / SHOULD 구분**, 출처 URL 병기)하고 CLAUDE.md 핵심 규칙·`verification.md` 커밋 전 게이트·풀스택 오케스트레이터 Phase 4.3 차단 게이트·design-architect/frontend-engineer/qa-inspector·prd-author/tech-verifier/roadmap-planner에 전파. **사실 정정**: 공식 필수 페이지는 **개인정보처리방침 1종뿐**(About·Contact·Terms는 관행), 누락돼 있던 진짜 MUST(**인증 CMP(IAB TCF)**·**HTTPS**·**`Mediapartners-Google` 차단 금지**·개인정보처리방침 구글 지정 문구) 추가, 근거 없는 "80%+·최소 분량" 기준 제거(구글은 최소 분량·통과 보장을 명시하지 않음 → **"MUST 전항 충족 + 저가치 콘텐츠 리스크 제거"** 라는 검증 가능한 게이트로 재정의) | 전체 하네스, `docs/guides/tech-stack.md`·`verification.md`, CLAUDE.md | 크롤링 업무의 모노레포 이관 + 애드센스 심사 통과 필수화 요청 |
| 2026-07-11 | **3자 검증(템플릿 vs `crawling-node-infra` vs 실워커 `slashnow`) 후 정렬**: ①베이스 이미지를 **`v1.61.0-noble`로 회귀**(인프라 §4-1·실워커 모두 noble — resolute는 미검증, 전환은 인프라 갱신 후에만. CI 러너 `ubuntu-26.04-arm`은 실워커 검증돼 유지) ②**다중 워커 규약 반영**: 컨테이너명 `worker-<워커키>`(Alloy 정적 타깃), 배포 슬롯 `/opt/crawling-worker-<워커키>`, ECR `<project>-<env>-<워커키>`, GitHub Variables 3종→**5종**(`+DEPLOY_DIR`·`SSM_PARAM_PATH`, `tofu output worker_deploy_values`), preflight 잡, **기본 `celery` 큐 공유 시 다중 워커 상호 오소비 경고** ③ScrapeGraphAI `>=3.12`→**`==2.1.5` pin**(3.x는 3.14 미지원) ④Beat 별도 서비스 규격(192M·30s·볼륨)·`shm_size: 256mb` 병행·히스토그램 버킷 0.5~300·모노레포 `paths:` 필터 필수·`allow_reuse_port`·비밀값 SSM 렌더 반영 ⑤오케스트레이터 잔재 오류 수정("에이전트당 전용 큐"·"multiprocess 계측"·`bull:*` 문구) | `celery-crawl-worker`·`crawl-worker-engineer`·`scraping-pipeline-build-orchestrator`, `docs/guides/tech-stack.md`, CLAUDE.md | 인프라·실워커 저장소와 템플릿 비교 검증 요청 |
| 2026-07-14 | **PRD 파생 경로와 수집 요구사항 인계 경로를 하네스에 명문화**. ①**시드 PRD 입력**: research-to-spec Phase 0이 `../auto-prd-vault/03_PRD_Docs/PRD-*.md`를 시드로 로드(`_workspace/00_seed_prd.md` 보존)하되 **검증 대상 가설로만 취급**(그대로 복사 금지 — 리서치·기술검증으로 재작성) ②**Phase 4.5 신설(조건부)**: PRD에 주기적 크롤링·외부 API 호출·배치 갱신 요구가 하나라도 있으면 신규 에이전트 **`data-jobs-spec-author`** 가 신규 스킬 **`data-jobs-spec`** 기준으로 **`docs/DATA-JOBS.md`**(모노레포 `wisdfire/jobhub-jobs` 인계 문서)를 생성. 수집 요구가 없으면 문서를 만들지 않는다(빈 문서 금지) ③**경계 규칙**: 인계 문서에는 **요구사항만**(무슨 데이터·왜·주기·필드·신선도·유일성 정의·적재 스키마 제안·웹앱의 편집 부가가치) 쓰고 **구현 계약(`run()`·이미지 slim/browser·`jobs.yml` 크론 표현식·`on_conflict`)은 쓰지 않는다** — 모노레포 결정권 침범 금지. PRD·ROADMAP은 링크·외부 의존성으로만 참조(내용 복제 = drift) ④tech-verifier에 **저장소 경계 검증 + 수집 소스 실재성 검증**(존재하지 않는 API 엔드포인트 전제 = Blocker) 추가, roadmap-planner는 수집 적재를 기다리지 않도록 **픽스처/시드 데이터 기반 검증 기준** 규약 추가 | `research-to-spec-orchestrator`·`prd-authoring`·`roadmap-planning`·**`data-jobs-spec`(신규)**, `prd-author`·`tech-verifier`·`roadmap-planner`·**`data-jobs-spec-author`(신규)**, `docs/guides/tech-stack.md`, CLAUDE.md | PRD가 auto-prd-vault에서 파생되고, 수집 요구는 jobhub-jobs 모노레포가 참조할 별도 문서로 분리하도록 하네스 갱신 요청 |
