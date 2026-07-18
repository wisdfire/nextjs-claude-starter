---
name: fullstack-web-orchestrator
description: "풀스택 웹사이트 개발 에이전트 팀을 조율하는 오케스트레이터. 웹사이트 개발, 화면 구현, 풀스택 기능 개발, 와이어프레임→디자인→프론트→백엔드→QA 파이프라인 실행 시 사용. 후속 작업: 결과 수정, 보완, 다시 실행, 재실행, 부분 재구현, 이전 결과 개선, QA, 링크 검증, 라우팅 점검, API 계약 갱신, 테스트, 배포, deploy, vercel, 검증 게이트 요청 시에도 반드시 이 스킬을 사용."
---

# Fullstack Web Orchestrator

Next.js 16 웹사이트를 **화면설계서 수용 → 라우트 매핑 → 프론트엔드 → 백엔드 → QA**의 파이프라인으로 개발하는 에이전트 팀을 조율한다. 브랜드·디자인 시스템·화면설계서는 이 저장소가 만들지 않고 **`webforge-design` 저장소의 산출물을 `docs/design/`에서 입력으로 받는다**(부재 시 자체 설계로 폴백 — Phase 1 참고). 각 모듈 완성 직후 QA를 점진 실행(incremental QA)하여 경계면 버그(링크 404, API↔훅 불일치)를 조기에 잡는다.

> **🚨 애드센스 심사 통과는 타협 불가 목표다(최우선).** 이 하네스로 만드는 모든 웹서비스는 구글 애드센스 심사를 통과해야 한다. **리더와 모든 팀원은 `adsense-readiness` 스킬을 로드**하고 그 **공식 MUST 10항**을 설계·구현·QA 전 단계에서 충족시킨다. 애드센스 MUST 미충족은 **Phase 4.3 게이트에서 배포·완료를 차단**한다. 나중에 고치는 것이 아니라 **처음부터 요건을 만족하도록 설계**한다(정책 페이지 라우트·광고 허용 화이트리스트·콘텐츠 오리지널리티).
>
> ⚠️ **데이터 수집(크롤러·Python 배치·ETL)은 이 저장소 범위 밖**이다 — 별도 모노레포 **`wisdfire/jobhub-jobs`** 소관. 웹앱은 **DB에 이미 적재된 수집 데이터를 읽어 렌더링**하는 것까지만 담당한다. 사용자가 크롤러 구현을 요청하면 모노레포 소관임을 알린다.

## 실행 모드: 에이전트 팀

`TeamCreate`로 팀을 구성하고 공유 작업 목록(`TaskCreate`)과 `SendMessage`로 조율한다. 파이프라인이지만 프론트/백엔드 병렬 구간과 QA↔엔지니어 실시간 피드백이 있어 팀 모드가 적합하다. 세션당 활성 팀은 1개다.

> **⚠️ 전제조건 — 실험적 플래그 필수(스타터킷 클론 사용자 주의)**: 팀 조율 원시도구 `TeamCreate`·`SendMessage`·`TaskCreate`는 실험적 기능으로, **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정된 셸에서 `claude`를 실행해야만** 제공된다. 미설정 시 이 원시도구들이 아예 없어 팀이 **조용히 단일 에이전트로 폴백**되고, 파이프라인·병렬 구간·경계면 통보·`depends_on` 조율이 오류 없이 소실된다(사용자는 "정상 완료"로 오인). `Agent`(invoke) 도구만 GA(플래그 무관)다. 반드시 Phase 0에서 가용성을 먼저 확인한다(아래 프리플라이트).

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|--------------|------|------|------|
| design-architect | design-architect (커스텀, `.claude/agents/design-architect.md`) | **화면설계서 수용**·라우트 매핑·토큰 매핑·컴포넌트 대응 + **애드센스 정책 페이지·광고 화이트리스트 설계** (화면설계서 부재 시에만 자체 와이어프레임·IA 설계) | **`adsense-readiness`**, (폴백 시) `wireframe-design`·`ui-ux-pro-max`·`frontend-design` | `_workspace/01_design_spec.md` |
| frontend-engineer | frontend-engineer (커스텀, `.claude/agents/frontend-engineer.md`) | Next.js 16 화면·컴포넌트·훅 구현 + Vitest 테스트 (**애드센스 MUST 준수**) | `frontend-build`, **`adsense-readiness`**, `ui-ux-pro-max` | 코드 + 테스트 + `_workspace/03_frontend_notes.md` |
| backend-engineer | backend-engineer (커스텀, `.claude/agents/backend-engineer.md`) | API route·Drizzle·서버 액션 + Vitest 테스트(shape 고정) | `backend-api` | 코드 + 테스트 + `_workspace/04_api_contract.md` |
| qa-inspector | qa-inspector (커스텀, `.claude/agents/qa-inspector.md`) — Explore 금지(스크립트 실행 필요) | 경계면 교차 검증(링크·shape·매핑) + **애드센스 MUST 기계 검증** + `npm run test` 게이트 | `qa-link-integrity`, **`adsense-readiness`** | `_workspace/05_qa_report.md` |

