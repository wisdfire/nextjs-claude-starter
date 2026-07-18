---
name: i18n-localization
description: "다국어(i18n) 구현 규칙의 단일 진실 공급원. 한국어가 기준 언어이고 영어를 추가 지원한다. 화면·컴포넌트·문구·메타데이터·라우팅을 다루는 모든 작업(설계·프론트 구현·백엔드 응답·QA·PRD)에서 반드시 로드한다. 사용자에게 보이는 문자열을 코드에 하드코딩하지 않게 하고, 로케일 라우팅·hreflang·번역 키 정합성을 강제한다."
---

# 다국어(i18n) — 한국어 기준 · 영어 추가 지원

이 프로젝트의 모든 웹서비스는 **한국어를 기준 언어**로 하고 **영어를 추가로 지원**한다.
사용자는 화면에서 언어를 직접 선택해 전환할 수 있어야 한다.

> **이 문서가 i18n 규칙의 단일 진실 공급원(SSOT)이다.** 다른 스킬·에이전트는 이 문서를 참조하고 규칙을 복제하지 않는다.

## 확정된 설계 (변경 금지 — 바꾸려면 사용자 승인 필요)

| 항목       | 값                                                                 | 이유                                                                                                      |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 라이브러리 | `next-intl` (설치·배선 완료)                                       | Next.js 16 App Router·Server Component 네이티브 지원                                                      |
| 기준 언어  | `ko` (`defaultLocale`)                                             | 한국어가 원본. 번역이 없으면 한국어로 폴백                                                                |
| 추가 언어  | `en`                                                               |                                                                                                           |
| URL 전략   | `localePrefix: "as-needed"`                                        | 한국어=`/about`, 영어=`/en/about`. 언어별 URL이 분리돼야 검색엔진이 따로 색인하고 hreflang을 붙일 수 있다 |
| 번역 깊이  | **코드가 정의한 UI 전부(정적 + 동적) · DB 콘텐츠는 번역하지 않음** | 아래 「번역 경계」 참조. 검토 없는 콘텐츠 기계번역은 애드센스 거절 사유                                   |
| 번역 생산  | **`messages/ko.json`이 원본 · `en.json`은 LLM이 생성**             | 사람이 두 파일을 수기 동기화하면 반드시 어긋난다. 생성은 자동, 검증은 기계가 한다                         |

## 🚧 번역 경계 — 무엇을 번역하고 무엇을 번역하지 않는가 (가장 중요)

이 경계를 넘으면 **애드센스 거절 사유**(scaled content abuse)가 된다. 판단 기준은 하나다:
**"이 문자열이 코드에 정의돼 있는가, DB에서 오는가?"**

|          | 번역한다 (`messages/*.json`)                                                                                                                                                                                                                         | 번역하지 않는다 (원문 그대로)                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **출처** | 코드가 정의한 값                                                                                                                                                                                                                                     | DB·외부 API·사용자 입력                                                               |
| **예시** | 버튼·라벨·안내 문구 · `aria-label`·`placeholder`·`alt` · 토스트·에러 메시지 · 폼 검증 문구 · 빈 상태 · **상태/카테고리 열거값**(`published`/`draft`) · **복수형**(`{count, plural, …}`) · **보간 문구**(`{name} 님이 작성`) · 상대 시간 · 메타데이터 | 수집된 게시물 **제목·본문** · 사용자가 쓴 댓글 · 업로드 파일명 · 외부 API가 준 설명문 |
| **개수** | 유한하고 코드와 함께 변한다                                                                                                                                                                                                                          | 무한하고 계속 늘어난다                                                                |

⚠️ **DB에서 온 텍스트를 LLM으로 번역해 쌓지 않는다.** 그것이 구글이 말하는 "human review 없는 machine-translated text"이며 대량으로 쌓이는 순간 저가치·자동생성 콘텐츠로 판정된다. 열거값(카테고리·상태)은 **코드에 키로 정의해** 번역하고, DB에는 그 키만 저장한다.

```tsx
// ❌ DB 값을 그대로 화면 문구로 쓰거나 번역 대상으로 삼는다
<Badge>{post.status}</Badge>              // "published" 가 영어 화면에도 한국어 화면에도 그대로
<Badge>{translate(post.status)}</Badge>   // 런타임 번역 — 하지 않는다

// ✅ DB에는 키만 두고, 표시 문구는 messages 에서 온다
<Badge>{t(`status.${post.status}`)}</Badge>   // messages: status.published / status.draft
```

## 배선된 파일 (이미 존재 — 새로 만들지 말 것)

