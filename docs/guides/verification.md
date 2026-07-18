# 검증 가이드

> 태스크 완료·커밋 직전에 이 문서를 확인할 것.

## 커밋 전 검증 게이트

구현이 포함된 모든 태스크는 아래 순서대로 통과해야 한다. 실행 없이 "통과로 간주"하거나 단계를 건너뛰는 것은 금지한다.

1. **린트 + 빌드**

   ```bash
   npm run lint
   npm run build
   ```

2. **단위 테스트 (필수)**

   ```bash
   npm run test
   ```

3. **포맷 확인** (선택)

   ```bash
   npm run format:check   # 또는 npm run format 으로 자동 정렬
   ```

4. **애드센스 게이트 (필수 — 사용자에게 보이는 화면·콘텐츠가 바뀐 경우)**

   `adsense-readiness` 스킬의 체크리스트로 자가 점검한다. **MUST 항목이 하나라도 미충족이면 태스크를 완료로 보고하지 않는다.** 애드센스 심사 통과는 이 프로젝트의 타협 불가 목표이므로, 나중에 고치는 것이 아니라 **구현 시점에 충족**시킨다.

   최소 확인 (상세·출처는 스킬 참조):
   - **개인정보처리방침**(유일한 공식 필수 페이지)이 존재하고, 구글 지정 문구(제3자 쿠키 광고·구글 광고 쿠키·opt-out 안내)를 포함하는가
   - 새 페이지가 **복제/저가치/자동생성 콘텐츠**가 아닌가 — **수집 데이터를 원본 그대로 노출하지 않고** 요약·구조화·해설 등 편집 부가가치를 더했는가
   - **플레이스홀더·미완성("준비 중") 화면**을 남기지 않았는가 — 대표 거절 사유
   - **저가치 화면(로그인·404/500·빈 목록·스켈레톤)에 광고 슬롯을 렌더하지 않는가**
   - `app/robots.ts`가 **`Mediapartners-Google`을 차단하지 않는가**(전역 `Disallow: /` 금지)
   - **깨진 링크(404)가 없는가** — 링크 정합성은 애드센스 Site behavior 요건이다(`qa-link-integrity`)
   - 광고가 콘텐츠보다 많거나, 내비게이션·버튼과 혼동되는 배치가 아닌가

5. **다국어 게이트 (필수 — 화면·문구가 바뀐 경우)**

   이 프로젝트는 **한국어 기준 + 영어 추가 지원**이다. 규칙의 SSOT는 `.claude/skills/i18n-localization/SKILL.md`이며, 아래는 **기계적으로 확인**한다:

   ```bash
   # ① 로케일 무시 네비게이션 (영어 화면에서 404·언어 이탈)
   grep -rnE 'from "next/link"|(Link|useRouter|redirect|usePathname).*from "next/navigation"' app components hooks lib

   # ② app/ 최상위 page·layout (로케일 라우팅 우회 → 번역 미적용)
   ls app/page.tsx app/layout.tsx 2>/dev/null

   # ③ 하드코딩된 사용자 노출 문자열 (aria-label·placeholder·alt·title)
   grep -rnE '(aria-label|placeholder|alt|title)="[^"]*[가-힣][^"]*"' app components

   # ④ setRequestLocale 누락
   grep -rL "setRequestLocale" $(find app -name "page.tsx")
   ```

   ①②③④에서 **하나라도 걸리면 완료로 보고하지 않는다.** ③은 주석·테스트의 한글은 정상이므로 **JSX 속성·토스트에 한정**해 판정한다.

   ```bash
   # ⑤ 번역 정합성 — 누락·낡음·잉여·ICU 파손(플레이스홀더·영어 복수형·리치 태그)
   npm run i18n:check
   ```

   `messages/ko.json`만 손으로 고치고, `en.json`은 **커밋 훅이 LLM으로 생성**한다(`npm run i18n:translate`로 직접 실행 가능). 번역을 손봤으면 `node scripts/i18n/translate.mjs --adopt`으로 확정한다 — 안 하면 다음 실행에서 덮어써진다.
   자동 번역이라도 **커밋 diff는 사람이 본다**: `git diff --cached messages/en.json`. 훅은 구조 파손만 막고 어색한 표현은 막지 못한다.
   같은 검증을 `npm run test`의 `tests/messages.test.ts`가 다시 돌리므로(훅 우회 대비) **출력을 실제로 읽고** 판단한다.

   화면 흐름이 바뀌었으면 아래 Playwright 검증에서 **양쪽 언어를 모두** 확인한다.

## 단위 테스트 강제 규칙

> 구현 태스크에서 **단위 테스트 작성은 선택이 아니라 필수**다. 테스트 없이 "구현 완료"로 보고하지 않는다.

- **새 로직을 추가하면 그에 대한 단위 테스트를 같은 PR/커밋에 함께 작성한다.** 기존 로직을 수정하면 관련 테스트를 갱신한다.
- 우선순위(반드시 테스트):
  - `lib/`의 순수 함수·유틸리티 (입력 → 출력 분기, 경계값)
  - 서버 액션·라우트 핸들러의 비즈니스 로직 (성공/실패/권한 분기)
  - 사용자 상호작용이 있는 컴포넌트 (클릭·입력 → 상태/렌더 변화)
