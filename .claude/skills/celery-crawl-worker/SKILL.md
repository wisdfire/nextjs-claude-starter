---
name: celery-crawl-worker
description: 크롤링 워커 애플리케이션(MAS)을 구현할 때 반드시 사용하는 계약 스킬. 별도 인프라 저장소(crawling-node-infra — AWS EC2 t4g.small ARM64 단일 노드 + Docker Compose, Valkey 브로커, ECR, Grafana Alloy→Grafana Cloud) 위에서 실행되는 Celery 워커 에이전트를 구현하고 arm64 이미지로 배포(ECR push → SSM send-command)하는 규약을 담는다. "크롤링 워커", "워커 에이전트", "워커 이미지", "Celery", "Valkey", "ECR", "SSM 배포", "arm64", "Playwright", "ScrapeGraphAI", "LLM 폴백", "에이전트 추가", "크론 스케줄" 요청 시 즉시 로드하라. 폐기된 스택(KEDA·K3s·Browserless·GHCR·ArgoCD GitOps) 언급 시에도 로드해 폐기 사실을 알려라. 위반 시 배포·관측이 동작하지 않으므로 인프라 계약 12항은 반드시 준수한다.
---

# 크롤링 워커(MAS) 구현 계약

크롤링 워커 애플리케이션 개발 프로젝트의 **리드 백엔드 엔지니어** 관점으로 이 계약을 적용한다.

## 배경 · 스코프

크롤링 실행 인프라는 **별도의 인프라 저장소 `crawling-node-infra`** 에서 구축·운영된다.
그 인프라는 **AWS EC2 t4g.small 단일 노드**(ARM64 Graviton2, 2 vCPU / 2 GiB RAM, Ubuntu LTS)
위에서 **Docker Compose**로 동작하며, 워커에게 다음을 제공한다.

| 인프라가 제공하는 것 | 워커(이 프로젝트)가 하는 것 |
| --- | --- |
| Valkey 브로커 (컨테이너, `crawling-infra_crawling-net` 네트워크) | Celery 워커 에이전트 구현 |
| ECR 이미지 저장소 (수명주기: 최근 10개) | arm64 이미지 빌드·push |
| GitHub OIDC IAM 역할 · EC2 인스턴스 프로파일 | SSM send-command로 배포 |
| Grafana Alloy (지표 scrape → Grafana Cloud) | `/metrics` 엔드포인트 노출 |

- 목표 워크로드: 약 100개 웹사이트, 하루 약 200개 크론 스케줄(동시 아님).
- 초기에는 에이전트 1~3개로 시작하고, 사이트 유형(뉴스/커머스/게시판 등)별 에이전트로 그룹핑해 점진 확장한다.
- **인프라 저장소의 `tofu/`·`docker/`를 직접 수정하지 않는다.** 필요 사항은 "인프라 저장소 요청 사항"으로 정리해 전달한다.
- 확장은 Pod 스케일아웃이 아니라 **인스턴스 타입 상향(scale-up)** 이 1순위다. 오토스케일러는 없다.

## 버전 매트릭스 (인프라 저장소에서 파생 — 임의로 바꾸지 마라)

인프라(`crawling-node-infra`)가 버전을 고정하고, 워커는 그 위에 얹힌다. **인프라 `CLAUDE.md`의 "워커 스택" 표와 `docs/03_cicd.md` §4-1이 단일 진실 공급원**이며, 아래는 그것을 워커 관점으로 옮긴 것이다. 인프라가 값을 바꾸면 이 표를 먼저 갱신한다.

### 인프라가 고정한 값 (워커가 맞춰야 함)

| 계층 | 값 | 워커에 미치는 영향 |
| --- | --- | --- |
| 호스트 | EC2 **t4g.small** (ARM64 Graviton2, 2 vCPU / 2 GiB), Ubuntu LTS(24.04 또는 26.04), 루트 30 GiB gp3 | 이미지는 **linux/arm64 전용**. 메모리·디스크 예산의 근거 |
| 브로커 | **Valkey `8.1-alpine`** (`maxmemory 512mb`, `noeviction`, `appendonly yes`) | `redis://` 스킴으로 접속. 쓰기 거부 에러를 삼키면 안 됨 |
| 레지스트리 | ECR (`MUTABLE` 태그, `scan_on_push`, **최근 10개 보관**) | 11번째 이전 버전으로는 롤백 불가 |
| IaC | OpenTofu **1.12.3**, AWS provider `~> 5.0` | 워커는 IaC를 다루지 않음 (`opentofu-infra` 스킬) |
| 관측 수집 | Grafana Alloy `v1.5.1`, redis_exporter `v1.67.0-alpine`, node_exporter `v1.8.2`, cAdvisor `v0.49.1` | Alloy가 `prometheus.scrape`만 함 → **워커는 `/metrics` pull로 노출** |
| CI 러너 | `ubuntu-24.04-arm` (네이티브 arm64) | x86 러너 + QEMU는 5~10배 느림 |
| CI 액션 | `actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`, `aws-actions/amazon-ecr-login@v2` | OIDC 인증 |

