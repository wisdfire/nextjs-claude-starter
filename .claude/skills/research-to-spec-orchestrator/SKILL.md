---
name: research-to-spec-orchestrator
description: 리서치→PRD/ROADMAP 문서화를 자동 오케스트레이션한다. "PRD 작성", "요구사항 정의", "로드맵", "리서치", "시장 조사", "기술 검증", "테스트 전략", "QA", "IaC", "인프라", "terraform", "opentofu", "tofu", "재실행", "수정", "보완", "다시", "PRD 업데이트" 등의 요청 시 적극적으로 이 하네스를 가동하라. 웹/학술/커뮤니티 병렬 리서치 → 교차검증+PRD 작성 팀 → 기술검증 → 로드맵 생성을 하이브리드 모드로 지휘한다.
---

# research-to-spec 오케스트레이터

주제(제품 아이디어·도메인)를 받아 병렬 리서치 → 교차검증 → PRD 작성 → 기술검증 → ROADMAP 생성을 자동 지휘한다. 최종 산출물은 사용자 프로젝트의 `docs/PRD.md`와 `docs/ROADMAP.md`다.

## 실행 모드: 하이브리드

Phase마다 실행 모드가 다르다. 이 표를 반드시 따른다.

| Phase | 목적 | 실행 모드 | 도구/구성 |
| --- | --- | --- | --- |
| Phase 0 | 컨텍스트 확인·재실행 판단 | 오케스트레이터 직접 | Read / Glob (`_workspace/`, `docs/`) |
| Phase 1 | 준비(주제·범위 분석) | 오케스트레이터 직접 | 사용자 입력·요구사항 문서 |
| Phase 2 | 병렬 리서치 수집 | **서브 에이전트(병렬)** | `Agent` ×3, `run_in_background: true`, `model: "opus"` |
| Phase 3 | 교차검증 + PRD 작성 | **에이전트 팀** | `TeamCreate` → cross-validator + prd-author, `SendMessage` 조율, `TeamDelete` |
| Phase 4 | 기술 실현성·출처 검증 | **서브 에이전트** | `Agent` ×1 (tech-verifier), `model: "opus"` |
| Phase 5 | ROADMAP 생성 | **에이전트 팀 또는 서브** | roadmap-planner, `model: "opus"` |
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
| roadmap-planner | 5 | 팀/서브 | `docs/ROADMAP.md` |

## 워크플로우

### Phase 0 — 컨텍스트 확인
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
- **필수**: PRD에 **애드센스 80%+ · 유지보수 최소(cron+Playwright+IaC) · Lighthouse 지표 · 품질·테스트 전략(단위/통합/E2E·CI 게이트)**가 반드시 반영됐는지 확인한다(`prd-authoring`·`adsense-readiness` 스킬 기준). 유지보수 최소화 항목에는 **IaC 프로비저닝 원칙**(상세는 `opentofu-infra` 스킬)이, 완성도 항목에는 **테스트 통과율**이 짝으로 들어가야 한다. 누락 시 prd-author에 보강 지시.
- 완료 후 `TeamDelete`로 팀을 정리한다.

### Phase 4 — 기술 검증 (서브 에이전트)
- `Agent`로 tech-verifier를 띄운다(`model: "opus"`). 입력: `docs/PRD.md`.
- **최신성**(context7로 라이브러리 버전·deprecated) + **출처 정상성**(WebFetch로 URL 생존·내용 일치, 죽은 링크·환각 출처 탐지) + **필수 요구사항 포함 검증**(PRD가 테스트 전략·IaC 프로비저닝을 요구사항으로 담고, 그 기술 선택이 최신·유효한지)을 검증해 `05_tech_verification.md` 생성.
- **Blocker/Warning이 있으면**: prd-author를 다시 `Agent`로 호출(또는 소규모 팀 재생성)해 PRD를 보정한 뒤 재검증한다.

