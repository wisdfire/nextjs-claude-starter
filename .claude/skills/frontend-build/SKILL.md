---
name: frontend-build
description: "Next.js 16 App Router 화면·컴포넌트·훅을 구현할 때 사용한다. page/layout 작성, Server/Client Component 구분, shadcn/ui 추가, 데이터 페칭, 링크 연결, proxy.ts 설정이 필요한 프론트엔드 구현 순간에 반드시 켠다."
---

# Frontend Build — Next.js 16 + shadcn/ui + Tailwind v4

디자인 명세를 동작하는 화면으로 구현한다. 이 프로젝트의 Next.js 16은 훈련 데이터와 다른 breaking change가 있으니 **추측 금지, 문서 우선**이다.

## 왜 문서를 먼저 보는가

Next.js 16은 관례가 바뀌었다(예: `middleware.ts` → `proxy.ts`). 훈련 데이터 기반으로 짜면 존재하지 않는 API를 부르거나 폐기된 패턴을 쓴다. 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 읽고, 불확실하면 Context7 MCP로 조회한다. **지어내지 않는다.**

## Server / Client Component 구분

- **기본은 Server Component**다. 데이터 페칭·DB 접근·비밀키 사용은 서버에서 한다.
- `"use client"`는 **필요할 때만**: 상태(`useState`)·이펙트(`useEffect`)·이벤트 핸들러·브라우저 API·클라이언트 훅이 필요한 경우.
- 이유: Server Component는 번들에 안 실려 성능이 좋고 비밀키를 안전하게 다룬다. 무분별한 `"use client"`는 이 이점을 버린다.
- 패턴: 페이지는 Server로 데이터를 받아 Client 컴포넌트에 props로 내린다(server-fetch → client-interact).

## 데이터 페칭

- **Server Component**: `async` 컴포넌트에서 직접 `await`로 데이터를 가져온다(fetch 또는 서버 전용 `import { db } from "@/lib/db"`).
- **Client Component**: 훅에서 API route를 호출한다. 응답 타입은 `_workspace/04_api_contract.md`의 shape과 **정확히** 일치시킨다.
  - 래핑된 응답(`{ items: [...] }`)은 훅에서 반드시 unwrap한다. 배열을 기대하는 곳에 래퍼 객체를 넘기면 `.map is not a function` 런타임 에러가 난다.
  - 필드 케이스(snake/camel)를 계약과 맞춘다. API가 `thumbnail_url`을 주면 타입도 `thumbnail_url`로 둔다(혹은 훅에서 변환).
- 계약이 아직 없으면 낙관적 타입 + `// TODO: 계약 확정 후 정정` 주석으로 진행하고 백엔드에 shape을 요청한다.

## 링크 & 내비게이션 (404 방지)

- 모든 `<Link href>`·`router.push()`·`redirect()`의 경로는 `_workspace/01_design_spec.md`의 **라우트 표 URL과 정확히 일치**시킨다.
- route group `(group)`은 URL에 나타나지 않는다. 파일이 `app/(app)/dashboard/create/page.tsx`면 링크는 `/dashboard/create`다(`/create` 아님, `/app/dashboard/create`도 아님).
- 동적 세그먼트는 실제 값으로 채운다: `router.push(`/posts/${id}`)`.
- 링크를 걸 때마다 "이 URL에 해당하는 page 파일이 실제로 있는가?"를 자문한다.

## shadcn/ui (base-ui 기반)

- 컴포넌트는 손으로 짜기 전에 `npx shadcn@latest add <name>`로 추가한다. 사용 예시는 shadcn MCP로 확인한다.
- 이 프로젝트 shadcn은 **base-ui 기반**이다. 합성은 Radix `asChild`가 아니라 base-ui **`render` prop**을 쓴다:
  ```tsx
  // 예: 버튼을 링크로 렌더 (base-ui render prop)
  <Button render={<Link href="/dashboard/create" />}>새 글</Button>
  ```
- shadcn에 없는 것만 직접 구현한다.

## Tailwind v4 & 디자인 토큰

- 스타일은 **Tailwind 유틸리티 클래스로만** 적용한다.
- **`app/globals.css`의 `:root`·`.dark` CSS 변수와 `@theme inline` 블록을 수정하지 않는다.** 색은 shadcn 토큰(`bg-primary`, `text-muted-foreground` 등)을 쓴다.
- 다크모드는 기존 `.dark` 토큰이 처리하므로 별도 색을 하드코딩하지 않는다.

## 다국어 (필수 · 상세는 `i18n-localization` 스킬)

> **`i18n-localization` 스킬이 단일 진실 공급원**이다. 화면·문구를 만들 때 반드시 함께 로드하라.

이 프로젝트는 **한국어 기준 + 영어 추가 지원**이며 next-intl이 이미 배선돼 있다. 구현 시 최소 규칙:

