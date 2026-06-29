# 코드 구현 규칙

> UI를 만들거나 코드를 구현하기 전에 이 문서를 확인할 것. 아래 규칙은 **강제**다.

이 프로젝트는 Claude Code 플러그인/스킬과 MCP 서버를 적극 활용하도록 구성돼 있다. "직접 손으로 짜기"보다 **이미 갖춰진 도구·라이브러리·공식 문서를 먼저 쓰는 것**이 기본 원칙이다.

## 1. 라이브러리·기능 우선 (로우코드 지양)

- 직접 구현하기 전에 **이미 설치된 라이브러리에 같은 기능이 있는지 먼저 확인**한다. 바퀴를 다시 만들지 않는다.
  - 날짜/시간 → `date-fns` / `date-fns-tz` (네이티브 `Date` 산술 금지)
  - 클래스 병합 → `lib/utils.ts`의 `cn()` (직접 문자열 조합 금지)
  - 토스트 → `sonner`, 아이콘 → `lucide-react`, variant 스타일 → `class-variance-authority`
  - DB 쿼리 → Drizzle `db` (raw SQL 문자열 조합보다 쿼리 빌더 우선)
- 설치된 패키지 목록은 `package.json`과 `docs/guides/tech-stack.md`에서 확인한다.
- 정말 새 의존성이 필요하면 먼저 `docs/guides/tech-stack.md`를 읽고 추가한다.

## 2. 라이브러리 API를 지어내지 말 것 (가장 중요)

- 함수 시그니처·옵션·import 경로가 **확실하지 않으면 추측하지 않는다.** 존재하지 않는 API를 만들어 쓰는 것(환각)은 금지한다.
- 구현 전 **Context7 MCP**로 최신 공식 문서를 조회한다. (`resolve-library-id` → `query-docs` 순서. 전역 규칙은 `~/.claude/rules/context7.md` 참고)
- Next.js 16은 훈련 데이터와 다른 breaking change가 있으므로 `node_modules/next/dist/docs/`의 해당 가이드를 먼저 확인한다.
- 확인이 끝나기 전에는 코드를 확정하지 않는다. "아마 이럴 것이다"로 진행하지 않는다.

## 3. UI 구성 — frontend-design 스킬 적극 사용

- 새 화면·레이아웃·시각 디자인을 만들거나 기존 UI를 다듬을 때는 **`frontend-design` 스킬을 적극 사용**해 의도적인(템플릿 같지 않은) 디자인 방향·타이포그래피·구성을 잡는다.
- 색상·간격·라운드 등은 `app/globals.css`의 디자인 토큰(CSS 변수)을 **수정하지 말고** Tailwind 유틸리티 클래스로만 적용한다. (상세: `docs/guides/architecture.md`)

## 4. 컴포넌트 생성 — shadcn/ui + MCP 적극 사용

- 새 UI 컴포넌트는 **손으로 짜기 전에 shadcn으로 추가**한다: `npx shadcn@latest add <name>`.
- shadcn 관련 작업(설치·합성·테마·레지스트리)은 **shadcn MCP / `vercel:shadcn` 스킬을 적극 활용**해 올바른 사용법과 최신 컴포넌트를 가져온다.
- 이 프로젝트의 shadcn은 **base-ui 기반**이다. 합성은 Radix의 `asChild`가 아니라 base-ui의 **`render` prop**을 쓴다. 예: `<Button render={<a href="..." />}>텍스트</Button>`.

## 5. 구현 후 — code-simplifier 스킬 적극 사용

- 코드를 작성/수정한 뒤에는 **`code-simplifier` 스킬(또는 `/simplify`)을 적극 사용**해 중복·불필요한 추상화·죽은 코드를 정리한다.
- **쓸모없는 코드 금지**: 사용하지 않는 변수·import·함수, 호출되지 않는 분기, "혹시 몰라" 남겨둔 주석 처리 코드는 남기지 않는다.
- 단, 단순화는 동작을 바꾸지 않는 선에서만 한다. 버그 탐색은 `/code-review`로 별도 수행한다.

## 6. 주석

- 초보 개발자가 흐름을 파악할 수 있도록 함수·주요 로직·비동기 처리·사이드 이펙트에 한국어 주석을 충분히 단다. (전역 규칙 — `~/.claude/CLAUDE.md`)

---

## 구현 체크리스트

코드 태스크를 마치기 전에 스스로 점검한다:

- [ ] 같은 기능을 하는 설치된 라이브러리/유틸을 먼저 찾아봤는가? (로우코드 지양)
- [ ] 사용한 라이브러리 API를 Context7/공식 문서로 확인했는가? (지어내지 않음)
- [ ] UI 작업이라면 frontend-design 방향을 적용하고, 컴포넌트는 shadcn/MCP로 추가했는가?
- [ ] code-simplifier로 불필요한 코드를 정리했는가?
- [ ] 단위 테스트를 추가/갱신했는가? (`docs/guides/verification.md`)
- [ ] 화면 흐름이 바뀌었다면 Playwright MCP로 실제 브라우저에서 확인했는가?
