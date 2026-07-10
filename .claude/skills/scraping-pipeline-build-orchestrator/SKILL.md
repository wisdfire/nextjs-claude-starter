---
name: scraping-pipeline-build-orchestrator
description: 데이터 수집·크롤링 워커 애플리케이션(MAS)을 구현·확장할 때 반드시 사용하는 오케스트레이터. 별도 인프라 저장소(crawling-node-infra — EC2 t4g.small ARM64 + Docker Compose + Valkey + ECR) 위에서 실행되는 Celery 크롤링 워커를 구현담당 crawl-worker-engineer에게 전담시켜 조율한다. "스크래핑", "크롤러", "크롤링 워커", "데이터 수집 파이프라인", "워커 에이전트", "새 타겟 사이트 추가", "에이전트 추가", "Playwright", "Celery", "Valkey", "ECR", "SSM 배포", "arm64", "ScrapeGraphAI", "LLM 폴백", "스케줄", "배포", "테스트", "pytest", "uv", "CI 게이트", "재실행", "수정", "보완", "다시" 요청 시 즉시 로드하라.
---

# 크롤링 워커 구축 오케스트레이터 (워커/MAS 트랙)

크롤링 워커 애플리케이션(MAS)을 구현·확장한다. 실행 인프라(**AWS EC2 t4g.small 단일 노드 · ARM64 Graviton2 · 2 vCPU/2 GiB · Ubuntu 26.04 LTS "Resolute Raccoon" · Docker Compose · Valkey 브로커 · ECR · Grafana Alloy→Grafana Cloud**)는 **별도 인프라 저장소 `crawling-node-infra`** 에서 OpenTofu(`opentofu-infra` 스킬 규약)로 구축·운영되며, 이 하네스는 그 위에서 실행될 **워커 에이전트 구현과 arm64 이미지 배포(ECR push → SSM send-command)만** 담당한다.

> **폐기 이력**
> - 2026-07-08: 배치 트랙(K8s CronJob이 Trigger→Scraping→Cleaning→Extracting→Load 컨테이너를 직접 실행, 4-엔지니어 팀)을 워커 트랙으로 단일화하며 폐기.
> - 2026-07-10: 인프라 확정에 따라 **K3s·KEDA·Browserless·GHCR·ArgoCD GitOps 트랙 폐기**. 재도입 요청이 오면 사용자에게 폐기 사실을 알리고 현행 계약(`celery-crawl-worker`)으로 안내하라.

## 실행 모드: 서브 에이전트 (단일 구현담당)

**crawl-worker-engineer가 리드 백엔드 엔지니어로 구현을 전담**한다. Agent 도구로 직접 호출하며(`model: "opus"` 명시), 팀 통신 오버헤드가 필요 없는 단일 구현자 구조다. 오케스트레이터(메인)는 요구 확정·산출물 검수·후속 조율을 담당한다.

> 이 하네스는 `Agent` 도구(GA)만 사용하므로 **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 플래그가 필요 없다** — 팀 폴백 리스크 없음(팀 기반 3개 하네스와 달리 플래그 미설정 환경에서도 무결하게 동작).

## 에이전트 구성

| 에이전트 | 담당 | 사용 스킬 | 산출물 |
| --- | --- | --- | --- |
| crawl-worker-engineer | **구현담당(리드 백엔드 엔지니어)**. Celery 워커(에이전트당 전용 큐·acks_late·멱등 upsert), Playwright sync + 이미지 내장 Chromium, 하이브리드 파싱(Locator 메인 80% + ScrapeGraphAI 폴백 20%), prometheus_client 계측(multiprocess), Celery Beat 스케줄, 2단 이미지(base→agent) + arm64 빌드 + ECR + SSM 배포, 테스트(fixture·폴백 트리거·계약 스키마) | `celery-crawl-worker`(계약, 필수 선로드), `python-test-ci`, `playwright-scraping`(셀렉터·Anti-Bot 참고), `supabase-upsert-load`(결과 저장=DB 확정 시) | `_workspace/05_crawl_worker.md` + 워커 모노레포 코드 |

## 워크플로우

