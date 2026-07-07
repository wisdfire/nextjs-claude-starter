---
name: celery-crawl-worker
description: 크롤링 워커 애플리케이션(MAS)을 구현할 때 반드시 사용하는 계약 스킬. 별도 인프라 저장소(AWS EC2+K3s, Valkey 브로커, KEDA 오토스케일링, Browserless 원격 브라우저, OTel→Grafana Cloud) 위에서 실행되는 Celery 워커 에이전트를 구현하고 도커 이미지로 배포하는 규약을 담는다. "크롤링 워커", "워커 에이전트", "워커 이미지", "Celery", "KEDA", "Browserless", "Valkey", "ScrapeGraphAI", "LLM 폴백", "에이전트 추가", "크론 스케줄" 요청 시 즉시 로드하라. 위반 시 KEDA 스케일링·관측이 동작하지 않으므로 인프라 계약 8항은 반드시 준수한다.
---

# 크롤링 워커(MAS) 구현 계약

크롤링 워커 애플리케이션 개발 프로젝트의 **리드 백엔드 엔지니어** 관점으로 이 계약을 적용한다.

## 배경 · 스코프

크롤링 실행 인프라(AWS EC2 단일 노드 + K3s)는 **별도의 인프라 저장소**에서 이미 구축·운영된다.
인프라가 제공하는 것: Valkey(브로커), KEDA(워커 오토스케일링), Browserless(원격 브라우저 풀),
OTel Collector → Grafana Cloud(관측). 이 프로젝트는 그 위에서 실행될 **크롤링 워커 에이전트
(MAS: Multi-Agent System)** 를 구현하고 도커 이미지로 배포하는 것만 담당한다.
워커 이미지는 인프라의 K3s 클러스터가 당겨가 KEDA ScaledObject로 0~N개 스케일링한다.

- 목표 워크로드: 약 100개 웹사이트, 하루 약 200개 크론 스케줄(동시 아님).
- 초기에는 에이전트 1~3개로 시작하고, 사이트 유형(뉴스/커머스/게시판 등)별 에이전트로 그룹핑해 점진 확장한다.
- **이 트랙에서 인프라 저장소의 클러스터를 직접 만지지 않는다** — 배포는 cross-repo GitOps PR로만.

## 기술 스택 (2026-07 기준 버전 고정, 설치 시점 재확인)

- Python 3.14.x (uv로 관리), Celery 5.6.x (브로커: Valkey/Redis 프로토콜), Celery Beat(스케줄러)
- Playwright 1.61.x — 반드시 **sync API** 사용 (Celery prefork와 정합. 동시성은 KEDA가 Pod 수로 확보)
- Pydantic v2 + pydantic-settings (모든 외부 입력 검증)
- ScrapeGraphAI 최신 안정 (LLM 파싱 폴백 전용. Python 3.14 미지원 시 3.13로 조정)
- OpenTelemetry SDK (OTLP gRPC 전송)
- Docker 베이스 이미지: python:3.14-slim — **브라우저 바이너리 설치 금지** (원격 Browserless 사용)

## 인프라 계약 (반드시 준수 — 위반 시 KEDA 스케일링·관측이 동작하지 않는다)

1. **큐**: 에이전트당 전용 Celery 큐 `crawl:<agent>` (예: crawl:news-kr). task_routes로 라우팅.
   결과 큐 `result:<agent>`, 데드레터 큐 `dead:<agent>`. `<agent>`는 소문자 케밥케이스.
2. **태스크 페이로드**(Pydantic 모델 `CrawlJob`): job_id(uuid4, 멱등성 키), agent, url,
   scheduled_at(ISO8601 UTC), retry_count, params(dict, 선택).
3. **Celery 필수 설정**: `acks_late=True`, `task_serializer="json"`(pickle 금지),
   `worker_prefetch_multiplier=1`, `--concurrency=1~2`, `max_tasks_per_child` 설정,
   broker visibility_timeout ≥ 태스크 최대 소요시간. at-least-once이므로 결과 저장은
   job_id 기준 upsert(멱등성 필수).
