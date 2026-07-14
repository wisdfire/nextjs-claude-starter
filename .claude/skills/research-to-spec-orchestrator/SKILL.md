---
name: research-to-spec-orchestrator
description: 리서치→PRD/ROADMAP/DATA-JOBS 문서화를 자동 오케스트레이션한다. "PRD 작성", "요구사항 정의", "로드맵", "리서치", "시장 조사", "기술 검증", "크롤링/수집 요구사항 정리", "PRD 내 테스트 전략·QA 요구사항", "PRD/로드맵 재실행", "PRD 보완/수정", "PRD 업데이트" 등의 요청 시 적극적으로 이 하네스를 가동하라. 웹/학술/커뮤니티 병렬 리서치 → 교차검증+PRD 작성 팀 → 기술검증 → 데이터 잡 스펙 → 로드맵 생성을 하이브리드 모드로 지휘한다.
---

# research-to-spec 오케스트레이터

주제(제품 아이디어·도메인) 또는 **시드 PRD**를 받아 병렬 리서치 → 교차검증 → PRD 작성 → 기술검증 → 데이터 잡 스펙 → ROADMAP 생성을 자동 지휘한다. 최종 산출물은 사용자 프로젝트의 `docs/PRD.md`·`docs/ROADMAP.md`, 그리고 수집 요구가 있을 때만 `docs/DATA-JOBS.md`다.

## 저장소 경계 (반드시 지킬 것)