### Phase 0: 컨텍스트 확인
- `_workspace/` 존재 여부를 확인한다.
  - **없으면**: 신규 워커 애플리케이션 구축 → Phase 1부터 전체 진행.
  - **있으면**: 기존 산출물(`05_crawl_worker.md`)과 워커 코드를 읽고 이어서 진행. 수정/보완/재실행 요청이면 crawl-worker-engineer를 해당 범위로만 재호출. 단, **완전히 다른 신규 워커 요청**이면 기존 `_workspace/`·코드를 `_workspace_{YYYYMMDD_HHMMSS}/`로 보관 이동 후 새로 시작한다(감사 추적 보존).
- **신규 에이전트/사이트 추가 요청이면(Factory 경량 경로)**: base 패키지(공통 런타임)를 재작성하지 말 것. 에이전트 모듈(사이트별 셀렉터·파싱·CrawlResult 스키마)과 Beat 스케줄, 에이전트 이미지(`FROM base`), 대응 테스트만 추가한다.
- **조정 포인트 확인**: `ECR_REPOSITORY_URL`·`AWS_ROLE_ARN`·`EC2_INSTANCE_ID`, 첫 에이전트 대상 사이트, 결과 저장 계층(result 큐 소비 vs DB upsert), LLM 공급자, `HEALTHCHECK_URL`이 확정됐는지 사용자 요청에서 확인하고, 미확정 항목은 스텁으로 진행함을 명시한다.

### Phase 1: 요구 확정
- 대상 에이전트 그룹(뉴스/커머스/게시판 등), 사이트 목록, 크론 스케줄, 추출 필드(CrawlResult 스키마·필수 필드)를 확정한다.
- **버전은 인프라에서 파생한다.** `celery-crawl-worker` 스킬의 "버전 매트릭스"를 그대로 따른다(인프라 `CLAUDE.md`의 워커 스택 표 + `docs/03_cicd.md` §4-1이 원본). 핵심: 베이스 `mcr.microsoft.com/playwright/python:v1.61.0-resolute`(`resolute` = Ubuntu 26.04 LTS) · pip `playwright==1.61.0`(태그와 일치) · `uv python install 3.14`로 Python 3.14.6 pin(resolute 내장 시스템 Python도 3.14지만 패치 재현성 위해 uv 관리 버전 사용) · `UV_SYSTEM_PYTHON=1` 금지 · uv 바이너리 버전 pin. ScrapeGraphAI의 3.14 실동작만 구현 시점에 확인한다(인프라 미검증 항목).
- ⚠️ **Celery는 3.14를 공식 선언하지 않았다.** Phase 3의 prefork 스모크 테스트가 이 리스크의 안전장치다. 실패하면 3.13으로 내리고 결정을 산출물에 기록한다.

### Phase 2: 구현 위임
- crawl-worker-engineer를 호출한다(`model: "opus"`). 에이전트는 `celery-crawl-worker` 계약 스킬을 먼저 로드하고:
  1. **계약 요약 보고** — 인프라 계약 12항·배포 계약·파싱 전략 이해를 보고.
  2. **뼈대** — 모노레포 구조/pyproject(uv)/Dockerfile(base·agent 2단, arm64)/docker-compose(Valkey).
  3. **단계 구현** — Celery 앱·CrawlJob 모델·브라우저 수명주기·하이브리드 파싱 프레임·Prometheus 계측(multiprocess)·Healthchecks ping·첫 에이전트(스텁)·Beat 스케줄.
  4. 각 단계 완료 시 실행·테스트로 검증하고 결과를 보고한다.

```
Agent(subagent_type: "crawl-worker-engineer", model: "opus", run_in_background: true,
      prompt: "<확정된 조정 포인트(대상 에이전트 그룹·사이트·스케줄·결과 저장 계층·LLM 공급자·ECR/EC2 식별자) 포함>")
```