### 워커가 고정하는 값

| 항목 | 핀 | 근거 |
| --- | --- | --- |
| 베이스 이미지 | **`mcr.microsoft.com/playwright/python:v1.61.0-noble`** | 인프라 지정. arm64 멀티아키. 브라우저·시스템 라이브러리 포함 |
| Python | **3.14** (uv가 설치) | 인프라 지정. ★ 이미지 내장 Python은 **3.12**다 — 그냥 두면 3.12로 돌아간다 |
| uv | `ghcr.io/astral-sh/uv` — **버전 태그로 pin** (검증본 `0.11.28`) | `:latest`는 재현성을 깬다 |
| Celery | `celery[redis]>=5.6.3` | `[redis]` extra가 kombu의 redis 트랜스포트를 가져온다 |
| Playwright (pip) | **`==1.61.0`** — 베이스 이미지 태그와 **정확히 일치** | 어긋나면 `Executable doesn't exist` |
| prometheus-client | `>=0.21.0` | 인프라 지정 |
| Pydantic | v2 + pydantic-settings | cp314 휠 제공 확인됨 |
| ScrapeGraphAI | 최신 안정 (`>=3.12,<4.0` 허용) | **LLM 파싱 폴백 전용.** 3.14 실동작은 미검증 → 구현 시 확인 |
| `pyproject.toml` | `requires-python = ">=3.14"` | Dockerfile의 `--python 3.14`와 어긋나면 `uv sync`가 거부 |

**인프라가 arm64에서 실제로 빌드해 검증한 조합**: Python `3.14.6` · uv `0.11.28` · Celery `5.6.3` · Chromium `149` 렌더링 + Valkey 연결 후 태스크 처리까지 확인.

> ⚠️ **Celery는 3.14를 공식 분류자에 올리지 않았다.** PyPI 메타데이터상 `celery 5.6.3`의 지원 표기는 3.9~3.13이고 `requires-python`은 `>=3.9`라 설치·실행에 문제는 없다(`billiard`·`kombu`·`vine` 모두 순수 파이썬). 인프라가 실제 구동까지 검증했으나 **"공식 보증"은 없다.** 우리가 기대는 prefork 프로세스 관리(fork·`worker_process_init`·`max_tasks_per_child`)가 정확히 그 취약 지점이므로 **prefork 스모크 테스트를 CI 게이트에 필수로 둔다**(§테스트). 참고로 `playwright 1.61.0`은 3.14 분류자를 명시 선언한다. 또한 **CPython에는 "LTS" 등급이 없다** — 모든 마이너 버전이 동일하게 약 2년 버그픽스 + 3년 보안 패치를 받는다.

### Dockerfile 규격 (인프라 `docs/03_cicd.md` §4-1 준수)

```dockerfile
# arm64 멀티아키 공식 이미지. 브라우저 바이너리는 /ms-playwright에 있고
# 파이썬 버전과 무관하므로, uv로 3.14를 따로 깔아도 그대로 재사용된다.
FROM mcr.microsoft.com/playwright/python:v1.61.0-noble

# uv 바이너리를 공식 이미지에서 복사 (pip으로 uv를 설치할 필요 없음).
# ★ :latest 대신 버전 태그로 pin 할 것 — 빌드 재현성.
COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /usr/local/bin/

WORKDIR /app
# 의존성만 먼저 복사해 레이어 캐시를 살린다 (코드만 바뀌면 재설치 안 함)
COPY pyproject.toml uv.lock ./

# uv가 3.14를 내려받아 그 버전으로 .venv를 만든다. 이미지 내장 3.12는 쓰이지 않는다.
RUN uv python install 3.14 \
 && uv sync --frozen --no-dev --python 3.14

ENV PATH="/app/.venv/bin:$PATH"
COPY . .

# -E: 태스크 이벤트 발행 (Flower가 이걸 읽는다)
CMD ["celery", "-A", "worker.app", "worker", "--loglevel=INFO", "--concurrency=1", "-E"]
```

