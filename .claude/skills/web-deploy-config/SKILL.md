---
name: web-deploy-config
description: "Next.js 웹앱의 배포 설정을 config-as-code로 관리하고 Vercel에 배포할 때 반드시 사용. vercel.ts 타입 설정, 환경변수(vercel env), 프리뷰/프로덕션 배포, CI 게이트를 다룬다. '배포', 'deploy', 'vercel', '환경변수', 'config', '프로덕션 배포', '프리뷰' 요청 시 즉시 로드."
---

# Web Deploy Config — Vercel config-as-code

Next.js 웹앱의 **배포 설정을 코드로 관리(config-as-code)** 하고 Vercel에 배포하는 규약이다. 스크래핑 하네스의 Terraform IaC에 대응하는 이 스택의 등가물이다.

## 왜 config-as-code인가 (IaC 등가물)

이 스택의 인프라(빌드·CDN·서버리스 함수·크론)는 **Vercel이 관리**한다. 그래서 EC2를 프로비저닝하는 Terraform 대신, 프로젝트 설정 자체를 **버전관리되는 코드(`vercel.ts`)** 로 둔다. 이유:

- **재현성**: 설정이 코드라서 누구든 같은 상태를 다시 만든다.
- **리뷰 가능**: 설정 변경이 PR diff로 드러나 코드리뷰를 거친다.
- **drift 방지**: 대시보드에서 손으로 바꾼 설정과 코드가 어긋나는 상태(drift)를 없앤다.

콘솔에서 클릭으로 바꾸지 말고, 설정 변경은 항상 `vercel.ts`를 고쳐 커밋한다.

## vercel.ts (타입 설정) — 핵심

`@vercel/config`를 써서 프로젝트 설정을 **타입 안전한 TypeScript**로 작성한다. 이는 `vercel.json`을 대체한다(둘 다 두면 안 됨 — `vercel.ts`가 우선하며 혼용은 혼란을 부른다).

- **설치**: `npm i @vercel/config`
- **작성**: 프로젝트 루트에 `vercel.ts`를 두고 `config`를 named export 한다.

```ts
// vercel.ts — 배포 설정을 코드로 관리 (버전관리 대상)
import { routes, deploymentEnv, type VercelConfig } from "@vercel/config/v1";

/**
 * Vercel 프로젝트 설정
 * - 빌드 명령·프레임워크, 리라이트/리다이렉트, 응답 헤더, 크론을 한곳에서 코드로 선언한다.
 * - 대시보드 수동 변경 대신 이 파일을 고쳐 커밋해 drift를 막는다.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",

  // 리라이트: 외부 API로 프록시 (routes 헬퍼로 타입 안전하게 작성)
  rewrites: [routes.rewrite("/api/legacy/(.*)", "https://old.example.com/$1")],

  // 리다이렉트: 영구 이동
  redirects: [routes.redirect("/old", "/new", { permanent: true })],

  // 헤더: 정적 자산 캐시 제어
  headers: [
    routes.cacheControl("/static/(.*)", { public: true, maxAge: "1 week", immutable: true }),
  ],

  // 크론: 정기 작업 선언 (아래 "크론" 절 참고)
  crons: [{ path: "/api/cleanup", schedule: "0 0 * * *" }],
};
```

- `routes.rewrite/redirect/cacheControl` 같은 헬퍼로 rewrites·redirects·headers를 타입 안전하게 쓴다. 원시 객체 형태(`{ source, headers: [...] }`)도 가능하지만 헬퍼가 오타·구조 오류를 컴파일 단계에서 잡는다.
- `deploymentEnv("API_TOKEN")`으로 배포 환경변수를 설정 값에 주입할 수 있다(값을 하드코딩하지 않는다).
- `vercel.json`에서 옮겨올 때는 내용을 `config`로 복사한 뒤 헬퍼로 점진 전환한다.

## 환경변수