### Phase 3: 테스트 게이트
- 파싱 단위 테스트(고정 HTML fixture), **폴백 트리거 테스트**(예외 + Pydantic 검증 실패 → ScrapeGraphAI 폴백 발동 + `crawl_parse_fallback_total` 기록), 계약 스키마 테스트(CrawlJob/CrawlResult), job_id 멱등성 테스트를 `python-test-ci` 규약으로 작성·통과시킨다.
- **Celery 설정 단정 테스트**(`celery_app.conf`의 `task_acks_late`·`task_ignore_result`·`task_serializer='json'`·`worker_prefetch_multiplier=1`·`visibility_timeout`, 그리고 **기본 큐가 `celery`인지**를 assert) 및 **브라우저 수명주기 스모크 테스트**(integration 마커: `chromium.launch()` → 세션 open/close → 더미 파싱; CI에서 1회 강제). 최소한 finally close·세션 1개는 mock 단위테스트로라도 게이트에 포함. 이로써 수동 체크박스 항목이 pytest 게이트로 승격된다.
- **메트릭 계약 테스트**: `/metrics` 출력에 인프라 알림이 참조하는 이름이 정확히 존재하는지 assert한다 — `crawl_items_extracted_total`·`crawl_task_total`·`crawl_task_failures_total`·`crawl_http_status_total`·`crawl_task_duration_seconds`. 이름이 어긋나면 Alloy가 빈 값을 긁어가 `CrawlExtractionZero`·`CrawlFailureRateHigh`가 조용히 죽는다. 메트릭 서버가 `worker_process_init`에서 단 한 번만 바인딩되는지(포트 충돌 없음)도 함께 검증한다.
- 폴백 트리거 테스트에서 ScrapeGraphAI(LLM) 클라이언트는 monkeypatch/mock으로 대체해 반환값을 주입하고, 폴백 경로 진입과 `crawl_parse_fallback_total` 기록만 검증한다(네트워크·비용·flaky 회피).
- **prefork 스모크 테스트(필수, integration 마커)**: Celery가 Python 3.14를 공식 선언하지 않았으므로 실제 워커를 prefork 풀로 띄워 ①자식 fork ②`worker_process_init` 발화 → `/metrics`(9464) 응답 ③`max_tasks_per_child` 재활용 후 태스크 정상 처리를 확인한다. CI에서 1회 강제. 실패 시 3.14를 포기하고 3.13으로 내린 뒤 결정을 산출물에 기록한다.
- 로컬에서 `uv run pytest -m "not integration"` 통과 확인. ruff·mypy 통과.
- 테스트/ruff/mypy 실패 시 crawl-worker-engineer를 해당 범위로 재호출해 수정 후 재검증한다(최대 2~3회, 초과 시 미해결 명시). Phase 5 보고 전 게이트 통과를 전제로 못 박는다.

### Phase 4: CI · 배포 연결
- 트리거는 `on: { push: { branches: [main] }, workflow_dispatch: {} }`. PR에서는 테스트 게이트만 돌고 배포하지 않는다.
- GitHub Actions를 `needs:` 체인으로 구성한다:
  `pytest·ruff·mypy 게이트` → **`ubuntu-26.04-arm` 러너에서 `docker build --platform linux/arm64`** → ECR push(`<git-sha>` + `latest`) → `aws ssm send-command` 배포 → **배포 결과 폴링 확인**.
- `permissions: { id-token: write, contents: read }`(OIDC 필수), `concurrency: { group: deploy-<ref>, cancel-in-progress: true }`.
- GitHub **Variables**(Secrets 아님): `AWS_ROLE_ARN`, `ECR_REPOSITORY_URL`, `EC2_INSTANCE_ID`. 인프라 저장소의 `tofu output`으로 얻는다.
- **`aws ssm wait command-executed`를 쓰지 말 것** — 약 100초 후 포기하므로 약 4GB 이미지 pull 중 정상 배포를 실패로 오탐한다. `get-command-invocation` 폴링(10초×90)으로 상태·표준출력·표준에러를 확인하고 실패 시 워크플로를 실패시킨다.
- 값이 미설정이면 배포 잡을 조건부 스킵/경고하고 ECR push까지만 수행해, 인프라 미프로비저닝 상태에서도 데드엔드 없이 성립하게 한다.
- 인프라 저장소 쪽 변경은 이 하네스 범위 밖이다 — 아래를 보고서에 **"인프라 저장소 요청 사항"** 으로 정리해 전달한다(직접 수정 금지):
  1. `prometheus.yml`·`config.alloy`의 `crawling-worker` 스크레이프 job(`worker:9464`) 주석 해제 — 켜야 `crawling_app` 알림 그룹이 동작한다.
  2. `crawl_parse_fallback_total` 알림 규칙 추가(워커 고유 지표).
  3. (선택) `REDIS_EXPORTER_CHECK_KEYS`에 `dead:<agent>` 추가 — 데드레터 적체 알림용.

