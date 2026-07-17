# 아키텍처 가이드

> 컴포넌트·라우트·DB 접근(Drizzle)·테마·경로 별칭 관련 작업 전에 이 문서를 확인할 것.

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
│   └── db/                 # Drizzle ORM (Neon Postgres) — 유일한 DB 접근 경로
│       ├── index.ts        # 서버 전용 db 클라이언트 (postgres-js)
│       └── schema.ts       # 테이블 스키마 (pgTable)
├── drizzle.config.ts       # drizzle-kit 설정 (generate/migrate/push/studio) — DIRECT_URL 사용
├── drizzle/                # 생성된 마이그레이션 SQL (db:generate 시 생성)
├── tests/setup.ts          # Vitest 전역 셋업
└── docs/                   # 프로젝트 문서 (이 디렉토리)
```

## 경로 별칭

- `@/*` → 프로젝트 루트. `tsconfig.json`과 `vitest.config.ts` 양쪽에 설정되어 있다.
  - 예: `import { cn } from "@/lib/utils"`

## 데이터 접근 규칙 — 서버사이드 Drizzle 단일 경로

**DB로 가는 길은 `lib/db` 하나뿐이다.** 브라우저가 DB에 직접 붙는 경로는 없다.

| 목적                                | 사용할 것                          | 비고                         |
| ----------------------------------- | ---------------------------------- | ---------------------------- |
| 타입 안전한 테이블 CRUD·복잡한 쿼리 | `lib/db`의 `db` (Drizzle)          | **서버에서만** import        |
| 스키마 정의·마이그레이션            | `lib/db/schema.ts` + `drizzle-kit` | `db:generate` → `db:migrate` |

- **Drizzle `db`는 서버 전용**이다. 서버 컴포넌트·라우트 핸들러·서버 액션에서만 `import { db } from "@/lib/db"`. 클라이언트 컴포넌트에서 import 금지(DB 자격증명·드라이버가 번들에 들어가면 안 됨).
- 공개 데이터는 서버에서 읽어 **ISR로 내보낸다.** 클라이언트에 DB 자격증명을 내보내는 경로를 새로 만들지 않는다.
- ⚠️ **"무엇을 공개할지"는 쿼리의 `where` 절이 책임진다.** DB에 그것을 걸러 줄 계층(RLS 등)이 없으므로, 공개 조건(예: `published = true`)을 빠뜨리면 미공개 데이터가 그대로 나간다. 권한 검증은 애플리케이션 레벨에서 직접 처리한다. (배경: `docs/guides/tech-stack.md`)
- 마이그레이션 워크플로우: `lib/db/schema.ts` 수정 → `npm run db:generate`(SQL 생성) → 검토 → `npm run db:migrate`(적용). `npm run db:push`는 **로컬 프로토타이핑 전용**이다 — 배포 시 스키마 반영 절차는 `docs/guides/db-operations.md`를 따른다.

## 테마(다크모드)

- `app/layout.tsx`의 `<html>`에 `suppressHydrationWarning`이 설정되어 있다 (next-themes가 클라이언트에서 클래스를 바꾸기 때문).
- 테마 토글은 `components/theme-toggle.tsx`. `useTheme()`의 `resolvedTheme`을 기준으로 토글한다.

## shadcn/ui 디자인 토큰 규칙

- **금지**: `app/globals.css`의 `:root`·`.dark` CSS 변수 및 `@theme inline` 블록을 임의로 추가·변경하지 말 것.
- 스타일은 Tailwind 유틸리티 클래스로만 적용한다.
- 새 컴포넌트는 손으로 짜기보다 `npx shadcn@latest add <name>`로 추가하는 것을 우선한다.