- ★ **`UV_SYSTEM_PYTHON=1`을 걸지 마라.** 이 구성은 의도적으로 **uv 관리 Python(3.14)** 을 쓴다. 시스템 Python을 강제하면 이미지 내장 3.12로 되돌아간다.
- **이미지는 압축 해제 시 약 4GB다** (브라우저 3종 + 파이썬 2개). 배포마다 t4g.small이 이만큼 pull하므로 `aws ssm wait command-executed`(약 100초 한계)로는 정상 배포를 실패로 오탐한다 — `get-command-invocation` 폴링을 쓴다(§배포 계약). 루트 30GiB를 지키려면 배포 시 `docker image prune`이 필수다.
- (선택) Chromium만 쓰므로 빌드 단계에서 `/ms-playwright`의 firefox·webkit 디렉터리를 지워 이미지를 줄일 수 있다. 인프라 문서가 허용하는 경로다. **삭제 후 Chromium 기동 스모크 테스트로 검증한 뒤에만** 적용한다.
- **브라우저가 필요 없는 요청 기반 워커**(httpx 등)라면 `python:3.14-slim-trixie` 경량 구성으로 약 300MB까지 줄어든다. 단 이 계약의 하이브리드 파싱은 브라우저를 전제하므로 기본 경로가 아니다.

### 런타임 스택

- Celery + **Celery Beat**(스케줄러) — 브로커는 Valkey(Redis 프로토콜)
- Playwright **sync API** 강제 (Celery prefork와 정합)
- 하이브리드 파싱: Locator 직접 파싱(80%) + ScrapeGraphAI LLM 폴백(20%)
- **prometheus_client** pull `/metrics` — OTel SDK/OTLP가 아니다 (§10)
- 태스크 UI: **Flower** (루프백 바인딩 + SSM 터널). `-E` 플래그가 없으면 이벤트가 안 나와 Flower가 빈 화면이 된다

## 인프라 계약 12항 (반드시 준수 — 위반 시 배포·관측이 동작하지 않는다)

1. **아키텍처: linux/arm64 전용.** t4g는 Graviton(ARM64)이다. amd64 이미지를 배포하면 서버에서
   `exec format error`로 컨테이너가 뜨지 않는다. 빌드는 `ubuntu-24.04-arm` **네이티브 러너**에서
   `docker build --platform linux/arm64`로 한다. x86 러너 + QEMU는 5~10배 느리다.
2. **브로커 접속**: 워커 compose는 인프라가 만든 네트워크에 external로 합류한다
   (`name: crawling-infra_crawling-net`). 그러면 호스트명 `valkey`로 직접 닿는다.
   `CELERY_BROKER_URL = redis://:${VALKEY_PASSWORD}@valkey:6379/0`. **6379를 외부에 게시하지 않는다.**
   - **kombu에는 `valkey://` 스킴이 없다.** Valkey는 Redis 프로토콜 호환이므로 `redis://`를 그대로 쓴다.
   - db 0 = 브로커, db 1 = 결과 백엔드(`CELERY_RESULT_BACKEND`). 단 `task_ignore_result=True`가 기본이라 db 1에는 키가 쌓이지 않는다.
3. **큐: Celery 기본 큐 `celery` 하나만 쓴다. 큐 이름을 바꾸지 마라.**
   인프라의 redis_exporter는 `REDIS_EXPORTER_CHECK_KEYS: "celery,unacked,unacked_index"`로
   **딱 이 세 키만 추적**한다. `crawl:<agent>` 같은 커스텀 큐로 라우팅하면 `redis_key_size{key="celery"}`가
   영원히 0이 되어 **`CeleryQueueBacklog`는 절대 울리지 않고 `CeleryQueueIdle`은 계속 오탐**한다.
   - Valkey에 생기는 Celery 키: `celery`(List, 대기) · `unacked`(Hash, 처리 중) · `unacked_index`(ZSet).
   - 에이전트 구분은 **큐가 아니라 태스크 이름과 `site` 라벨**로 한다. 워커가 `--concurrency=1` 단일
     프로세스라 큐를 쪼개도 병렬성 이득이 없다.
   - 데드레터는 워커가 직접 `dead:<agent>` 리스트에 LPUSH한다(소문자 케밥케이스). 이 키는 exporter가
     추적하지 않으므로 알림이 필요하면 인프라에 check-keys 추가를 요청한다.
   - 에이전트별 큐 분리가 정말 필요해지면 **인프라의 `REDIS_EXPORTER_CHECK_KEYS`와 알림 expr 변경이
     선행**되어야 한다. 워커가 먼저 바꾸면 관측이 조용히 죽는다.
4. **태스크 페이로드**(Pydantic 모델 `CrawlJob`): job_id(uuid4, 멱등성 키), agent, url,
   scheduled_at(ISO8601 UTC), retry_count, params(dict, 선택).
