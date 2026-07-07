---
name: data-pipeline-design-orchestrator
description: 데이터 파이프라인을 설계할 때 반드시 사용하라. pipeline-lead가 아키텍처를 확정하고 스키마/ETL/검증/모니터링 4개 전문 에이전트에 계층적으로 위임하는 에이전트 팀을 구동한다. "데이터 파이프라인 설계", "스키마 설계", "ETL 설계", "검증 규칙", "모니터링", "관측성", "SLA", "테스트 전략", "검증 테스트", "IaC", "인프라", "terraform", "opentofu", "tofu", "재실행", "수정", "보완", "다시" 키워드에 적극적으로 켜라. 설계 산출물(문서)을 생성하며 구현은 하지 않는다.
---

# data-pipeline-design 오케스트레이터 (에이전트 팀 · 계층적 위임)

데이터 파이프라인을 **설계**(구현 아님, 문서 산출물)한다. 계층적 위임으로 pipeline-lead가 전체 아키텍처를 잡고 4개 하위 전문가에 작업을 분해·위임하며, 산출물 간 필드명·키 정합성을 관장한다.

## 실행 모드: 에이전트 팀

- TeamCreate로 팀을 구성하고, pipeline-lead를 상위 조율자로 두는 **계층적 위임** 구조로 실행한다.
- 모든 에이전트는 `model: "opus"`로 생성한다.
- schema 산출물이 하류 3개의 기준점이므로, **schema를 먼저 확정**한 뒤 나머지가 이를 참조한다(depends_on).
- 팀원 간 필드명·PK·키 조율은 SendMessage로 수행한다.

## 에이전트 구성

| 에이전트 | 타입 | 모델 | 역할 | 산출물 | 사용 스킬 | depends_on |
| --- | --- | --- | --- | --- | --- | --- |
| pipeline-lead | general-purpose | opus | 상위 조율자. 아키텍처 확정, 4개 하위에 위임, 정합성 관장, **배포·인프라(IaC) 방침** | `_workspace/00_pipeline_architecture.md` | `opentofu-infra`(IaC 방침 참조) | — |
| schema-designer | general-purpose | opus | 소스 분석, 테이블/타입/관계/인덱스/제약, 정규화 판단, DDL·Drizzle 초안 | `_workspace/01_schema_design.md` | `schema-design` | pipeline-lead |
| etl-designer | general-purpose | opus | E/T/L 로직, 멱등성, 증분, Upsert 키, 재처리·백필, **테스트·검증 전략** | `_workspace/02_etl_logic.md` | `etl-logic-design` | schema-designer |
| validation-designer | general-purpose | opus | 4계층 검증 규칙, 품질 지표, quarantine, **규칙↔테스트 페어링** | `_workspace/03_validation_rules.md` | `data-validation-rules` | schema-designer |
| monitoring-designer | general-purpose | opus | 볼륨/지연/실패율/신선도 메트릭, 알림, SLO, 드리프트 | `_workspace/04_monitoring_setup.md` | `pipeline-monitoring` | schema-designer, validation-designer |

## 워크플로우

### Phase 0 — 컨텍스트 확인
- 요청 의도(신규 설계 / 수정·보완 / 특정 영역만 재실행)를 파악한다.
- 기존 `_workspace/*.md` 산출물이 있으면 읽어 현재 상태를 확인한다("다시/수정/보완"이면 필수).
- 데이터 소스·적재 목표·비즈니스 규칙이 부족하면 진행 전에 사용자에게 명확화 질문을 한다(추측 금지).

### Phase 1 — 준비
- `_workspace/` 디렉토리를 확인/생성한다.
- 스택 전제(Supabase PostgreSQL + Drizzle)를 확정하고, 파일 컨벤션 `_workspace/{phase}_{agent}_{artifact}.md`를 적용한다.

### Phase 2 — 팀 구성
- TeamCreate로 5개 에이전트를 `model: "opus"`로 생성한다.
- pipeline-lead를 상위 조율자로 지정한다.