```
i18n/routing.ts        # 로케일 목록·기본값·URL 전략 (SSOT)
i18n/navigation.ts     # 로케일 인식 Link·useRouter·usePathname·redirect·getPathname
i18n/request.ts        # 요청별 로케일 판별 + messages 로드
proxy.ts               # 로케일 라우팅 미들웨어 (Next.js 16은 middleware.ts가 아니라 proxy.ts)
next.config.ts         # createNextIntlPlugin() 래핑
messages/ko.json       # 한국어 번역 — 원본(SSOT). 사람이 고치는 유일한 번역 파일
messages/en.json       # 영어 번역 — LLM 생성물. 직접 고쳤으면 --adopt 로 확정한다
messages/.translations.lock.json  # ko 값의 지문(번역 최신성 판정) — 직접 수정 금지
scripts/i18n/check.mjs      # 번역 정합성 검증 (LLM 없음)
scripts/i18n/translate.mjs  # ko → en LLM 번역 (Claude Code 헤드리스)
.githooks/pre-commit        # ko.json 커밋 시 자동 번역·검증
components/locale-switcher.tsx   # 언어 선택 드롭다운 (재사용 — 다시 만들지 말 것)
app/[locale]/layout.tsx          # 루트 레이아웃 (lang·hreflang·NextIntlClientProvider)
tests/messages.test.ts           # 번역 정합성 회귀 테스트 (CI 게이트)
```

## MUST — 어기면 완료로 보지 않는다

### 1. 사용자에게 보이는 문자열을 코드에 하드코딩하지 않는다

**모든** 사용자 노출 문자열은 `messages/*.json`에서 온다. 놓치기 쉬운 것들:

- `aria-label` · `alt` · `title` · `placeholder` (아이콘 전용 버튼이 특히 위험 — 화면에 글자가 없어 리뷰에서 안 보인다)
- 토스트·에러 메시지·빈 상태 문구·확인 다이얼로그
- `generateMetadata`의 `title`·`description`
- 폼 검증 메시지

```tsx
// ❌ 영어 화면에서도 한국어가 그대로 남는다
<Button aria-label="테마 전환">

// ✅
const t = useTranslations("ThemeToggle");
<Button aria-label={t("label")}>
```

### 2. 네비게이션은 반드시 `@/i18n/navigation`에서 가져온다

```tsx
// ❌ 로케일 접두사가 빠져 영어 화면에서 한국어로 튕기거나 404
import Link from "next/link";
import { useRouter, redirect } from "next/navigation";

// ✅ 현재 로케일을 유지한 채 이동
import { Link, useRouter, redirect } from "@/i18n/navigation";
```

`usePathname`도 마찬가지다 — `@/i18n/navigation`의 것은 **로케일 접두사를 제거한** 경로를 준다(언어 전환에 필요).
예외: `next/navigation`의 `useSearchParams`·`useParams`는 그대로 쓴다(로케일과 무관).

### 3. 새 페이지는 `app/[locale]/` 아래에 만들고 `setRequestLocale`을 호출한다

```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale); // 없으면 정적 렌더링이 해제돼 Lighthouse 성능이 떨어진다
  // ...
}
```

`app/` 최상위에 `page.tsx`·`layout.tsx`를 만들지 않는다(로케일 라우팅을 우회해 번역이 적용되지 않는다).
단 `robots.ts`·`sitemap.ts`·`favicon.ico`처럼 로케일이 없는 파일은 `app/` 최상위에 둔다.

### 3-A. 동적 UI 문구도 전부 messages 에서 온다

정적 JSX 문구만 번역하고 런타임에 조립되는 문구를 놓치는 것이 가장 흔한 누락이다.
아래는 **전부 번역 대상**이며, ICU 문법으로 `messages`에 넣는다.

```jsonc
{
  "Post": {
    // 복수형 — 한국어는 구분이 없지만 영어는 one/other 를 모두 갖춰야 한다
    "count": "{count, plural, other {게시물 #개}}",
    // 보간 — 어순이 언어마다 다르므로 문장을 코드에서 이어붙이지 않는다
    "author": "{name} 님이 작성",
  },
  "Status": {
    // 열거값 — DB에는 published/draft 키만 저장하고 표시 문구는 여기서 온다
    "published": "공개",
    "draft": "초안",
  },
  "Errors": {
    // 서버가 내려준 에러 코드 → 화면 문구 매핑
    "INVALID_EMAIL": "이메일 형식이 올바르지 않습니다",
    "RATE_LIMITED": "요청이 너무 많습니다. 잠시 후 다시 시도하세요",
  },
}
```

