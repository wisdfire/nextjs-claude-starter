---
name: docker-cicd-deploy
description: 스크래핑 파이프라인을 컨테이너화하고 자동 배포·스케줄 실행할 때 반드시 사용. Dockerfile(Playwright 포함) + GitHub Actions(이미지 빌드→레지스트리 push→EC2/K8s 배포) + 쿠버네티스(Deployment/CronJob) + Redis(작업 큐·중복방지 캐시·분산 락) 구성 방법론. "배포", "Docker화", "CI/CD", "CronJob 스케줄", "재배포" 작업에서 즉시 로드하라.
---

# Docker · CI/CD · K8s · Redis 배포 하네스

## Why: 왜 이렇게 배포하는가

스크래핑 파이프라인은 **주기적으로**(크론) 실행되고, **여러 워커가 동시에** 돌 수 있으며, Playwright라는 **무거운 시스템 의존성**을 갖는다. 그래서:

- **Docker** — Playwright 브라우저·시스템 라이브러리를 이미지에 고정해 "내 컴퓨터에선 됐는데"를 없앤다.
- **GitHub Actions** — 코드 push마다 이미지를 빌드·레지스트리에 올리고 서버에 자동 배포해 수동 배포 실수를 없앤다.
- **K8s CronJob** — 스케줄 실행(Trigger)을 선언적으로 관리하고, 실행 시간 상한으로 좀비 잡을 막는다.
- **Redis** — 여러 워커가 같은 URL을 중복 크롤링하거나 동시에 같은 잡을 트리거하는 **경쟁 상태**를 큐·캐시·분산 락으로 막는다.

## 1. Dockerfile — uv + Playwright 멀티스테이지

**규칙**: 패키지 매니저는 **uv로 통일**한다(`pip install`/`requirements.txt` 금지). 의존성은 `pyproject.toml`에 선언하고 `uv.lock`으로 잠근다. Playwright 시스템 의존성은 직접 나열하지 말고 **공식 base 이미지**를 쓰되, uv 바이너리는 공식 uv 이미지에서 **멀티스테이지 COPY**로 가져온다.

**Why(락파일 먼저 COPY)**: 소스 코드는 자주 바뀌지만 의존성은 드물게 바뀐다. `pyproject.toml`·`uv.lock`을 코드보다 **먼저** COPY해 `uv sync` 레이어를 캐시하면, 코드만 고친 재빌드에서 의존성 설치를 건너뛰어 빌드가 빨라진다.

```dockerfile
# 공식 Playwright 이미지 사용 (브라우저·시스템 의존성 내장)
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

# uv 바이너리를 공식 이미지에서 멀티스테이지로 가져온다 (버전 고정 = 재현성)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 락파일을 먼저 COPY → uv sync 레이어를 캐시로 재사용 (Why: 코드만 바뀐 재빌드 가속)
COPY pyproject.toml uv.lock ./
# --frozen: 락파일 그대로 재현 설치(드리프트 차단), --no-dev: 런타임에 dev 의존성 제외
RUN uv sync --frozen --no-dev

# 애플리케이션 코드 복사 (의존성 레이어 뒤 = 캐시 최대화)
COPY . .

# Playwright 브라우저는 uv 환경 안에서 시스템 의존성까지 설치
RUN uv run playwright install --with-deps chromium

# 실행 시간 예산 밖에서 강제 종료되도록 엔트리포인트에서 타임아웃 처리
# uv run: 프로젝트 가상환경으로 실행 (별도 activate 불필요)
ENTRYPOINT ["uv", "run", "python", "-m", "pipeline.run"]
```

- 락파일 → 코드 순으로 COPY해 **레이어 캐시**를 살린다.
- `uv sync --frozen`으로 **`uv.lock`을 그대로 재현** — CI/로컬/프로덕션 의존성 버전이 100% 일치한다.
- 시크릿은 이미지에 굽지 말 것. 런타임 환경변수/Secret으로 주입.

## 2. GitHub Actions — 빌드 → push → 배포

`.github/workflows/deploy.yml`. **트리거 규약**: main 브랜치 push 또는 태그 시 배포. 시크릿은 전부 `secrets.*`.

**Why(게이트 우선)**: 파서가 조용히 깨진 채 배포되면 잘못된 데이터가 DB에 쌓인다. 그래서 **pytest 단위테스트 job이 먼저 통과해야만** 빌드·배포 job이 `needs:`로 이어지게 한다(게이트 상세는 `python-test-ci` 스킬). uv는 `astral-sh/setup-uv`로 설치하고 캐시를 켜 CI 설치 시간을 줄인다.

