# 시작하기

> 이 저장소를 클론한 직후 한 번 읽고, 아래 순서대로 환경을 준비한다.

## 1. 클론 & 설치

```bash
git clone https://github.com/wisdfire/next-js-starter-kit.git
cd next-js-starter-kit
npm install
```

> `.npmrc`에 `legacy-peer-deps=true`가 설정되어 있어 별도 플래그 없이 설치된다. (이유는 `docs/guides/tech-stack.md`의 "패키지 매니저 주의" 참고)

## 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`을 열어 Supabase 프로젝트 값을 채운다. (Supabase 대시보드 > Project Settings > API)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

데이터베이스(Drizzle ORM)를 쓴다면 연결 문자열도 채운다. (Supabase 대시보드 > Project Settings > Database > Connection string)

- `DATABASE_URL` — 서버리스 환경에서는 **Transaction pooler**(포트 6543) 문자열을 권장한다. `[YOUR-PASSWORD]` 자리에 DB 비밀번호를 넣고, 비밀번호의 특수문자는 URL 인코딩한다.

> Supabase를 당장 쓰지 않는다면 값을 비워둬도 개발 서버는 뜬다. 다만 Supabase / DB 호출 코드는 런타임에 실패한다.

## 3. 데이터베이스 준비 (Drizzle ORM — 선택)

DB 테이블이 필요할 때만 진행한다. 자세한 구조는 `docs/guides/architecture.md`의 "데이터 접근 규칙", 스택 설명은 `docs/guides/tech-stack.md`를 참고한다.

1. 위 2단계에서 `DATABASE_URL`을 채운다.
2. `lib/db/schema.ts`에 테이블을 정의한다. (초기엔 플레이스홀더 `example` 테이블이 들어 있다.)
3. 스키마를 마이그레이션 SQL로 변환하고 DB에 적용한다.

```bash
npm run db:generate   # lib/db/schema.ts → drizzle/ 에 마이그레이션 SQL 생성
npm run db:migrate    # 생성된 마이그레이션을 DB에 적용
# npm run db:push     # (개발용) 마이그레이션 없이 스키마를 DB에 즉시 반영
# npm run db:studio   # Drizzle Studio (브라우저 DB GUI)
```

> 쿼리는 서버에서만 `import { db } from "@/lib/db"`로 사용한다. (클라이언트 컴포넌트 import 금지)
> Drizzle 직접 연결은 Supabase RLS의 보호를 받지 않을 수 있으니 권한 검증은 애플리케이션에서 직접 처리한다.

## 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 스타터킷 랜딩 페이지를 확인한다.

## 5. 요구사항 넣고 개발 시작

이 스타터킷의 목적은 **클론 후 요구사항 문서를 넣고 바로 개발을 시작**하는 것이다.

1. 요구사항·기획 문서를 `docs/`에 추가한다 (예: `docs/PRD.md`). 더 이상 쓰지 않는 문서는 `docs/archive/`로 옮긴다.
2. `app/page.tsx`(랜딩)를 실제 화면으로 교체한다.
3. 새 UI 컴포넌트는 `npx shadcn@latest add <name>`로 추가한다.
4. 작업 종류에 따라 `CLAUDE.md`의 문서 색인을 따라 해당 가이드를 먼저 읽는다.

## Claude Code 플러그인 (선택)

이 저장소는 `.claude/settings.json`에 **프로젝트 권장 플러그인 세트와 마켓플레이스**를 명시해 두었다. Claude Code로 이 프로젝트를 열면, 사용자(전역) 설정에 해당 플러그인이 없어도 프로젝트 설정 기준으로 활성화/설치가 안내된다.

- 포함 플러그인(모두 **Anthropic 공식** `claude-plugins-official`): `vercel`, `supabase`, `playwright`, `frontend-design`, `typescript-lsp`, `code-review`, `code-simplifier`, `commit-commands`, `claude-md-management`, `security-guidance`
- 마켓플레이스: `claude-plugins-official`(anthropics/claude-plugins-official)
- 플러그인 추가/제거는 Claude Code에서 `/plugin` 명령으로 관리한다.

> **보안 원칙**: 공개 템플릿이므로 클론하는 사람의 머신에서 코드를 실행할 수 있는 플러그인은 **Anthropic 1st-party 마켓플레이스(`anthropics/*`)로만** 한정한다. 서드파티(개인 GitHub) 마켓플레이스/플러그인(예: harness, karpathy 등)은 공급망(supply-chain) 위험이 있어 프로젝트 설정에 커밋하지 않는다. 개인적으로 쓰려면 gitignore되는 `.claude/settings.local.json` 또는 사용자(전역) 설정에 둔다.

> 플러그인 캐시(`~/.claude/plugins/`)는 각자 환경에 내려받아지며 git에 포함되지 않는다. 따라서 `enabledPlugins`만으로 환경이 재현된다.

## 자주 쓰는 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드 (타입 체크 포함)
npm run start        # 빌드 결과 실행
npm run lint         # ESLint
npm run test         # 단위 테스트 (Vitest)
npm run test:watch   # 테스트 watch 모드
npm run format       # Prettier 자동 정렬

npm run db:generate  # Drizzle: 스키마 → 마이그레이션 SQL 생성
npm run db:migrate   # Drizzle: 마이그레이션 DB 적용
npm run db:push      # Drizzle: 스키마 즉시 반영 (개발용)
npm run db:studio    # Drizzle Studio (DB GUI)
```