```tsx
// ❌ 문장을 코드에서 조립한다 — 영어 어순으로 바꿀 수 없다
<p>{count}개의 게시물</p>
<p>{post.author} 님이 작성</p>
toast.error("이메일 형식이 올바르지 않습니다");

// ✅ 완성된 문장을 messages 가 소유하고, 코드는 값만 넘긴다
<p>{t("Post.count", { count })}</p>
<p>{t("Post.author", { name: post.author })}</p>
toast.error(t(`Errors.${code}`));
```

- **서버 에러**: 백엔드는 **코드**(`INVALID_EMAIL`)를 내려주고 프론트가 번역을 찾는다. 서버가 완성된 한국어 문장을 주면 영어 화면에서 번역할 방법이 없다.
- **날짜·숫자·상대시간**: 문자열로 만들지 말고 `useFormatter()`의 `format.dateTime`·`format.number`·`format.relativeTime`을 쓴다.
- **키가 동적일 때**(`t(\`Errors.${code}\`)`) 가능한 코드 값이 전부 messages 에 있는지 확인한다 — 없으면 화면에 `Errors.FOO`가 그대로 뜬다. 백엔드는 발생 가능한 코드를 `04_api_contract.md`에 열거한다.

### 4. 한국어만 쓴다 — 영어는 LLM이 생성한다

**`messages/ko.json`만 손으로 고친다.** `en.json`은 생성물이므로 수기로 동기화하지 않는다(사람이 두 파일을 맞추면 반드시 어긋난다).

```bash
npm run i18n:check       # 누락·낡음·잉여·ICU 파손 검사 (LLM 호출 없음)
npm run i18n:translate   # 바뀐 키만 LLM 번역 (Claude Code 헤드리스)
```

**커밋 시 자동 실행된다**: `.githooks/pre-commit`이 `messages/ko.json`이 스테이징된 커밋을 감지하면, 바뀐 키만 번역해 `en.json`·lock 파일을 함께 스테이징한다. (`npm install`의 `prepare`가 `core.hooksPath`를 `.githooks`로 설정하며 활성화된다.)

동작 방식:

- **원본은 ko** — `en.json`은 `ko.json`에서 파생된다.
- **바뀐 것만 번역** — `messages/.translations.lock.json`이 번역 시점의 ko 값 지문을 갖고 있어, ko가 바뀐 키만 다시 번역한다(비용·diff 최소화).
- **ko에서 지운 키는 en에서도 자동 정리**된다.
- **LLM 출력을 기계 검증**한다 — 플레이스홀더 누락, **영어 복수형 `one` 카테고리 누락**, 리치 태그 소실, 빈 값을 잡아내고 하나라도 걸리면 **커밋을 중단**한다.
  ⚠️ 이 검증은 장식이 아니다. LLM은 `{count, plural, other {# post}}`처럼 `one`을 빠뜨려 **"5 post"** 를 만드는 실수를 실제로 한다.
- **번역을 손으로 고쳤으면** `node scripts/i18n/translate.mjs --adopt`으로 확정한다. 안 하면 다음 실행에서 LLM 번역으로 덮어쓴다.
- 훅을 건너뛴 커밋(`--no-verify`)에 대비해 **`npm run test`가 같은 검증을 다시 돌린다**(CI 게이트).

⚠️ **자동 생성된 번역도 커밋에 남는다 — diff를 확인하라**: `git diff --cached messages/en.json`. 훅은 구조 파손만 막지, 어색한 표현·용어 불일치는 사람이 본다.

기타 규칙:

- 키가 빠지면 그 언어에서 원문 키(`Home.title`)가 화면에 그대로 노출된다 → 애드센스가 **미완성 페이지**로 판정한다.
- `tests/messages.test.ts`를 삭제하거나 skip하지 않는다.
- 네임스페이스는 화면·컴포넌트 단위로 나눈다(`Home`, `LocaleSwitcher`, `Metadata`, `Errors`, `Status`, …).

### 5. 언어 전환 UI를 제공한다

- `components/locale-switcher.tsx`(`<LocaleSwitcher />`)를 **재사용**한다. 새로 만들지 않는다.
- 전역 헤더·네비게이션에 배치해 **모든 화면에서 접근 가능**해야 한다.
- 언어 라벨은 그 언어 자체 표기(한국어 / English)로 쓴다 — 읽지 못하는 언어로 적으면 찾을 수 없다.

### 6. 로케일별 메타데이터와 hreflang을 붙인다 (애드센스·SEO 직결)