### Phase 3 — 계층적 위임 실행
1. **아키텍처 확정**: pipeline-lead가 전체 데이터 흐름·계층·**표준 용어 사전(테이블·컬럼·PK·Upsert 키)**과 **배포·인프라(IaC) 방침**(실행 환경 = 스케줄러/워커/DB/캐시를 OpenTofu로 프로비저닝, 상세는 `opentofu-infra` 스킬 참조)을 담은 `00_pipeline_architecture.md`를 작성한다.
2. **schema 우선 위임**: lead가 schema-designer에 위임 → `01_schema_design.md` 확정. 필드명·PK가 여기서 못박힌다.
3. **하류 3개 위임(schema 참조)**: 확정된 필드명·PK를 lead가 브로드캐스트한 뒤 etl / validation / monitoring designer가 진행. 이들은 schema 산출물의 이름을 문자 그대로 참조한다. etl-designer는 **테스트·검증 전략**(Transform 단위테스트·멱등성 테스트·경계 케이스·테스트 도구)을, validation-designer는 **각 규칙↔테스트 케이스 페어링**(위반 샘플→reject/quarantine/flag 분기 검증)을 산출물에 포함한다.
4. **팀원 간 조율**: 하위 designer가 스키마에 없는 컬럼/키가 필요하면 SendMessage로 schema-designer(또는 lead)에 보강을 요청하고, 변경은 lead 승인 후 전체에 재전파한다(단일 진실 원천).

### Phase 4 — 정합성 통합
- pipeline-lead가 4개 산출물을 대조: 테이블·컬럼명, PK/Upsert 키, 타입, 참조 관계가 일관되게 쓰였는지 확인한다.
- **테스트 전략·IaC 방침 일관성 점검**: (1) etl·validation 산출물의 **테스트·검증 전략**(멱등성/경계 케이스/규칙↔테스트 페어링)이 서로 도구·fixture 규약을 맞춰 정의됐는지, (2) 아키텍처의 **IaC 방침**이 실행 환경·모니터링 리소스 프로비저닝까지 일관되게 반영됐는지 4개 산출물 전반에서 대조한다.
- 불일치가 있으면 해당 designer에 재작업을 지시하고 `00_pipeline_architecture.md`에 정합성 체크 결과를 기록한다.

### Phase 5 — 정리
- 5개 산출물 경로와 한 줄 요약, 정합성 확인 결과, 남은 오픈 이슈(추가 확인 필요 항목)를 사용자에게 보고한다.
- 구현이 아닌 **설계 문서**만 산출했음을 명시한다.

## 데이터 흐름

```
사용자 요구사항 / 데이터 소스
        │
        ▼
   pipeline-lead ── 00_pipeline_architecture.md (표준 용어 사전)
        │  위임
        ▼
   schema-designer ── 01_schema_design.md  (필드명·PK 확정 = 단일 진실 원천)
        │  필드명·PK 브로드캐스트
        ├──────────────┬───────────────┐
        ▼              ▼               ▼
  etl-designer   validation-designer  monitoring-designer
  02_etl_logic   03_validation_rules  04_monitoring_setup
        │              │               │
        └──────────────┴───────────────┘
                       ▲  SendMessage로 필드/키 조율
                       │
        pipeline-lead 정합성 통합 (Phase 4)
```

## 에러 핸들링

- **입력 부족**: 소스·목표·규칙이 모호하면 Phase 0에서 멈추고 질문한다. 추측으로 설계하지 않는다.
- **필드명·키 불일치**: Phase 4에서 발견 시 lead가 조율, 해당 designer 재작업. 임의 로컬 수정 금지.
- **스키마 변경 파급**: schema가 바뀌면 lead가 하류 3개에 재전파하고 정합성을 다시 대조한다.
- **에이전트 실패/중단**: 해당 산출물이 없으면 lead가 재위임한다. 부분 산출물만 있으면 이어서 보완한다.
- **순환 의존**: 검증/모니터링이 아직 없는 컬럼을 참조하면 schema 기준으로 끊고 schema 보강을 우선한다.

## 테스트 시나리오

### 정상 시나리오
입력: "주문 로그(JSON)를 Supabase에 적재해 일별 매출 대시보드를 만들고 싶다. 소스는 시간당 갱신, 컬럼은 order_id·user_id·amount·status·created_at."
기대: Phase 0에서 소스·목표 확인 → lead가 아키텍처+용어 사전 작성 → schema-designer가 `orders` 테이블(PK `order_id`, `amount numeric`, `created_at timestamptz`)+Drizzle 초안 → etl가 `order_id` Upsert·`created_at` 워터마크 증분 → validation이 4계층 규칙(amount≥0 등)+quarantine → monitoring이 신선도(1시간)·볼륨 드리프트·SLO → Phase 4 정합성 통과 → 5개 산출물 경로 보고. 모든 산출물에서 컬럼명이 `order_id`/`created_at`로 일치.

### 에러 시나리오
입력: "데이터 파이프라인 설계해줘" (소스·목표 미제공).
기대: Phase 0에서 진행을 멈추고 "데이터 소스(형식·컬럼·볼륨·갱신 주기)와 적재 목표를 알려달라"고 명확화 질문. 추측으로 임의 스키마를 만들지 않는다. 이후 사용자가 정보를 주면 정상 워크플로우로 재개.