이 저장소는 **Next.js 웹서비스만** 소유한다. 크롤링·주기 API 호출·배치는 별도 모노레포 **[`wisdfire/jobhub-jobs`](https://github.com/wisdfire/jobhub-jobs)** 가 구현한다.

- PRD·ROADMAP에 **수집 구현 Task를 넣지 않는다.**
- 대신 수집 요구가 있으면 **`docs/DATA-JOBS.md`(인계 문서)** 를 만들어 모노레포가 읽게 한다 (Phase 4.5).
- 웹앱의 책임은 "Supabase에 적재된 데이터를 읽어 렌더링"까지다.

이 하네스는 **애드센스 수익형 콘텐츠 사이트**를 기본 전제로 4대 게이트(**애드센스 MUST**/유지보수·배포설정/Lighthouse/테스트전략)를 강제한다. 그중 **애드센스는 타협 불가 최우선 게이트**다. 제품 유형이 달라도(구독형·내부툴 등) 애드센스 게이트는 사용자가 명시적으로 면제하지 않는 한 유지한다.

> **⚠️ 전제조건 — 실험적 플래그(Phase 3·5 팀 모드)**: 팀 조율 원시도구 `TeamCreate`·`SendMessage`·`TaskCreate`는 실험적 기능으로 **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정된 셸에서 `claude`를 실행해야만** 제공된다. 미설정 시 Phase 3 팀이 **조용히 단일 에이전트로 폴백**된다(오류 없이 조율 소실). **Phase 2 병렬 리서치는 `Agent`(invoke) = GA라 플래그와 무관**하다. Phase 0에서 가용성을 먼저 확인한다.

## 실행 모드: 하이브리드

Phase마다 실행 모드가 다르다. 이 표를 반드시 따른다.

| Phase | 목적 | 실행 모드 | 도구/구성 |
| --- | --- | --- | --- |
| Phase 0 | 컨텍스트 확인·**시드 PRD 로드**·재실행 판단 | 오케스트레이터 직접 | Read / Glob (`../auto-prd-vault/03_PRD_Docs/`, `_workspace/`, `docs/`) |
| Phase 1 | 준비(주제·범위 분석) | 오케스트레이터 직접 | 사용자 입력·시드 PRD·요구사항 문서 |
| Phase 2 | 병렬 리서치 수집 | **서브 에이전트(병렬)** | `Agent` ×3, `run_in_background: true`, `model: "opus"` |
| Phase 3 | 교차검증 + PRD 작성 | **에이전트 팀** | `TeamCreate` → cross-validator + prd-author, `SendMessage` 조율, `TeamDelete` |
| Phase 4 | 기술 실현성·출처 검증 | **서브 에이전트** | `Agent` ×1 (tech-verifier), `model: "opus"` |
| **Phase 4.5** | **데이터 잡 요구사항 인계 문서**(수집 요구 있을 때만) | **서브 에이전트** | `Agent` ×1 (data-jobs-spec-author), `model: "opus"` |
| Phase 5 | ROADMAP 생성 | **서브 에이전트** | roadmap-planner, `Agent`, `model: opus` |
| Phase 6 | 정리·보고 | 오케스트레이터 직접 | 산출물 요약 |

## 에이전트 구성

| 에이전트 | Phase | 모드 | 산출물 |
| --- | --- | --- | --- |
| web-researcher | 2 | 서브(병렬) | `_workspace/02_web_research.md` |
| academic-researcher | 2 | 서브(병렬) | `_workspace/02_academic_research.md` |
| community-researcher | 2 | 서브(병렬) | `_workspace/02_community_research.md` |
| cross-validator | 3 | 팀 | `_workspace/03_validated_findings.md` |
| prd-author | 3 | 팀 | `docs/PRD.md` |
| tech-verifier | 4 | 서브 | `_workspace/05_tech_verification.md` |
| data-jobs-spec-author | 4.5 | 서브(조건부) | `docs/DATA-JOBS.md` |
| roadmap-planner | 5 | 서브 | `docs/ROADMAP.md` |

## 워크플로우

### Phase 0 — 컨텍스트 확인 · 시드 PRD 로드
- **시드 PRD 확인(권장 진입점)**: 이 프로젝트의 PRD는 보통 **`../auto-prd-vault/03_PRD_Docs/PRD-*.md`** 에서 파생된다. 사용자가 시드 파일을 지정했으면 그것을 Read하고, 지정하지 않았으면 `Glob`으로 후보를 나열해 **어느 것을 시드로 쓸지 사용자에게 묻는다**(임의 선택 금지). 시드 없이 주제만 주어졌으면 그대로 진행한다.
  - ⚠️ **시드는 리서치의 대체물이 아니라 입력이다.** 시드의 주장·수치·출처는 **미검증 가설로 취급**하고 Phase 2~4에서 검증·보강한다. 시드를 그대로 `docs/PRD.md`로 복사하지 않는다.
  - 시드 PRD 원본은 `_workspace/00_seed_prd.md`로 복사해 근거 추적용으로 보존하고, Phase 1 브리프에 그 경로를 넣는다.
- **팀 원시도구 가용성 프리플라이트(Phase 3 진입 전 필수)**: `TeamCreate`/`SendMessage`가 사용 가능한지 확인한다(플래그 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 게이트). 불가 시 `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 안내, 또는 Phase 3을 팀 대신 **`Agent` 서브 2단계**(cross-validator → prd-author, 상충 조율은 오케스트레이터가 파일 인계로 중재)로 폴백 실행한다.
- `_workspace/`가 있는지, `docs/PRD.md`·`docs/ROADMAP.md`가 이미 있는지 확인한다.
- **분기**:
  - 아무것도 없음 → 전체 신규 실행(Phase 1부터).
  - `02_*` 리서치만 있음 → Phase 3부터 재개 가능.
  - `PRD.md`는 있고 수정 요청 → Phase 3(부분) 또는 Phase 4부터. 완료된 내용은 보존.
  - `PRD.md`+`ROADMAP.md` 있고 "보완/업데이트" → 변경 범위만 부분 재실행.
- `_workspace/`가 없으면 생성한다.

### Phase 1 — 준비
- 주제·범위·타깃·핵심 질문 목록을 정리한다. 불명확하면 사용자에게 명확화 질문을 먼저 한다(추측 금지).
- 세 리서처에 전달할 공통 리서치 브리프를 만든다. **시드 PRD가 있으면 그 핵심 주장·수치·출처를 "검증 대상 가설" 목록으로 브리프에 넣어** 리서처가 확인·반박하게 한다.

### Phase 2 — 병렬 리서치 (서브 에이전트)
- `Agent` 도구로 **web/academic/community-researcher 3개를 동시에** 띄운다. 각 호출에 `run_in_background: true`, `model: "opus"`.
- 각 서브에 Phase 1 브리프와 산출물 경로를 전달한다.
- 세 산출물이 모두 완료될 때까지 대기(필요 시 `Monitor`).

### Phase 3 — 교차검증 + PRD 작성 (에이전트 팀)
- `TeamCreate`로 cross-validator + prd-author 팀을 만든다(`model: "opus"`).
- 순서: cross-validator가 `02_*` 3개를 교차검증해 `03_validated_findings.md` 생성 → `SendMessage`로 prd-author에 전달 → prd-author가 `docs/PRD.md` 작성.
- 상충·불명확 지점은 `SendMessage`로 두 에이전트가 조율한다.
- **필수**: PRD에 **애드센스 MUST 10항 · 유지보수 최소(자동수집 요구사항+배포 config-as-code) · Lighthouse 지표 · 품질·테스트 전략(단위/통합/E2E·CI 게이트)**가 반드시 반영됐는지 확인한다(`prd-authoring`·`adsense-readiness` 스킬 기준). 유지보수 항목에는 **배포 config-as-code 원칙**(상세는 `web-deploy-config` 스킬)이, 완성도 항목에는 **테스트 통과율**이 짝으로 들어가야 한다. 이때 `docs/PRD.md`에서 필수 섹션 헤딩 4종(애드센스/유지보수/Lighthouse/테스트전략)의 존재를 **Grep으로 결정적으로 확인**한다. 누락 시 prd-author에 보강 지시. ⚠️ **수집 구현(크롤러·Python 배치)이 이 저장소의 작업으로 기술돼 있으면 보정 지시**한다 — 모노레포 `wisdfire/jobhub-jobs` 소관이다.
- 완료 후 `TeamDelete`로 팀을 정리한다.

### Phase 4 — 기술 검증 (서브 에이전트)
- `Agent`로 tech-verifier를 띄운다(`model: "opus"`). 입력: `docs/PRD.md`.
- **최신성**(context7로 라이브러리 버전·deprecated) + **출처 정상성**(WebFetch로 URL 생존·내용 일치, 죽은 링크·환각 출처 탐지) + **애드센스 MUST 10항 충족 검증(누락은 Blocker)** + **필수 요구사항 포함 검증**(PRD가 테스트 전략·배포 설정을 요구사항으로 담고, 그 기술 선택이 최신·유효한지, Lighthouse 지표가 PRD에 실제로 존재하는지)을 검증해 `05_tech_verification.md` 생성. 애드센스 정책은 자주 바뀌므로 **공식 문서를 WebFetch로 열어 현행성까지 대조**하게 한다.
- **Blocker가 있으면**: prd-author를 다시 `Agent`로 호출(또는 소규모 팀 재생성)해 PRD를 보정한 뒤 재검증한다. **보정 루프는 최대 2~3회**로 제한하고, 초과 시 잔여 Blocker를 `05_tech_verification.md`·PRD에 "미해결"로 명시하고 사용자 판단을 요청한 뒤 Phase 5로 진행(또는 중단)한다(무한 루프 방지). **Warning은 루프 트리거에서 제외**하고 PRD의 "알려진 리스크"로 기록만 하며, 잔여 Blocker는 roadmap-planner의 "선결 검증 필요"로 이관한다. **Phase 4 재검증 종료 조건은 `Blocker 0 AND 4대 필수요소(애드센스 MUST 10항/유지보수/Lighthouse/테스트전략) 유지`**로, 둘 다 충족해야 Phase 5로 넘어간다. **애드센스 MUST 누락은 그 자체로 Blocker**이므로 루프 상한을 넘겨도 "미해결"로 넘기지 말고 사용자에게 명시적으로 보고한다.

### Phase 4.5 — 데이터 잡 요구사항 인계 문서 (서브 에이전트 · 조건부)

**트리거 판정(오케스트레이터가 직접)**: 확정된 `docs/PRD.md`의 데이터 확보 전략에 **주기적 크롤링 / 주기적 외부 API 호출 / 배치 갱신**이 하나라도 있는가?

- **없다** → Phase 4.5를 **건너뛴다.** `docs/DATA-JOBS.md`를 만들지 않고(빈 문서 금지), "수집 요구 없음"을 Phase 6 보고에 명시한다.
- **있다** → `Agent`로 **data-jobs-spec-author**를 띄운다(`model: "opus"`). 입력: `docs/PRD.md`. 산출물: **`docs/DATA-JOBS.md`**.

이 문서는 **별도 모노레포 `wisdfire/jobhub-jobs`가 읽어 구현하는 인계 문서**다. 오케스트레이터는 완료 후 다음을 확인한다.

- **요구사항만 담겼는가**: 무슨 데이터·왜·주기·필드·신선도·유일성 정의·적재 스키마 제안·웹앱 소비 방식. ⚠️ **구현 계약(`run()`·이미지 slim/browser·`jobs.yml` 크론·`on_conflict` 구현)이 적혀 있으면 삭제 지시**한다 — 모노레포가 결정할 몫을 침범한 것이다.
- **애드센스 제약이 잡마다 명시됐는가**: 수집 원본을 그대로 게시하지 않고 웹앱이 더할 **편집 부가가치**(요약·구조화·비교·해설)가 구체적으로 적혔는지 확인한다(`adsense-readiness` 스킬 — 복제·저가치 콘텐츠는 대표 거절 사유).
- **PRD가 이 문서를 링크로 참조하는가**: PRD 본문에 수집 요구를 **복제하지 않고** `docs/DATA-JOBS.md` 링크만 두는지 Grep으로 확인한다. 누락 시 prd-author에 링크 추가만 지시한다(내용 복제는 drift를 부른다).
- **환각 소스 없는가**: 대상 URL·API 엔드포인트가 실제 확인된 것인지, 미확인은 "확인 필요"로 표시됐는지 본다.

### Phase 5 — ROADMAP 생성 (서브 에이전트)
- 검증(또는 보정) 완료된 `docs/PRD.md`와 `05_tech_verification.md`를 입력으로 roadmap-planner를 실행(`model: "opus"`). `docs/DATA-JOBS.md`가 있으면 함께 전달해 **외부 의존성**으로 표기하게 한다.
- `docs/ROADMAP.md`를 **Phase→Task 계층 + 완료 체크박스([ ]/[x]) + 의존성·산출물·검증 기준(Lighthouse 등)**으로 생성한다.
- **테스트·배포 규약(필수)**: 초기 Phase에 **배포 설정(config-as-code) Task**를 두고, **각 Phase에 테스트/QA Task**를 최소 1개 포함하며, **각 기능 Task의 검증 기준에 테스트 통과 조건(CI 게이트 green)**을 페어링한다(`roadmap-planning` 스킬 기준). **애드센스 요건 Task를 반드시 포함**하고 런칭 Phase 완료 기준에 애드센스 MUST 전항 통과를 건다. 크롤러·ETL Task는 넣지 않는다(모노레포 소관 — **`docs/DATA-JOBS.md`를 가리키는 외부 의존성으로만 표기**).

### Phase 6 — 정리·보고
- `docs/PRD.md`·`docs/ROADMAP.md`(+ 있으면 `docs/DATA-JOBS.md`) 경로와 핵심 요약, 미해결 쟁점·리스크, 남은 Blocker를 사용자에게 보고한다.
- **`docs/DATA-JOBS.md`를 만들었으면** 사용자에게 **다음 행동을 명시**한다: 이 문서를 **`wisdfire/jobhub-jobs` 모노레포에 전달해 잡 구현을 요청**해야 하며, 웹앱 개발은 "Supabase에 적재 완료" 를 외부 의존성으로 두고 병행 가능하다. 수집 요구가 없었으면 "수집 요구 없음"이라고 명시한다.
- `_workspace/` 중간 산출물은 근거 추적용으로 보존한다.

## 하이브리드 전환 규칙

- **팀 → 서브 전환**(Phase 3→4): 반드시 **`TeamDelete`로 팀을 먼저 정리**한 뒤 `Agent`로 tech-verifier를 호출한다. 파일 경로(`docs/PRD.md`)로 인계한다.
- **서브 → 팀 전환**(Phase 2→3): 서브의 산출물은 통신이 아니라 **파일 경로**(`_workspace/02_*.md`)로 다음 팀에 전달한다.
- **서브 → 서브**(Phase 4 내 보정, Phase 4→4.5→5): 파일 경로(`docs/PRD.md`·`docs/DATA-JOBS.md`)로 인계하고, 팀을 만들지 않는다. **Phase 4.5는 PRD가 확정된 뒤에만**(Blocker 0) 실행한다 — 미확정 PRD로 잡 스펙을 쓰면 모노레포에 잘못된 요구가 넘어간다.
- **팀 재생성 시 정리**(Phase 4 보정 루프): 보정을 위해 소규모 팀을 재생성했다면 재검증 전 **`TeamDelete`로 반드시 정리**한 뒤 tech-verifier 재검증으로 넘어간다.
- 모든 `Agent`·`TeamCreate` 호출에 **`model: "opus"`**를 명시한다.

## 데이터 흐름

```
[주제·범위] (+ 선택: ../auto-prd-vault/03_PRD_Docs/PRD-*.md 시드)
   └→ _workspace/00_seed_prd.md  ← 시드는 "검증 대상 가설"로만 취급
   └─(Phase 1 브리프)→ web/academic/community-researcher (병렬)
        └→ _workspace/02_web_research.md
        └→ _workspace/02_academic_research.md
        └→ _workspace/02_community_research.md
             └─(파일 경로 인계)→ cross-validator
                  └→ _workspace/03_validated_findings.md
                       └─(SendMessage)→ prd-author
                            └→ docs/PRD.md
                                 └─(TeamDelete 후 파일 인계)→ tech-verifier
                                      └→ _workspace/05_tech_verification.md
                                           └─(Blocker면 prd-author 보정 루프)
                                           ├─(수집 요구 있을 때만)→ data-jobs-spec-author
                                           │    └→ docs/DATA-JOBS.md ──▶ [wisdfire/jobhub-jobs 모노레포가 구현]
                                           └→ roadmap-planner
                                                └→ docs/ROADMAP.md (수집은 외부 의존성으로만 표기)
```

## 파일 컨벤션

- 중간 산출물: `_workspace/{phase}_{agent}_{artifact}.md` (예: `00_seed_prd.md`, `02_web_research.md`, `03_validated_findings.md`, `05_tech_verification.md`).
- 최종 산출물만 프로젝트 `docs/`에 둔다: `docs/PRD.md`, `docs/ROADMAP.md`, 그리고 **수집 요구가 있을 때만 `docs/DATA-JOBS.md`**(모노레포 인계 문서 — 정본은 이 저장소가 소유하고, `jobhub-jobs`는 읽어서 구현한다).

> 번호는 도메인 **고정 슬롯**이며 연속 시퀀스가 아니다(04 결번·05 사용 가능). 번호는 감사 추적용 식별자일 뿐이며 실행 순서는 Phase가 규정한다.

## 에러 핸들링

- **리서치 실패/빈약**: 특정 축 서브가 "정보 부족"을 반환하면 해당 축만 쿼리 재구성해 재호출한다. 그래도 부족하면 커버리지 한계를 PRD에 명시하고 진행.
- **상충 데이터**: cross-validator가 해소 못 한 상충은 삭제하지 말고 "미해결 쟁점"으로 PRD에 남기고, 필요 시 사용자에게 판단을 요청한다.
- **죽은 출처·환각 출처**: tech-verifier가 Blocker로 표시하면 prd-author 보정 루프를 돈다. 근거가 환각으로 판명된 요구사항은 근거 교체 또는 제거. 보정 루프는 최대 2~3회, 초과 시 미해결로 명시하고 사용자에 판단 요청.
- **PRD 필수 요소 누락**: 애드센스 MUST 10항/유지보수/Lighthouse/품질·테스트 전략 중 하나라도 빠지면 Phase 3을 완료로 보지 않고 prd-author를 재호출한다.
- **경계 침범(수집 구현이 이 저장소 작업으로 기술됨)**: PRD·ROADMAP에 크롤러·Python 배치 구현 Task가 있으면 제거하고, 그 요구는 `docs/DATA-JOBS.md`(Phase 4.5)로 옮긴다. 반대로 `DATA-JOBS.md`에 구현 계약(`run()`·이미지·크론 표현식·`on_conflict`)이 적혔으면 삭제 지시한다 — 모노레포가 결정할 몫이다.
- **수집 대상이 robots.txt·ToS로 금지**: data-jobs-spec-author가 리스크로 올리면 잡을 확정하지 말고 사용자에게 대안(공식 API·제휴·수동 입력)을 제시하고 판단을 요청한다.
- **팀 정리 실패**: Phase 전환 전 `TeamDelete` 성공을 확인한다. 잔여 팀이 있으면 다음 Phase를 시작하지 않는다.
- **명확화 필요**: 주제·범위가 모호하면 추측하지 말고 Phase 1에서 사용자에게 질문한다.

## 테스트 시나리오

### 정상 시나리오
1. 사용자: "OO 주제로 PRD랑 로드맵 만들어줘." → Phase 0: `_workspace/`·`docs/` 없음 확인 → Phase 1 브리프 → Phase 2 세 리서처 병렬 완료 → Phase 3 팀이 교차검증·PRD(애드센스/유지보수/Lighthouse 포함) 작성 → Phase 4 tech-verifier Blocker 0 → Phase 4.5 수집 요구 없음 → 스킵 → Phase 5 ROADMAP(체크박스 포함) 생성 → Phase 6 보고. **기대**: `docs/PRD.md`·`docs/ROADMAP.md` 생성, 필수 요구사항 반영, 모든 Task에 체크박스·검증 기준. `DATA-JOBS.md`는 만들지 않음.

2. **시드 PRD + 수집 요구 있음**: 사용자: "`../auto-prd-vault/03_PRD_Docs/PRD-20260702-전기요금-....md` 기준으로 PRD/로드맵 만들어줘." → Phase 0이 시드를 `_workspace/00_seed_prd.md`로 보존하고 그 주장을 **검증 대상 가설**로 브리프에 실음 → Phase 2~4 검증 → Phase 4.5: PRD에 "KEPCO 공공 API 주기 호출" 요구가 있으므로 data-jobs-spec-author가 `docs/DATA-JOBS.md` 생성(잡 키 제안·필요 필드·주기·유일성·적재 스키마·**웹앱의 편집 부가가치**) → Phase 5 ROADMAP은 수집 Task를 만들지 않고 "Supabase 적재 완료"를 **외부 의존성**으로 표기 → Phase 6에서 "이 문서를 `jobhub-jobs`에 전달하라"고 보고. **기대**: 시드가 그대로 복사되지 않고 검증을 거침, 수집 구현이 이 저장소 로드맵에 들어오지 않음.

### 에러 시나리오
3. tech-verifier가 PRD 인용 URL 2건을 **죽은 링크/환각 출처**로 판정(Blocker). → Phase 4가 prd-author를 재호출해 해당 근거를 교체/제거하고 PRD 보정 → 재검증 Blocker 0 확인 후에만 Phase 5로 진행. **기대**: 환각 출처가 최종 PRD에 남지 않고, 보정 이력이 `05_tech_verification.md`에 기록됨.

4. data-jobs-spec-author가 `DATA-JOBS.md`에 **`jobs.yml` 크론 표현식과 `on_conflict` 컬럼**까지 적음(경계 침범). → 오케스트레이터가 Phase 4.5 검수에서 잡아내 해당 부분 삭제를 지시하고, 요구 주기는 KST 사람 언어("매일 새벽 1회")로, 유일성은 자연키 정의로만 남기게 한다. **기대**: 구현 결정권이 `jobhub-jobs`에 남는다.
