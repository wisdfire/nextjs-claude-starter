# 하네스 에이전트팀 4팀 검증 보고서

> ⚠️ **부분 초과(superseded) — 2026-07-10**
> 이 보고서는 2026-07-08 시점의 스냅샷이다. 이후 크롤링 워커 하네스의 실행 인프라가
> **K3s+KEDA+Browserless+GHCR/GitOps → 단일 EC2 + Docker Compose + ECR + SSM**으로 교체되면서,
> 아래 **크롤링워커 관련 발견은 대상이 사라져 무효**다: cross-repo GitOps 토큰(`GITOPS_TOKEN`) 전제조건,
> `python:3.14-slim` 검증항목, Browserless CDP 브라우저 수명주기 테스트.
> 인용된 `SKILL.md:<줄번호>`도 재작성으로 더 이상 맞지 않는다.
> 현행 계약은 `.claude/skills/celery-crawl-worker/SKILL.md`가 단일 진실 공급원이다.
> 나머지 3개 하네스(풀스택 웹·데이터 파이프라인·리서치→PRD)에 대한 발견은 그대로 유효하다.

> **작성일**: 2026-07-08 · **대상**: `.claude/skills/*-orchestrator` 4개 하네스 + 연결 에이전트 17종 · **프로젝트**: next-js-starter-kit
> **검증 규모**: 3회 반복 × 4팀 병렬 감사(12) + 치명/중대 발견 적대적 검증(12) + 팀별 3회차 통합(4) = **에이전트 28개 · 서브 토큰 ~198만 · 오류 0**

---

## 1. 검증 방법론

사용자 요구("병렬 검증 · 3회 반복 채점 · 최고점 회차를 보고서로 · 오류가 없어야 함 · 검증단계 설계 확인 · 범용 스타터팩")를 다음 파이프라인으로 수행했다.

1. **지상 근거 확보(사전)** — 오케스트레이터가 참조하는 도구·스크립트·에이전트·스킬이 실제로 존재하는지 파일시스템에서 직접 대조. 그 결과 아래 4·5번 사실을 확정해 감사자에게 주입.
2. **3회 독립 병렬 감사** — 각 회차마다 4팀을 동시에 감사(회차 간 무간섭, 자기일관성 확보). 5축 기준: 워크플로우 동작성 · 검증단계 설계 · 논리오류 없음 · 범용성 · 개선점.
3. **적대적 검증(거짓 양성 제거)** — 각 회차의 치명/중대 발견을 별도 검증자가 파일을 다시 열어 *반증 시도*. 근거가 틀렸거나 과장된 발견은 refuted/하향. "오류가 없어야 한다"는 요구를 거짓 양성 제거로 해석.
4. **팀별 3회차 통합** — 팀마다 3회 결과를 중복 제거·severity 교정해 *확정 발견*만 남김.

> **지상 근거로 확정한 사실**: 참조된 프로젝트 스킬 19종·`link-check.mjs`·17개 agent_type 정의는 **모두 실재**(환각 참조 0건). `ui-ux-pro-max`·`frontend-design`은 플러그인 스킬로 실재하며 `.claude/settings.json`에 프로젝트 스코프로 고정됨.

## 2. 회차별 종합점수 및 최고점 회차 선정

각 회차 종합점수 = 4팀 total(0~100) 평균.

| 회차 | 종합점수 | 풀스택 | 데이터파이프라인 | 리서치→PRD | 크롤링워커 | 판정 |
|---|---|---|---|---|---|---|
| #1 | **69.00** | 69 | 60 | 65 | 82 |  |
| #2 | **70.75** ⭐ | 67 | 62 | 72 | 82 | **최고점(채택)** |
| #3 | **67.75** | 64 | 61 | 72 | 74 |  |

**➡ 사용자 요청에 따라 최고 종합점수 회차는 #2(70.75점)이며, 본 보고서의 대표 채점 기준으로 채택한다.**

단, 발견(오류·개선) 목록은 회차 #2 단독이 아니라 **3회 전체를 적대적 검증한 뒤의 확정 union**을 싣는다. 이유: (a) 확정된 실제 오류를 회차 선택 때문에 누락하면 "오류가 없어야 한다"는 최우선 요구에 위배되고, (b) 통합 편집자 4명이 공통적으로 *탐지 철저성은 회차 #3이 최고*로 판정했기 때문이다. 즉 **점수 대표=#2, 발견 근거=3회 검증 union**으로 두 기준을 모두 만족시킨다.

## 3. 팀별 최종 점수(적대적 검증 후 재산정)

| 순위 | 하네스 | 실행 모드 | 워크플로우 | 검증설계 | 오류없음 | 범용성 | **총점** |
|---|---|---|---|---|---|---|---|
| 1 | 크롤링 워커 구현 | 서브 에이전트(단일 구현담당) | 22/25 | 18/25 | 19/25 | 20/25 | **79/100** |
| 2 | 리서치→PRD/ROADMAP | 하이브리드(서브+팀) | 19/25 | 18/25 | 19/25 | 15/25 | **71/100** |
| 3 | 풀스택 웹 개발 | 에이전트 팀(파이프라인) | 16/25 | 19/25 | 17/25 | 14/25 | **66/100** |
| 4 | 데이터 파이프라인 설계 | 에이전트 팀(계층적 위임) | 16/25 | 15/25 | 16/25 | 16/25 | **63/100** |

## 4. 전 팀 공통 최우선 이슈 — 실험 플래그 미문서화 🔴

가장 중대한 발견은 개별 팀이 아니라 **팀 기반 3개 하네스(풀스택·데이터파이프라인·리서치→PRD) 전반의 공통 결함**이다.

- **사실**: 이 하네스들이 조율에 쓰는 `TeamCreate`/`SendMessage`/`TaskCreate`는 `harness-marketplace` 플러그인이 의존하는 **실험적 플래그 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 게이트 원시도구**다. `Agent(invoke)`만 GA(플래그 무관)다.
- **증상**: 플래그가 없으면 팀이 **조용히 단일 에이전트로 폴백**된다. 파이프라인·병렬 구간·경계면 실시간 통보·점진 QA 피드백·`depends_on` 그래프가 *오류 없이* 소실되는데 사용자는 "정상 완료"로 오인한다.
- **실증**: `grep -rl EXPERIMENTAL_AGENT_TEAMS .claude/` = 0건. 이 감사 세션에 제공된 도구 목록에도 `SendMessage`는 있으나 `TeamCreate`/`TaskCreate`/`TeamDelete`는 부재 → 플래그 미설정 시 팀 원시도구 자체가 없음을 독립 실증.
- **스타터팩 함의**: 클론한 사용자는 대부분 이 플래그를 모른다. **범용 스타터팩의 치명적 이식성 결함**이다.
- **유일한 면역**: 크롤링워커 하네스는 `Agent`(GA) 단일 서브에이전트라 플래그와 무관 → 4팀 중 최고점(79)의 핵심 이유.