5. **Celery 필수 설정** — ①②를 빼먹으면 워커 재시작 한 번에 잡이 사라지고, ③을 빼먹으면 며칠 뒤
   Valkey가 `OOM command not allowed`를 뱉으며 멈춘다(인프라의 `noeviction`·`maxmemory 512mb`와 맞물린다):
   - ① `task_acks_late=True` — **`CeleryUnackedStuck` 알림이 성립하는 전제.** 기본값(False)에서는
     태스크를 받자마자 ack하므로 `unacked`가 거의 항상 0이고, 워커가 처리 도중 죽으면 태스크가 조용히 사라진다.
   - ② `worker_prefetch_multiplier=1` — 기본값(4)은 태스크를 쟁여두므로 워커가 죽으면 쟁여둔 것들이
     visibility_timeout 동안 방치된다.
   - ③ `task_ignore_result=True` — 켜두면 `celery-task-meta-<id>` 키가 `result_expires`(기본 24시간)
     동안 쌓여 512MB maxmemory를 잠식하고, noeviction 때문에 결국 "새 태스크 추가 거부"로 이어진다.
     결과가 꼭 필요하면 `result_expires=3600`처럼 짧게 잡는다.
   - `task_serializer="json"`(pickle 금지), `max_tasks_per_child`(브라우저 누수 차단),
     `broker_transport_options={"visibility_timeout": 3600}`(가장 오래 걸리는 태스크보다 넉넉히 — 짧으면 중복 실행).
   - `-E` 플래그로 태스크 이벤트를 발행한다. 없으면 **Flower가 빈 화면**이 된다.
   - ★ **`--concurrency=1`을 쓴다.** 인프라 `docs/03` 예시 CMD는 `--concurrency=2`지만 같은 문서가
     "브라우저 메모리 때문에 **2 이하** 권장"이라 명시하므로 1은 규격 안이다. 1을 고르는 이유 둘:
     ① 700M 예산에서 Chromium 2개는 페이지당 수백 MB를 쓰는 순간 OOM으로 간다(그 첫 희생자는 Valkey다).
     ② prefork 자식이 둘이면 `worker_process_init`에서 둘 다 9464를 잡으려다 **포트 충돌**한다(§10).
     동시성을 2로 올리려면 ②를 먼저 해결해야 한다.
   - 브로커 URL은 db 0(`/0`). at-least-once이므로 결과 저장은 job_id 기준 upsert(멱등성 필수).
6. **Valkey는 `noeviction`이다.** 메모리가 가득 차면 키를 버리는 대신 **쓰기를 거부**한다
   (큐가 조용히 사라지지 않게 하려는 의도적 설계). 따라서 `apply_async`가 OOM 에러를 던질 수 있다.
   **이 에러를 절대 삼키지 마라** — 잡 유실을 감추게 된다. `evicted_keys`는 항상 0이어야 한다.
7. **메모리 예산: 컨테이너 `deploy.resources.limits.memory: 700M`.**
   근거: 2 GiB − Valkey(768M) − OS/Docker(약 500M) ≈ 700M. Valkey를 굶기면 OOM Killer가
   **Valkey를 먼저 죽이고 큐에 쌓인 잡이 통째로 사라진다.**
   - 브라우저 인스턴스는 태스크당 **1개만**.
   - Docker 기본 `/dev/shm`은 64MB라 Chromium이 크래시한다.
     `chromium.launch(args=["--disable-dev-shm-usage"])`를 쓰거나 compose에 `shm_size: 512m`을 준다.
     (700M 예산에서는 `--disable-dev-shm-usage`가 안전하다)
8. **수명주기**: SIGTERM 시 Celery warm shutdown 기본 동작 유지(커스텀 핸들러로 덮어쓰기 금지).
   compose의 `stop_grace_period` 기본값은 10초라 진행 중인 태스크가 잘린다 —
   **`stop_grace_period: 300s`** 를 명시한다. 단일 태스크는 LLM 폴백 포함 300초 이내 완료.
9. **브라우저**: playwright **sync API**로 `chromium.launch(...)` (로컬 실행).
   태스크 1건당 브라우저/컨텍스트 1개를 열고 **finally로 반드시 닫는다**. 좀비 브라우저는 700M을 즉시 터뜨린다.
   - **왜 Chromium인가** (이미지에는 3종이 다 있지만 런타임엔 하나만 띄운다):
     ① `--disable-dev-shm-usage`가 **Chromium 전용 플래그**다. Docker 기본 `/dev/shm`이 64MB라 이 플래그가 없으면
     크래시하는데, Firefox·WebKit엔 대응 수단이 없어 `shm_size`를 올려야 하고 그만큼 700M 예산을 잃는다.
     ② Anti-Bot 우회 도구(`playwright-stealth` 등)가 Chromium을 겨냥해 만들어져 있다.
     ③ 크롤링 대상 사이트는 Chrome 기준으로 렌더링된다. 크로스 브라우저 검증이 목적이 아니므로 엔진 1개면 충분하다.
   - 다른 엔진으로 바꾸려면 위 세 가지를 먼저 해결해야 한다. 기본값을 임의로 바꾸지 마라.
