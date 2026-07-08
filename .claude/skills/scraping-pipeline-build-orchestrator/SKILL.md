---
name: scraping-pipeline-build-orchestrator
description: 데이터 수집·크롤링 워커 애플리케이션(MAS)을 구현·확장할 때 반드시 사용하는 오케스트레이터. 별도 인프라 저장소(K3s+KEDA+Valkey+Browserless+OTel) 위에서 실행되는 Celery 크롤링 워커를 구현담당 crawl-worker-engineer에게 전담시켜 조율한다. "스크래핑", "크롤러", "크롤링 워커", "데이터 수집 파이프라인", "워커 에이전트", "새 타겟 사이트 추가", "에이전트 추가", "Playwright", "Celery", "KEDA", "Browserless", "ScrapeGraphAI", "LLM 폴백", "스케줄", "배포", "GitOps", "테스트", "pytest", "uv", "CI 게이트", "재실행", "수정", "보완", "다시" 요청 시 즉시 로드하라.
---

# 크롤링 워커 구축 오케스트레이터 (워커/MAS 트랙)

크롤링 워커 애플리케이션(MAS)을 구현·확장한다. 실행 인프라(AWS EC2+K3s, Valkey 브로커, KEDA 오토스케일링, Browserless 원격 브라우저, OTel→Grafana Cloud)는 **별도 인프라 저장소**에서 OpenTofu(`opentofu-infra` 스킬 규약)로 구축·운영되며, 이 하네스는 그 위에서 실행될 **워커 에이전트 구현과 이미지 배포(GHCR push + cross-repo GitOps PR)만** 담당한다.

> 기존 배치 트랙(K8s CronJob이 Trigger→Scraping→Cleaning→Extracting→Load 컨테이너를 직접 실행, 4-엔지니어 팀)은 2026-07-08 워커 트랙으로 단일화하며 폐기했다. 배치 방식 재도입 요청이 오면 사용자에게 폐기 사실을 알리고 워커 트랙으로 안내하라.

## 실행 모드: 서브 에이전트 (단일 구현담당)

**crawl-worker-engineer가 리드 백엔드 엔지니어로 구현을 전담**한다. Agent 도구로 직접 호출하며(`model: "opus"` 명시), 팀 통신 오버헤드가 필요 없는 단일 구현자 구조다. 오케스트레이터(메인)는 요구 확정·산출물 검수·후속 조율을 담당한다.

> 이 하네스는 `Agent` 도구(GA)만 사용하므로 **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 플래그가 필요 없다** — 팀 폴백 리스크 없음(팀 기반 3개 하네스와 달리 플래그 미설정 환경에서도 무결하게 동작).

## 에이전트 구성

| 에이전트 | 담당 | 사용 스킬 | 산출물 |
| --- | --- | --- | --- |
| crawl-worker-engineer | **구현담당(리드 백엔드 엔지니어)**. Celery 워커(에이전트당 전용 큐·acks_late·멱등 upsert), Playwright sync + Browserless CDP, 하이브리드 파싱(Locator 메인 80% + ScrapeGraphAI 폴백 20%), OTel 계측, Celery Beat 스케줄, 2단 이미지(base→agent) + GHCR + cross-repo GitOps PR, 테스트(fixture·폴백 트리거·계약 스키마) | `celery-crawl-worker`(계약, 필수 선로드), `python-test-ci`, `playwright-scraping`(셀렉터·Anti-Bot 참고), `supabase-upsert-load`(결과 저장=DB 확정 시) | `_workspace/05_crawl_worker.md` + 워커 모노레포 코드 |

## 워크플로우

### Phase 0: 컨텍스트 확인
- `_workspace/` 존재 여부를 확인한다.
  - **없으면**: 신규 워커 애플리케이션 구축 → Phase 1부터 전체 진행.
  - **있으면**: 기존 산출물(`05_crawl_worker.md`)과 워커 코드를 읽고 이어서 진행. 수정/보완/재실행 요청이면 crawl-worker-engineer를 해당 범위로만 재호출. 단, **완전히 다른 신규 워커 요청**이면 기존 `_workspace/`·코드를 `_workspace_{YYYYMMDD_HHMMSS}/`로 보관 이동 후 새로 시작한다(감사 추적 보존).
- **신규 에이전트/사이트 추가 요청이면(Factory 경량 경로)**: base 패키지(공통 런타임)를 재작성하지 말 것. 에이전트 모듈(사이트별 셀렉터·파싱·CrawlResult 스키마)과 Beat 스케줄, 에이전트 이미지(`FROM base`), 대응 테스트만 추가한다.
- **조정 포인트 확인**: `<org>`/레지스트리 경로, 첫 에이전트 대상 사이트, 결과 저장 계층(result 큐 소비 vs DB upsert), LLM 공급자가 확정됐는지 사용자 요청에서 확인하고, 미확정 항목은 스텁으로 진행함을 명시한다.