> **권고(P0)**: (1) 3개 오케스트레이터 "실행 모드" 절에 `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 전제조건 블록 추가, (2) Phase 0에서 리더가 플래그/팀 원시도구 가용성을 확인하고 **미설정 시 'GA `Agent` 서브에이전트 폴백 모드'로 명시 분기 또는 사용자 안내 후 중단**, (3) `CLAUDE.md` 하네스 섹션에 4팀 공통 전제조건 1줄. 인용은 저장소에 없는 `experimental-dependency.md` 대신 관측 근거로 서술.

## 5. 팀별 상세

### 5.1 크롤링 워커 구현 — 79/100

- **스킬**: `scraping-pipeline-build-orchestrator` · **모드**: 서브 에이전트(단일 구현담당)
- **구성**: crawl-worker-engineer
- **종합 판정**: 크롤링 워커(scraping-pipeline-build) 하네스는 감사한 팀들 중 설계 완성도가 가장 높다. 4개 하네스 중 유일하게 GA인 Agent 도구만 쓰는 서브에이전트 단일 구현담당 구조라 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 플래그에 의존하지 않아 '조용한 단일에이전트 폴백'이라는 구조적 critical 리스크가 없고, 인프라 저장소 경계·폐기 배치 트랙 처리·참조 정합성이 3개 파일에서 모순 없이 유지되며, 테스트 게이트가 needs: 체인으로 실제 강제된다. 적대적 검증을 거친 뒤 확정된 결함은 단 하나의 major(cross-repo GitOps PR용 교차저장소 쓰기 토큰 전제 미문서화 → 클론 사용자의 배포 파이프라인 반쪽 실패, iter1·iter3 공동 confirmed)뿐이다. 3회 감사가 major로 올렸던 TaskCreate 자기모순과 계약 미게이트(Celery 설정·브라우저 수명주기)는 모두 partial→minor로 교정되었다 — 전자는 기능 영향 없는 문서 용어 불일치, 후자는 데이터 정합성 핵심은 이미 게이트되고 라이브 브라우저 제외는 관례적 트레이드오프이기 때문이다. 나머지는 Agent 파라미터 미명시·ruff/mypy 선언-템플릿 간극·LLM 모킹 지침 부재·python 버전 충돌·'05' 잔재·Phase0 아카이브 분기·플래그 면역성 안내 누락 등 경미한 문서/검증 하드닝 항목이다. 확정 기준 재산정 점수는 79/100으로, iter1·iter2의 82(관대)와 iter3의 74(엄격, 그러나 두 major가 사후 하향됨) 사이에서 verificationDesign 축(계약 런타임 절반 미게이트 + ruff/mypy·LLM 모킹 갭 클러스터)을 가장 낮게 두고 genericReusability를 유일 major(토큰)로 조정한 값이다. 종합적으로 견고하나, 계약의 런타임 부분을 자동 게이트로 승격하고 배포 토큰 전제를 명문화하면 최상위 등급으로 올라선다.

**확정 발견 11건** (🔴치명 0 · 🟠중대 1 · 🟡경미 10):

<details>
<summary><b>🟠 중대</b> · cross-repo GitOps PR에 필요한 교차저장소 쓰기 토큰 전제조건이 문서화되지 않음</summary>

- **근거**: SKILL.md:47 '인프라 저장소 k8s/workers/*.yaml 태그 갱신 PR 자동 생성(cross-repo GitOps)', celery-crawl-worker/SKILL.md:74-76 동일. 문서화된 시크릿은 계약 4항(런타임 워커: VALKEY_URL·BROWSERLESS_WS/TOKEN·OTEL·LLM_API_KEY)뿐이고, 조정 포인트 표(celery-crawl-worker:90-95)에는 <org>·대상 사이트·결과 저장 계층·LLM 공급자만 있으며 교차저장소 쓰기 토큰(PAT/GitHub App)이 어디에도 없다. iter1(ver-1)·iter3(gr-1) 모두 제기, 두 회차 적대적 검증에서 confirmed/major 유지.
- **영향**: GitHub Actions 기본 GITHUB_TOKEN은 타 저장소에 PR을 생성할 수 없다. 스타터킷을 클론한 사용자가 CI를 돌리면 빌드·GHCR push까지는 성공하나 cross-repo PR 스텝이 403으로 실패해 '이미지는 올라갔는데 배포 PR은 안 생기는' 반쪽 상태가 된다. 전제조건을 열거하는 전용 조정 포인트 표가 있음에도 배포의 핵심 시크릿을 누락한 실질적 재현성 갭. 이 팀에서 유일하게 확정된 major.
- **권고**: Phase 4와 검증항목(SKILL.md:76)에 'cross-repo PR용 시크릿(예: GITOPS_TOKEN, 인프라 저장소 contents+pull_requests write 권한 PAT/GitHub App 토큰)이 Secrets에 설정되어야 함'을 필수 전제로 명시. celery-crawl-worker:90-95 조정 포인트 표에 토큰 항목 1행 추가. 미설정 시 GitOps PR 잡을 조건부로 스킵/경고하고 GHCR push까지만 수행하도록 하여(iter2 fw-5의 인프라 저장소 존재 게이트 우려 흡수) 인프라 저장소 부재 상태에서도 파이프라인이 데드엔드 없이 성립하게 한다. README 로컬 실행 절차에도 시크릿 세팅 안내 추가.

</details>

<details>
<summary><b>🟡 경미</b> · 계약의 런타임 절반(Celery 설정·Browserless CDP 브라우저 수명주기)이 자동 pytest 게이트가 아닌 수동 체크박스로만 검증됨</summary>

- **근거**: Phase 3 테스트 목록(SKILL.md:43)은 파싱 단위·폴백 트리거·계약 스키마(CrawlJob/CrawlResult)·job_id 멱등성만 요구. acks_late·task_serializer·worker_prefetch_multiplier·visibility_timeout(SKILL.md:69)과 브라우저 sync API+connect_over_cdp·세션 1개·finally close·300초 예산(SKILL.md:71-72)은 수동 [ ] 체크박스로만 확인. docker-compose(Valkey+Browserless)는 SKILL.md:38·63에 구성되나 이를 실행하는 통합/스모크 잡이 Phase 3·4 어디에도 없다. iter2(fw-2, Celery 설정)·iter3(vd-1, 브라우저 수명주기) 각각 제기, 둘 다 partial→minor 교정.
- **영향**: '검증 강제성 vs 선언'이 사용자 최우선 관심사인데, 계약의 붕괴 위험이 가장 높은 런타임 부분(CDP 429 백오프·finally close·정적 Celery conf 값)이 어떤 자동 게이트로도 실행되지 않아 이 영역 회귀는 조용히 통과한다. 단, 데이터 정합성 핵심(파싱·폴백·스키마·멱등성)은 실제 게이트되고, requests/limits 등은 인프라 저장소(범위 밖) 소관이며 라이브 브라우저를 빠른 CI에서 제외하는 것은 관례적 트레이드오프라 '계약 절반 공백'은 과장 → 두 회차 모두 minor로 하향.
- **권고**: Phase 3에 celery_app.conf 정적 값(acks_late/task_serializer/worker_prefetch_multiplier/visibility_timeout)을 단정하는 assertion 단위테스트를 추가해 Phase 4 needs: 체인에 편입(즉시 강제 가능·저비용). 추가로 docker-compose 대상 integration 마커 스모크 테스트 1개(연결→세션 open/close→더미 파싱)를 만들어 CI service-container/compose로 한 번은 브라우저 수명주기 계약이 강제되게 한다. 최소한 finally close·세션 1개는 mock CDP 단위테스트로라도 게이트에 넣는다.

</details>

<details>
<summary><b>🟡 경미</b> · 에이전트 입력 프로토콜이 플래그-게이트 팀 원시도구 TaskCreate를 참조 — 선언된 서브에이전트 모드와 문서 용어 자기모순</summary>

- **근거**: crawl-worker-engineer.md:38 '입력: 오케스트레이터의 TaskCreate(대상 에이전트 그룹, 사이트 목록·스케줄, 확정된 조정 포인트).' vs SKILL.md:12-14 '실행 모드: 서브 에이전트 ... Agent 도구로 직접 호출', crawl-worker-engineer.md:46 '단독 구현담당(서브 에이전트 모드)'. experimental-dependency.md:19-20에서 TaskCreate는 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 게이트 팀 원시도구, Agent(invoke)는 GA로 명시. 3회 전원(err-1/fw-1/le-1) 제기, 3회 모두 partial→minor 교정.
- **영향**: 오케스트레이터가 실제로는 Agent 도구 prompt로 동일 내용을 전달하므로 런타임은 즉시 깨지지 않는다(3회 발견 본문 모두 인정). 그러나 이 하네스가 4개 중 유일하게 플래그-무관(GA Agent)인데도 load-bearing한 '입력' 정의 한 줄이 플래그-게이트 primitive를 지목해 문서 용어가 자기모순이다. 유지보수자가 이 문서에 맞춰 오케스트레이터를 TaskCreate로 '정정'하면 플래그 미설정 시 조용히 단일에이전트로 폴백되는 잠복 함정이 되나, 이는 사변적이므로 major가 아닌 minor.
- **권고**: crawl-worker-engineer.md:38을 '입력: 오케스트레이터가 Agent 도구 prompt로 전달하는 과제(대상 에이전트 그룹·사이트·스케줄·확정된 조정 포인트)'로 정정하고 TaskCreate/SendMessage 등 팀 원시도구 언급을 이 파일에서 제거해 서브에이전트 모드 표기(line 46)와 일치시킨다.

</details>

<details>
<summary><b>🟡 경미</b> · 오케스트레이터가 Agent 도구 호출 파라미터(subagent_type/prompt 등)를 완전히 명시하지 않아 서브에이전트 템플릿 규약에서 이탈</summary>

- **근거**: SKILL.md:14·36 'Agent 도구로 직접 호출(model: opus 명시)'·'crawl-worker-engineer를 호출한다'만 있고 subagent_type/prompt/run_in_background를 포함한 Agent() 호출 블록이 없다. orchestrator-template.md:271 작성원칙 #3 '서브 모드는 name·subagent_type·prompt·run_in_background·model을 완전 명시'. 3회 전원(reu-1/fw-6/gr-2) 제기.
- **영향**: 단일 구현담당이라 subagent_type이 유일해 실행이 애매해지진 않으나, 표준 서브에이전트 템플릿의 파라미터 완전 명시 규약에서 이탈해 재현·확장 시 호출 규약이 덜 명확하다. 3회 모두 제기된 안정적 minor.
- **권고**: Phase 2에 Agent(subagent_type: "crawl-worker-engineer", model: "opus", prompt: <확정 조정 포인트 포함>) 형태의 완전한 최소 호출 예시 1블록을 추가한다.

</details>

<details>
<summary><b>🟡 경미</b> · ruff·mypy를 빌드 게이트 needs: 전제로 선언했으나 재사용 CI 템플릿은 pytest만 강제</summary>

- **근거**: SKILL.md:77 '품질 게이트: pytest(not integration)·ruff·mypy 통과가 빌드·push의 needs: 전제', Phase3 line 44 'ruff·mypy 통과'. 그러나 참조 스킬 python-test-ci/SKILL.md:107-125 CI yaml의 test job에는 'uv run pytest -m "not integration"'만 있고 ruff/mypy step이 없다. iter1(ver-2) 제기.
- **영향**: 선언(게이트)과 강제(템플릿)의 간극. 엔지니어가 python-test-ci 템플릿을 그대로 쓰면 ruff/mypy가 실제로 게이트되지 않아 타입·린트 오류가 있어도 이미지가 빌드·push된다. 회귀 방지 주장과 실제 강제의 불일치.
- **권고**: python-test-ci의 CI yaml test job에 'uv run ruff check .'·'uv run mypy .' step을 pytest와 같은 job(또는 needs로 연결된 병렬 job)에 추가해 실제로 build-push의 전제가 되게 한다.

</details>

<details>
<summary><b>🟡 경미</b> · 폴백 트리거 테스트의 ScrapeGraphAI(LLM) 모킹 지침 부재 — 네트워크 의존/flaky·비용 위험</summary>

- **근거**: Phase3 line 43 '폴백 트리거 테스트(예외 + Pydantic 검증 실패 → ScrapeGraphAI 폴백 발동 + crawl.parse.fallback 기록)'. python-test-ci/SKILL.md:83-88은 '단위테스트는 네트워크 없이 fixture만' 원칙을 두나 ScrapeGraphAI 호출을 어떻게 모킹/스텁할지 구체 지침이 없다. iter1(ver-3) 제기.
- **영향**: 모킹 없이 작성하면 폴백 검증 단위테스트가 실제 LLM(LLM_API_KEY)을 호출해 네트워크·비용·비결정성에 노출되고 LLM_API_KEY 없는 CI에서 실패해 게이트 신뢰도가 떨어진다.
- **권고**: Phase3 또는 celery-crawl-worker 폴백 섹션에 'ScrapeGraphAI 클라이언트를 monkeypatch/mock으로 대체해 반환값을 주입하고, 폴백 경로 진입과 crawl.parse.fallback 메트릭 기록만 검증한다'는 지침을 명시한다.

</details>

<details>
<summary><b>🟡 경미</b> · 파이썬 버전 검증항목이 python:3.14-slim을 못박아 3.13 폴백 결정과 충돌</summary>

- **근거**: SKILL.md:71 검증항목 '이미지에 브라우저 바이너리 없음(python:3.14-slim)' vs SKILL.md:59 에러핸들링 'ScrapeGraphAI가 Python 3.14 미지원: 3.13로 조정'. celery-crawl-worker:29 vs :27 동일 긴장. iter3(le-2) 제기.
- **영향**: 검증항목을 문자 그대로 대조하는 검수자가 ScrapeGraphAI 제약으로 정당하게 3.13을 선택한 빌드를 '계약 위반'으로 오판할 수 있다. 문서 내 두 규칙이 다른 값을 강제하는 경미한 정합성 결함.
- **권고**: SKILL.md:71을 'python:3.14-slim(ScrapeGraphAI 3.14 미지원 시 3.13-slim, 결정을 산출물에 기록)'로 조건부 표기해 에러핸들링 결정과 일치시킨다.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 3 테스트/린트/타입 실패 시 재작업 루프가 명시되지 않음</summary>

- **근거**: Phase 3(SKILL.md:42-44)은 테스트를 '작성·통과시킨다'·'통과 확인'만 기술하고, 에러 핸들링(SKILL.md:53-59)은 런타임 오류(Browserless 429·파싱 실패·예산 초과)만 다룬다. 'Phase 3 게이트 실패 → 구현 수정 → 재실행' 루프가 없다. iter2(fw-3) 제기.
- **영향**: 단일 구현담당이 자기수정하리라 암묵 가정되나, 생성-검증 패턴의 명시적 재시도 상한/재검증 루프가 문서화되지 않아 통과 기준 미달 시 진행이 모호하다.
- **권고**: Phase 3에 '테스트/ruff/mypy 실패 시 crawl-worker-engineer를 해당 범위로 재호출해 수정 후 재검증(최대 N회)'을 명시하고, Phase 5 보고 전 게이트 통과를 전제조건으로 못 박는다.

</details>

<details>
<summary><b>🟡 경미</b> · 산출물 파일번호 '05'가 현재 단일워커 워크플로우 Phase에 매핑되지 않음(폐기된 배치 트랙 잔재)</summary>

- **근거**: SKILL.md:82와 crawl-worker-engineer.md:42는 산출물을 _workspace/05_crawl_worker.md로 규정하나, 파일 컨벤션은 {phase}_{agent}_{artifact}이고 현재 Phase는 0~5·산출물은 단일이다. '05'는 폐기된 5단 배치 트랙(SKILL.md:10)의 마지막 스테이지 번호 잔재로 보인다. iter2(fw-4) 제기.
- **영향**: 동작 무해하나 컨벤션 자기정합성이 깨져 신규 사용자가 phase 번호 규칙을 오해할 수 있다.
- **권고**: _workspace/crawl_worker.md 또는 현재 구현 Phase에 맞춘 번호로 바꾸거나 '05는 임의 식별번호'라는 주석을 남긴다.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 0에 '새 입력 제공 시 기존 산출물 아카이브' 분기가 없어 오케스트레이터 템플릿과 미세 드리프트</summary>

- **근거**: SKILL.md:24-29 Phase 0은 _workspace/ 없으면/있으면 2분기만 두고 '있으면'은 항상 이어서 진행. orchestrator-template.md:45 '새 입력 제공 → 기존 _workspace/를 _workspace_{YYYYMMDD_HHMMSS}/로 이동' 분기 부재. iter3(gr-3) 제기.
- **영향**: 단일 구현담당의 증분 수정 성격상 '이어서 진행'이 의도일 수 있어 영향은 낮으나, 전혀 다른 워커를 새로 만들 때 기존 산출물이 덮어써질 여지가 있다.
- **권고**: Phase 0에 '완전히 다른 신규 워커 요청'일 때 기존 _workspace/·코드를 타임스탬프 디렉토리로 보관하는 분기를 한 줄 추가하거나, 증분 전용임을 명시적으로 못박는다.

</details>

<details>
<summary><b>🟡 경미</b> · 이 하네스의 실험 플래그 면역성이 명시되지 않음(스타터팩 안내 누락)</summary>

- **근거**: SKILL.md 전체에 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 언급 없음. 이 하네스는 서브에이전트(Agent=GA) 단일 구조라 플래그가 불필요(experimental-dependency.md:20 'Agent(invoke) ... No (GA)'). iter1(reu-2) 제기.
- **영향**: 긍정적 사실(플래그 없이 동작)이 문서화되지 않아, 다른 3개 팀-기반 하네스와 함께 클론한 사용자가 '이것도 플래그가 필요한가'를 판단할 수 없다. 규제/엔터프라이즈 환경에서 이 하네스를 우선 채택할 근거가 사라진다.
- **권고**: SKILL.md 실행 모드 섹션에 '이 하네스는 Agent 도구(GA)만 사용하므로 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 플래그가 필요 없다 — 팀 폴백 리스크 없음' 한 줄을 추가한다.

</details>

**핵심 개선안(우선순위순)**:

- Phase 4·contract 조정 포인트 표에 cross-repo GitOps 쓰기 토큰(인프라 저장소 contents+pull_requests 권한 PAT/GitHub App 시크릿)을 필수 전제로 추가하고, 미설정 시 GitOps PR 잡을 조건부 스킵/경고해 GHCR push까지만 수행하도록 하여 클론 사용자의 반쪽 배포 실패(유일한 확정 major)를 제거한다.
- 계약의 런타임 절반을 자동 게이트로 끌어올린다: celery_app.conf 정적 값(acks_late/task_serializer/worker_prefetch_multiplier/visibility_timeout)을 단정하는 저비용 pytest 단위테스트를 Phase 3에 추가해 needs: 체인에 편입하고, docker-compose 대상 integration 마커 스모크 테스트 1개(연결→세션 open/close→더미 파싱)를 CI에서 실행해 브라우저 수명주기 계약이 한 번은 강제되게 한다.
- crawl-worker-engineer.md:38의 TaskCreate 참조를 'Agent 도구 prompt로 전달'로 정정하고, Phase 2에 Agent(subagent_type, model, prompt) 완전 호출 블록을 추가하며, SKILL.md 실행 모드에 '플래그 면역(GA Agent 전용)' 한 줄을 명시해 설계의 핵심 장점을 문서 전반에 일관되게 드러낸다.
- python-test-ci CI 템플릿의 test job에 'uv run ruff check .'·'uv run mypy .' step을 추가해, SKILL.md:77이 선언한 ruff·mypy 게이트가 실제로 build-push의 needs: 전제가 되게 정합화한다.
- 폴백 트리거 테스트에 ScrapeGraphAI monkeypatch/mock 지침을 명시하고, SKILL.md:71의 python:3.14-slim을 '3.14 미지원 시 3.13-slim, 결정 기록'으로 조건부 표기해 검증항목과 에러핸들링 결정 간 충돌을 없앤다.

---

### 5.2 리서치→PRD/ROADMAP — 71/100

- **스킬**: `research-to-spec-orchestrator` · **모드**: 하이브리드(서브+팀)
- **구성**: web/academic/community-researcher · cross-validator · prd-author · tech-verifier · roadmap-planner
- **종합 판정**: research-to-spec 하네스는 하이브리드 흐름(Phase 2 서브 병렬 리서치→Phase 3 팀 교차검증/PRD→Phase 4 서브 기술검증→Phase 5 로드맵)이 논리적으로 이어지고, 이중 필수요소 게이트·환각 방지 계층·TeamDelete 선행 전환 규칙·파일 인계 기반 재개 분기 등 문서 하네스에 걸맞은 검증 골격이 실제 게이트로 구현된 점이 강점이다. 확정 결함의 축은 두 가지 major다: (1) Phase 3 팀이 의존하는 실험 플래그(CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)가 어디에도 문서화되지 않아 플래그 없는 클론 사용자에게 생성자↔검증자 분리가 조용히 폴백되는 문제(적대적 검증 2회로 critical→major 하향 — Phase 2가 GA이고 산출물은 여전히 생성되며 Phase 3이 본질적으로 순차라 폭발반경 제한적), (2) tech-verifier 보정 루프에 표준이 필수로 규정한 재시도 상한이 없어 교착 가능성. 나머지는 파일번호 05 자기모순, Phase 5 '팀 또는 서브' 모호성과 팀 정리 규칙 부재, 소프트·비결정적 게이트, 트리거 키워드 충돌, cross-source-research 스킬 미연결, 도구호출 예시 부재 등 재현성·유지보수성 minor다. 애드센스 특화는 refute가 아니라 의도된 차별점으로 minor 문서 보완 사안으로 정정했다. 최종 점수는 71/100으로, 검증 설계 골격은 우수하나 전제조건 안내·루프 종료 규율·범용성 분기가 보강돼야 스타터킷으로서 신뢰성 있게 재현된다. genericReusability(15)가 가장 약한 축으로 도메인 특화와 라우팅 충돌이 반영됐다. 세 회차 중 iteration 3이 스킬↔에이전트 연결·팀 생명주기까지 파고들어 타 회차가 놓친 고유 구조 결함을 발굴하고 fw-1의 폭발반경을 정확히 한정해 가장 철저했다.

**확정 발견 9건** (🔴치명 0 · 🟠중대 2 · 🟡경미 7):

<details>
<summary><b>🟠 중대</b> · 실험 플래그(CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) 미문서화 — Phase 3 팀이 플래그 없으면 조용히 단일 에이전트로 폴백</summary>

- **근거**: SKILL.md:19,57,59,61,79가 Phase 3에서 TeamCreate/SendMessage/TeamDelete(플래그 게이트 원시도구)에 의존하나, 프로젝트 .claude/(skills·agents) 및 SKILL.md 전체 grep에서 EXPERIMENTAL/AGENT_TEAMS/전제조건 언급 0건. 표준 experimental-dependency.md:22-28 '플래그 미설정 시 팀이 단일 에이전트 실행으로 조용히 폴백되어 Producer-Reviewer 패턴이 소리 없이 깨진다'. 3회 감사 모두 이 증거를 실재 확인.
- **영향**: 플래그 없이 클론한 사용자가 트리거하면 Phase 3의 cross-validator+prd-author가 한 에이전트로 합쳐져 생성자↔검증자 분리가 사라지고 SendMessage 조율·TeamDelete가 무효화된다. 다만 하드 실패가 아니라 품질 저하다: Phase 2 병렬 리서치는 GA Agent라 플래그 없이도 동작하고, Phase 3은 본질적으로 순차(SKILL.md:58 cross-validator→prd-author)라 PRD.md/ROADMAP.md는 여전히 생성된다. 적대적 검증 2회가 critical→major로 하향(폭발반경 제한적).
- **권고**: SKILL.md 상단 '실행 모드' 표 앞에 '전제조건' 블록 신설: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 요구 + 미설정 시 폴백 경고 명시, Phase 0에 플래그 유무 프리플라이트 체크 추가. 더 나은 근본 해법: Phase 3은 파일 인계 기반 순차 파이프라인이므로(agent-design-patterns.md:93) 팀 대신 Agent 서브 2단계(cross-validator→prd-author, SendMessage 상충 조율은 오케스트레이터 중재로 대체)로 재구성하면 이 하네스의 유일한 플래그 의존이 제거돼 전체가 GA 경로로 무결해진다.

</details>

<details>
<summary><b>🟠 중대</b> · tech-verifier↔prd-author 보정 루프에 최대 재시도 상한 부재 — 무한 루프/교착 위험</summary>

- **근거**: SKILL.md:66 'Blocker/Warning이 있으면 prd-author를 다시 Agent로 호출...보정한 뒤 재검증한다', :98 '(Blocker면 보정 루프)', :112·:123 '재검증 Blocker 0 확인 후에만 Phase 5 진행'. 재시도/최대/횟수/무한 언급 grep 0건(3회 모두 확인). 표준 agent-design-patterns.md:130 생성-검증 패턴 '무한 루프 방지를 위해 최대 재시도 횟수(2~3회) 설정 필수'. 3회 감사 전부 confirmed/major.
- **영향**: 해소 불가능한 Blocker(대체 불가 죽은 출처·환각 인용, 스택으로 실현 불가능한 요구)를 만나면 보정→재검증→여전히 Blocker가 종료 조건 없이 반복돼 토큰·시간을 소진하거나 Phase 5 진입이 영구 차단된다. 표준이 명시적 '필수'로 규정한 항목의 누락. 추가로 SKILL.md:66은 비차단인 Warning(tech-verifier.md:35)까지 루프 트리거로 삼는 부수 결함이 있다.
- **권고**: Phase 4에 '보정 루프 최대 2~3회, 초과 시 잔여 Blocker를 미해결로 05_tech_verification.md·PRD에 명시하고 사용자 판단 요청 후 Phase 5 진행(또는 중단)'하는 상한·탈출 조건을 명문화하고 에러 핸들링 섹션(SKILL.md:108-115)에도 반영. Warning은 루프 트리거에서 제외해 PRD의 '알려진 리스크'로 기록만 하도록 분리. 잔여 Blocker는 roadmap-planner의 '선결 검증 필요'(roadmap-planner.md:26,54)로 이관.

</details>

<details>
<summary><b>🟡 경미</b> · 애드센스/cron+Playwright/Lighthouse 특화가 전 PRD에 강제되나 적용 범위가 SKILL 상단에 미명시</summary>

- **근거**: SKILL.md:60,113과 prd-author.md:17-41이 애드센스 80%+·유지보수 최소(cron+Playwright+IaC)·Lighthouse·테스트 전략을 무조건 PRD 완료 게이트로 강제, 누락 시 Phase 3 미완료 처리. iter1·iter2 모두 partial→minor로 하향(refute 아님).
- **영향**: 광고 무관 제품(내부 대시보드·구독형 SaaS·B2B 툴)으로 클론 시 부적합한 요구사항이 삽입될 수 있으나, 이는 은닉 버그가 아니라 의도된 핵심 차별점이다: prd-authoring 스킬 description·CLAUDE.md 하네스 목표표가 '애드센스 콘텐츠 사이트'를 반복 공지. 실질 영향은 광고 무관 제품에 대한 소규모 문서 명료성 노이즈로 한정.
- **권고**: SKILL.md 상단 '적용 범위' 한 줄 추가('이 하네스는 애드센스 수익 콘텐츠 사이트를 전제한다'). 더 똑똑한 개선: Phase 1(SKILL.md:47-49)에서 제품 유형(광고형/구독형/내부툴)을 먼저 분기시켜 4대 게이트를 '광고·콘텐츠형일 때 조건부 필수'로 재정의하면 범용 오용을 원천 차단하면서 특화 가치는 유지된다.

</details>

<details>
<summary><b>🟡 경미</b> · 파일번호 컨벤션 자기모순 — Phase 4 산출물이 05_로 명명(04 부재)되어 {phase}_ 규칙 위반</summary>

- **근거**: SKILL.md:105 컨벤션 '{phase}_{agent}_{artifact}.md'이면서 같은 줄 예시로 Phase 4 tech-verifier 산출물을 05_tech_verification.md로 든다(line 33에서 Phase 4로 명기). 04_ 파일 grep 0건. 3회 감사 모두 제기.
- **영향**: 실행은 안전(05_가 line 33,65,69,97,105,123 및 roadmap-planner.md:30에서 내부 일관 참조). 그러나 Phase 0 재개 판단(SKILL.md:42)에서 파일번호↔Phase 매핑을 신뢰하는 후속 개선 시 혼란을 유발하고 규칙 신뢰도를 떨어뜨린다.
- **권고**: 04_tech_verification.md로 개칭해 {phase}_ 규칙과 일치(SKILL·tech-verifier.md·roadmap-planner.md 6개 참조 일괄 갱신)하거나, 컨벤션 문구를 'Phase가 아닌 순번'으로 재정의해 자기모순 제거. 다른 하네스(fullstack의 04=api_contract)와의 04 의미 충돌도 함께 정리.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 5 '팀 또는 서브' 모호 + Phase 4 보정 루프의 팀 재생성 정리 규칙 부재</summary>

- **근거**: SKILL.md:21,34,68이 단일 에이전트 roadmap-planner의 모드를 '에이전트 팀 또는 서브'로 열어둠(표준 agent-design-patterns.md:73 '에이전트 1개 → 서브'로 단정). SKILL.md:66은 보정 시 '소규모 팀 재생성'을 허용하나 하이브리드 전환 규칙(:77-82)은 2→3·3→4·Phase4 내부만 다루고 재생성 팀 및 Phase 5 팀의 TeamDelete를 다루지 않음. 3회 감사에서 fw-2/fw-3/le-2/ef-2로 반복 제기.
- **영향**: 1인 팀 선택 시 불필요한 플래그 의존(fw-1 리스크 확대)·오버헤드가 생기고, 팀 재생성/Phase 5 팀에 대한 정리 규칙이 없어 잔여 팀이 남아 '세션당 1팀 활성' 제약(agent-design-patterns.md:31-34)과 충돌할 소지가 있다.
- **권고**: Phase 5를 '서브 에이전트'로 확정(모드 표 line 21·구성 line 34·워크플로우 line 68 모두 수정)하고 보정 루프의 '소규모 팀 재생성' 표현을 삭제해 Agent 서브로 단일화. 팀 옵션을 유지하려면 4→5 전환 및 재생성 팀 재검증 전 TeamDelete를 전환 규칙 절에 명문화.

</details>

<details>
<summary><b>🟡 경미</b> · 필수요소 게이트가 선언적('확인한다') 소프트 자기점검이고 Phase 4 재검증이 애드센스·Lighthouse를 미커버</summary>

- **근거**: Phase 3 게이트는 오케스트레이터·prd-author의 '확인한다' 자기점검(SKILL.md:60,113; prd-author.md:62)이며 '어떻게' 확인하는지 결정적 절차 없음. Phase 4 tech-verifier의 필수요소 재검증(tech-verifier.md:27-29)은 테스트 전략·IaC 포함만 대상 — 애드센스 80%·Lighthouse 존재는 독립 재검증 안 됨. 3회 감사에서 vd-2/vf-2로 반복.
- **영향**: 게이트 통과 판정이 LLM 눈대중에 의존해 재현성이 낮고, 애드센스·Lighthouse는 Phase 3 단일 게이트에만 걸려 있어 그 게이트가 부실하거나 Phase 4 보정 중 prd-author가 항목을 실수로 떨어뜨리면 필수요소가 빠진 채 최종 PRD로 통과할 수 있다.
- **권고**: Phase 3 게이트에 '필수 섹션 헤딩 4종(애드센스/유지보수·IaC/Lighthouse/테스트전략)이 docs/PRD.md에 존재하는지 Grep로 확인'하는 결정적 체크를 명시하고, tech-verifier의 필수요소 검사(tech-verifier.md:27-29)에 애드센스·Lighthouse 존재 여부를 추가해 이중 게이트를 완성. Phase 4 재검증 종료 조건을 'Blocker 0 AND 4대 필수요소 유지'로 확장.

</details>

<details>
<summary><b>🟡 경미</b> · 트리거 키워드가 다른 오케스트레이터와 대량 충돌(IaC/opentofu/terraform/테스트전략/QA/재실행/수정/보완/다시)</summary>

- **근거**: research-to-spec description(SKILL.md:3)에 'IaC, 인프라, terraform, opentofu, tofu, 테스트 전략, QA, 재실행, 수정, 보완, 다시' 포함. 동일 키워드가 data-pipeline-design-orchestrator·scraping-pipeline-build-orchestrator description에도 존재(available-skills 목록에서 확인). iter1에서 제기.
- **영향**: '인프라/테스트/재실행/보완' 요청 시 어느 하네스가 발화할지 모호해 잘못된 오케스트레이터가 활성화될 수 있어 라우팅 신뢰성이 저하된다.
- **권고**: 공통 후속 키워드는 도메인 접두어와 함께 쓰도록 조정('PRD/로드맵 보완', 'PRD 재실행')하고, IaC/terraform/opentofu 같은 순수 인프라 실행 키워드는 문서 산출 하네스인 research-to-spec description에서 제거해 실제 IaC 실행 하네스에만 남긴다.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 2 방법론과 일치하는 cross-source-research 스킬이 세 리서처 어디에도 연결되지 않음(방법론 중복 인라인)</summary>

- **근거**: grep 결과 cross-source-research가 web/academic/community-researcher.md 및 SKILL.md 어디에도 참조되지 않으나, 스킬 설명('웹·학술·커뮤니티 3축 수집·신뢰도 등급·교차검증')이 Phase 2 방법론과 동일. 세 에이전트가 출처 병기·A/B/C 등급 규칙을 각자 인라인 중복 서술. iter3에서 고유 발굴.
- **영향**: 동작에는 문제 없으나 표준 agent-design-patterns.md:290-298의 스킬↔에이전트 연결 원칙 미준수로, 신뢰도 등급·출처 병기 규약 갱신 시 세 파일을 각각 수정해야 하는 유지보수 부담과 드리프트 위험이 있다.
- **권고**: 세 리서처 정의에 'Skill 도구로 /cross-source-research 참조' 지시를 추가해 신뢰도 등급·출처 병기 규약의 단일 출처(SSOT)를 확보하고 중복 인라인을 축소한다.

</details>

<details>
<summary><b>🟡 경미</b> · 구체적 TeamCreate/Agent/TaskCreate 도구호출 예시 부재로 agent_type·depends_on 매핑이 암묵적</summary>

- **근거**: SKILL.md는 Phase를 서술형으로만 기술(:56-61 등)하고 TeamCreate(members:[{name,agent_type,model,prompt}])·TaskCreate(depends_on) 형태의 구체 호출 코드가 없음. 표준 orchestrator-template.md:58-77은 호출 코드와 agent_type·depends_on 명시를 권장. iter2에서 제기.
- **영향**: 실행 에이전트가 cross-validator/prd-author를 subagent_type로 어떻게 넘길지, Phase 3 두 작업의 depends_on(교차검증→PRD)을 어떻게 등록할지 매번 추론해야 해 재현성·일관성이 실행자 판단에 좌우된다.
- **권고**: Phase 2·3·4·5에 각각 최소 하나의 구체 도구호출 예시(Agent/TeamCreate/TaskCreate, agent_type·model:opus·run_in_background·depends_on 포함)를 추가해 표준 오케스트레이터 템플릿 수준으로 명세화한다.

</details>

**핵심 개선안(우선순위순)**:

- Phase 3을 팀 대신 Agent 서브 2단계 순차 파이프라인(cross-validator→prd-author, 파일 인계, SendMessage 상충 조율은 오케스트레이터 중재로 대체)으로 재구성해 이 하네스의 유일한 실험 플래그 의존을 제거하고 전체를 GA 경로로 무결화한다 — 전제조건 문서화보다 근본적인 해법(fw-1 해소).
- Phase 4 보정 루프에 '최대 2~3회, 초과 시 잔여 Blocker를 05 파일·PRD에 명시하고 사용자 판단 요청 후 진행/중단' 상한·탈출 조건을 명문화하고, 비차단 Warning을 루프 트리거에서 분리해 '알려진 리스크' 기록으로 전환한다(vd-1 해소).
- Phase 1에 제품 유형(광고형/구독형/내부툴) 분기를 신설해 애드센스·cron+Playwright·Lighthouse 4대 요소를 '광고·콘텐츠형일 때 조건부 필수' 게이트로 재정의하고, SKILL.md 상단에 '애드센스 콘텐츠 사이트 전제' 적용 범위를 명시한다(gr-1 해소).
- 필수요소 게이트를 결정적 검사로 승격: Phase 3 완료 전 docs/PRD.md에 필수 섹션 헤딩 4종 존재를 Grep로 확인하는 체크리스트를 명시하고, Phase 4 tech-verifier 재검증 대상에 애드센스·Lighthouse까지 포함해 이중 게이트를 완성한다(vd-2 해소).
- Phase 5를 '서브 에이전트'로 확정하고 보정 루프의 '소규모 팀 재생성' 표현을 삭제해 1인 팀·미정의 TeamDelete로 인한 '세션당 1팀' 제약 위반 소지를 제거한다(fw-2/fw-3 해소).
- 세 리서처 정의에 /cross-source-research 스킬 참조를 연결해 신뢰도 등급·출처 병기 규약의 단일 출처를 확보하고, tech-verifier 산출물을 04_로 개칭해 파일번호 컨벤션 자기모순을 제거한다(reuse-1·file-number 해소).

---

### 5.3 풀스택 웹 개발 — 66/100

- **스킬**: `fullstack-web-orchestrator` · **모드**: 에이전트 팀(파이프라인)
- **구성**: design-architect · frontend-engineer · backend-engineer · qa-inspector
- **종합 판정**: 풀스택 웹 오케스트레이터는 무순환 depends_on DAG, 리더가 실제 실행하는 lint→build→test 강제 게이트, 경계면 '양쪽 동시 읽기' 교차검증, 실재하는 link-check.mjs·전용 에이전트 정의 등 검증 설계가 4개 하네스 중 최상급이다(검증 축이 가장 높음). 그러나 팀 원시도구를 쓰면서 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 전제조건을 어디에도 문서화하지 않아, 클론 사용자가 트리거하면 팀·병렬·SendMessage 계약갱신·점진 QA가 오류 없이 단일 에이전트로 폴백되어 하네스 핵심이 실행 시점에 소실되는 critical 결함이 실행 신뢰성을 크게 갉아먹는다. iter2가 이 발견의 인용 출처(experimental-dependency.md)가 저장소에 없음을 정확히 지적했으나(직접 확인됨), 관측 근거인 grep 0건과 이 감사 세션의 팀 원시도구 미제공이 동작 주장을 독립적으로 뒷받침하므로 critical을 유지한다. 배포 클러스터(Phase 4.5 무조건 실행·vercel.ts 미강제 선언·@vercel/config 미설치·Vercel 미링크 에러 핸들링 부재)는 다수결 major다. 반면 iter1이 major로 올렸던 플러그인 전제 이슈는 .claude/settings.json enabledPlugins가 두 플러그인을 프로젝트 스코프로 고정하고 있어 refute되어 minor로 확정한다. 나머지(점진 QA 타이밍·agent_type 표기·파일 번호·명령 게이트 상한)는 minor다. 3회 중 iteration 3이 가장 철저했다: critical에 대해 저장소에 없는 인용문서에 의존하지 않고 세션의 deferred tools(SendMessage 존재·TeamCreate 계열 부재)라는 세션 검증 가능한 독립 증거를 제시했고, 게이트-vs-체크리스트(L116 vs L124) 구분과 package.json 실증(@vercel/config 부재)으로 major를 정확히 confirmed 판정했으며 QA 타이밍은 partial→minor로 보정해 과장을 걸렀다. iter2는 날조 출처를 잡아낸 적대적 예리함이 돋보였으나 독립 증거를 놓쳐 critical을 minor로 과소평가했고, iter1은 플러그인 major를 정확히 refute했지만 critical 근거가 부분적으로 허구 문서에 의존했다. 최종 점수는 66/100(작업흐름 16·검증 19·오류자유 17·범용성 14)으로 3회 평균(66.7)에 수렴하되, 검증 설계 강점과 전제조건 문서화 실패를 함께 반영했다."

**확정 발견 7건** (🔴치명 1 · 🟠중대 1 · 🟡경미 5):

<details>
<summary><b>🔴 치명</b> · 팀 원시도구 실험 플래그(CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1) 전제조건 미문서화 — 클론 사용자에게 조용히 단일 에이전트로 폴백</summary>

- **근거**: SKILL.md L12·L49·L66·L99·L139가 TeamCreate/TaskCreate/TaskGet/TeamDelete/SendMessage를 파이프라인 전 구간에서 사용. 직접 검증: `grep -rl EXPERIMENTAL_AGENT_TEAMS .claude/` = 0건(exit 1), CLAUDE.md·SKILL.md 어디에도 플래그 고지 없음. 독립 방증(이 감사 세션의 deferred tools 목록): SendMessage는 제공되나 TeamCreate/TaskCreate/TeamDelete/TaskGet은 부재 — 플래그 미설정 시 팀 원시도구 자체가 없음을 실증. 3회 감사 중 2회(iter1·iter3) confirmed-critical, 1회(iter2) partial-minor. iter2가 인용 표준문서 experimental-dependency.md의 저장소 내 부재를 지적한 것은 사실이나(직접 확인: 해당 파일 없음), 이는 '인용 출처'만 무효화할 뿐 관측 가능한 동작 근거(grep 0건 + 팀 원시도구 미제공)는 독립적으로 성립한다.
- **영향**: 스타터킷을 클론한 사용자가 웹개발 요청으로 오케스트레이터를 트리거하면 TeamCreate/SendMessage/TaskCreate 조율이 전부 무효화되고 리더 1명 순차 실행으로 조용히 폴백된다. 프론트/백엔드 병렬 구간, 경계면 실시간 통보(shape↔훅), 점진 QA 피드백 루프, depends_on 파이프라인이 오류 없이 소실되어 하네스 핵심 가치가 실행 시점에 사라지는데 사용자는 '정상 완료'로 오인한다. 4개 하네스 공통 이슈.
- **권고**: SKILL.md '실행 모드: 에이전트 팀' 절(L10 부근)에 전제조건 블록 추가: (1) `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 요구 명시, (2) Phase 0/Phase 2 진입 전 리더가 TeamCreate 가용성(플래그)을 확인하고 미설정 시 '플래그 안내 후 중단' 또는 'Agent(invoke) GA 서브에이전트 폴백 모드'로 명시 분기, (3) 4개 하네스 공통이므로 CLAUDE.md '하네스' 섹션에 전제조건 1줄 추가. 인용은 실재하지 않는 experimental-dependency.md 대신 관측 근거(원시도구 게이트)로 서술.