10. **관측: Prometheus pull 방식.** 인프라의 Grafana Alloy는 `prometheus.scrape`만 하고
    **OTLP 리시버가 없다.** 따라서 워커는 `prometheus_client`로 `/metrics`(포트 **9464**)를 노출한다.
    스크레이프 타깃은 `worker:9464` 하나다.
    - ★ **Celery는 브로커에 실패 큐를 두지 않는다.** 실패한 태스크는 브로커에서 즉시 제거되므로,
      **실패율과 데이터 품질은 워커가 직접 노출하지 않으면 영원히 알 수 없다.** 계측은 선택이 아니다.
    - ★ **prefork는 자식을 fork하므로 포트가 충돌한다.** 모듈 import 시점에 `start_http_server()`를
      호출하면 자식들이 9464를 두고 다툰다. 두 경로 중 하나를 택한다:
      - **권장(prefork + concurrency 1)**: `worker_process_init` 시그널에서 자식이 9464를 연다.
        자식이 하나뿐이라 충돌이 없고, `max_tasks_per_child`로 브라우저 누수를 끊을 수 있다.
        (자식 재활용 순간 짧은 스크레이프 공백이 생긴다 — 정상이다)
      - **대안(solo/threads 풀)**: `worker_ready` 시그널에서 `start_http_server(9464)`.
        단순하지만 `max_tasks_per_child`가 동작하지 않아 Playwright 메모리 누수를 끊지 못한다.
      - concurrency를 2 이상으로 올리면 자식마다 9464를 잡으려 해 **포트 충돌**한다. 그때는
        `PROMETHEUS_MULTIPROC_DIR` + `multiprocess.MultiProcessCollector`로 집계하고 지표 노출을
        별도 프로세스가 맡아야 한다(Alloy의 scrape 타깃은 `worker:9464` 하나뿐이므로 자식별 포트 분리는 답이 아니다).
        지금 계약(concurrency 1)에서는 불필요하다.
    - 메트릭 이름은 **인프라의 알림 규칙(`rules/crawling.yml`의 `crawling_app` 그룹)과 맺은 계약**이다.
      임의로 바꾸면 알림이 조용히 죽는다.

      | 메트릭 | 라벨 | 쓰이는 곳 |
      | --- | --- | --- |
      | `crawl_items_extracted_total` | `site` | 30분간 0 → 셀렉터 붕괴 (`CrawlExtractionZero`, critical) |
      | `crawl_task_total` | `site` | 실패율의 분모 (`CrawlFailureRateHigh`) |
      | `crawl_task_failures_total` | `site`, `reason` | 실패율의 분자 (20% 초과 시 알림) |
      | `crawl_http_status_total` | `site`, `status` | 429 비율 10% 초과 → IP 차단 (`CrawlRateLimited`) |
      | `crawl_task_duration_seconds` | `site` | 태스크 처리 시간 히스토그램 (버킷 0.5~60) |
      | `crawl_parse_fallback_total` | `site` | LLM 폴백 = 셀렉터 수리 신호 (**워커 고유 지표 — 인프라에 알림 추가 요청 대상**) |

    - 인프라의 `prometheus.yml`·`config.alloy`에서 `crawling-worker` 스크레이프 job은 **아직 주석 상태**다.
      워커가 `/metrics`를 노출한 뒤 활성화해야 `crawling_app` 알림 그룹이 동작한다(인프라 요청 사항).
    - 예외 추적(선택): Sentry `CeleryIntegration`을 켜면 태스크 이름·인자가 이벤트에 함께 붙는다.
    - 로그는 구조화 JSON을 stdout으로. compose 로그 로테이션(`max-size: 10m`, `max-file: 3`) 필수.
11. **Dead man's switch (필수)**: 크롤링 장애는 조용하다 — 스케줄러가 죽으면 에러 로그조차 없다.
    잡 성공 시 `HEALTHCHECK_URL`을 ping하고, 실패 시 `${HEALTHCHECK_URL}/fail`을 호출한다
    (Healthchecks.io). 지표보다 먼저 도입해야 할 단 하나의 감시 장치다.
12. **실패 처리**: `autoretry_for` + `retry_backoff`(지수 백오프)로 재시도, 상한 초과 시
    원인(error 필드)을 포함해 `dead:<agent>` 큐로 LPUSH.

### 환경변수 (하드코딩 금지 — `pydantic-settings`로만 주입)

**이름은 인프라 `docs/03_cicd.md` §4-2의 compose 규격과 일치해야 한다.** 임의로 짓지 마라.

| 변수 | 값 | 비고 |
| --- | --- | --- |
| `CELERY_BROKER_URL` | `redis://:${VALKEY_PASSWORD}@valkey:6379/0` | db 0 = 브로커 |
| `CELERY_RESULT_BACKEND` | `redis://:${VALKEY_PASSWORD}@valkey:6379/1` | db 1. `task_ignore_result=True`라 실사용 안 함 |
| `PYTHONUNBUFFERED` | `1` | 로그가 버퍼에 갇히지 않게 (`docker logs` 즉시 확인) |
| `HEALTHCHECK_URL` | Healthchecks.io ping URL | dead man's switch (§11) |
| `METRICS_PORT` | `9464` | Alloy scrape 타깃 |
| (선택) `LLM_API_KEY` · `SENTRY_DSN` | — | ScrapeGraphAI · Sentry(CeleryIntegration) |

