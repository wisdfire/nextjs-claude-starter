---
name: research-to-spec-orchestrator
description: 리서치→PRD/ROADMAP 문서화를 자동 오케스트레이션한다. "PRD 작성", "요구사항 정의", "로드맵", "리서치", "시장 조사", "기술 검증", "PRD 내 테스트 전략·QA 요구사항", "PRD/로드맵 재실행", "PRD 보완/수정", "PRD 업데이트" 등의 요청 시 적극적으로 이 하네스를 가동하라. 웹/학술/커뮤니티 병렬 리서치 → 교차검증+PRD 작성 팀 → 기술검증 → 로드맵 생성을 하이브리드 모드로 지휘한다.
---

# research-to-spec 오케스트레이터

주제(제품 아이디어·도메인)를 받아 병렬 리서치 → 교차검증 → PRD 작성 → 기술검증 → ROADMAP 생성을 자동 지휘한다. 최종 산출물은 사용자 프로젝트의 `docs/PRD.md`와 `docs/ROADMAP.md`다.

이 하네스는 **애드센스 수익형 콘텐츠 사이트**를 기본 전제로 4대 게이트(**애드센스 MUST**/유지보수·배포설정/Lighthouse/테스트전략)를 강제한다. 그중 **애드센스는 타협 불가 최우선 게이트**다. 제품 유형이 달라도(구독형·내부툴 등) 애드센스 게이트는 사용자가 명시적으로 면제하지 않는 한 유지한다.

> **⚠️ 전제조건 — 실험적 플래그(Phase 3·5 팀 모드)**: 팀 조율 원시도구 `TeamCreate`·`SendMessage`·`TaskCreate`는 실험적 기능으로 **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 설정된 셸에서 `claude`를 실행해야만** 제공된다. 미설정 시 Phase 3 팀이 **조용히 단일 에이전트로 폴백**된다(오류 없이 조율 소실). **Phase 2 병렬 리서치는 `Agent`(invoke) = GA라 플래그와 무관**하다. Phase 0에서 가용성을 먼저 확인한다.

## 실행 모드: 하이브리드

Phase마다 실행 모드가 다르다. 이 표를 반드시 따른다.

| Phase | 목적 | 실행 모드 | 도구/구성 |
| --- | --- | --- | --- |
| Phase 0 | 컨텍스트 확인·재실행 판단 | 오케스트레이터 직접 | Read / Glob (`_workspace/`, `docs/`) |
| Phase 1 | 준비(주제·범위 분석) | 오케스트레이터 직접 | 사용자 입력·요구사항 문서 |
| Phase 2 | 병렬 리서치 수집 | **서브 에이전트(병렬)** | `Agent` ×3, `run_in_background: true`, `model: "opus"` |
| Phase 3 | 교차검증 + PRD 작성 | **에이전트 팀** | `TeamCreate` → cross-validator + prd-author, `SendMessage` 조율, `TeamDelete` |
| Phase 4 | 기술 실현성·출처 검증 | **서브 에이전트** | `Agent` ×1 (tech-verifier), `model: "opus"` |
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
| roadmap-planner | 5 | 서브 | `docs/ROADMAP.md` |

## 워크플로우

### Phase 0 — 컨텍스트 확인
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
- 세 리서처에 전달할 공통 리서치 브리프를 만든다.

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

### Phase 5 — ROADMAP 생성 (서브 에이전트)
- 검증(또는 보정) 완료된 `docs/PRD.md`와 `05_tech_verification.md`를 입력으로 roadmap-planner를 실행(`model: "opus"`).
- `docs/ROADMAP.md`를 **Phase→Task 계층 + 완료 체크박스([ ]/[x]) + 의존성·산출물·검증 기준(Lighthouse 등)**으로 생성한다.
- **테스트·배포 규약(필수)**: 초기 Phase에 **배포 설정(config-as-code) Task**를 두고, **각 Phase에 테스트/QA Task**를 최소 1개 포함하며, **각 기능 Task의 검증 기준에 테스트 통과 조건(CI 게이트 green)**을 페어링한다(`roadmap-planning` 스킬 기준). **애드센스 요건 Task를 반드시 포함**하고 런칭 Phase 완료 기준에 애드센스 MUST 전항 통과를 건다. 크롤러·ETL Task는 넣지 않는다(모노레포 소관 — 외부 의존성으로만 표기).

