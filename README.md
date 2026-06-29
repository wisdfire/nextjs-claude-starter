# Next.js Starter Kit

GitHub에서 클론한 뒤 **요구사항 문서를 넣어 곧바로 개발을 시작**하기 위한 Next.js 웹서비스 스타터킷입니다.

## 기술 스택

| 영역            | 스택                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| 프레임워크      | **Next.js 16** (App Router · Turbopack) · **React 19** · **TypeScript 5**                                      |
| 스타일 · UI     | **Tailwind CSS v4** · **shadcn/ui** (base-nova · base-ui) · **lucide-react** · **next-themes** · **sonner**    |
| 백엔드 · 데이터 | **Supabase** (`@supabase/ssr`) — 클라이언트/서버 분리 + 미들웨어 세션 갱신                                     |
| ORM · DB        | **Drizzle ORM** (`drizzle-orm` · `postgres` · `drizzle-kit`) — Supabase Postgres에 타입 안전 쿼리/마이그레이션 |
| 국제화 (옵션)   | **next-intl** — 설치만 되어 있고 라우팅 미연결. 다국어가 필요할 때 연결 (상세는 tech-stack 가이드)             |
| 분석            | **@vercel/analytics** · **@vercel/speed-insights**                                                             |
| 날짜/시간       | **date-fns v4** · **date-fns-tz v3**                                                                           |
| 테스트          | **Vitest v4** · **Testing Library** (jsdom)                                                                    |
| 포맷 · 린트     | **Prettier** (+ tailwindcss 플러그인) · **ESLint**                                                             |

> 모든 의존성은 Context7 공식 문서를 기준으로 최신 버전으로 설치되었습니다. 상세는 [`docs/guides/tech-stack.md`](docs/guides/tech-stack.md) 참고.

## 빠른 시작

```bash
git clone https://github.com/wisdfire/next-js-starter-kit.git
cd next-js-starter-kit
npm install

cp .env.example .env.local   # Supabase 키 입력
npm run dev                  # http://localhost:3000
```

자세한 절차는 [`docs/guides/getting-started.md`](docs/guides/getting-started.md)를 참고하세요.

## 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드 (타입 체크 포함)
npm run start        # 빌드 결과 실행
npm run lint         # ESLint
npm run test         # 단위 테스트 (Vitest)
npm run test:watch   # 테스트 watch 모드
npm run test:ui      # Vitest UI 모드
npm run format       # Prettier 자동 정렬
npm run format:check # Prettier 포맷 검사 (수정 없이 확인만)
npm run db:generate  # Drizzle: 스키마 → 마이그레이션 SQL 생성
npm run db:migrate   # Drizzle: 마이그레이션 DB 적용
npm run db:push      # Drizzle: 스키마를 DB에 즉시 반영 (개발용)
npm run db:studio    # Drizzle Studio (DB GUI)
```

## 프로젝트 구조

```
app/                  # App Router 라우트 (layout · page · globals.css)
components/
  ui/                 # shadcn/ui 컴포넌트 (base-nova)
  theme-provider.tsx  # 다크모드 컨텍스트
  theme-toggle.tsx    # 테마 전환 버튼
lib/
  utils.ts            # cn() 클래스 병합 헬퍼
  supabase/           # client · server · middleware 클라이언트
  db/                 # Drizzle ORM (index 클라이언트 · schema)
drizzle.config.ts     # drizzle-kit 설정
proxy.ts              # Next.js 16 미들웨어 (Supabase 세션 갱신)
tests/                # Vitest 전역 셋업
docs/                 # 프로젝트 문서 (guides · archive · workflow)
CLAUDE.md             # Claude Code용 문서 색인(라우터)
```

## 문서

- [`CLAUDE.md`](CLAUDE.md) — 작업 종류별 문서 색인 (Claude Code 진입점)
- [`docs/guides/getting-started.md`](docs/guides/getting-started.md) — 클론 후 환경 설정
- [`docs/guides/tech-stack.md`](docs/guides/tech-stack.md) — 기술 스택 상세
- [`docs/guides/architecture.md`](docs/guides/architecture.md) — 디렉토리·아키텍처
- [`docs/guides/coding.md`](docs/guides/coding.md) — UI·코드 구현 규칙 (도구·라이브러리·MCP)
- [`docs/guides/verification.md`](docs/guides/verification.md) — 커밋 전 검증 게이트 (단위 테스트·Playwright MCP)

## 라이선스

MIT