`VALKEY_PASSWORD`는 인프라의 `/opt/crawling-infra/.env`에서 가져와 워커의
`/opt/crawling-worker/.env`(권한 600)에 넣는다. compose는 `ECR_REPOSITORY_URL`·`IMAGE_TAG`도 읽는다.

## 배포 계약 (ECR + OIDC + SSM)

- **트리거**: `on: { push: { branches: [main] }, workflow_dispatch: {} }`.
  `workflow_dispatch`는 롤백·재배포에 쓰므로 반드시 함께 넣는다. PR에서는 테스트 게이트만 돌고 배포하지 않는다.
- **레지스트리**: ECR. `${ECR_REPOSITORY_URL}:<git-sha>` 와 `:latest` 두 태그를 push하되,
  **배포가 참조하는 것은 항상 커밋 SHA 태그**다(`.env`의 `IMAGE_TAG`). `latest`는 수동 pull 편의용.
  ECR 수명주기가 최근 10개만 보관하므로 **그보다 오래된 버전으로는 롤백할 수 없다.**
- **인증**: GitHub OIDC. 워크플로에 `permissions: { id-token: write, contents: read }`가 없으면
  역할 assume이 실패한다. `aws-actions/configure-aws-credentials@v4` → `aws-actions/amazon-ecr-login@v2`.
  **AWS 액세스 키를 Secrets에 저장하지 않는다.**
- **배포 방식**: `aws ssm send-command`로 서버에 명령을 보낸다. 서버가 아웃바운드로 명령을 가져가므로
  **인바운드 포트를 열지 않는다. SSH를 쓰지 않는다.** 서버에서 수행: ECR 로그인(인스턴스 프로파일) →
  `.env`의 `IMAGE_TAG`를 이번 SHA로 치환 → `docker compose pull && up -d` → `docker image prune`.
- ★ **배포 결과를 반드시 폴링해 확인한다.** `send-command`의 성공은 "명령을 큐에 넣었다"는 뜻일 뿐이다.
  이 단계가 없으면 배포가 실패해도 워크플로는 초록불이 뜬다.
  `aws ssm get-command-invocation`으로 상태를 직접 폴링하라(10초 간격, 최대 15분).
  **`aws ssm wait command-executed`를 쓰지 마라** — 약 100초 후 포기하므로 **약 4GB** 이미지를
  t4g.small이 pull하는 동안 정상 진행 중인 배포를 실패로 오탐한다.
- **GitHub Variables**(Secrets 아님 — 비밀이 아니다): `AWS_ROLE_ARN`, `ECR_REPOSITORY_URL`, `EC2_INSTANCE_ID`.
- **서버 배치**: `/opt/crawling-worker/`에 워커의 `docker-compose.yml`과 `.env`(600). 최초 1회 수동 배치.
- 워커 compose는 인프라 compose와 **생명주기를 분리**한다. 인프라 저장소에 워커 코드·compose·잡 스키마를 추가하지 않는다.
- `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: true }`로 중복 배포를 막는다.

## 데이터 파싱 전략 (하이브리드 80/20)

- **메인(80%, 안정성)**: Playwright Locator(CSS/XPath)로 DOM 직접 파싱 → 속도·비용 최적화.
- **폴백(20%, 유연성)**: DOM 변경으로 기존 로직이 깨졌을 때만 ScrapeGraphAI(LLM) 호출로 복구.
- 폴백 트리거는 예외(try-except)만이 아니라 **Pydantic 검증 실패**(필수 필드 누락/형식 오류)를
  포함해야 한다 — 셀렉터가 조용히 엉뚱한 값을 반환하는 silent breakage를 잡기 위함.
- LLM 폴백 결과도 동일한 Pydantic 모델(`CrawlResult`)로 검증해 환각을 걸러낸다.
- 폴백 발생 시 `crawl_parse_fallback_total` 메트릭을 반드시 기록한다(폴백 지속 발생 = 셀렉터 수리 신호,
  Grafana Cloud 알림 대상). **LLM 폴백은 임시 복구이지 영구 대체가 아니다.**

## 프로젝트 구조 및 산출물

1. **모노레포 구조**: 공통 패키지(base) + 에이전트별 모듈. 베이스 이미지(공통 런타임: Celery 앱,
   Pydantic 모델, 브라우저 수명주기, Prometheus 계측, 하이브리드 파싱 프레임)를 만들고 에이전트 이미지가
   `FROM`으로 상속하는 2단 구성. 에이전트는 사이트별 셀렉터/파싱 로직만 구현한다.