- 페이지는 **`app/[locale]/` 아래**에 만들고 `setRequestLocale(locale)`을 호출한다.
- 사용자에게 보이는 문자열은 **전부 `messages/ko.json`·`messages/en.json`**에 두고 `useTranslations`로 읽는다. `aria-label`·`placeholder`·`alt`·토스트·메타데이터까지 포함 — 아이콘 버튼의 `aria-label`이 가장 자주 새는 구멍이다.
- 링크·이동은 **`@/i18n/navigation`**의 `Link`·`useRouter`·`redirect`를 쓴다(`next/link`·`next/navigation` 금지 — 로케일 접두사가 빠져 404가 난다).
- 키를 추가하면 **두 언어 파일에 동시에** 추가한다(`tests/messages.test.ts`가 검증).
- 언어 전환 UI는 기존 `<LocaleSwitcher />`를 재사용한다.

## proxy.ts (미들웨어)

- Next.js 16에서 미들웨어 파일은 `middleware.ts`가 아니라 **`proxy.ts`**다. 이 프로젝트에는 **로케일 라우팅용 `proxy.ts`가 이미 있다** — 새로 만들지 말고 기존 파일에 필요한 로직을 더한다.
  ⚠️ 프록시는 **매 요청마다** 돈다. 하는 일이 없는 로직을 더하지 말 것 — 전 요청에 지연만 더한다.
- `matcher`에서 `/api`·`_next`·정적 파일이 제외돼 있다. 이 제외를 풀면 API 경로에 로케일 접두사가 붙어 엔드포인트가 깨진다.
- 작성 전 `node_modules/next/dist/docs/`에서 proxy 관련 문서를 확인한다.

## 단위 테스트 (Vitest) — 컴포넌트·훅과 함께 작성

컴포넌트·훅을 구현하면 **같은 단계에서 Vitest 단위 테스트를 함께 작성**한다. 이유: 화면 회귀(렌더 깨짐·상호작용 실패·훅 로직 오류)를 **배포 전에** 잡기 위해서다. 테스트 없는 컴포넌트는 다음 수정에서 조용히 깨진다.

- **테스트 파일 위치**: 소스 옆 `__tests__/` 디렉토리 또는 같은 폴더의 `*.test.tsx`(훅은 `*.test.ts`). 예: `components/post-card.tsx` → `components/__tests__/post-card.test.tsx`.
- **실행**: `npm run test`(전체) / `npm run test:watch`(변경 감지). 설정은 `vitest.config.ts`(jsdom), 셋업은 `tests/setup.ts`(jest-dom 매처 전역 등록). `globals: true`라 `describe/it/expect`는 import 없이 쓴다. `@/*` 경로 별칭도 그대로 동작한다.
- **컴포넌트 렌더·상호작용 검증**: `@testing-library/react`의 `render`·`screen`으로 화면에 기대한 내용이 나오는지 확인하고, `@testing-library/user-event`로 클릭·입력 등 상호작용을 시뮬레이션한다. 단언은 `@testing-library/jest-dom` 매처(`toBeInTheDocument`, `toHaveTextContent` 등)를 쓴다.
  ```tsx
  import { render, screen } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { PostCard } from "../post-card";

  // 렌더 검증: 전달한 제목이 화면에 보이는지 확인
  it("제목을 렌더한다", () => {
    render(<PostCard title="첫 글" />);
    expect(screen.getByText("첫 글")).toBeInTheDocument();
  });

  // 상호작용 검증: 버튼 클릭 시 콜백이 호출되는지 확인
  it("클릭 시 onOpen을 호출한다", async () => {
    const onOpen = vi.fn();
    render(<PostCard title="첫 글" onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "열기" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  ```
- **커스텀 훅 테스트**: `@testing-library/react`의 `renderHook`으로 훅을 렌더하고, 상태 변화는 `act`로 감싼다. 비동기 훅은 `waitFor`로 결과를 기다린다. API를 호출하는 훅은 `vi.fn()`/`vi.mock()`으로 fetch를 모킹해 네트워크 없이 로직만 검증한다.
- 응답 shape을 unwrap하는 훅은 **래핑된 응답을 준 뒤 언랩 결과를 단언**해 계약 불일치(`.map is not a function` 류)를 테스트로 고정한다.

## 코드 규칙

- 날짜 계산은 네이티브 `Date` 산술 대신 `date-fns`/`date-fns-tz`를 쓴다.
- 컴포넌트·훅·`useEffect`·비동기 처리에 흐름을 설명하는 한국어 주석을 충분히 단다(초보자가 따라올 수 있게).
- 최소·외과적 변경(`karpathy-guidelines`). 미사용 import·죽은 분기를 남기지 않는다.

## 산출물