- **관리 주체는 `vercel env`**: 환경변수는 Vercel에 저장하고 CLI(`vercel env add/ls/rm`, 로컬 동기화는 `vercel env pull`)로 다룬다. `.env`/`.env.local`은 **커밋하지 않는다**(비밀 노출 방지). 이 프로젝트도 `.env.example`만 커밋하고 `.env.local`은 개인 로컬용이다.
- **`NEXT_PUBLIC_*`와 서버 전용을 구분**한다:
  - `NEXT_PUBLIC_*`는 **브라우저 번들에 그대로 노출**된다 → 공개해도 되는 값(예: Supabase anon key, 공개 URL)만.
  - 서버 전용 변수(서비스 롤 키, DB 비밀번호 등)는 접두사 없이 두고 **서버 코드에서만** 읽는다. 절대 `NEXT_PUBLIC_`을 붙이지 않는다.
- 환경 스코프(Production/Preview/Development)를 구분해 등록한다. 프리뷰와 프로덕션이 다른 키를 쓸 수 있다.

## 배포 흐름 (프리뷰 → 프로덕션)

Vercel의 Git 연동은 **브랜치 = 프리뷰, `main` = 프로덕션**이 기본이다.

1. **검증 게이트 통과가 전제**: 배포 전 반드시 `npm run lint` → `npm run build` → `npm run test`(Vitest) 순으로 통과시킨다. 테스트가 깨진 채 배포하지 않는다(자세한 검증 규율은 `docs/guides/verification.md`).
2. **프리뷰 배포**: 기능 브랜치를 push하면 Vercel이 프리뷰 URL을 만든다. CLI로는 `vercel`(인자 없이)로 프리뷰 배포한다. 프리뷰에서 실제 동작을 확인한다.
3. **프로덕션 승격**: 리뷰·프리뷰 확인 후 `main`에 머지하면 프로덕션 배포된다. CLI로는 `vercel --prod`. 문제가 생기면 이전 배포로 롤백(promote)한다.

## 크론 (정기 작업)

정기 작업은 손으로 스케줄러를 운영하지 말고 **`vercel.ts`의 `crons`로 선언**한다(유지보수 최소화). 각 항목은 `path`(호출할 API 라우트)와 `schedule`(cron 표현식)을 갖는다.

```ts
crons: [
  { path: "/api/sync", schedule: "*/15 * * * *" }, // 15분마다
  { path: "/api/daily", schedule: "0 0 * * *" },    // 매일 자정 UTC
];
```

- `path`에 해당하는 `app/api/**/route.ts` 핸들러가 실제로 존재해야 한다. 스케줄은 UTC 기준이다.
- 크론 스케줄은 프로덕션 배포에서 동작한다.

## 셀프호스팅 예외 (cross-ref)

EC2 등 **자체 인프라에 직접 배포**하는 경우는 이 스킬의 대상이 아니다. 그때는 config-as-code 대신 **`terraform-infra` 스킬(스크래핑 하네스)** 의 Terraform IaC 규약을 참조한다. 여기서 인프라 프로비저닝을 중복 정의하지 않는다.

## 환각 금지

`@vercel/config`·`vercel` CLI·크론 표현식 등 API가 불확실하면 **추측하지 말고** Context7 MCP 또는 Vercel 공식 문서(`vercel/docs/project-configuration/vercel-ts`, `cron-jobs`)로 먼저 확인한다. 존재하지 않는 설정 키·헬퍼를 지어내지 않는다.

## 하지 말 것

- `vercel.json`과 `vercel.ts`를 동시에 두지 않는다(중복·혼란).
- `.env`/`.env.local`을 커밋하지 않는다. 비밀 값을 `vercel.ts`에 하드코딩하지 않는다.
- 서버 전용 비밀에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다(브라우저 노출).
- 검증 게이트(lint→build→test) 미통과 상태로 프로덕션 배포하지 않는다.
- 대시보드에서 설정을 손으로 바꿔 코드와 drift를 만들지 않는다.
- 셀프호스팅 인프라를 여기서 다루지 않는다 — `terraform-infra` 스킬 참조.