### Phase 1: 요구 확정
- 대상 에이전트 그룹(뉴스/커머스/게시판 등), 사이트 목록, 크론 스케줄, 추출 필드(CrawlResult 스키마·필수 필드)를 확정한다.
- 라이브러리 버전(Celery·Playwright·ScrapeGraphAI·OTel SDK)은 구현 시점에 최신 안정을 재확인해 고정한다(Context7 MCP/공식 문서).

### Phase 2: 구현 위임
- crawl-worker-engineer를 호출한다(`model: "opus"`). 에이전트는 `celery-crawl-worker` 계약 스킬을 먼저 로드하고:
  1. **계약 요약 보고** — 인프라 계약 8항·파싱 전략 이해를 보고.
  2. **뼈대** — 모노레포 구조/pyproject(uv)/Dockerfile(base·agent 2단)/docker-compose(Valkey+Browserless).
  3. **단계 구현** — Celery 앱·CrawlJob 모델·Browserless 연결·하이브리드 파싱 프레임·OTel 계측·첫 에이전트(스텁)·Beat 스케줄.
  4. 각 단계 완료 시 실행·테스트로 검증하고 결과를 보고한다.

```
Agent(subagent_type: "crawl-worker-engineer", model: "opus", run_in_background: true,
      prompt: "<확정된 조정 포인트(대상 에이전트 그룹·사이트·스케줄·결과 저장 계층·LLM 공급자) 포함>")
```

### Phase 3: 테스트 게이트
- 파싱 단위 테스트(고정 HTML fixture), **폴백 트리거 테스트**(예외 + Pydantic 검증 실패 → ScrapeGraphAI 폴백 발동 + `crawl.parse.fallback` 기록), 계약 스키마 테스트(CrawlJob/CrawlResult), job_id 멱등성 테스트를 `python-test-ci` 규약으로 작성·통과시킨다.
- **Celery 설정 단정 테스트**(`celery_app.conf`의 acks_late·task_serializer='json'·worker_prefetch_multiplier=1·visibility_timeout을 assert) 및 **브라우저 수명주기 스모크 테스트**(integration 마커: connect_over_cdp 연결→세션 open/close→더미 파싱; CI service-container/compose로 1회 강제). 최소한 finally close·세션 1개는 mock CDP 단위테스트로라도 게이트에 포함. 이로써 수동 체크박스 항목이 pytest 게이트로 승격된다.
- 폴백 트리거 테스트에서 ScrapeGraphAI(LLM) 클라이언트는 monkeypatch/mock으로 대체해 반환값을 주입하고, 폴백 경로 진입과 `crawl.parse.fallback` 메트릭 기록만 검증한다(네트워크·비용·flaky 회피).
- 로컬에서 `uv run pytest -m "not integration"` 통과 확인. ruff·mypy 통과.
- 테스트/ruff/mypy 실패 시 crawl-worker-engineer를 해당 범위로 재호출해 수정 후 재검증한다(최대 2~3회, 초과 시 미해결 명시). Phase 5 보고 전 게이트 통과를 전제로 못 박는다.

### Phase 4: CI · 배포 연결
- GitHub Actions: pytest 게이트 → 이미지 빌드(`ghcr.io/<org>/worker-<agent>:<agent>-<git-sha>`, latest 금지) → GHCR push → **인프라 저장소 `k8s/workers/*.yaml` 태그 갱신 PR 자동 생성**(cross-repo GitOps)을 `needs:` 체인으로 구성한다. 클러스터 직접 접근 금지.
- cross-repo PR 자동 생성에는 **인프라 저장소에 대한 쓰기 권한 토큰**(예: `GITOPS_TOKEN` — contents+pull_requests write 권한 PAT 또는 GitHub App)이 GitHub Secrets에 설정돼야 한다. 미설정 시 GitOps PR 잡을 조건부 스킵/경고하고 GHCR push까지만 수행해 인프라 저장소 부재 상태에서도 데드엔드 없이 성립하게 한다.
- 인프라 저장소 쪽 변경(KEDA ScaledObject·Secret·OpenTofu)은 이 하네스 범위 밖이다 — 필요 사항(새 큐 이름·환경변수)을 보고서에 "인프라 저장소 요청 사항"으로 정리해 전달한다.