2. 첫 에이전트 1개를 예시로 완성(대상 사이트는 추후 지정, 우선 example.com 스텁).
3. **Celery Beat 스케줄** 구성(에이전트별 크론). 스케줄 정의는 코드/설정 파일로 버전 관리.
4. **로컬 개발 환경**: docker-compose(Valkey)로 인프라 계약과 동일한 환경변수·네트워크 규격을 재현.
   Valkey는 `maxmemory 512mb` + `noeviction`으로 서버와 동일하게 맞춘다. README에 로컬 실행 절차 문서화.
   로컬이 arm64가 아니면 `--platform linux/arm64` 빌드가 QEMU로 느려질 수 있음을 문서에 명시한다.
5. **테스트**: 파싱 로직 단위 테스트(고정 HTML fixture), 폴백 트리거 테스트, 계약 스키마 테스트.
   - ★ **prefork 스모크 테스트(필수, integration 마커)**: Celery가 3.14를 공식 지원하지 않으므로 **실제 워커를 prefork 풀로 띄워** ①자식 프로세스가 fork되고 ②`worker_process_init`이 발화해 `/metrics`(9464)가 응답하며 ③`max_tasks_per_child` 도달 시 자식이 재활용된 뒤에도 태스크가 계속 처리되는지 확인한다. 이 셋 중 하나라도 깨지면 3.14를 쓸 수 없다는 뜻이므로 즉시 보고하고 3.13으로 내린다.
6. **CI(GitHub Actions)**: pytest·ruff·mypy 게이트 → `ubuntu-24.04-arm` 러너에서 arm64 이미지 빌드
   → ECR push → SSM 배포 → **배포 결과 폴링 확인**을 `needs:` 체인으로 구성한다.
7. **코드 품질**: ruff(lint+format), mypy. 모든 함수 docstring과 주요 로직 인라인 주석은 초보
   개발자가 흐름을 파악할 수 있도록 한국어로 상세히 작성한다.

## 인프라 저장소 요청 사항 (직접 고치지 말고 보고서로 전달)

인프라 저장소는 2026-07-10 Celery(Python) 기준으로 정렬됐다. 남은 접점은 아래뿐이며, 워커 구현 시
발견되는 대로 보고서에 모아 전달한다. **인프라 저장소의 파일을 직접 수정하지 않는다.**

- **워커 `/metrics` 수집 활성화**: `docker/prometheus/prometheus.yml`의 `crawling-worker` job과
  `docker/alloy/config.alloy`의 `prometheus.scrape` 타깃(`worker:9464`)이 아직 주석 상태다.
  이걸 켜야 `rules/crawling.yml`의 `crawling_app` 알림 그룹(`CrawlExtractionZero` 등)이 동작한다.
- **`crawl_parse_fallback_total` 알림 추가**: 워커 고유 지표라 인프라 규칙에 아직 없다.
  폴백이 지속 발생하면 셀렉터 수리 신호이므로 warning 알림을 제안한다.
- **`dead:<agent>` 큐 감시(선택)**: `REDIS_EXPORTER_CHECK_KEYS`에 추가해야 데드레터 적체를 알림으로 잡을 수 있다.
- **에이전트별 큐 분리가 필요해질 때**: `REDIS_EXPORTER_CHECK_KEYS`와 `CeleryQueueBacklog`·`CeleryQueueIdle`의
  expr을 함께 바꿔야 한다. 이 선행 작업 없이 워커만 큐를 바꾸면 관측이 조용히 죽는다.

## 사용 시 조정 포인트

구현 착수 전 아래 항목이 확정되었는지 확인하고, 미확정이면 스텁/플레이스홀더로 명시한다.

| 항목 | 조정 |
| --- | --- |
| AWS 계정·리전·`ECR_REPOSITORY_URL` | 인프라 저장소에서 `tofu output -raw ecr_repository_url`로 확인 |
| `AWS_ROLE_ARN` · `EC2_INSTANCE_ID` | `tofu output`으로 확인해 GitHub Variables에 등록 |
| 첫 에이전트 대상 사이트 | 확정 후 "추후 지정" 부분에 명시 (그 전까지 example.com 스텁) |
| 결과 저장 계층 | 태스크가 DB(upsert)에 직접 적재하는 것이 기본. Celery 결과 백엔드로 돌려받는 방식은 `task_ignore_result=True`와 상충하므로 택하지 않는다 |
| LLM 공급자 | ScrapeGraphAI에 연결할 LLM(API 키 이름 포함) 확정 시 추가 |
| `HEALTHCHECK_URL` | Healthchecks.io Check 생성 후 발급된 ping URL. 미설정이면 dead man's switch 비활성 경고 |

## 트랙 정책 (폐기된 스택)

**2026-07-08**: 배치 트랙(K8s CronJob이 파이프라인 컨테이너를 직접 실행, Instructor 추출 기본)을 폐기하고 워커(MAS) 트랙으로 단일화했다.