- 테스트 도구·위치: **Vitest + Testing Library** (`@testing-library/react`, `user-event`). 위치 규약은 `docs/guides/tech-stack.md`의 "테스트" 참고 (`*.test.ts(x)` 또는 `__tests__/`).
- 라이브러리 사용법이 헷갈리면 **Context7 MCP**로 Vitest / Testing Library 공식 문서를 먼저 조회한다. API를 추측하지 않는다.
- **커버리지보다 의미**: 단순 getter나 타입 별칭까지 테스트하라는 뜻이 아니다. 깨지면 사용자가 체감하는 **동작·분기**를 테스트한다.

## E2E / 상호작용 검증 (Playwright MCP)

화면 흐름이 바뀌는 작업(새 페이지·폼·인증 흐름·주요 사용자 시나리오)은 단위 테스트에 더해 **Playwright MCP로 실제 브라우저에서 검증**한다.

권장 절차:

1. `npm run dev`로 개발 서버를 띄운다 (기본 http://localhost:3000).
2. Playwright MCP 도구로 실제 사용자 흐름을 재현한다:
   - `browser_navigate` — 대상 URL로 이동
   - `browser_snapshot` — 접근성 트리 스냅샷으로 현재 화면 구조 확인 (스크린샷보다 검증에 유리)
   - `browser_click` · `browser_type` · `browser_fill_form` — 클릭·입력 등 상호작용
   - `browser_console_messages` · `browser_network_requests` — 콘솔 에러·요청 실패 확인
3. 기대한 화면 전환·텍스트·상태 변화가 실제로 일어나는지 확인하고, 콘솔/네트워크 에러가 없는지 본다.
4. **양쪽 언어를 모두 확인한다** (다국어는 기본값이다):
   - `/` → 한국어 렌더 · `<html lang="ko">`
   - 언어 선택 → `/en` 이동 · 영어 렌더 · `<html lang="en">`
   - 다시 한국어 선택 → `/`로 복귀 (`NEXT_LOCALE` 쿠키 유지)
   - 각 언어에서 헤더·푸터 링크가 404 없이 열리는지 (특히 개인정보처리방침)

   `browser_evaluate`로 한 번에 확인할 수 있다. **아이콘 전용 버튼의 `aria-label`은 화면에 글자가 없어 스냅샷으로는 안 보이므로 여기서만 잡힌다**:

   ```js
   () => ({
     lang: document.documentElement.lang,
     labels: [...document.querySelectorAll("button[aria-label]")].map(b => b.getAttribute("aria-label")),
     hreflang: [...document.querySelectorAll('link[rel="alternate"]')].map(l => `${l.hreflang} -> ${l.href}`),
   })
   ```

> Playwright MCP는 **수동 검증·디버깅 용도**다. 회귀를 막아야 하는 핵심 흐름은 Vitest 단위/통합 테스트로 고정해 두는 것을 우선한다.

## 기준

- `npm run build`는 TypeScript 타입 체크까지 포함한다. 타입 에러가 있으면 빌드가 실패한다.
- 테스트가 하나라도 실패하면 커밋하지 않는다.
- UI 변경은 위 Playwright MCP 절차로 실제 브라우저에서 한 번 확인한다.

## 하지 말 것 (검증 금지 규칙)

검증 단계에서 자주 게이트를 무력화하는 안티패턴이다. **전부 금지**한다.

### 테스트 신뢰성 (강제)

- **테스트를 구현에 억지로 맞추기 금지**: 테스트가 실패할 때 원인을 파악하지 않고 **기대값(assertion)만 실제 출력에 맞춰 바꿔** 통과시키지 않는다. 버그일 수 있는 출력을 정답으로 굳히는 셈이다. 테스트가 아니라 구현을 고쳐 통과시킨다.
- **`.only` / `.skip` 잔재 금지**: `it.only`·`describe.only`를 커밋에 남기지 않는다 — 다른 모든 테스트를 **조용히 건너뛰게** 해 게이트를 무력화한다. `.skip`으로 실패 테스트를 덮어두지 않는다.
- **검증 대상 자체를 모킹하지 말 것 (과도한 모킹 금지)**: 테스트하려는 그 함수·컴포넌트를 모킹하면 아무것도 검증하지 못한다. 모킹은 **외부 경계**(네트워크·DB(`vi.mock("@/lib/db")`)·시간)에만 하고, 검증 대상 단위 자체는 실제로 실행한다.

### 테스트 품질

- **구현 세부에 결합된 테스트 금지**: 내부 상태·클래스명·호출 횟수 같은 구현 디테일이 아니라 **사용자가 관찰하는 동작**(화면 텍스트·역할·상호작용 결과)을 검증한다. 리팩터링에 쉽게 깨지는 테스트를 만들지 않는다. (Testing Library 철학)
- **타이밍 의존·flaky 테스트 금지**: 고정 `sleep`·임의 타임아웃으로 렌더/응답을 기다리지 않는다. `findBy*`·`waitFor`(Testing Library), `browser_wait_for`(Playwright)로 **조건 기반 대기**를 쓴다.

### 보고 정직성

- **로그 안 읽고 "통과" 보고 금지 / 전체 스위트 실행**: 새로 추가한 테스트 하나만 돌리고 전체 통과로 보고하지 않는다. 빌드·테스트 **출력을 실제로 읽고**, 실패·경고가 있으면 그대로 보고한다. green을 넘겨짚지 않는다.

## 예외

- 문서(`docs/`, `README.md`)만 수정한 경우 빌드·테스트 게이트를 생략할 수 있다.
- 설정 파일만 바꾼 경우에도 가능하면 `npm run build`로 부팅 가능 여부는 확인한다.
- 단위 테스트가 본질적으로 무의미한 변경(순수 스타일 토큰/문구 교체 등)은 테스트 작성을 생략할 수 있으나, 그 이유를 보고에 명시한다.