### Phase 5: 정리 및 보고
- 아래 검증 항목 통과를 확인하고, 산출물 목록·로컬 실행 절차(README)·신규 에이전트 확장 방법·미확정 스텁 목록·인프라 저장소 요청 사항을 보고한다.
- README에는 서버 최초 1회 준비(`/opt/crawling-worker/` 배치, `.env` 600 권한, `VALKEY_PASSWORD` 조회)와 GitHub Variables 세팅 안내를 포함하고, 미설정 시 ECR push까지만 동작함을 명시한다.
- 롤백 절차(이전 커밋 SHA로 `.env` 교체 후 `docker compose up -d`)와 **ECR 수명주기가 최근 10개만 보관하므로 그보다 오래된 버전으로는 롤백 불가**하다는 한계를 명시한다.

## 에러 핸들링

- **Valkey 쓰기 거부(noeviction OOM)**: 삼키지 말고 실패로 드러낸다. 큐 적재 실패 = 잡 유실. `evicted_keys`는 항상 0이어야 한다.
- **브라우저 크래시**: `/dev/shm` 64MB 기본값이 첫 용의자 — `--disable-dev-shm-usage` 확인. 세션은 finally로 반드시 close(좀비 브라우저 → OOM Killer → **Valkey가 먼저 죽어 큐 전체 유실**).
- **파싱 실패/silent breakage**: 예외 또는 Pydantic 검증 실패 → ScrapeGraphAI 폴백 → 재검증. 폴백 지속 발생은 셀렉터 수리 신호(Grafana 알림 대상)로 보고.
- **재시도 상한 초과**: error 필드 포함해 `dead:<agent>` 큐로 LPUSH.
- **429/403 급증**: IP 차단 진행 중. 재시도가 악화시키므로 rate limit을 낮춘다.
- **300초 예산 초과**: 소요시간 히스토그램으로 측정, 초과 패턴 시 사이트 분리·스케줄 조정 제안. compose `stop_grace_period: 300s` 누락 시 배포마다 태스크가 잘린다.
- **`exec format error`**: amd64 이미지를 arm64 서버에 배포한 것이다. 러너·`--platform`·베이스 이미지를 확인한다.
- **Celery가 Python 3.14에서 오작동**: prefork 스모크 테스트가 이를 잡는다. 실패하면 우회하지 말고 **3.13으로 내리고** 결정을 산출물에 기록한다.
- **`Executable doesn't exist`**: pip `playwright` 버전 ≠ 베이스 이미지 태그. 같은 커밋에서 함께 올린다.
- **파이썬 패치가 uv.lock과 어긋남/시스템 Python으로 되돌아감**: resolute 이미지 내장 시스템 Python은 3.14(패치 미고정)다. `ENV PATH="/app/.venv/bin:$PATH"` 누락 또는 `UV_SYSTEM_PYTHON=1`이 원인으로, uv가 pin한 3.14.6 대신 시스템 3.14가 잡혀 재현성이 깨진다.

## 테스트 시나리오

- **정상 — 첫 에이전트 구축**: base+에이전트 모노레포, docker-compose 로컬 환경(Valkey), 첫 에이전트(example.com 스텁), 테스트 5종, arm64 빌드→ECR→SSM 배포 CI까지 구축. Pydantic 검증 실패 시 LLM 폴백이 발동하고 `crawl_parse_fallback_total`이 기록되며, 같은 job_id 재실행이 멱등이면 통과.
- **에러 — 브라우저 크래시/셀렉터 붕괴**: `/dev/shm` 부족으로 Chromium이 죽으면 `--disable-dev-shm-usage`로 복구되고, DOM 변경으로 셀렉터가 엉뚱한 값을 반환하면 검증 실패→폴백→재검증으로 복구되며 메트릭이 남고, 최종 실패 시 dead 큐에 error와 함께 적재되면 통과.
- **에러 — 배포 오탐**: SSM 명령이 실패했는데 워크플로가 초록불이면 실패다. `get-command-invocation` 폴링으로 상태를 확인하고 비-Success 시 exit 1 하는지 검증한다.

## 검증 항목 (계약 준수 — 반드시 확인)