- `generateMetadata`에서 `getTranslations({ locale, namespace: "Metadata" })`로 title·description을 번역한다.
- `alternates.languages`로 언어별 URL(hreflang)을 선언한다 — 없으면 검색엔진이 **중복 콘텐츠**로 판정할 수 있다.
- `metadataBase`(`NEXT_PUBLIC_SITE_URL`)를 설정해 절대 URL로 출력되게 한다(구글은 hreflang에 절대 URL을 요구).
- **본문이 번역되지 않은 문서**(한국어 원문만 있는 콘텐츠)는 영어 라우트에서 `canonical`을 한국어 URL로 지정하고 `hreflang="en"`을 **붙이지 않는다**. 같은 본문을 두 URL로 색인시키면 복제 콘텐츠가 된다.

### 7. 날짜·숫자는 로케일 포맷터로 출력한다

- next-intl의 `useFormatter()`(`format.dateTime`·`format.number`·`format.relativeTime`)를 쓴다.
- `date-fns`를 쓸 때는 로케일을 넘긴다(`import { ko, enUS } from "date-fns/locale"`).
- 네이티브 `Date` 산술·수동 문자열 조립 금지(프로젝트 전역 규칙).

## SHOULD

- 서버가 내려주는 **데이터**(DB 콘텐츠)는 번역 대상이 아니다 — 번역은 UI 층의 책임이다. API 응답에 한국어 UI 문구를 담아 보내지 않는다.
- 에러 메시지는 백엔드가 **코드**(`INVALID_EMAIL`)를 주고 프론트가 그 코드로 번역을 찾는 방식이 좋다. 백엔드가 완성된 한국어 문장을 주면 영어 화면에서 번역할 수 없다.
- 텍스트 길이는 언어마다 다르다(영어가 한국어보다 길어지는 경우가 많다). 고정 폭 버튼·한 줄 고정 레이아웃은 넘침을 확인한다.
- 언어를 추가할 때는 `i18n/routing.ts`의 `locales`와 `LOCALE_LABELS`, `messages/<locale>.json`만 건드린다. 로케일 목록을 다른 곳에 복제하지 않는다.

## 하지 말 것

- 사용자 노출 문자열 하드코딩(특히 `aria-label`·토스트·메타데이터).
- **문장을 코드에서 조립**(`{count}개의 게시물`) — 어순이 다른 언어로 옮길 수 없다. ICU 보간·복수형을 쓴다.
- `next/link`·`next/navigation`의 `Link`·`useRouter`·`redirect`·`usePathname` 사용.
- `app/` 최상위에 페이지·레이아웃 생성.
- **`messages/en.json`을 손으로 고치고 `--adopt` 없이 두기** — 다음 번역에서 덮어써진다.
- **`messages/.translations.lock.json` 직접 수정** — 최신성 판정이 망가져 낡은 번역이 통과한다.
- **DB·사용자 입력·수집 콘텐츠를 LLM으로 번역해 쌓기** — 애드센스 거절 사유(scaled content abuse). 열거값은 코드에 키로 정의해 번역하고 DB에는 키만 저장한다.
- **번역 검증 실패를 `--no-verify`로 우회해 커밋** — CI(`npm run test`)에서 어차피 막히고, 그 사이 영어 화면이 깨진다.
- 번역이 없다는 이유로 **"준비 중"·빈 화면**을 노출(대표 거절 사유). 번역이 없으면 한국어 원문으로 폴백한다.
- `tests/messages.test.ts` 삭제·skip.

## 검증 (완료 전 필수)

```bash
npm run i18n:check                        # 번역 정합성 (누락·낡음·ICU 파손)
npm run lint && npm run build && npm run test
```

추가로 화면 흐름이 바뀌면 **Playwright MCP로 양쪽 언어를 실제로 확인**한다:

1. `/` 접속 → 한국어 렌더 · `<html lang="ko">`
2. 언어 선택 → `/en` 이동 · 영어 렌더 · `<html lang="en">` · **아이콘 버튼 `aria-label`까지 영어인지**
3. 다시 한국어 선택 → `/`로 복귀 · `NEXT_LOCALE` 쿠키 유지
4. 각 언어에서 헤더·푸터 링크가 **해당 로케일 경로로** 연결되는지(404 없음)
5. `<link rel="alternate" hreflang>`·`canonical`이 절대 URL로 출력되는지

```js
// Playwright에서 한 번에 확인
() => ({
  lang: document.documentElement.lang,
  labels: [...document.querySelectorAll("button[aria-label]")].map((b) =>
    b.getAttribute("aria-label"),
  ),
  hreflang: [...document.querySelectorAll('link[rel="alternate"]')].map(
    (l) => `${l.hreflang} -> ${l.href}`,
  ),
});
```