</details>

<details>
<summary><b>🟠 중대</b> · 배포 게이트 결함 클러스터 — Phase 4.5 무조건 실행 + vercel.ts 체크리스트가 강제 아닌 선언 + @vercel/config 미설치 + Vercel 미링크 에러 핸들링 부재</summary>

- **근거**: 직접 검증: package.json에 @vercel/analytics·@vercel/speed-insights는 있으나 @vercel/config 0건, vercel.ts 파일 부재. SKILL.md L116 명령 게이트(lint→build→test)만 리더가 실제 실행하는 강제 게이트이고, L124 'vercel.ts 설정 코드화'·L126 Playwright는 '비기능 검증 항목(완료 체크리스트)'에 체크박스로만 존재해 실행·확인 메커니즘이 없다. L129 Phase 4.5는 '검증 게이트를 통과한 뒤 리더가 Vercel에 배포한다'로 사용자 배포 의도 조건 없이 무조건 단계로 서술. 에러 핸들링 표(167-175)에 Vercel 미링크/미인증/배포 실패 행 없음. 3회 감사: iter1 partial→major, iter3 confirmed→major, iter2 partial→minor(다수결 major).
- **영향**: 로컬 기능 개발만 원하는 클론 사용자에게도 Phase 4.5가 프로덕션 배포를 사실상 의무화한다. @vercel/config 미설치·Vercel 계정/링크 부재 상태에서는 이 단계가 막히거나 무의미해지고, 실패 대응 경로가 에러 표에 없어 완료 처리가 blocking된다. vercel.ts 체크리스트 항목은 검증 명령이 없어 '통과'를 객관 판정할 수단이 없다(선언에 그침).
- **권고**: (1) Phase 4.5를 '사용자가 배포/deploy/vercel을 명시 요청한 경우에만' 실행하는 조건부 단계로 명시(트리거 키워드와 일치). (2) vercel.ts 체크박스를 '배포 수반 태스크에 한함'으로 스코프 제한하고, 적용 시 검증법(vercel.json 부재 + vercel.ts 존재 + npm run build 통과)을 명시해 강제화하거나 Phase 4.5 진입조건으로만 두어 Phase 5 하드 게이트(lint→build→test)와 분리. (3) 에러 핸들링 표에 'Vercel 미링크/미인증 → 배포 스킵 + 로컬 검증만 완료로 보고' 행 추가. (4) @vercel/config는 미설치·미검증 패키지임을 web-deploy-config 연동 지점에 경고로 남기거나 package.json에 선반영.