```yaml
name: build-and-deploy
on:
  push:
    branches: [main]
jobs:
  # 게이트: pytest 단위테스트가 실패하면 이후 job이 전부 막힌다
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true          # uv 캐시로 의존성 설치 가속
      - run: uv sync --frozen          # 락파일 그대로 재현 설치
      # 단위테스트만 게이트 (실제 사이트 접속 integration 테스트는 제외)
      - run: uv run pytest -m "not integration"
  build-push:
    needs: test                        # ← 테스트 통과가 빌드의 전제
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # 레지스트리 로그인 (GHCR 예시. ECR이면 aws-actions/amazon-ecr-login)
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}
      # 빌드 + push (SHA 태그로 롤백 추적 가능)
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      # 방식 A) EC2(Docker): SSH로 접속해 새 이미지 pull & 재기동
      # 방식 B) K8s: kubectl set image 로 롤링 업데이트
      - run: echo "배포 대상에 맞춰 EC2 SSH 또는 kubectl 배포 스텝 배치"
```

- **게이트 체인**: `test`(pytest) → `build-push` → `deploy`. 테스트 실패 시 배포가 원천 차단된다.
- **이미지 태그는 항상 커밋 SHA**로 — 문제 시 이전 SHA로 즉시 롤백.
- EC2 배포: SSH(`appleboy/ssh-action`)로 `docker pull && docker compose up -d`.
- K8s 배포: `kubectl set image deployment/... =:${SHA}` 롤링 업데이트.

## 3. 쿠버네티스 — Deployment + CronJob

**상시 워커**는 Deployment, **주기 스크래핑 트리거**는 CronJob으로 분리한다.

```yaml
# CronJob: 스케줄 트리거 (Trigger 계층)
apiVersion: batch/v1
kind: CronJob
metadata: { name: scrape-trigger }
spec:
  schedule: "0 */6 * * *"          # 6시간마다
  concurrencyPolicy: Forbid         # 이전 잡이 안 끝났으면 중복 실행 금지
  jobTemplate:
    spec:
      activeDeadlineSeconds: 900     # 실행 시간 예산(15분) — 초과 시 강제 종료
      backoffLimit: 2                # 실패 재시도 상한
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: scraper
              image: ghcr.io/ORG/REPO:SHA
              envFrom:
                - secretRef: { name: pipeline-secrets }  # 시크릿 주입
```

- `concurrencyPolicy: Forbid` + `activeDeadlineSeconds`가 **중복·좀비 잡의 1차 방어선**.
- 시크릿(Supabase 키·LLM 키·Proxy 자격증명)은 K8s `Secret` → `envFrom`.

## 4. Redis — 큐 · 중복방지 · 분산 락

**Why**: CronJob이 겹치거나 워커가 병렬이면 같은 URL을 중복 크롤링한다. Redis로 세 가지를 해결한다.

- **작업 큐**: 수집 대상 URL을 리스트에 넣고 워커가 `RPOP`으로 하나씩 소비 → 부하 분산.
- **중복 방지 캐시**: 처리한 고유키를 `SET key 1 EX <ttl>`로 기록, 크롤 전 `EXISTS`로 스킵.
- **분산 락**: `SET lock:<job> <id> NX EX <ttl>` — 획득 성공한 워커만 실행, 실패하면 조용히 종료.

```python
# 분산 락: 동일 잡의 중복 트리거 차단 (Why: CronJob 겹침·수동 재실행 대비)
got_lock = redis.set(f"lock:{job_id}", worker_id, nx=True, ex=900)
if not got_lock:
    return  # 다른 워커가 이미 실행 중 → 즉시 종료
try:
    run_pipeline()
finally:
    redis.delete(f"lock:{job_id}")  # 락은 반드시 해제
```

- 락 TTL은 실행 예산보다 약간 길게 — 워커가 죽어도 TTL로 자동 해제.

## 체크리스트 (배포 완료 판정)

- [ ] Dockerfile이 uv(`uv sync --frozen --no-dev`) 기반이고 Playwright 버전과 일치하며 시크릿을 굽지 않는다
- [ ] Actions가 pytest 게이트(`test` job)를 `needs:`로 앞단에 두고, SHA 태그로 빌드·push하며 롤백 가능하다
- [ ] CronJob에 `activeDeadlineSeconds` + `concurrencyPolicy: Forbid`가 있다
- [ ] 모든 시크릿이 GitHub Secrets / K8s Secret으로만 주입된다
- [ ] Redis 분산 락으로 크론 중복 실행이 차단된다

## 확장 규약 (Factory)

새 타겟 사이트 추가 시 인프라를 재작성하지 말 것. **큐에 넣을 URL 대상과 CronJob 스케줄만 추가**하고 이미지·워크플로·락 로직은 그대로 재사용한다.

라이브러리 API·CLI 사용법이 불확실하면 추측하지 말고 **Context7 MCP/공식 문서**로 먼저 확인하라.