### Phase 6 — 정리·보고
- `docs/PRD.md`·`docs/ROADMAP.md` 경로와 핵심 요약, 미해결 쟁점·리스크, 남은 Blocker를 사용자에게 보고한다.
- `_workspace/` 중간 산출물은 근거 추적용으로 보존한다.

## 하이브리드 전환 규칙

- **팀 → 서브 전환**(Phase 3→4): 반드시 **`TeamDelete`로 팀을 먼저 정리**한 뒤 `Agent`로 tech-verifier를 호출한다. 파일 경로(`docs/PRD.md`)로 인계한다.
- **서브 → 팀 전환**(Phase 2→3): 서브의 산출물은 통신이 아니라 **파일 경로**(`_workspace/02_*.md`)로 다음 팀에 전달한다.
- **서브 → 서브**(Phase 4 내 보정): 파일 경로로 인계하고, 팀을 만들지 않는다.
- **팀 재생성 시 정리**(Phase 4 보정 루프): 보정을 위해 소규모 팀을 재생성했다면 재검증 전 **`TeamDelete`로 반드시 정리**한 뒤 tech-verifier 재검증으로 넘어간다.
- 모든 `Agent`·`TeamCreate` 호출에 **`model: "opus"`**를 명시한다.

## 데이터 흐름

```
[주제·범위]
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
                                           └→ roadmap-planner
                                                └→ docs/ROADMAP.md
```

## 파일 컨벤션

- 중간 산출물: `_workspace/{phase}_{agent}_{artifact}.md` (예: `02_web_research.md`, `03_validated_findings.md`, `05_tech_verification.md`).
- 최종 산출물만 프로젝트 `docs/`에 둔다: `docs/PRD.md`, `docs/ROADMAP.md`.

> 번호는 도메인 **고정 슬롯**이며 연속 시퀀스가 아니다(04 결번·05 사용 가능). 번호는 감사 추적용 식별자일 뿐이며 실행 순서는 Phase가 규정한다.

## 에러 핸들링

- **리서치 실패/빈약**: 특정 축 서브가 "정보 부족"을 반환하면 해당 축만 쿼리 재구성해 재호출한다. 그래도 부족하면 커버리지 한계를 PRD에 명시하고 진행.
- **상충 데이터**: cross-validator가 해소 못 한 상충은 삭제하지 말고 "미해결 쟁점"으로 PRD에 남기고, 필요 시 사용자에게 판단을 요청한다.
- **죽은 출처·환각 출처**: tech-verifier가 Blocker로 표시하면 prd-author 보정 루프를 돈다. 근거가 환각으로 판명된 요구사항은 근거 교체 또는 제거. 보정 루프는 최대 2~3회, 초과 시 미해결로 명시하고 사용자에 판단 요청.
- **PRD 필수 요소 누락**: 애드센스 MUST 10항/유지보수/Lighthouse/품질·테스트 전략 중 하나라도 빠지면 Phase 3을 완료로 보지 않고 prd-author를 재호출한다.
- **팀 정리 실패**: Phase 전환 전 `TeamDelete` 성공을 확인한다. 잔여 팀이 있으면 다음 Phase를 시작하지 않는다.
- **명확화 필요**: 주제·범위가 모호하면 추측하지 말고 Phase 1에서 사용자에게 질문한다.

## 테스트 시나리오

### 정상 시나리오
1. 사용자: "OO 주제로 PRD랑 로드맵 만들어줘." → Phase 0: `_workspace/`·`docs/` 없음 확인 → Phase 1 브리프 → Phase 2 세 리서처 병렬 완료 → Phase 3 팀이 교차검증·PRD(애드센스/유지보수/Lighthouse 포함) 작성 → Phase 4 tech-verifier Blocker 0 → Phase 5 ROADMAP(체크박스 포함) 생성 → Phase 6 보고. **기대**: `docs/PRD.md`·`docs/ROADMAP.md` 생성, 세 필수 요구사항 반영, 모든 Task에 체크박스·검증 기준.

### 에러 시나리오
2. tech-verifier가 PRD 인용 URL 2건을 **죽은 링크/환각 출처**로 판정(Blocker). → Phase 4가 prd-author를 재호출해 해당 근거를 교체/제거하고 PRD 보정 → 재검증 Blocker 0 확인 후에만 Phase 5로 진행. **기대**: 환각 출처가 최종 PRD에 남지 않고, 보정 이력이 `05_tech_verification.md`에 기록됨.