</details>

<details>
<summary><b>🟡 경미</b> · 점진 QA(백엔드)의 depends_on이 '프론트 구현'을 포함하지 않아 shape↔훅 교차검증이 그 시점에 성립 불가</summary>

- **근거**: SKILL.md L71 `{ title: '점진 QA(백엔드)', description: 'API 완성 즉시 shape↔훅·엔드포인트 매핑 검증', depends_on: ['백엔드 구현'] }` — 소비자측(프론트 훅)을 만드는 L70 '프론트 구현'(depends_on:['설계'], 백엔드와 병렬)이 의존성에 없다. qa-inspector.md는 경계면 검증을 '양쪽 동시 읽기'로 규정. iter2·iter3이 제기, 둘 다 partial→minor(iter1 미제기).
- **영향**: 백엔드 완성 시점에 대응 훅이 미존재하면 shape↔훅 교차검증이 그 시점엔 불가하고, 실질 검증이 통합 QA(L73, 양측 점진 QA에 depends_on)로 지연된다. 다만 통합 QA가 완료 게이트 전에 반드시 shape↔훅·엔드포인트 매핑을 최종 재검증하므로 경계면 버그는 유실이 아니라 '지연'될 뿐이다 — major가 아닌 문서 정밀도 문제.
- **권고**: (a) 점진 QA(백엔드) description을 훅 비의존 범위(route.ts의 NextResponse.json shape ↔ 04_api_contract.md 계약 일치, 엔드포인트 존재)로 좁히고 shape↔훅 교차검증은 통합 QA로 명확히 귀속, 또는 (b) 진짜 조기 경계면 검증을 원하면 depends_on에 '프론트 구현'을 추가. description↔depends_on 불일치를 제거.