**2026-07-10**: 인프라가 `crawling-node-infra`(단일 EC2 + Docker Compose)로 확정되면서
**K3s · KEDA · Browserless · GHCR · ArgoCD GitOps 트랙을 폐기**했다.
과거 습관이 섞이지 않도록 특히 주의할 반전 지점:

| 항목 | 폐기된 가정 | 현행 계약 |
| --- | --- | --- |
| 오케스트레이션 | K3s + KEDA ScaledObject (0~N Pod) | **없음.** 단일 호스트 Docker Compose |
| 동시성 확보 | KEDA Pod 수 | **Celery `--concurrency=1`**, 확장은 인스턴스 scale-up |
| 브라우저 | Browserless 원격 CDP, 이미지에 바이너리 금지 | **이미지 내장** `chromium.launch()` |
| 레지스트리 | GHCR | **ECR** |
| 배포 | cross-repo GitOps PR (`k8s/workers/*.yaml`) | **ECR push → SSM send-command** |
| 관측 | OTel SDK → OTLP gRPC → Collector | **prometheus_client `/metrics` pull** (Alloy scrape) |
| 리소스 계약 | K8s requests 256Mi / limits 512Mi | **compose `limits: 700M`** |
| 아키텍처 | 암묵적 amd64 | **linux/arm64 전용** |

단, **sync API 강제**(Celery prefork 정합)와 **LLM은 폴백 전용**(Locator 직접 파싱이 기본)은 유지된다.
KEDA·Browserless·GitOps 재도입 요청이 오면 폐기 사실을 알리고 현행 계약으로 안내하라.
인프라는 이 저장소가 아니라 **별도 인프라 저장소**가 OpenTofu(`opentofu-infra` 스킬 규약, 1.12.x)로 소유한다.

## 하지 말 것 (금지 규칙)

파이썬 워커 구현·테스트에서 **전부 금지**한다. (근거: `docs/guides/coding.md §8`·`verification.md`의 원칙을 파이썬 스택에 적용)

- **비밀·토큰 하드코딩 금지**: `CELERY_BROKER_URL`·`VALKEY_PASSWORD`·LLM API 키를 코드·이미지·compose에 직접 굽지 않는다 — `pydantic-settings`(환경 변수)로만 주입.
- **`UV_SYSTEM_PYTHON=1` 금지**: 이 구성은 uv 관리 Python 3.14를 쓴다. 시스템 Python을 강제하면 이미지 내장 3.12로 되돌아간다.
- **`:latest` 태그 금지**: 워커 이미지도, `COPY --from=ghcr.io/astral-sh/uv`도 버전으로 pin한다.
- **에러 삼키기 금지**: `except:`·`except Exception: pass`로 예외를 조용히 버리지 않는다 — 재시도→`dead:<agent>` 큐→`crawl_task_failures_total` 경로로 드러낸다. 특히 **Valkey `noeviction` OOM 에러(`OOM command not allowed`)를 삼키면 잡 유실이 은폐된다.**
- **큐 이름 변경 금지**: 기본 큐 `celery`를 벗어나면 인프라의 `CeleryQueueBacklog`·`CeleryQueueIdle`이 죽는다(check-keys 고정).
- **`task_acks_late`·`worker_prefetch_multiplier=1`·`task_ignore_result` 끄기 금지**: 각각 잡 유실·재시작 방치·Valkey OOM으로 직결된다.
- **`maxmemory-policy`를 `allkeys-lru`로 바꾸기 금지**: Celery 공식 문서는 허용하지만 이 프로젝트에선 대기 태스크가 지워진다.
- **`# type: ignore`·`Any` 남발 금지**: mypy를 무의미하게 만들지 않는다.
- **디버그 잔재 금지**: `print()`·주석 처리 코드를 남기지 않는다 — 관측은 구조화 JSON 로그·Prometheus 지표로만.
- **amd64 이미지 push 금지**: `--platform linux/arm64` 없이 빌드하면 서버에서 `exec format error`가 난다.
- **`aws ssm wait command-executed` 금지**: 100초 한계로 정상 배포를 실패로 오탐한다. `get-command-invocation` 폴링을 쓴다.
- **브라우저 close 누락 금지**: 700M 예산에서 좀비 브라우저 하나가 OOM Killer를 부르고, 그 첫 희생자는 Valkey(=큐 전체)다.
- **base 패키지 불필요 수정 금지**: Factory 경량 경로(에이전트 모듈·스케줄·이미지만 추가)를 지키고 공통 런타임을 흔들지 않는다.
- **테스트 위생**: 실패 테스트를 `@pytest.mark.skip`·`xfail`로 덮지 않는다. 검증 대상 파서 자체를 모킹하지 않고 **고정 HTML fixture**로 실제 실행한다(외부 경계인 네트워크·LLM만 모킹). 라이브 사이트 의존 flaky 테스트를 만들지 않는다.