- 코드: `app/`, `components/`, 훅은 `hooks/`(또는 `lib/hooks/`).
- 테스트: 소스 옆 `__tests__/` 또는 `*.test.tsx`(훅은 `*.test.ts`). `npm run test` 통과 필수.
- `_workspace/03_frontend_notes.md`: 구현 화면·컴포넌트 목록, 훅↔호출 API 매핑, 라우트별 링크 목록(QA 대조용), 작성한 테스트 목록, 미해결 TODO.

## 하지 말 것

- 라우트 표에 없는 URL로 링크를 걸지 않는다(특히 route group 접두사 누락).
- 사용자에게 보이는 문자열을 코드에 하드코딩하지 않는다(`aria-label`·토스트·메타데이터 포함) — 영어 화면에 한국어가 그대로 남는다.
- `next/link`·`next/navigation`의 `Link`·`useRouter`·`redirect`·`usePathname`을 쓰지 않는다 — `@/i18n/navigation`을 쓴다.
- `app/` 최상위에 `page.tsx`·`layout.tsx`를 만들지 않는다(로케일 라우팅 우회 → 번역 미적용).
- 계약과 다른 응답 shape을 가정하지 않는다(래핑/케이스 확인).
- `globals.css` 디자인 토큰을 수정하지 않는다.
- 컴포넌트·훅을 테스트 없이 완료 처리하지 않는다(회귀를 배포 전에 못 잡는다).
- Next.js API를 추측으로 쓰지 않는다 — 문서/Context7로 확인.
- `"use client"`를 습관적으로 page 최상단에 붙이지 않는다 — 상태·이벤트·브라우저 API가 필요한 잎 컴포넌트에만.
- 클라이언트 노출 금지 값에 `NEXT_PUBLIC_`을 붙이지 않고, **서버 전용인 `lib/db`를 클라이언트 컴포넌트로 import하지 않는다**(DB 외부 비노출 전제가 거기서 깨진다).
- 타입 에러를 `any`·`as unknown as T`로 덮지 않는다 — shape에 맞게 좁힌다.
- `console.log`·`debugger`·주석 처리한 옛 코드를 커밋에 남기지 않는다.
- 담당 밖 파일 리포맷·리네이밍을 커밋에 섞지 않는다(diff 오염).
- 테스트에서 `.only`/`.skip`으로 실패를 덮지 않고, 검증 대상 컴포넌트·훅 자체를 모킹하지 않으며(외부 경계만 모킹), 고정 `sleep` 대신 `findBy*`·`waitFor`로 대기하고, 실패 시 기대값만 바꿔 통과시키지 않는다.


## 애드센스 요건 (구현 시 필수 · 최우선)

> **`adsense-readiness` 스킬이 단일 진실 공급원**이다. 반드시 함께 로드하라. 애드센스 MUST 미충족은 검증 게이트에서 **배포를 차단**한다.

- **개인정보처리방침 페이지**(`app/privacy/page.tsx`)에 **구글 지정 문구**를 반드시 포함: 제3자(구글 포함) 쿠키 기반 광고 게재 사실 · 구글 광고 쿠키 사용 · `https://www.google.com/settings/ads`에서 opt-out 가능 안내.
- **`app/robots.ts`에서 `Mediapartners-Google`을 차단하지 않는다** — 전역 `Disallow: /` 금지(광고가 아예 게재되지 않는다).
- **저가치 화면에 광고 슬롯을 렌더하지 않는다** — 로그인·404/500·Thank you·빈 목록·스켈레톤. 라우트 단위 **광고 허용 화이트리스트**로 구현한다.
- **"준비 중" 플레이스홀더·미완성 페이지를 남기지 않는다** (대표 거절 사유).
- **수집 데이터를 원본 그대로 렌더링하지 않는다** — 요약·구조화·해설 등 편집 부가가치를 구현한다(복제 콘텐츠 금지). 수집 자체는 모노레포 `wisdfire/jobhub-jobs` 소관이며, 웹앱은 DB에 적재된 데이터를 읽어 **가공해서** 보여준다.
- **편집 뎁스를 템플릿 한 줄로 끝내지 않는다(streamprice 학습)**: 설계가 정한 `adsense-readiness` §편집 뎁스 4종 레이어를 실제로 구현한다. 특히 데이터 화면의 해설 문단은 **데이터 조건(신규/인상/동률/결측)에 따라 분기**해 렌더한다 — "N번째로 낮습니다" 같은 **한 문장에 숫자만 바꿔 끼우면** 심사관에게 대량 자동생성으로 읽힌다(전 페이지 동형 = MUST 6 리스크). 문구는 하드코딩이 아니라 조건별로 다른 `messages` 키/ICU 분기로 조립한다(i18n 경계 준수). 에버그린 가이드·방법론·FAQ 화면이 설계에 있으면 데이터 화면과 함께 구현한다(뒤로 미루면 뎁스가 비어 배포 게이트에서 막힌다).
- 광고 배치: 콘텐츠보다 광고가 많지 않게, 내비게이션·버튼과 혼동되지 않게. 라벨은 "Advertisements"/"Sponsored Links"만.