- [ ] **아키텍처**: 베이스 이미지·`--platform linux/arm64`·`ubuntu-26.04-arm` 러너가 전부 arm64로 정합
- [ ] **큐 규약**: 기본 큐 `celery` 유지(커스텀 큐 금지 — exporter check-keys가 `celery`·`unacked`·`unacked_index` 고정), 데드레터는 `dead:<agent>` LPUSH
- [ ] **Celery 필수 설정**: `task_acks_late`(← `CeleryUnackedStuck` 알림의 전제), `worker_prefetch_multiplier=1`, **`task_ignore_result=True`**(결과 백엔드 누적 → Valkey OOM 방지), JSON 직렬화(pickle 금지), concurrency 1, max_tasks_per_child, `visibility_timeout: 3600`
- [ ] **멱등성**: 결과 저장이 job_id 기준 upsert (at-least-once 정합)
- [ ] **브로커 접속**: external network `crawling-infra_crawling-net` 합류, `valkey:6379` 호스트명, 6379 외부 게시 없음
- [ ] **noeviction 정합**: 큐 적재 실패(OOM 에러)를 삼키지 않고 실패로 드러냄
- [ ] **브라우저**: sync API + `chromium.launch()`, 태스크당 세션 1개, finally close, `--disable-dev-shm-usage`(Chromium 전용 플래그 — 다른 엔진으로 바꾸지 않았다)
- [ ] **이미지 정합**: 베이스 = `mcr.microsoft.com/playwright/python:v1.61.0-resolute`(Ubuntu 26.04), pip `playwright==1.61.0`(이미지 태그와 일치), `uv python install 3.14` + `uv sync --python 3.14` + `ENV PATH=/app/.venv/bin:$PATH`, `pyproject.toml`의 `requires-python = ">=3.14"`, uv 바이너리는 버전 pin(`:latest` 금지), `UV_SYSTEM_PYTHON=1` 없음
- [ ] **prefork 스모크 테스트 통과**: Celery 3.14 미선언 리스크의 안전장치 — fork·`worker_process_init`→`/metrics` 응답·`max_tasks_per_child` 재활용 후 정상 처리를 실제 워커로 확인
- [ ] **메모리·수명주기**: compose `limits: 700M` + `stop_grace_period: 300s`, SIGTERM warm shutdown 유지(커스텀 핸들러 금지), 태스크 300초 이내
- [ ] **관측**: `/metrics`(9464)를 `worker_process_init`에서 1회 바인딩 + 계약 메트릭 6종(`crawl_items_extracted_total`·`crawl_task_total`·`crawl_task_failures_total`·`crawl_http_status_total`·`crawl_task_duration_seconds`·`crawl_parse_fallback_total`) + JSON stdout 로그 + 로그 로테이션
- [ ] **Dead man's switch**: 잡 성공 시 `HEALTHCHECK_URL` ping, 실패 시 `/fail`
- [ ] **폴백 규율**: 트리거에 Pydantic 검증 실패 포함, 폴백 결과 재검증, 메트릭 기록
- [ ] **환경변수**: `CELERY_BROKER_URL`(db 0)·`CELERY_RESULT_BACKEND`(db 1)·`PYTHONUNBUFFERED=1`·`HEALTHCHECK_URL`·`METRICS_PORT`(·`LLM_API_KEY`·`SENTRY_DSN`) — 인프라 compose 규격과 이름 일치, 하드코딩 없음
- [ ] **Celery CMD**: `--concurrency=1` + `-E`(이벤트 발행 — 없으면 Flower가 빈 화면)
- [ ] **배포**: ECR push(SHA 태그로 배포), OIDC(`id-token: write`), SSM send-command + **결과 폴링 확인**(`wait command-executed` 미사용), SSH·액세스 키 없음
- [ ] **품질 게이트**: pytest(`not integration`)·ruff·mypy 통과가 빌드·push의 `needs:` 전제
- [ ] **uv.lock 재현성**: 의존성이 pyproject.toml 선언 + uv.lock 잠금

## 파일 컨벤션

- 워크스페이스 산출물: `_workspace/{phase}_{agent}_{artifact}.{ext}` (예: `_workspace/05_crawl_worker.md`).
- > 산출물 번호 `05`는 도메인 **고정 슬롯**(폐기된 배치 트랙 잔재 번호)이며 실행 Phase와 무관한 감사 추적용 식별자다.
- 워커 코드: base 패키지 + `agents/<agent>/` 모듈, `Dockerfile.base`/`Dockerfile.agent`, `docker-compose.yml`, `tests/fixtures/<site>/sample.html` + `tests/test_*.py`, `.github/workflows/*.yml`, README.
- IaC(인프라 저장소 측): `opentofu-infra` 스킬 규약(OpenTofu 1.12.x) — 이 저장소에서는 다루지 않는다.