### Phase 5: 정리 및 보고
- 아래 검증 항목 통과를 확인하고, 산출물 목록·로컬 실행 절차(README)·신규 에이전트 확장 방법·미확정 스텁 목록을 보고한다.
- README 로컬 실행 절차에는 GitOps PR용 시크릿(GITOPS_TOKEN 등) 세팅 안내를 포함해, 미설정 시 GHCR push까지만 동작함을 명시한다.

## 에러 핸들링

- **Browserless 연결 실패(429 등)**: 타임아웃 + 지수 백오프 재시도. 세션은 finally로 반드시 close.
- **파싱 실패/silent breakage**: 예외 또는 Pydantic 검증 실패 → ScrapeGraphAI 폴백 → 재검증. 폴백 지속 발생은 셀렉터 수리 신호(Grafana 알림 대상)로 보고.
- **재시도 상한 초과**: error 필드 포함해 `dead:<agent>` 큐로 LPUSH.
- **300초 예산 초과**: 소요시간 span으로 측정, 초과 패턴 시 사이트 분리·스케줄 조정 제안.
- **ScrapeGraphAI가 Python 3.14 미지원**: 3.13로 조정하고 산출물 문서에 결정 기록.

## 테스트 시나리오

- **정상 — 첫 에이전트 구축**: base+에이전트 모노레포, docker-compose 로컬 환경(Valkey+Browserless), 첫 에이전트(example.com 스텁), 테스트 4종, GHCR+GitOps PR CI까지 구축. Pydantic 검증 실패 시 LLM 폴백이 발동하고 `crawl.parse.fallback` 메트릭이 기록되며, 같은 job_id 재실행이 멱등이면 통과.
- **에러 — Browserless 연결 실패/셀렉터 붕괴**: CDP 연결 429 시 백오프 재시도 후 성공, DOM 변경으로 셀렉터가 엉뚱한 값을 반환하면 검증 실패→폴백→재검증으로 복구되고 메트릭이 남으며, 최종 실패 시 dead 큐에 error와 함께 적재되면 통과.

## 검증 항목 (계약 준수 — 반드시 확인)

- [ ] **큐 규약**: `crawl:`/`result:`/`dead:<agent>`(소문자 케밥케이스) + task_routes 라우팅
- [ ] **Celery 필수 설정**: acks_late, JSON 직렬화(pickle 금지), prefetch 1, concurrency 1~2, max_tasks_per_child, visibility_timeout ≥ 최대 소요시간
- [ ] **멱등성**: 결과 저장이 job_id 기준 upsert (at-least-once 정합)
- [ ] **브라우저**: sync API + `connect_over_cdp`, 태스크당 세션 1개, finally close, 이미지에 브라우저 바이너리 없음(`python:3.14-slim`; ScrapeGraphAI가 3.14 미지원이면 `3.13-slim`으로 조정하고 결정을 산출물에 기록)
- [ ] **수명주기**: SIGTERM warm shutdown 유지(커스텀 핸들러 금지), 태스크 300초 이내, requests 256Mi/limits 512Mi 정합
- [ ] **관측**: `crawl.job` span + 성공/실패·소요시간·`crawl.parse.fallback` 메트릭 + JSON stdout 로그
- [ ] **폴백 규율**: 트리거에 Pydantic 검증 실패 포함, 폴백 결과 재검증, 메트릭 기록
- [ ] **환경변수**: VALKEY_URL·BROWSERLESS_WS·BROWSERLESS_TOKEN·OTEL_EXPORTER_OTLP_ENDPOINT(·LLM_API_KEY) — 하드코딩 없음
- [ ] **배포**: 이미지 태그 `<agent>-<git-sha>`(latest 금지), GitOps PR 방식, 클러스터 직접 접근 없음, cross-repo PR용 시크릿(GITOPS_TOKEN 등) 설정
- [ ] **품질 게이트**: pytest(`not integration`)·ruff·mypy 통과가 빌드·push의 `needs:` 전제
- [ ] **uv.lock 재현성**: 의존성이 pyproject.toml 선언 + uv.lock 잠금

## 파일 컨벤션

- 워크스페이스 산출물: `_workspace/{phase}_{agent}_{artifact}.{ext}` (예: `_workspace/05_crawl_worker.md`).
- > 산출물 번호 `05`는 도메인 **고정 슬롯**(폐기된 배치 트랙 잔재 번호)이며 실행 Phase와 무관한 감사 추적용 식별자다.
- 워커 코드: base 패키지 + `agents/<agent>/` 모듈, `Dockerfile.base`/`Dockerfile.agent`, `docker-compose.yml`, `tests/fixtures/<site>/sample.html` + `tests/test_*.py`, `.github/workflows/*.yml`, README.
- IaC(인프라 저장소 측): `opentofu-infra` 스킬 규약(OpenTofu 1.12.x) — 이 저장소에서는 다루지 않는다.