### Phase 5 — ROADMAP 생성 (에이전트 팀 또는 서브)
- 검증(또는 보정) 완료된 `docs/PRD.md`와 `05_tech_verification.md`를 입력으로 roadmap-planner를 실행(`model: "opus"`).
- `docs/ROADMAP.md`를 **Phase→Task 계층 + 완료 체크박스([ ]/[x]) + 의존성·산출물·검증 기준(Lighthouse 등)**으로 생성한다.
- **테스트·IaC 규약(필수)**: 초기 Phase에 **인프라 프로비저닝(IaC) Task**를 두고, **각 Phase에 테스트/QA Task**를 최소 1개 포함하며, **각 기능 Task의 검증 기준에 테스트 통과 조건(CI 게이트 green)**을 페어링한다(`roadmap-planning` 스킬 기준).

### Phase 6 — 정리·보고
- `docs/PRD.md`·`docs/ROADMAP.md` 경로와 핵심 요약, 미해결 쟁점·리스크, 남은 Blocker를 사용자에게 보고한다.
- `_workspace/` 중간 산출물은 근거 추적용으로 보존한다.

## 하이브리드 전환 규칙

- **팀 → 서브 전환**(Phase 3→4): 반드시 **`TeamDelete`로 팀을 먼저 정리**한 뒤 `Agent`로 tech-verifier를 호출한다. 파일 경로(`docs/PRD.md`)로 인계한다.
- **서브 → 팀 전환**(Phase 2→3): 서브의 산출물은 통신이 아니라 **파일 경로**(`_workspace/02_*.md`)로 다음 팀에 전달한다.
- **서브 → 서브**(Phase 4 내 보정): 파일 경로로 인계하고, 팀을 만들지 않는다.
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

## 에러 핸들링

- **리서치 실패/빈약**: 특정 축 서브가 "정보 부족"을 반환하면 해당 축만 쿼리 재구성해 재호출한다. 그래도 부족하면 커버리지 한계를 PRD에 명시하고 진행.
- **상충 데이터**: cross-validator가 해소 못 한 상충은 삭제하지 말고 "미해결 쟁점"으로 PRD에 남기고, 필요 시 사용자에게 판단을 요청한다.
- **죽은 출처·환각 출처**: tech-verifier가 Blocker로 표시하면 prd-author 보정 루프를 돈다. 근거가 환각으로 판명된 요구사항은 근거 교체 또는 제거.
- **PRD 필수 요소 누락**: 애드센스/유지보수(IaC 포함)/Lighthouse/품질·테스트 전략 중 하나라도 빠지면 Phase 3을 완료로 보지 않고 prd-author를 재호출한다.
- **팀 정리 실패**: Phase 전환 전 `TeamDelete` 성공을 확인한다. 잔여 팀이 있으면 다음 Phase를 시작하지 않는다.
- **명확화 필요**: 주제·범위가 모호하면 추측하지 말고 Phase 1에서 사용자에게 질문한다.

## 테스트 시나리오

### 정상 시나리오
1. 사용자: "OO 주제로 PRD랑 로드맵 만들어줘." → Phase 0: `_workspace/`·`docs/` 없음 확인 → Phase 1 브리프 → Phase 2 세 리서처 병렬 완료 → Phase 3 팀이 교차검증·PRD(애드센스/유지보수/Lighthouse 포함) 작성 → Phase 4 tech-verifier Blocker 0 → Phase 5 ROADMAP(체크박스 포함) 생성 → Phase 6 보고. **기대**: `docs/PRD.md`·`docs/ROADMAP.md` 생성, 세 필수 요구사항 반영, 모든 Task에 체크박스·검증 기준.

### 에러 시나리오
2. tech-verifier가 PRD 인용 URL 2건을 **죽은 링크/환각 출처**로 판정(Blocker). → Phase 4가 prd-author를 재호출해 해당 근거를 교체/제거하고 PRD 보정 → 재검증 Blocker 0 확인 후에만 Phase 5로 진행. **기대**: 환각 출처가 최종 PRD에 남지 않고, 보정 이력이 `05_tech_verification.md`에 기록됨.
