# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**프로젝트**: Next.js Starter Kit (`next-js-starter-kit`) — GitHub에서 클론한 뒤 요구사항 문서를 넣어 곧바로 개발을 시작하기 위한 Next.js 웹서비스 스타터킷. Next.js 16 · Tailwind v4 · shadcn/ui(base-nova) · Supabase · Vitest 기반.

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
| 처음 클론·환경 설정·실행                           | `docs/guides/getting-started.md` |
| 의존성 추가·교체, 기술 스택, 날짜/시간 처리        | `docs/guides/tech-stack.md`      |
| 컴포넌트·라우트·Supabase 클라이언트·테마·경로 별칭 | `docs/guides/architecture.md`    |
| UI·컴포넌트 구현, 코드 작성 (도구·라이브러리 규칙) | `docs/guides/coding.md`          |
| 태스크 완료·검증·커밋 직전                         | `docs/guides/verification.md`    |

## 문서 디렉토리 규약

- `docs/guides/` — 항상 유효한 기술/구조/검증 가이드
- `docs/archive/` — 보관 문서 (이전 버전 PRD·로드맵 등)
- `docs/workflow/` — (옵션) 기능 개발 워크플로우 문서
- 요구사항·기획 문서(PRD·ROADMAP 등)는 `docs/` 루트에 추가하고, 폐기 시 `docs/archive/`로 이동

## 이 스타터킷의 사용 흐름

1. 클론 → `npm install` → `.env.example`을 `.env.local`로 복사해 Supabase 키 입력
2. 요구사항 문서를 `docs/`에 추가
3. `app/page.tsx`(랜딩)를 실제 화면으로 교체하며 개발 시작
4. 위 "문서 색인"에 따라 작업별 가이드를 먼저 읽고 진행

## 하네스 (에이전트 팀 오케스트레이터)

이 프로젝트에는 4개의 범용 하네스가 구성되어 있다. 해당 도메인 작업 요청 시 아래 오케스트레이터 스킬을 사용하라. 단순 질문은 직접 응답 가능하다. 에이전트/스킬 상세는 `.claude/agents/`·`.claude/skills/`에서 관리한다(여기 중복 기재하지 않음).

| 하네스 | 목표 | 트리거 → 사용할 오케스트레이터 스킬 |
| ------ | ---- | ----------------------------------- |
| 풀스택 웹 개발 | 와이어프레임→디자인→프론트→백엔드→QA(링크 경로 검증)를 파이프라인으로 조율 | 웹사이트/화면/풀스택 개발 요청 시 → `fullstack-web-orchestrator` |
| 데이터 파이프라인 설계 | 스키마·ETL·검증규칙·모니터링을 계층적 위임으로 설계(문서 산출) | 데이터 파이프라인/스키마/ETL/모니터링 설계 요청 시 → `data-pipeline-design-orchestrator` |
| 리서치→PRD/ROADMAP | 웹·학술·커뮤니티 교차검증 → PRD.md(애드센스 80%+·유지보수 최소·Lighthouse 지표)·ROADMAP.md 생성 | PRD/요구사항 정의/로드맵/시장조사 요청 시 → `research-to-spec-orchestrator` |
| 크롤링 워커 구현 | 별도 인프라(K3s+KEDA+Valkey+Browserless+OTel) 위 Celery 크롤링 워커(MAS) 구현 + GHCR·GitOps 배포 (Factory 확장, 구현담당 crawl-worker-engineer) | 스크래퍼/크롤러/수집 파이프라인/크롤링 워커/새 사이트·에이전트 추가/Celery/KEDA 요청 시 → `scraping-pipeline-build-orchestrator` |

> **데이터 수집·크롤링(Python) 스택**은 Next.js 앱과 분리된 별도 서비스다: uv · Python 3.14 · Celery 5.6+Valkey+Beat · Playwright 1.61 sync+Browserless CDP · 하이브리드 파싱(Locator 80% + ScrapeGraphAI 폴백 20%) · Pydantic v2 · OTel · GHCR+GitOps 배포 · pytest(CI 게이트). IaC 표준 도구는 **OpenTofu 1.12.x**(`opentofu-infra` 스킬, Terraform 대체). 상세는 `docs/guides/tech-stack.md`의 "데이터 수집·크롤링(Python)" 섹션 참고.

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