</details>

<details>
<summary><b>🟡 경미</b> · 에이전트 구성 표의 agent_type 표기('general-purpose (...)')와 TeamCreate 실행 코드의 전용 타입명 자기모순</summary>

- **근거**: SKILL.md L18-21 표는 '에이전트 타입'을 'general-purpose (`.claude/agents/design-architect.md`)'로 기재하나, L52-59 TeamCreate 예시는 `agent_type: "design-architect"`(전용 커스텀 타입명)를 넣는다. 표준(agent-design-patterns.md)은 커스텀 에이전트를 `subagent_type: "{name}"`으로 호출. 3회 감사 모두 minor로 일치(iter1 fw-4·iter2 fw-4·iter3 fw-6).
- **영향**: 실행 경로(TeamCreate 코드)는 전용 타입명을 써서 정상 동작한다. 그러나 표만 읽는 구현자가 'general-purpose'를 넣으면 .claude/agents/*.md의 페르소나·프로토콜이 로드되지 않고 인라인 프롬프트만 적용돼 품질 저하. 유지보수자를 오도하는 문서 내 자기모순.
- **권고**: 표의 '에이전트 타입' 열을 실제 코드와 일치하게 'design-architect (커스텀, .claude/agents/design-architect.md)' 형태로 4명 모두 통일. general-purpose는 빌트인 타입명이므로 커스텀 정의 지칭에 쓰지 않는다. data-pipeline 오케스트레이터도 동일 표기 이슈 함께 정정.

</details>

<details>
<summary><b>🟡 경미</b> · 산출물 파일 번호 규약 — 02 결번 및 번호 순서와 의존 순서 역전(계약 04가 소비자 노트 03보다 뒤 번호)</summary>

- **근거**: SKILL.md L92-97 산출물: 00_input, 01_design_spec, 03_frontend_notes, 04_api_contract, 05_qa_report — 02 결번. 프론트 노트(03)가 소비하는 백엔드 API 계약이 04로, 업스트림(계약)이 다운스트림(프론트)보다 큰 번호를 가져 의존 방향과 역전. 3회 감사 모두 minor 일치(iter1 fw-5·iter2 fw-6·iter3 fw-5).
- **영향**: 동작에는 영향 없으나 표준의 {phase}_{agent}_{artifact} 규약과 어긋나고, 결번·순서 역전이 후속 세션·감사 추적 시 데이터 흐름 오해를 유발한다.
- **권고**: 번호를 파이프라인·의존 순서에 맞춰 재배열(예: 01 design → 02 api_contract → 03 frontend_notes → 04 qa_report)하거나, 번호가 도메인 고정 슬롯임을 SKILL.md에 주석으로 명시.

</details>

<details>
<summary><b>🟡 경미</b> · 플러그인 스킬(ui-ux-pro-max·frontend-design) 전제가 SKILL.md 산문에 미고지 (단, settings.json으로 이미 프로젝트 스코프 고정됨)</summary>

- **근거**: design-architect.md L22·frontend-engineer.md L23이 두 스킬을 '적극 사용'하도록 지시. 직접 검증: .claude/settings.json enabledPlugins가 `ui-ux-pro-max@ui-ux-pro-max-skill`·`frontend-design@claude-plugins-official`를 true로 프로젝트 스코프에 명시 고정하고 extraKnownMarketplaces로 마켓플레이스도 등록. iter1은 major로 제기했으나 adversarial verdict refuted(핵심 impact '조용히 무시/사용 불가'가 settings.json 고정으로 성립 안 함)→minor 하향, iter2·iter3은 애초 minor로 제기.
- **영향**: settings.json이 플러그인/MCP 전제조건을 선언하는 정식 메커니즘으로 클론 사용자에게 설치를 안내하므로 '이식성 붕괴'는 성립하지 않는다. 잔여 결함은 SKILL.md 산문에 폴백 안내가 없다는 편의 수준의 문서 공백뿐 — major reusability 결함이 아니다.
- **권고**: 선택적 개선: SKILL.md 에이전트 표 하단에 'ui-ux-pro-max/frontend-design은 플러그인 필요 — 미설치 시 wireframe-design/frontend-build만으로 진행' 폴백 주석 1줄 추가. settings.json 고정이 이미 있으므로 우선순위는 낮음.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 4.3 명령 게이트 수정 루프에 명시적 최대 반복 상한 부재</summary>

- **근거**: 직접 검증: SKILL.md L116 명령 게이트는 '수정 → 재검증 루프로 돌린다'로 상한 미기재. 반면 L108 QA 루프는 '재검증 루프(최대 2~3회)', L171 에러 표는 'QA 반복 미수정 → 최대 2~3회 후 리포트에 미해결 명시'로 상한이 있음 — 즉 상한은 QA 루프에만 걸려 있고 명령 게이트에는 없음. iter1 fw-6 단독 제기가 정확. iter2·iter3의 strengths가 '재시도 최대 2~3회'를 명령 게이트에도 있는 것처럼 서술한 것은 두 루프의 혼동(반증 아님).
- **영향**: lint/build/test가 환경 미비·해결 불가 의존성으로 계속 실패하면 명령 게이트 루프가 종료 조건 없이 반복될 수 있고, 실패를 '미해결'로 확정해 사용자에게 에스컬레이션하는 종료 경로가 명령 게이트에는 없다. 자기종료 설계의 국소 빈틈.
- **권고**: Phase 4.3 명령 게이트(L116)에도 '최대 2~3회 재시도 후 미통과 항목을 05_qa_report.md에 미해결로 확정하고 사용자에게 에스컬레이션' 종료 조건을 QA 루프(L108)·에러 표(L171)와 동일하게 명시.

</details>

**핵심 개선안(우선순위순)**:

- 최우선(critical): SKILL.md 실행 모드 절에 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 전제조건 블록 + Phase 0/2 진입 전 플래그 가용성 확인·미설정 시 GA 서브에이전트 폴백 분기를 명문화하고, CLAUDE.md 하네스 섹션에도 4개 하네스 공통 전제조건 1줄 추가. 인용은 실재하지 않는 experimental-dependency.md 대신 관측 근거(팀 원시도구 게이트)로 서술.
- 차선(major): Phase 4.5 배포를 '사용자가 배포/deploy/vercel 명시 요청 시에만' 조건 실행으로 강등하고, vercel.ts 체크박스를 배포 태스크로 스코프 제한(또는 Phase 4.5 진입조건으로 이관)해 Phase 5 하드 게이트(lint→build→test)와 분리. 에러 핸들링 표에 'Vercel 미링크/미인증 → 배포 스킵 + 로컬 검증 완료 보고' 행 추가.
- 점진 QA(백엔드) description↔depends_on 정합화: 훅 비의존 검증(route.ts shape ↔ 04_api_contract.md)으로 좁히고 shape↔훅 교차검증은 통합 QA로 명확히 귀속(또는 depends_on에 '프론트 구현' 추가).
- Phase 4.3 명령 게이트에도 QA 루프와 동일한 '최대 2~3회 후 미해결 확정·에스컬레이션' 종료 조건을 추가해 무한 반복 방지.
- 문서 정합: 에이전트 표의 agent_type을 전용 타입명(design-architect 등)으로 통일하고, 산출물 파일 번호를 의존 순서(01 design→02 api_contract→03 frontend_notes→04 qa_report)로 재배열. @vercel/config는 미설치 패키지이므로 선반영하거나 온디맨드 설치임을 web-deploy-config 연동점에 경고.

---

### 5.4 데이터 파이프라인 설계 — 63/100

- **스킬**: `data-pipeline-design-orchestrator` · **모드**: 에이전트 팀(계층적 위임)
- **구성**: pipeline-lead · schema-designer · etl-designer · validation-designer · monitoring-designer
- **종합 판정**: 데이터 파이프라인 설계 하네스는 schema-first 단일 진실 원천·00~04 산출물 컨벤션·'설계만/구현 안 함' 경계·참조 무결성이 세 회차에서 일관되게 견고하다고 확인됐으며, 문서 성격에 맞게 실행 게이트 대신 정합성 대조 게이트를 둔 방향성도 옳다. 그러나 실행 배선(wiring) 층에 구조적 결함이 집중된다. 세 회차 모두 '실험 플래그 미문서화'를 critical로 제기했으나 적대적 검증에서 3회 만장일치로 major로 하향됐다(폴백돼도 산출물은 생성되며 4개 하네스 공통 환경 전제이기 때문). 확정된 major는 다섯으로, 그 뿌리는 대체로 하나다 — Phase 2에 구체적 TeamCreate/TaskCreate 코드블록이 없다는 점이 general-purpose 타입 방치(페르소나 미로드)·depends_on 순서 미강제·리더 권한 혼동을 동시에 낳는다. 따라서 이 코드블록 신설이 최고 레버리지 수정이다. 나머지(Phase 4 소프트 게이트, 스택/테스트툴 하드코딩, 파일명 서술 불일치, 워크스페이스 아카이브 부재)는 검증에서 minor로 정착했다. critical이 major로 정정된 만큼 실제 품질은 감사원들이 매긴 60~62보다 소폭 높아, 4축 재산정 총점을 63/100으로 확정한다. 3회 중 iteration 3이 가장 철저했다: 최다 발견(7건)에 더해, 다른 두 회차가 '직접 확인'했다고 인용한 표준문서 experimental-dependency.md가 실제로는 리포에 존재하지 않음을 적대적 검증에서 스스로 발견해 자기 증거사슬의 권위 한계까지 드러냈고, le-1·le-2를 실제 파일 대조로 confirmed 처리했다.

**확정 발견 10건** (🔴치명 0 · 🟠중대 5 · 🟡경미 5):

<details>
<summary><b>🟠 중대</b> · 실험 플래그(CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) 전제 미문서화 — 팀이 조용히 단일 에이전트로 폴백</summary>

- **근거**: SKILL.md:12·15·39가 TeamCreate/SendMessage에 전적으로 의존하나, 리포 6개 파일 어디에도 플래그/전제조건 언급이 0건(3회 grep 일치). 3회 감사 모두 critical로 제기했고 적대적 검증에서 3회 모두 major로 하향 일치. iter3 검증은 근거로 인용된 표준문서 docs/experimental-dependency.md가 리포에 실제로 존재하지 않음을 발견 — 'silently breaks' 인용의 권위는 리포 내에서 검증 불가하며, iter1·iter2의 '직접 확인' 인용은 이 점에서 신뢰도가 약함.
- **영향**: 스타터킷 클론 사용자가 플래그 없이 트리거하면 TeamCreate/SendMessage가 단일 에이전트로 폴백되어 schema-first 계층 위임·필드/키 브로드캐스트·depends_on 순서가 보장되지 않는다. 다만 설계 문서 5종 산출물 자체는 생성되므로 '완전 붕괴'가 아니라 계층위임 보장의 소실(degradation)이며, 4개 하네스 공통 환경 전제라 이 스킬 고유 로직 결함은 아니다. 그래서 critical이 아닌 major.
- **권고**: SKILL.md Phase 0 앞에 '전제조건' 절을 신설: (1) `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 확인, (2) 미설정 시 `export ...=1` 안내 또는 서브에이전트 폴백 경로 명시, (3) 미설정 진행 시 '단일 에이전트 폴백 — 계층 위임 미보장' 경고 출력. 4개 하네스 공통 사안이므로 CLAUDE.md '하네스' 표에 전제조건 각주 1줄을 함께 등록.

</details>

<details>
<summary><b>🟠 중대</b> · 에이전트 '타입' 열이 전부 general-purpose — 5개 전용 페르소나 .md가 런타임에 로드되지 않음</summary>

- **근거**: SKILL.md:19-25 표의 타입 열이 5개 모두 general-purpose이나, pipeline-lead/schema-designer/etl-designer/validation-designer/monitoring-designer는 .claude/agents/*.md 커스텀 정의로 실존. 표준 agent-design-patterns.md:197-199 '커스텀 에이전트는 subagent_type:"{name}"으로 호출'. Phase 2(:38-40)는 'TeamCreate로 5개 생성'만 있고 agent_type 매핑도, .md를 prompt에 인라인하라는 지시도 없음. iter2·iter3 적대적 검증 모두 confirmed(major). iter1의 minor 하향 논거(형제 스킬도 표엔 general-purpose)는, 이 스킬은 형제 fullstack SKILL.md:52-59와 달리 실제 TeamCreate 코드블록이 아예 없어 agent_type을 커스텀명으로 해소할 지점이 전무하다는 사실로 반박됨.
- **영향**: TeamCreate가 agent_type=general-purpose로 스폰하면 5개 .md의 작업원칙·팀통신 프로토콜·재호출 지침이 주입되지 않고, 오케스트레이터의 프롬프트 인라인도 없어 정성껏 작성한 핵심 자산이 사문화된다. 클론 사용자 산출물 품질이 설계 의도와 달라진다.
- **권고**: 표의 타입을 각 에이전트명(subagent_type:"schema-designer" 등)으로 교체하거나, Phase 2에 TeamCreate members[].prompt로 각 .md를 Read해 인라인하도록 명시. 반드시 둘 중 하나를 확정해 연결 고리를 끊기지 않게 한다(fw-3 TeamCreate 코드블록 신설과 함께 처리).

</details>

<details>
<summary><b>🟠 중대</b> · 구체적 TeamCreate/TaskCreate 코드블록 부재 — schema-first 순서가 산문 표에만 존재하고 기계적으로 강제되지 않음</summary>

- **근거**: SKILL.md 전체에 TeamCreate(members=[...])·TaskCreate(depends_on=[...]) 실행 코드블록이 없음(3회 grep 일치). depends_on은 :19-25 표 열(산문)과 Phase 3(:42-46) 내러티브로만 존재. 표준 orchestrator-template.md 작성원칙 2(:270)·Phase 2 코드블록(:58-77)은 TaskCreate로 순서를 조작화하도록 요구하고, 형제 fullstack SKILL.md:49-75는 실제 코드블록을 갖춤. iter2 검증 confirmed(major).
- **영향**: 'schema 확정 후 하류 3개'라는 순서가 실행 가능한 태스크 그래프로 인코딩되지 않아 프롬프트 서술에만 의존한다. 폴백/오해석 시 4개 designer가 schema 확정 전 착수해 필드명·PK 불일치를 유발할 수 있고, Phase 5 정리에 TeamDelete가 없어 세션당 1팀 제약 하에서 재실행 시 잔존 팀과 충돌할 수 있다.
- **권고**: Phase 2에 TeamCreate(name/agent_type/model/prompt) 블록과 TaskCreate(depends_on: schema→[etl,validation], schema+etl+validation→monitoring) 블록을 템플릿대로 삽입해 순서를 기계적으로 강제. Phase 5에 SendMessage 종료 요청 + TeamDelete로 팀 정리를 명시.

</details>

<details>
<summary><b>🟠 중대</b> · 리더 전용 권한(위임·재위임)을 팀원 pipeline-lead에 부여 — 평탄 단일 팀에서 실행 불가</summary>

- **근거**: SKILL.md:12·42-46이 pipeline-lead를 '상위 조율자'로, 에러핸들링 :84가 '산출물 없으면 lead가 재위임'으로 리더 권한(재스폰)을 팀원에게 부여. 표준 agent-design-patterns.md:33 '리더 고정(이전 불가)', :160 '팀 중첩 불가(팀원이 팀 생성 불가)…평탄화하여 단일 팀'. 실제 리더는 TeamCreate를 호출한 오케스트레이터이고 pipeline-lead는 동료 팀원. iter2 검증 confirmed(major); iter1은 minor 하향, iter3은 미제기. 형제 fullstack SKILL.md:99는 리더=오케스트레이터가 재할당을 수행하는 올바른 패턴.
- **영향**: 팀원 pipeline-lead는 TaskCreate로 작업을 분배하거나 실패한 designer를 재위임(재스폰)할 수 없다. '위임/재위임' 워크플로우가 구조적으로 실행 불가능하며, 누가 depends_on 순서와 재실행을 강제하는지 제어흐름이 모호하다. (단 SendMessage 브로드캐스트는 팀원도 가능하므로 그 부분은 유효.)
- **권고**: leader/member 권한 분리: TaskCreate·depends_on·실패 재할당은 오케스트레이터(유일 리더)가 수행하고, pipeline-lead는 'SendMessage 기반 정합성 관장 팀원'으로 역할 한정. :84 'lead가 재위임'을 '오케스트레이터가 실패 task 재할당'으로 정정.

</details>

<details>
<summary><b>🟠 중대</b> · depends_on 그래프가 에이전트 입력 프로토콜과 모순 — etl 의존 누락</summary>

- **근거**: SKILL.md:24 validation-designer depends_on=schema-designer(만), :25 monitoring-designer depends_on=schema+validation(둘 다 etl-designer 미선언). 그러나 validation-designer.md:27 입력에 '02_etl_logic.md(적재·격리 흐름)', monitoring-designer.md:30 입력에 '02_etl_logic.md(로깅 포인트·실패 지점)' 명시. SKILL.md:45·데이터흐름도(:68-73)는 etl/validation/monitoring을 schema 뒤 병렬 형제로 그림. iter3 검증 confirmed(major); iter1은 minor(SendMessage 실시간 조율이 완화)로 하향, iter2는 minor로 제기. 3회 중 2회가 원래 major로 제기.
- **영향**: 선언된 DAG(schema만 의존)와 실제 파일 입력(etl 산출물 소비)이 불일치. 병렬 실행 시 validation/monitoring이 미생성·미완성 02_etl_logic.md를 읽어 데드 레퍼런스나 부분정보 기반 설계가 발생하고, Phase 4에서만 뒤늦게 불일치가 잡혀 재작업 비용이 커진다. SendMessage 조율이 완화책이나 depends_on 자체가 불완전한 구조적 표기 결함.
- **권고**: SKILL.md:24-25 depends_on을 실제 입력에 맞춰 교정: validation-designer→(schema, etl), monitoring-designer→(schema, etl, validation). 데이터흐름도(:68-73)도 monitoring/validation이 etl 확정 후 착수함을 화살표로 반영하거나 '병렬은 초안, etl 확정 후 보강' 명시. fw-3의 TaskCreate depends_on에 그대로 매핑.

</details>

<details>
<summary><b>🟡 경미</b> · Phase 4 정합성 게이트가 정성 기준·자기검증 — 재현 가능한 대조 절차·통과기준·재작업 한계·Phase 5 차단조건 부재</summary>

- **근거**: SKILL.md Phase 4(:48-52)는 '일관되게 쓰였는지 확인'·'불일치 시 재작업 지시'까지만 규정하고, grep 기반 필드명 대조 스크립트, 정량 pass/fail 체크리스트, 재작업 최대 반복, 미통과 시 Phase 5 진입 차단이 없음. 게이트 수행자가 00 저자이자 조율자인 pipeline-lead(생성-검증 미분리). iter1·iter3 모두 major→partial→minor로 하향 일치, iter2도 minor 제기. 하향 근거: :49-50이 대조 대상(테이블·컬럼명·PK/Upsert 키·타입·참조 관계·테스트 도구/fixture·IaC)을 구체 열거하고 있어 오케스트레이터의 기계적 grep 대조가 가능하며, 산출물이 코드가 아닌 마크다운이라 lint/test 게이트 대상이 없음.
- **영향**: 문서 하네스의 유일한 품질 게이트가 정성 자기검토라 회귀 탐지력이 약하다. 필드명 오탈자·PK 불일치·누락 참조가 통과되거나, 반대로 무한 재작업 루프가 발생할 수 있다. 다만 대조 항목이 이미 열거돼 있어 붕괴가 아닌 견고성 갭.
- **권고**: Phase 4에 (1) 00 표준 용어사전 vs 01~04 필드명 grep 대조 체크리스트, (2) 각 산출물 필수섹션 존재 확인(02 멱등성 테스트, 03 규칙별 reject/quarantine/flag 테스트), (3) '모든 컬럼/PK 일치 & 필수섹션 present'라는 명시적 pass 조건 + Phase 5 진입 하드 게이트, (4) 재작업 최대 2회, 초과 시 미해결 항목을 오픈 이슈로 승격 보고를 추가. 반복 대조 스크립트를 skill scripts/에 번들 권장하며, 가능하면 정합성 검증을 별도 서브에이전트에 위임(생성-검증 분리).

</details>

<details>
<summary><b>🟡 경미</b> · 스택 전제를 Supabase+PostgreSQL+Drizzle로 하드코딩 — 웨어하우스/비-Postgres 적재와 충돌</summary>

- **근거**: SKILL.md:36 'Phase 1: 스택 전제(Supabase PostgreSQL+Drizzle) 확정', pipeline-lead.md:10 동일, schema-designer는 Drizzle 초안 강제(:22). iter1 gr-1(minor)로만 제기. Phase 0에서 이 전제를 사용자에게 확인/재정의할 여지가 명시되지 않음.
- **영향**: 스타터킷 하우스 스택이라 대개 합리적이나, BigQuery/Snowflake/ClickHouse 등 웨어하우스나 비-Postgres 적재를 원하는 클론 사용자와 충돌. 전제가 가정으로만 존재하고 확인 대상으로 노출되지 않음.
- **권고**: Phase 0/1에 '기본 스택은 Supabase+Postgres+Drizzle이나 적재 대상이 다르면 사용자에게 확인 후 조정' 분기를 추가해 전제를 확인 대상으로 노출.

</details>

<details>
<summary><b>🟡 경미</b> · 구현/테스트 도구 스택(pytest/Vitest)이 아키텍처에서 확정되지 않아 etl·validation 테스트 규약 정합이 흔들림</summary>

- **근거**: etl-designer.md:25·validation-designer.md:23이 '구현 스택에 맞는 테스트 도구(pytest/Vitest 등) 지정'을 각자 요구하나, SKILL.md·pipeline-lead 어디에도 이 파이프라인의 구현 언어/테스트 러너를 확정하는 단계가 없음(스택 전제는 TS계 Supabase/Drizzle인데 ETL은 Python일 수 있음). iter1 gr-2(minor)로 제기. Phase 4(:50)가 '테스트 도구·fixture 규약을 서로 맞췄는지' 대조를 요구하는데 기준점이 없음.
- **영향**: 두 designer가 서로 다른 러너를 고를 수 있고, Phase 4 테스트 정합 대조의 기준점이 부재해 검증이 흔들린다.
- **권고**: pipeline-lead의 00 아키텍처 표준 용어사전에 '구현/테스트 스택(러너·fixture 형식)' 항목을 추가해 하류가 문자 그대로 참조하게 하고 Phase 4 대조의 기준점으로 삼는다.

</details>

<details>
<summary><b>🟡 경미</b> · 파일명 컨벤션 서술과 실제 파일명 불일치</summary>

- **근거**: SKILL.md:36 '파일 컨벤션 {phase}_{agent}_{artifact}.md 적용'이라 서술하나 실제 산출물은 01_schema_design.md·02_etl_logic.md 등(:22-25)으로 {agent} 세그먼트 없음이며 번호는 phase가 아니라 산출물 일련번호(00~04 모두 Phase 3 생성). 표준 orchestrator-template.md:239 예시는 '01_analyst_requirements.md'로 agent 포함. iter2 err-2(minor)로 제기.
- **영향**: 동작을 깨뜨리진 않으나 명시 컨벤션과 실제가 어긋나 후속 세션/사용자가 파일명 규칙을 오해하거나 번호를 phase로 착각할 수 있다.
- **권고**: :36 서술을 실제 규칙 '{seq}_{artifact}.md (00~04 일련번호, agent 세그먼트 생략)'로 정정하거나 파일명에 agent 세그먼트를 추가해 서술과 일치시킨다.

</details>

<details>
<summary><b>🟡 경미</b> · 새 입력 재실행 시 기존 _workspace 타임스탬프 아카이브 절차 부재 — 감사 추적 손실</summary>

- **근거**: SKILL.md Phase 0(:30-33)은 기존 _workspace를 '읽어 확인'만, Phase 1(:34-36)은 '_workspace 확인/생성'만 규정. 표준 orchestrator-template.md:44-52는 새 입력 시 기존 _workspace를 _workspace_{YYYYMMDD_HHMMSS}/로 이동해 감사 추적을 보존하라고 요구. iter2 err-3·iter3 fw-3 두 회차에서 minor로 제기(재현성 있는 갭).
- **영향**: 동일 소스에 완전히 다른 새 요구사항으로 재실행하면 이전 5개 설계 문서가 백업 없이 덮어써져 감사 추적·롤백이 불가능해진다. '수정/보완' 분기는 있으나 '새 입력' 분기의 보관 로직이 누락됨.
- **권고**: Phase 0/1에 분기 추가: '새 입력 제공 → 기존 _workspace를 _workspace_{YYYYMMDD_HHMMSS}/로 이동 후 재생성', '부분 수정 → 해당 산출물만 덮어쓰기'를 템플릿대로 명시.

</details>

**핵심 개선안(우선순위순)**:

- Phase 2에 실제 TeamCreate/TaskCreate 코드블록을 신설하라 — 이 한 조치가 세 개의 major를 동시에 해소한다: (a) members[].agent_type을 커스텀 에이전트명(schema-designer 등)으로 지정해 5개 .md 페르소나를 실제 로드, (b) TaskCreate depends_on으로 schema-first 순서를 기계적으로 강제, (c) 리더=오케스트레이터가 task를 생성·재할당함을 코드로 못박아 리더/팀원 권한 혼동 제거. Phase 5에 TeamDelete 정리도 함께 추가.
- SKILL.md Phase 0 앞에 실험 플래그 전제조건 절을 신설(echo 확인 → 미설정 시 export 안내/서브에이전트 폴백 경로 → 미설정 진행 시 '계층 위임 미보장' 경고). 4개 하네스 공통 사안이므로 CLAUDE.md 하네스 표에 각주 1줄 등록.
- depends_on 그래프를 실제 에이전트 입력에 맞춰 교정: validation-designer→(schema, etl), monitoring-designer→(schema, etl, validation). 데이터흐름도의 3자 병렬 표현도 etl 확정 후 보강 관계로 수정하고, 위 TaskCreate depends_on에 그대로 매핑.
- Phase 4 정합성 게이트를 하드 게이트로 승격: 00 용어사전 vs 01~04 필드명 grep 대조 체크리스트 + 각 산출물 필수섹션 존재 확인 + '모든 컬럼/PK 일치 & 필수섹션 present' 명시적 pass 조건 + Phase 5 진입 차단 + 재작업 최대 2회(초과 시 오픈 이슈 승격). 대조 스크립트를 skill scripts/에 번들하고 검증을 별도 서브에이전트에 위임 권장.
- 00 아키텍처 표준 용어사전에 '구현/테스트 스택(러너·fixture 형식)'과 '적재 대상(기본 Supabase+Postgres+Drizzle, 다르면 Phase 0에서 사용자 확인)' 항목을 추가해 하류 정합의 단일 기준점으로 삼고, 파일명 컨벤션 서술(:36)을 실제 규칙과 일치시키며 새 입력 재실행 시 _workspace 타임스탬프 아카이브 분기를 넣는다.

---

## 6. 교차 분석 — 4팀에 반복되는 구조적 패턴

개별 발견을 넘어, **여러 팀에서 반복되는 5개 구조적 패턴**이 스타터팩 전체의 체질을 규정한다. 이것이 3회 반복 검증이 준 가장 큰 통찰이다.

### 6.1 검증 게이트가 "강제(gate)"가 아니라 "선언(declare)"에 그침 ★사용자 최우선 관심사

사용자가 가장 강조한 "검증단계 설계"에서 공통 약점이 드러났다. 실제로 **리더가 명령을 실행해 통과 여부를 판정하는 하드 게이트**는 풀스택의 `lint→build→test`(Phase 4.3)뿐이고, 나머지는 대부분 *체크박스·"확인한다"류 소프트 자기점검*이다.

| 팀 | 하드 게이트(실행·강제) | 소프트 게이트(선언·자기점검) |
|---|---|---|
| 풀스택 | `lint→build→test` 순차 실행 ✅ | `vercel.ts 코드화`·Playwright 체크박스(검증명령 없음) |
| 데이터파이프라인 | 없음(문서 산출물) | Phase 4 정합성 "대조" — 재현 절차·통과기준·Phase 5 차단조건 부재 |
| 리서치→PRD | tech-verifier Blocker(부분) | 애드센스/Lighthouse/필수요소 "확인한다" — Phase 4 재검증이 애드센스·Lighthouse 미커버 |
| 크롤링워커 | `pytest·ruff·mypy` needs: 체인 ✅ | Celery 설정·Browserless 수명주기는 수동 체크박스(자동 pytest 아님) |

**개선 방향**: 각 소프트 게이트를 *객관적으로 판정 가능한 조건*으로 바꾼다 — 예) `vercel.ts` = "`vercel.json` 부재 + `vercel.ts` 존재 + build 통과", 데이터파이프라인 Phase 4 = "필드명·PK·타입 대조표를 `00_...md`에 표로 남기고 불일치 0건이어야 Phase 5 진입", 크롤링워커 Celery 설정 = 계약 항목을 assert하는 자동 테스트로 승격.

### 6.2 문서(표)와 실행(코드)의 자기모순 — `agent_type`

풀스택·데이터파이프라인의 에이전트 구성 표가 타입을 `general-purpose`로 적었다. 실제 실행 코드는 전용 타입명(`design-architect` 등)을 넣지만, **표만 보고 구현하면 `.claude/agents/*.md`의 페르소나·프로토콜이 로드되지 않고 인라인 프롬프트만 적용**돼 품질이 조용히 저하된다. 데이터파이프라인은 이 때문에 pipeline-lead의 리더 권한이 평탄 팀에서 실행 불가한 모순까지 파생됐다. → **표의 타입 열을 실제 전용 타입명으로 통일**하면 두 팀 동시 해소.

### 6.3 자기종료 설계의 국소 빈틈 — 루프 상한 부재

수정·재검증·보정 루프에 **최대 반복 상한과 종료(에스컬레이션) 조건**이 빠진 곳이 반복된다: 풀스택 Phase 4.3 명령 게이트, 리서치→PRD의 tech-verifier↔prd-author 보정 루프(무한 루프 위험), 크롤링워커 Phase 3 재작업 루프. 이미 상한이 명시된 곳(풀스택 QA 루프 "최대 2~3회")을 **모든 루프에 일관 적용**하면 장시간 실행 하네스의 교착을 막는다.

### 6.4 파일 번호 컨벤션의 국지적 불일치

전 팀에 `{phase}_{agent}_{artifact}` 규약과 어긋나는 결번·순서 역전이 산재한다(풀스택 02 결번·계약04가 소비자03보다 뒤, 리서치→PRD 04 부재·05 점프, 크롤링워커 05가 현재 Phase에 미매핑=폐기된 배치 트랙 잔재). **동작에는 무해**하나 감사 추적·후속 세션의 데이터 흐름 이해를 저해한다. 번호를 의존 순서에 맞춰 재배열하거나 "도메인 고정 슬롯"임을 주석으로 명시.

### 6.5 재실행 시 산출물 아카이브·트리거 라우팅

- **아카이브 분기**: 풀스택만 "새 요구 시 `_workspace_{타임스탬프}/`로 보관 이동"을 갖췄고, 데이터파이프라인·크롤링워커 Phase 0에는 이 분기가 없어 재실행 시 이전 산출물이 덮여 감사 추적이 손실된다. → 풀스택 방식을 4팀에 통일.
- **트리거 충돌**: 리서치→PRD 오케스트레이터가 `IaC·opentofu·terraform·테스트전략·QA·재실행·수정·보완·다시`를 트리거로 선언해 다른 3개 오케스트레이터와 대량 충돌한다. 스타터팩에서 "어느 하네스가 뜰지" 모호 → 각 description의 트리거를 **도메인 고유 키워드로 좁히고 범용 동사(재실행/수정/다시)는 컨텍스트 한정** 필요.

---

## 7. 우선순위 실행 로드맵

| 우선순위 | 항목 | 대상 팀 | 근거 |
|---|---|---|---|
| **P0 (필수·이식성)** | 실험 플래그 전제조건 문서화 + Phase 0 가용성 확인 + GA 폴백 분기 | 풀스택·데이터파이프라인·리서치→PRD | §4 — 미조치 시 클론 사용자에게 조용히 폴백(치명) |
| **P1 (동작 품질)** | 표의 `agent_type`을 전용 타입명으로 통일(페르소나 로드 보장) | 풀스택·데이터파이프라인 | §6.2 — 조용한 품질 저하 |
| **P1** | 소프트 검증 게이트를 객관 판정 조건으로 승격(vercel.ts·Phase4 정합성·Celery 계약) | 전 팀 | §6.1 — 사용자 최우선 관심사 |
| **P1** | 풀스택 Phase 4.5 배포를 "배포/deploy/vercel 명시 요청 시에만" 조건 실행 + Vercel 미링크 에러 행 추가 | 풀스택 | 5.3 major — 로컬 개발자에게 배포 강제 |
| **P1** | cross-repo GitOps PR용 교차저장소 쓰기 토큰 전제조건 문서화 | 크롤링워커 | 5.1 major — 미기재 시 CI 실패 |
| **P2 (일관성·견고성)** | 모든 수정/보정 루프에 최대 반복 상한 + 에스컬레이션 종료조건 | 풀스택·리서치→PRD·크롤링워커 | §6.3 |
| **P2** | 파일 번호 컨벤션 재정렬(또는 고정 슬롯 주석) | 전 팀 | §6.4 |
| **P2** | Phase 0 재실행 아카이브 분기 4팀 통일 + 트리거 키워드 충돌 해소 | 데이터파이프라인·크롤링워커·리서치→PRD | §6.5 |
| **P2** | 스택 하드코딩(Supabase/Postgres/Drizzle) 완화 + LLM/네트워크 의존 테스트 모킹 지침 | 데이터파이프라인·크롤링워커 | 5.4 minor |

---

## 8. 결론

### 종합 판정

3회 반복 검증 결과, **4개 하네스는 참조 무결성(환각 도구·죽은 경로) 관점에서는 건강하다** — 참조된 스킬·스크립트·에이전트 정의가 모두 실재하고, `depends_on` 그래프에 순환이 없으며, 정상/에러 시나리오가 문서화돼 있다. 이는 스타터팩의 기반이 견고함을 뜻한다.

그러나 **단 하나의 구조적 결함이 전체 이식성을 위협한다**: 팀 기반 3개 하네스가 실험적 플래그에 의존하면서 그 전제를 문서화하지 않아, 클론 사용자에게 *오류 없이 조용히* 단일 에이전트로 폴백된다. 스타터팩의 핵심 가치("클론 후 곧바로 사용")와 정면 충돌하는 **P0 이슈**이며, 최우선으로 해소해야 한다.

두 번째 축은 사용자가 강조한 **검증단계 설계**다. 게이트가 대체로 "선언"에 머물러 *객관적으로 통과를 판정·강제하는 하드 게이트*로 승격이 필요하다(§6.1). 이 두 축(P0 이식성 + P1 검증 강제화)만 조치하면 스타터팩 품질이 크게 도약한다.

### 팀별 건강도 순위

1. 🥇 **크롤링워커 (79)** — `Agent`(GA) 단일 서브에이전트라 플래그 면역. 계약 체크리스트가 촘촘. 남은 건 GitOps 토큰 전제·수동 체크박스의 자동화뿐.
2. 🥈 **리서치→PRD (71)** — 하이브리드 설계가 정교(Phase2 GA 서브는 플래그 무관). Phase3 팀 구간의 플래그·보정 루프 상한만 보완.
3. 🥉 **풀스택 (66)** — 파이프라인 DAG·하드 게이트(lint→build→test)는 모범적이나, 플래그·배포 게이트 결함이 감점.
4. **데이터파이프라인 (63)** — 계층적 위임 설계는 타당하나, `general-purpose` 표기가 리더 권한 모순으로 파생되고 문서 산출물의 정합성 게이트가 가장 정성적. 개선 여지가 가장 큼.

### 최고점 회차 명시(사용자 요청)

**회차 #2가 종합점수 70.75로 최고**이며 본 보고서의 대표 채점 기준이다. 발견 목록은 오류 누락 방지를 위해 3회 적대적 검증 union으로 통합했고, 탐지 철저성 기준으로는 통합 편집자 4명 공통으로 **회차 #3**을 최고로 평가했다.