4. **환경변수**(하드코딩 금지, 인프라가 Secret으로 주입): `VALKEY_URL`, `BROWSERLESS_WS`,
   `BROWSERLESS_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, (필요 시) `LLM_API_KEY`.
5. **브라우저**: playwright sync API로
   `chromium.connect_over_cdp(f"{BROWSERLESS_WS}?token={BROWSERLESS_TOKEN}")`.
   태스크 1건당 세션 1개를 열고 반드시 닫는다(finally). 연결 실패(429 등)는 타임아웃·재시도 구현.
6. **수명주기**: SIGTERM 시 Celery warm shutdown 기본 동작 유지(커스텀 핸들러로 덮어쓰기 금지).
   단일 태스크는 LLM 폴백 포함 300초 이내 완료. Pod 리소스 계약: requests 256Mi / limits 512Mi.
7. **관측(OTel)**: 태스크당 span `"crawl.job"`(job_id, agent, url, retry_count, 결과 상태).
   필수 메트릭: 성공/실패 카운터, 소요시간 히스토그램, LLM 폴백 카운터 `"crawl.parse.fallback"`
   (agent, url 속성). 로그는 구조화 JSON stdout.
8. **실패 처리**: `autoretry_for` + `retry_backoff`(지수 백오프)로 재시도, 상한 초과 시
   원인(error 필드)을 포함해 `dead:<agent>` 큐로 LPUSH.

## 데이터 파싱 전략 (하이브리드 80/20)

- **메인(80%, 안정성)**: Playwright Locator(CSS/XPath)로 DOM 직접 파싱 → 속도·비용 최적화.
- **폴백(20%, 유연성)**: DOM 변경으로 기존 로직이 깨졌을 때만 ScrapeGraphAI(LLM) 호출로 복구.
- 폴백 트리거는 예외(try-except)만이 아니라 **Pydantic 검증 실패**(필수 필드 누락/형식 오류)를
  포함해야 한다 — 셀렉터가 조용히 엉뚱한 값을 반환하는 silent breakage를 잡기 위함.
- LLM 폴백 결과도 동일한 Pydantic 모델(`CrawlResult`)로 검증해 환각을 걸러낸다.
- 폴백 발생 시 `crawl.parse.fallback` 메트릭을 반드시 기록한다(폴백 지속 발생 = 셀렉터 수리 신호,
  인프라의 Grafana Cloud 알림 대상). **LLM 폴백은 임시 복구이지 영구 대체가 아니다.**

## 프로젝트 구조 및 산출물

1. **모노레포 구조**: 공통 패키지(base) + 에이전트별 모듈. 베이스 이미지(공통 런타임: Celery 앱,
   Pydantic 모델, Browserless 연결, OTel 계측, 하이브리드 파싱 프레임)를 만들고 에이전트 이미지가
   `FROM`으로 상속하는 2단 구성. 에이전트는 사이트별 셀렉터/파싱 로직만 구현한다.
2. 첫 에이전트 1개를 예시로 완성(대상 사이트는 추후 지정, 우선 example.com 스텁).
3. **Celery Beat 스케줄** 구성(에이전트별 크론). 스케줄 정의는 코드/설정 파일로 버전 관리.
4. **로컬 개발 환경**: docker-compose(Valkey + Browserless chromium)로 인프라 계약과 동일한
   환경변수 규격을 재현. README에 로컬 실행 절차 문서화.
5. **테스트**: 파싱 로직 단위 테스트(고정 HTML fixture), 폴백 트리거 테스트, 계약 스키마 테스트.
6. **CI(GitHub Actions)**: 코드 변경 → 이미지 빌드(`ghcr.io/<org>/worker-<agent>:<agent>-<git-sha>`,
   **latest 태그 금지**) → GHCR push → 인프라 저장소의 `k8s/workers/*.yaml` 이미지 태그를 갱신하는
   PR 자동 생성(cross-repo GitOps). **클러스터 직접 접근 금지.**
7. **코드 품질**: ruff(lint+format), mypy. 모든 함수 docstring과 주요 로직 인라인 주석은 초보
   개발자가 흐름을 파악할 수 있도록 한국어로 상세히 작성한다.

## 진행 방식

- 시작 전에 위 계약을 요약해 이해한 바를 보고하고, 프로젝트 뼈대(구조/pyproject/도커/컴포즈)부터
  단계적으로 구현하라. 각 단계 완료 시 실행·테스트로 검증하고 결과를 보고하라.
- 라이브러리 버전은 구현 시점에 최신 안정 버전을 재확인해 고정(pin)하라 (Context7 MCP/공식 문서 활용).

## 사용 시 조정 포인트

구현 착수 전 아래 항목이 확정되었는지 확인하고, 미확정이면 스텁/플레이스홀더로 명시한다.

| 항목 | 조정 |
| --- | --- |
| `<org>` / 레지스트리 | 실제 GitHub org·GHCR 경로로 치환 |
| 첫 에이전트 대상 사이트 | 확정 후 "추후 지정" 부분에 명시 (그 전까지 example.com 스텁) |
| 결과 저장 계층 | `result:<agent>` 큐 소비 방식 또는 DB(upsert) 직접 적재 중 확정 시 추가 |
| LLM 공급자 | ScrapeGraphAI에 연결할 LLM(API 키 이름 포함) 확정 시 추가 |

## 트랙 정책 (배치 트랙 폐기)

기존 배치 트랙(K8s CronJob이 파이프라인 컨테이너를 직접 실행, Instructor 추출 기본, 직접 배포)은
**2026-07-08 이 워커(MAS) 트랙으로 단일화하며 폐기**했다. 크롤링 구현 요청은 전부 이 계약을 따른다.
배치 시절 습관이 섞이지 않도록 특히 주의할 반전 지점:

- 브라우저는 이미지에 넣지 않는다 → Browserless **원격 CDP** 접속 (배치: 이미지 내장).
- Playwright는 **sync API 강제** — 동시성은 KEDA Pod 수로 확보 (배치: async 허용).
- LLM은 기본 경로가 아니라 **폴백 전용** — Locator 직접 파싱이 기본 (배치: Instructor 추출 기본).
- 트리거는 CronJob+Redis 락이 아니라 **Celery Beat → Valkey 큐 → KEDA** (멱등성은 job_id upsert로).
- 배포는 클러스터 직접 접근이 아니라 **GHCR push → 인프라 저장소 GitOps PR**만.
- 인프라는 이 저장소가 아니라 **별도 인프라 저장소**가 OpenTofu(`opentofu-infra` 스킬 규약, 1.12.x)로 소유한다.