> **배포 설정**: Vercel 배포·`vercel.ts` config-as-code·환경변수는 리더가 `web-deploy-config` 스킬을 로드해 처리한다(검증 게이트 통과 후, 아래 Phase 4.5 참고).

> **모델**: 모든 팀원은 `model: "opus"`로 생성한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)

기존 산출물 존재 여부로 실행 모드를 결정한다:

0. **팀 원시도구 가용성 프리플라이트(필수·선행)**: `TeamCreate`/`TaskCreate`/`SendMessage`가 실제로 사용 가능한지 확인한다(실험적 플래그 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 게이트).
   - **가용** → 팀 모드로 정상 진행.
   - **불가** → 사용자에게 `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 설정 후 재실행을 안내하거나, **GA `Agent`(invoke) 서브에이전트 폴백 모드**로 전환한다: 각 단계를 `Agent` 서브에이전트 순차/병렬 호출로 실행하고(모두 `model: "opus"`), 팀원 간 `SendMessage` 조율은 리더가 `_workspace/*.md` 파일 인계로 대행한다. 폴백 진행 시 "단일 에이전트 폴백 — 팀 실시간 조율 미보장"을 사용자에게 1줄 경고한다.
1. `_workspace/` 디렉토리 존재 여부를 확인한다.
2. 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. Phase 1로 진행.
   - **`_workspace/` 존재 + 부분 수정 요청**(예: "링크 다시 검증", "이 화면만 고쳐", "API 계약 갱신") → **부분 재실행**. 관련 팀원만 재호출하고, 대상 산출물만 덮어쓴다. 재호출 시 프롬프트에 이전 산출물 경로를 포함해 "먼저 Read 후 개선점만 반영"을 지시한다.
   - **`_workspace/` 존재 + 새 요구사항 제공** → **새 실행**. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동한 뒤 Phase 1로 진행.

### Phase 1: 준비

1. **화면설계서 인계 확인 (모드 분기 — 가장 먼저)**: `docs/design/`에 아래 4종이 있는지 확인한다. 이 저장소는 브랜드·디자인 시스템·화면설계서를 **생산하지 않는다** — `webforge-design` 저장소가 생산하고 상위 오케스트레이터가 `docs/design/`에 복사해 넣는다.

   | 파일 | 내용 |
   |------|------|
   | `docs/design/00_brand-guideline.md` | 브랜드 방향·보이스·시각 원칙 |
   | `docs/design/01_design-system.md` | 디자인 토큰(색·타이포·간격) |
   | `docs/design/02_screen-spec.md` | **화면 정의의 SSOT** — 화면 목록·레이아웃·컴포넌트·문구 |
   | `docs/design/manifest.json` | 인계 상태 |

   판정은 **아래 4분기를 순서대로** 적용한다. 어느 분기에도 걸리지 않는 상태를 임의 판단으로 넘기지 않는다.

   | # | 상태 | 판정 |
   |---|------|------|
   | ① | `docs/design/` 없음 | **자체 설계 모드(폴백)** |
   | ② | 4종 전부 있고 `manifest.json`의 `status == "ready"` | **화면설계서 모드** |
   | ③ | 4종 전부 있으나 `status != "ready"`(`needs-review` 등) | **정지·보고** |
   | ④ | `docs/design/`은 있으나 **4종 중 일부만 있음** / `manifest.json` 부재 / JSON 파싱 실패 / `status` 필드 없음 | **정지·보고** |

   - **① 자체 설계 모드(폴백)** — 이 스타터킷을 파이프라인 밖에서 단독 사용하는 정상 경로다. 기존대로 `design-architect`가 `wireframe-design` 스킬로 IA·와이어프레임·디자인 토큰 방침을 **자체 설계**한다. 사용자에게 "화면설계서 부재 — 자체 설계 모드로 진행" 1줄 안내.
   - **② 화면설계서 모드** — 4종을 `_workspace/00_input/`에 복사하고 아래 2~4를 진행한다. 이후 전 단계는 이 문서들을 **기준 문서**로 삼는다(새로 설계하지 않는다).
   - **③ 정지·보고** — `ready`는 webforge-design의 적대적 검증 3렌즈를 통과했다는 뜻이며, 미통과 산출물로 구현을 시작하면 재작업이 확정된다. 현재 `status` 값과 함께 보고한다.
   - **④ 정지·보고 (부분 이관·판독 불가)** — **폴백으로 넘어가지 않는다.** 복사가 중간에 끊겼거나 인계가 미완인 상태이며, 이때 폴백하면 이미 확정된 브랜드를 자체 설계로 덮어쓴다. **판정 불가는 "진행"이 아니라 "정지"다** — 상위 오케스트레이터가 재이관해야 할 문제이지 이 하네스가 메울 문제가 아니다. 보고에는 **실재하는 파일 목록과 누락 파일 목록을 각각** 적는다.

   > **계측기 부재를 "부재"로 읽지 마라.** `manifest.json`을 읽지 못한 것과 화면설계서가 없는 것은 다른 상태다. 전자를 후자로 해석하는 순간 차단 게이트가 조용히 무력화된다.
   >
   > 어느 모드인지를 Phase 2의 TeamCreate 프롬프트에 **반드시 명시**한다. 팀원이 모드를 오판하면 확정된 브랜드를 덮어쓰거나(화면설계서 모드에서 재설계), 아무 설계 없이 구현에 들어간다(폴백 모드에서 수용만 시도).

2. 사용자 입력을 분석한다 — 어떤 화면/기능이 필요한지, 데이터 요구가 무엇인지 파악한다. **화면설계서 모드에서는 `02_screen-spec.md`가 화면 정의의 진실이며**, 사용자 입력은 그와 어긋나는 부분을 발견했을 때 사용자에게 되묻는 근거로만 쓴다(임의로 화면을 추가·변경하지 않는다).
3. 작업 디렉토리에 `_workspace/`를 생성한다(초기 실행, 또는 새 실행에서 기존 것을 보관 이동한 직후).
4. 요구사항 문서를 `_workspace/00_input/`에 저장한다(화면설계서 4종과 같은 위치).

### Phase 2: 팀 구성

1. 팀 생성:
   ```
   TeamCreate(
     team_name: "fullstack-web-team",
     members: [
       { name: "design-architect",  agent_type: "design-architect",  model: "opus",
         prompt: /* 화면설계서 모드 */ "_workspace/00_input/02_screen-spec.md·01_design-system.md·00_brand-guideline.md를 **먼저 Read**하라. 이 문서들이 화면·컴포넌트·토큰·문구의 SSOT다. 당신의 일은 **새로 설계하는 것이 아니라 수용·번역·검증**이다: ①화면설계서의 화면 목록을 그대로 받아 Next.js 16 App Router 라우트로 매핑한다(route group·동적 세그먼트 정확히 — 이 표가 QA의 SSOT다) ②컴포넌트를 shadcn 카탈로그에 대응시킨다 ③01_design-system.md의 토큰을 shadcn 토큰 체계로 매핑한다(신규 정의 금지, globals.css의 :root/.dark/@theme inline 수정 금지) ④화면설계서와 애드센스 MUST(adsense-readiness 스킬)가 충돌하면 — 예: 정책 페이지 라우트 누락, 저가치 화면 광고 — 임의로 고치지 말고 리더에게 SendMessage로 보고한다. **화면을 추가·삭제·재설계하지 않고, 팔레트·폰트·무드를 재결정하지 않는다**(이미 확정된 브랜드다). 결과를 _workspace/01_design_spec.md에 쓴다."
                 /* 폴백(docs/design/ 부재) */ "화면설계서가 없다 — 자체 설계 모드다. wireframe-design 스킬로 _workspace/00_input의 요구사항을 IA·라우트 매핑·와이어프레임·디자인 토큰 방침·컴포넌트 명세로 설계해 _workspace/01_design_spec.md에 쓴다. 시각 방향은 ui-ux-pro-max·frontend-design 스킬로 결정한다. 라우트 표는 QA의 SSOT이니 정확히." },
       { name: "frontend-engineer", agent_type: "frontend-engineer", model: "opus",
         prompt: "frontend-build 스킬로 01_design_spec.md의 라우트 표를 따라 app/ 화면·컴포넌트·훅을 구현. **화면설계서(_workspace/00_input/02_screen-spec.md·01_design-system.md)가 있으면 그것도 직접 Read하고, 문구·컴포넌트·토큰은 거기 있는 것을 쓴다(임의 생성 금지)** — 01_design_spec.md는 라우트 매핑 계층일 뿐 화면 정의의 원본이 아니다. shadcn은 npx로 추가, base-ui render prop 사용. 훅 타입은 04_api_contract.md에 맞춘다. 컴포넌트·훅에 Vitest 테스트(@testing-library/react·renderHook)를 함께 작성해 npm run test 통과." },
       { name: "backend-engineer",  agent_type: "backend-engineer",  model: "opus",
         prompt: "backend-api 스킬로 API route·Drizzle을 구현하고 응답 shape을 04_api_contract.md에 계약으로 기록. shape 변경 시 frontend-engineer에 통지. DB 계층(@/lib/db)을 vi.mock으로 모킹한 Vitest 테스트로 응답 shape을 계약과 일치하게 고정하고 npm run test 통과." },
       { name: "qa-inspector",      agent_type: "qa-inspector",      model: "opus",
         prompt: "qa-link-integrity 스킬로 각 모듈 완성 직후 점진 검증. link-check.mjs 실행으로 링크 404, API shape↔훅 타입, 엔드포인트↔훅 매핑을 교차 검증하고 발견 즉시 해당 팀원에 파일:라인+수정방법 통보. 추가로 npm run test(Vitest) 통과 여부를 게이트로 확인. **화면설계서가 있으면 _workspace/00_input/02_screen-spec.md의 화면 목록 ↔ 실제 app/ 라우트를 양방향 대조**해 누락 화면과 명세에 없는 임의 추가 화면을 모두 지적한다." }
     ]
   )
   ```

   > **`design-architect` 프롬프트는 Phase 1에서 판정한 모드에 따라 둘 중 하나만 넣는다.** 위 블록의 두 문자열은 선택지이지 연결이 아니다 — 둘 다 넣으면 에이전트가 "수용하라"와 "설계하라"를 동시에 받아 어느 쪽이든 반쯤 수행한다.

2. 작업 등록(`depends_on`으로 파이프라인 의존성 명시):
   ```
   TaskCreate(tasks: [
     { title: "설계",       description: "IA·라우트 매핑·와이어프레임·컴포넌트 명세", assignee: "design-architect" },
     { title: "API 계약 설계", description: "화면 데이터 요구 기반 엔드포인트·응답 shape 초안", assignee: "backend-engineer", depends_on: ["설계"] },
     { title: "백엔드 구현",  description: "route·Drizzle 구현 + 계약 확정",   assignee: "backend-engineer", depends_on: ["API 계약 설계"] },
     { title: "프론트 구현",  description: "화면·컴포넌트·훅 구현, 링크·훅 타입 연결",   assignee: "frontend-engineer", depends_on: ["설계"] },
     { title: "점진 QA(백엔드)", description: "API 완성 즉시 route.ts 응답 shape ↔ 04_api_contract.md 계약 일치·엔드포인트 존재 검증(shape↔훅 교차검증은 통합 QA에서)", assignee: "qa-inspector", depends_on: ["백엔드 구현"] },
     { title: "점진 QA(프론트)", description: "화면 완성 즉시 링크 정합성(link-check.mjs) 검증", assignee: "qa-inspector", depends_on: ["프론트 구현"] },
     { title: "통합 QA",      description: "전 모듈 교차 재검증 + 회귀 확인",           assignee: "qa-inspector", depends_on: ["점진 QA(백엔드)","점진 QA(프론트)"] }
   ])
   ```

   > 팀원당 5~6개 작업이 적정. QA는 전체 완성 후 1회가 아니라 각 모듈 완성 직후 실행하도록 작업을 쪼갠다.

### Phase 3: 파이프라인 실행

**실행 방식:** 팀원들이 공유 작업 목록에서 작업을 요청(claim)하고 자체 조율한다. 리더는 모니터링하며 필요 시 개입한다.

**팀원 간 통신 규칙:**
- `design-architect`는 라우트·컴포넌트 명세를 `frontend-engineer`에, 데이터 요구를 `backend-engineer`에 SendMessage로 공유한다.
- `backend-engineer`는 응답 shape 확정/변경 시 `frontend-engineer`에 즉시 통지한다(계약 갱신).
- `frontend-engineer`는 필요한 엔드포인트·기대 shape을 `backend-engineer`에 요청한다.
- `qa-inspector`는 발견을 즉시 해당 팀원(경계면 이슈는 양쪽 모두)에 파일:라인+수정방법으로 통보한다.
- 각 팀원은 작업 완료 시 산출물을 파일로 저장하고 리더에게 알린다.

**산출물 저장:**

| 팀원 | 출력 경로 |
|------|----------|
| design-architect | `_workspace/01_design_spec.md` (+필요 시 `01_wireframes.md`) |
| frontend-engineer | `app/`·`components/`·`hooks/` 코드 + `_workspace/03_frontend_notes.md` |
| backend-engineer | `app/api/`·`lib/db/` 코드 + `_workspace/04_api_contract.md` |
| qa-inspector | `_workspace/05_qa_report.md` |

> 파일 번호는 도메인 **고정 슬롯**이며 연속 시퀀스가 아니다(02 등 결번 가능). 번호는 감사 추적용 식별자일 뿐 실행 순서를 규정하지 않는다 — 순서는 `depends_on`/Phase가 규정한다.

**리더 모니터링:** 팀원 유휴 시 자동 알림 수신 → 막힌 팀원에 SendMessage로 지시/재할당. 진행률은 TaskGet으로 확인.

### Phase 4: QA 통합 검증 (incremental → 통합)

1. 각 모듈 완성 즉시 해당 점진 QA가 이미 수행되었는지 확인한다(Phase 2에서 쪼갠 작업).
> **검증가의 자세 (전 QA 단계 공통)**: 검증가는 "이 산출물은 옳다"를 확인하지 않는다. **"이 산출물에는 결함이 있다"를 입증하려 시도**한다. 반증에 실패했을 때만 통과다. 불확실하면 통과시키지 않는다.
>
> **"성공처럼 보이는 것"은 증거가 아니다.**
> - 종료 코드 0 ≠ 성공 · 테스트 통과 ≠ 동작(실제 대상에 대고 확인하라)
> - `npm run build` 성공 ≠ 화면 정상 · 화면이 정상 ≠ 정상(ISR 캐시가 옛 HTML을 낸다 — `x-vercel-cache: HIT`·`age` 헤더를 읽어라)
>
> **판정 전에 계측기를 먼저 의심하라.** 초록/빨강을 말하기 전에 스크립트·grep 패턴 자체가 틀렸을 가능성을 배제한다(대조군 1건을 일부러 넣어 검출되는지 확인).

2. 모든 구현 완료 후 `qa-inspector`가 통합 QA를 수행:
   - `node .claude/skills/qa-link-integrity/scripts/link-check.mjs` 재실행으로 전체 링크 정합성 확인. 200 응답이라도 **본문이 404 화면인 soft-404**를 별도로 확인한다.
   - **화면설계서 대조(화면설계서 모드에 한함)**: `_workspace/00_input/02_screen-spec.md`의 화면 목록 ↔ 실제 `app/` 라우트를 **양방향** 대조해 ①명세에 있는데 구현되지 않은 **누락 화면** ②명세에 없는데 만들어진 **임의 추가 화면**을 모두 지적한다. 인계 계약의 준수 여부를 검증하는 유일한 지점이다.
   - API 응답 shape ↔ 훅 타입, 엔드포인트 ↔ 훅 1:1 매핑 교차 재검증.
   - **애드센스 MUST 기계 검증**: ①개인정보처리방침 라우트 존재 ②`app/robots.ts`가 `Mediapartners-Google`을 차단하지 않음(전역 `Disallow: /` 없음) ③저가치 라우트(로그인·404/500·빈 목록)에 광고 슬롯 미렌더 ④"준비 중" 플레이스홀더 화면 부재 ⑤링크 404 = 0(Site behavior 요건).
   - 이전 지적 항목의 회귀 여부 재확인.
3. 발견 이슈가 있으면 해당 팀원에 통보하고 수정 → 재검증 루프(최대 2~3회).
4. `_workspace/05_qa_report.md`에 통과/실패/미검증을 확정한다.

### Phase 4.3: 검증 게이트 (완료 전제)

배포·완료 처리 전에 반드시 통과해야 하는 게이트다. **점진 QA는 모듈 완성 직후에 계속 유지**하되, 여기서 전체를 최종 확정한다.

1. **QA 교차 검증 통과**: 링크 정합성·API 응답 shape↔훅 타입·엔드포인트↔훅 매핑이 `05_qa_report.md`에서 모두 통과.
1-A. **애드센스 게이트 통과(필수·차단성)**: `adsense-readiness` 스킬의 **MUST 10항이 전부 충족**돼야 한다. 하나라도 미충족이면 해당 팀원에 수정을 지시하고, **미통과 상태로 배포·완료로 넘어가지 않는다.** 사용자가 애드센스를 명시적으로 면제한 경우에만 건너뛰고 그 사실을 보고에 남긴다.
2. **명령 게이트 순서 통과**: 리더가 `npm run lint` → `npm run build` → `npm run test`(Vitest) 순으로 실행해 전부 통과시킨다. 하나라도 실패하면 해당 팀원에 파일:라인과 함께 통보하고 수정 → 재검증 루프로 돌린다. 최대 2~3회 재시도 후에도 미통과면 잔여 항목을 `05_qa_report.md`에 "미해결"로 확정하고 사용자에게 에스컬레이션한다(무한 루프 방지).
3. 게이트 미통과 상태로는 Phase 4.5(배포)나 Phase 5(완료 보고)로 넘어가지 않는다.

**비기능 검증 항목(완료 체크리스트):**
- [ ] QA 교차 검증(링크·shape·매핑) 통과
- [ ] **애드센스 MUST 10항 전부 충족** (`adsense-readiness`) — 개인정보처리방침(구글 지정 문구 포함)·크롤러 차단 없음·HTTPS·저가치 화면 광고 미렌더·플레이스홀더 없음·수집 데이터 편집 부가가치·광고 배치 규칙·링크 404 없음
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] **`npm run test`(Vitest) 통과** — 컴포넌트·훅·엔드포인트에 대응 테스트 존재
- [ ] **`vercel.ts` 설정 코드화(배포 수반 태스크에 한함)** — 배포 시에만 검증: `vercel.json` 수기 파일 부재 + `vercel.ts`(`@vercel/config`) 존재 + `npm run build` 통과. `@vercel/config`는 기본 미설치이므로 배포 태스크에서 온디맨드 설치한다.
- [ ] **화면설계서 대조 통과(화면설계서 모드에 한함)** — 누락 화면 0 · 명세에 없는 임의 추가 화면 0 (`qa-inspector`)
- [ ] 화면 흐름 변경 시 **Playwright MCP** 브라우저 검증 — **수행 주체는 `qa-inspector`**. 스크린샷·DOM 스냅샷·콘솔 로그로 주요 경로를 실제로 이동해 렌더·이동 실패를 확인하고 결과를 `05_qa_report.md`에 남긴다(정적 대조만으로는 실제 렌더 실패를 잡지 못한다)

> **검증 항목별 도구 특정** — "확인한다"로 끝내지 말고 **무엇으로** 확인했는지를 리포트에 적는다.
>
> | 검증 대상 | 도구 |
> |---|---|
> | 배포·렌더된 화면 | **Playwright MCP** (스크린샷·DOM 스냅샷·콘솔 로그) |
> | 링크 무결성·404·soft-404 | `link-check.mjs` + HTTP 상태코드 조회 **+ 본문 대조**(200인데 404 본문 검출) |
> | 성능·접근성 | Lighthouse |
> | DB 적재·**커밋 실증** | **별개 연결**에서 재조회(`psql`) · Neon MCP `run_sql` |
> | 캐시 오염 | `x-vercel-cache` · `age` 헤더 판독 |
> | 화면설계서 준수 | `02_screen-spec.md` ↔ `app/` 라우트 양방향 대조 |
> | 라이브러리·API 현행성 | context7 MCP |

### Phase 4.5: 배포 (config-as-code)

**이 Phase는 사용자가 배포/deploy/vercel을 명시적으로 요청한 경우에만 실행한다**(트리거 키워드와 일치). 로컬 기능 개발만 원하는 경우 Phase 4.3 검증 게이트 통과로 완료 처리하고 이 단계를 건너뛴다. 배포를 수행할 때는 검증 게이트 통과 후 리더가 `web-deploy-config` 스킬을 로드해 Vercel에 배포한다.

1. **설정 코드화 확인**: 배포 설정(빌드·리라이트·헤더·크론)이 `vercel.ts`(`@vercel/config`)로 코드화되어 있는지 확인한다. `vercel.json`을 손으로 만들지 않는다.
2. **환경변수 확인**: 서버 전용 키와 `NEXT_PUBLIC_*`가 구분되어 `vercel env`에 등록되어 있는지 확인한다(`.env.local`은 커밋 금지).
3. **프리뷰 → 프로덕션**: 기능 브랜치 push로 프리뷰 URL을 확인한 뒤, `main` 머지(또는 `vercel --prod`)로 프로덕션 승격한다. 화면 흐름이 바뀌었으면 프리뷰에서 Playwright MCP로 실제 동작을 확인한다.
4. 상세 규약과 크론·셀프호스팅 예외는 `web-deploy-config` 스킬을 따른다.

### Phase 5: 정리

1. 팀원들에게 종료 요청(SendMessage).
2. 팀 정리(TeamDelete).
3. `_workspace/`는 보존한다(중간 산출물 삭제 금지 — 사후 검증·감사 추적용).
4. 커밋 전 검증은 Phase 4.3 검증 게이트(`npm run lint`→`build`→`test`)와 Phase 4.5 배포가 이미 통과·완료되었는지 리더가 확인한다. 화면 흐름 변경 시 Playwright MCP로 브라우저 검증.
5. 사용자에게 결과를 요약 보고한다(생성/수정 화면, API, QA 결과, Vitest 테스트 통과, `vercel.ts` 설정 코드화·배포 결과 요약).

> **팀 재구성:** Phase별로 다른 조합이 필요하면 현재 팀을 TeamDelete 후 새 TeamCreate. 이전 산출물은 `_workspace/`에 보존되어 새 팀이 Read로 접근 가능.

## 데이터 흐름

```
[리더] → TeamCreate
   │
   ├─ design-architect ─→ _workspace/01_design_spec.md (라우트 표 = SSOT)
   │        │  ├─(라우트·컴포넌트)→ frontend-engineer
   │        │  └─(데이터 요구)────→ backend-engineer
   │        ↓
   ├─ backend-engineer ─→ _workspace/04_api_contract.md ─(응답 shape)→ frontend-engineer
   │        ↓
   ├─ frontend-engineer → app/·components/·hooks/ + _workspace/03_frontend_notes.md
   │        ↓
   └─ qa-inspector ─(link-check.mjs + 교차검증)→ _workspace/05_qa_report.md
            │  └─(파일:라인+수정방법)→ 해당 팀원 (경계면 이슈는 양쪽)
            ↓
      [리더: 통합 + 커밋 전 검증]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1명 실패/중지 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작. 재실패 시 작업 재할당 |
