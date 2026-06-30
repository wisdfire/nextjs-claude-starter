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
