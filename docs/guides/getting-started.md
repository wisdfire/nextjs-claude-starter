# 시작하기

> 이 저장소를 클론한 직후 한 번 읽고, 아래 순서대로 환경을 준비한다.

## 1. 클론 & 설치

```bash
git clone https://github.com/wisdfire/next-js-starter-kit.git
cd next-js-starter-kit
npm install
```

> `.npmrc`에 `legacy-peer-deps=true`가 설정되어 있어 별도 플래그 없이 설치된다. (이유는 `docs/guides/tech-stack.md`의 "패키지 매니저 주의" 참고)

## 2. Neon 프로젝트 생성

[Neon 콘솔](https://console.neon.tech)에서 프로젝트를 만든다.

- 리전: 아시아는 **싱가포르**(`aws-ap-southeast-1`)가 가장 가깝다 (서울·도쿄 없음).
- 생성 직후 `neondb` 데이터베이스가 함께 만들어진다.

## 3. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`을 열어 **연결 문자열 2종**을 채운다. 호스트명의 `-pooler` 유무가 유일한 차이이고, 용도가 다르다.

| 변수           | 호스트         | 용도                                        | 배포 환경 등록   |
| -------------- | -------------- | ------------------------------------------- | ---------------- |
| `DATABASE_URL` | `-pooler` 있음 | 앱 런타임·빌드                              | ✅ 등록          |
| `DIRECT_URL`   | `-pooler` 없음 | `drizzle-kit`(generate/migrate/push/studio) | ❌ **로컬 전용** |

Neon CLI로 발급하거나, 콘솔 > Project > **Connection Details**에서 복사한다.

```bash
neon connection-string --project-id <PROJECT_ID> --pooled   # → DATABASE_URL
neon connection-string --project-id <PROJECT_ID>            # → DIRECT_URL
```

> ⚠️ **출력을 그대로 붙여넣는다. 손으로 조립하지 말 것** — 호스트에 `.c-N.` 세그먼트가 들어가고 `channel_binding=require`가 붙는다.

- `NEXT_PUBLIC_SITE_URL` — 서비스 정식 도메인 (metadata의 `metadataBase` 기준). 비워두면 `http://localhost:3000`으로 폴백한다.

> DB를 당장 쓰지 않는다면 값을 비워둬도 개발 서버는 뜬다. 다만 DB 호출 코드는 런타임에 실패한다.

## 4. 데이터베이스 준비 (Drizzle ORM — 선택)

DB 테이블이 필요할 때만 진행한다. 자세한 구조는 `docs/guides/architecture.md`의 "데이터 접근 규칙", 스택 설명은 `docs/guides/tech-stack.md`를 참고한다.

1. 위 3단계에서 `DATABASE_URL`·`DIRECT_URL`을 채운다.
2. `lib/db/schema.ts`에 테이블을 정의한다. (초기엔 플레이스홀더 `example` 테이블이 들어 있다.)
3. 스키마를 DB에 반영한다.

```bash
npm run db:push       # 스키마를 DB에 즉시 반영 — 로컬 프로토타이핑 전용
# npm run db:studio   # Drizzle Studio (브라우저 DB GUI)
```

> ⚠️ **`db:push`는 첫 배포 전까지만 쓴다.** 배포 이후로는 `db:push` 대신
> `npm run db:generate`(마이그레이션 SQL 생성) → 리뷰 → `npm run db:migrate`(적용) 경로만 쓴다 —
> `db:push`는 이력을 남기지 않아 "지금 DB가 어떤 상태인지"를 코드에서 알 수 없게 만든다.
> 배포 시 스키마 반영 절차는 **[`docs/guides/db-operations.md`](./db-operations.md)** 를 따른다.

> 쿼리는 서버에서만 `import { db } from "@/lib/db"`로 사용한다. (클라이언트 컴포넌트 import 금지)
> DB에는 행 수준 보안(RLS) 같은 계층이 없다 — **"무엇을 공개할지"는 쿼리의 `where` 절이 책임진다.**

## 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 스타터킷 랜딩 페이지를 확인한다.

## 6. 요구사항 넣고 개발 시작

이 스타터킷의 목적은 **클론 후 요구사항 문서를 넣고 바로 개발을 시작**하는 것이다.

1. 요구사항·기획 문서를 `docs/`에 추가한다 (예: `docs/PRD.md`). 더 이상 쓰지 않는 문서는 `docs/archive/`로 옮긴다.
2. `app/page.tsx`(랜딩)를 실제 화면으로 교체한다.
3. 새 UI 컴포넌트는 `npx shadcn@latest add <name>`로 추가한다.
4. 작업 종류에 따라 `CLAUDE.md`의 문서 색인을 따라 해당 가이드를 먼저 읽는다.

## Claude Code 플러그인 (선택)

이 저장소는 `.claude/settings.json`에 **프로젝트 권장 플러그인 세트와 마켓플레이스**를 명시해 두었다. Claude Code로 이 프로젝트를 열면, 사용자(전역) 설정에 해당 플러그인이 없어도 프로젝트 설정 기준으로 활성화/설치가 안내된다.

- 포함 플러그인(**Anthropic 공식** `claude-plugins-official`): `vercel`, `playwright`, `frontend-design`, `typescript-lsp`, `code-review`, `code-simplifier`, `commit-commands`, `claude-md-management`, `security-guidance`
- 포함 플러그인(**서드파티 — 보안 예외 승인**): `ui-ux-pro-max`(UI/UX 디자인 인텔리전스, `ui-ux-pro-max-skill` 마켓플레이스)
- 마켓플레이스: `claude-plugins-official`(anthropics/claude-plugins-official), `ui-ux-pro-max-skill`(nextlevelbuilder/ui-ux-pro-max-skill)
- 플러그인 추가/제거는 Claude Code에서 `/plugin` 명령으로 관리한다.

> **설치 스코프 (중요)**: 위에 명시한 권장 플러그인은 반드시 **프로젝트 스코프(`.claude/settings.json`)**에 설치/등록한다. `/plugin`으로 추가할 때 저장 위치를 물으면 **사용자(전역)·local이 아니라 프로젝트(project)를 선택**해야, 설정이 git에 커밋되어 팀원·다른 머신에서도 동일하게 재현된다. (전역 설정에만 켜면 이 저장소를 클론한 다른 사람에게는 적용되지 않는다.)
> 단, 아래 "보안 원칙"에 해당하는 **서드파티 플러그인은 예외**로, 프로젝트 스코프에 커밋하지 말고 `.claude/settings.local.json`(gitignore됨) 또는 사용자(전역) 스코프에 둔다.

> **보안 원칙**: 공개 템플릿이므로 클론하는 사람의 머신에서 코드를 실행할 수 있는 플러그인은 원칙적으로 **Anthropic 1st-party 마켓플레이스(`anthropics/*`)로만** 한정한다. 서드파티(개인 GitHub) 마켓플레이스/플러그인(예: harness, karpathy 등)은 공급망(supply-chain) 위험이 있어 기본적으로 프로젝트 설정에 커밋하지 않는다. 개인적으로 쓰려면 gitignore되는 `.claude/settings.local.json` 또는 사용자(전역) 설정에 둔다.
>
> **승인된 예외**: `ui-ux-pro-max`(`nextlevelbuilder/ui-ux-pro-max-skill`)는 디자인 작업의 핵심 도구로 판단해 프로젝트 메인테이너가 검토 후 **프로젝트 스코프 커밋을 명시적으로 승인**했다. 따라서 이 플러그인과 마켓플레이스는 예외적으로 `.claude/settings.json`에 포함되어 git으로 재현된다. 다른 서드파티 플러그인을 같은 방식으로 추가하려면 동일하게 공급망 위험을 검토하고 이 목록에 명시한 뒤 커밋한다. (서드파티 마켓플레이스는 업스트림이 변경될 수 있으므로 업데이트 시 내용을 확인한다.)

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