| API 계약 미확정으로 프론트 blocking | 프론트는 낙관적 타입+TODO로 진행, 계약 확정 후 정정 |
| QA가 반복 지적해도 미수정 | 리더에 에스컬레이션, 최대 2~3회 후 리포트에 "미해결" 명시 |
| link-check.mjs 실행 실패 | QA가 수동 Grep 폴백 + 리포트에 "수동 검증" 표기 |
| `DATABASE_URL` 부재 | 백엔드가 목 응답으로 계약만 확정, 리더가 `.env.local` 필요를 사용자에 안내 (`lib/db`는 부재 시 즉시 throw한다 — 우회하지 않는다) |
| 팀원 과반 실패 | 사용자에 알리고 진행 여부 확인 |
| 라우트 표 변경으로 하류 링크 깨짐 | design-architect가 frontend/qa에 변경 통지 → QA 재실행 |
| Vercel 미링크/미인증 | 배포를 스킵하고 로컬 검증(lint·build·test) 통과만으로 완료 보고. 사용자에 `vercel link`/인증 안내 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "회원제 블로그를 만들어줘"를 요구.
2. Phase 1에서 화면(목록/상세/작성/로그인)과 데이터 요구를 파악.
3. Phase 2에서 4명 팀 구성 + 7개 작업 등록(파이프라인 의존성).
4. Phase 3에서 design→(backend∥frontend)→QA 순으로 자체 조율 진행.
5. 백엔드 API 완성 즉시 점진 QA가 shape↔훅 검증, 프론트 화면 완성 즉시 link-check.mjs로 링크 검증.
6. Phase 4에서 통합 QA로 회귀 확인, 이슈 수정 루프.
7. Phase 5에서 lint/build/test 통과 확인 후 팀 정리.
8. 예상 결과: 동작하는 화면 코드 + `_workspace/01~05` 산출물, QA 통과.

### 에러 흐름
1. Phase 3에서 프론트가 `/create`로 링크를 걸었으나 실제 라우트는 `/dashboard/create`.
2. 점진 QA의 link-check.mjs가 매칭 실패로 감지, "route group 접두사 누락 의심 — 유사 라우트: /dashboard/create" 힌트 출력.
3. QA가 `frontend-engineer`에 `파일:라인 + /dashboard/create로 수정` SendMessage 통보.
4. 프론트가 해당 링크만 외과적으로 수정.
5. QA가 link-check.mjs를 재실행하여 통과 확인, 리포트 갱신.
6. 최종 보고서에 "링크 정합성 이슈 1건 발견·수정 완료" 명시.
