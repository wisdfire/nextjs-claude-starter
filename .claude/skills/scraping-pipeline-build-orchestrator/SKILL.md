---
name: scraping-pipeline-build-orchestrator
description: 데이터 수집·처리 파이프라인(스크래퍼/크롤러)을 설계·구현·확장할 때 반드시 사용하는 에이전트 팀 오케스트레이터. Trigger→Scraping→Cleaning→Extracting→Load 파이프라인을 4명의 전문 엔지니어(infra·scraper·extraction·loader)에게 분배해 병렬·의존 조율한다. "스크래핑 파이프라인", "크롤러 구현", "데이터 수집 파이프라인", "새 타겟 사이트 추가", "스크래퍼", "Playwright 크롤링", "추출", "적재", "배포", "테스트", "pytest", "uv", "terraform", "인프라 프로비저닝", "CI 게이트", "재실행", "수정", "보완", "다시" 요청 시 즉시 로드하라.
---

# 스크래핑 파이프라인 구축 오케스트레이터 (에이전트 팀 모드)

데이터 수집·처리 파이프라인을 **파이프라인 아키텍처**(Trigger→Scraping→Cleaning→Extracting→Load)와 **Factory 패턴**(공통 모듈 고정 + 사이트별 파싱만 추가)으로 설계·구현한다. 전문 에이전트 4명을 팀으로 묶어 조율한다.

## 실행 모드: 에이전트 팀

TeamCreate로 팀을 만들고 4명의 엔지니어를 병렬·의존 관계로 실행한다. 파이프라인 순서(scraper→extraction→loader)는 의존이고, infra는 병렬로 진행하다 마지막에 통합한다. 팀원끼리 SendMessage로 인계물(HTML shape·JSON 스키마·Upsert 키)을 직접 주고받는다. **모든 Agent/TeamCreate 호출에 `model: "opus"`를 명시**한다.

## 에이전트 구성

| 에이전트 | 파이프라인 단계 | 담당 | 사용 스킬 | 산출물 |
| --- | --- | --- | --- | --- |
| infra-engineer | Trigger · Deploy | uv Dockerfile, GitHub Actions(pytest 게이트→빌드→push→EC2/K8s), K8s Deployment/CronJob, Redis(큐·중복방지·분산락), Terraform 인프라 프로비저닝 | `docker-cicd-deploy`, `python-test-ci`, `terraform-infra` | `_workspace/01_infra_deploy.md` + Docker/워크플로/k8s/terraform |
| scraper-engineer | Scraping | Playwright 렌더링 대기, Anti-Bot(Stealth·딜레이·Proxy), 메모리 close(try/finally), 타임아웃·재시도, BaseScraper Factory, 사이트별 fixture 테스트 | `playwright-scraping`, `python-test-ci` | `_workspace/02_scraper.md` + 스크래퍼 코드·테스트 |
| extraction-engineer | Cleaning · Extracting | BeautifulSoup 정제(토큰 최소화), Instructor+Pydantic 스키마 강제, 사이트별 스키마 Factory, 스키마 검증 테스트 | `html-clean-llm-extract`, `python-test-ci` | `_workspace/03_extraction.md` + 정제·추출 코드·테스트 |
| loader-engineer | Load | Supabase Upsert(고유키 on_conflict), 배치·트랜잭션·무결성, Upsert 멱등성 테스트 | `supabase-upsert-load`, `python-test-ci` | `_workspace/04_loader.md` + 적재 코드·테스트 |

각 에이전트는 자신의 전용 스킬을 먼저 로드하고, 공통으로 `python-test-ci`(pytest 단위테스트·CI 게이트)를 적용한다. infra-engineer는 인프라 프로비저닝 시 `terraform-infra`도 로드한다.

## 워크플로우

### Phase 0: 컨텍스트 확인
- `_workspace/` 존재 여부를 확인한다.
  - **없으면**: 신규 파이프라인 구축 → Phase 1부터 전체 진행.
  - **있으면**: 기존 산출물(01~04)을 읽고 이어서 진행. 수정/보완/재실행 요청이면 해당 에이전트만 재호출.
- **신규 타겟 사이트 추가 요청이면(Factory 경량 경로)**: 인프라·공통 모듈을 재작성하지 말 것. scraper는 BaseScraper 하위 클래스만, extraction은 Pydantic 스키마·셀렉터만, loader는 테이블·Upsert 키만 추가하고, infra는 CronJob 스케줄/큐 대상만 덧붙인다. 공통 파이프라인은 그대로 재사용한다.

### Phase 1: 준비
- 타겟 사이트(URL·구조·동적 여부), 추출 스키마(필드·타입·**고유 식별 키**), 스케줄 주기, 배포 대상(EC2/K8s)을 분석·확정한다.
- **uv 환경을 초기화**한다: `pyproject.toml`(런타임 의존성 + `[dependency-groups] dev`에 pytest·playwright 등)과 `uv.lock`을 만들어 전 팀원이 `uv sync`로 동일 환경을 재현하게 한다.
- 불확실한 라이브러리 API는 Context7 MCP/공식 문서로 확인한다.

### Phase 2: 팀 구성
- TeamCreate로 팀 생성(`model: "opus"`).
- TaskCreate로 작업을 파이프라인 의존 관계로 배치:
  - **의존 체인**: scraper → extraction → loader (인계물이 순서대로 흐름).
  - **병렬**: infra는 다른 셋과 동시에 시작(스켈레톤까지), Phase 4에서 통합.

### Phase 3: 파이프라인 구현 (팀원 자체 조율)
- **scraper → extraction**: scraper가 확보한 **HTML shape(목표 셀렉터·구조)**을 SendMessage로 extraction에 전달해 정제 대상을 좁힌다.
- **extraction → loader**: extraction의 **Pydantic 스키마 필드와 고유 식별 키**를 SendMessage로 loader에 전달해 Upsert `on_conflict` 키와 정합시킨다.
- 각 에이전트는 산출물(`_workspace/0X_*.md` + 코드)을 만들고 팀에 완료를 알린다.

### Phase 3.5: 단위테스트 (구현 직후 검증)
- **각 엔지니어가 담당 모듈의 pytest 단위테스트를 작성·통과**시킨다: scraper는 사이트별 fixture 파서 테스트, extraction은 Pydantic 스키마 검증 테스트, loader는 Upsert 멱등성 테스트. 모두 `python-test-ci` 규약(네트워크 미의존 fixture, `@pytest.mark.integration` 분리)을 따른다.
- 로컬에서 `uv run pytest -m "not integration"`이 통과하는지 각자 확인한 뒤 Phase 4로 넘긴다.

### Phase 4: 통합 · 배포
- (인프라 변경 시 전제) infra-engineer가 **Terraform으로 인프라를 프로비저닝**한다: EC2·보안그룹·K8s·Redis·레지스트리를 `terraform-infra` 규약(remote state+lock, plan→승인→apply)으로 만들고 outputs를 GitHub Actions 시크릿/변수로 넘긴다. 앱 배포는 이 인프라 위에서 GitHub Actions가 담당한다(레이어 분리).
- infra-engineer가 scraper·extraction·loader 코드를 **하나의 uv 기반 Docker 이미지**로 묶는다.
- GitHub Actions 파이프라인을 **pytest 게이트가 통과해야 Docker 빌드·배포가 진행**되도록 `needs:` 체인(`test`→`build-push`→`deploy`)으로 구성한다.
- CronJob 스케줄과 Redis 분산 락으로 크론 중복 실행을 차단하도록 트리거를 마무리한다.

### Phase 5: 정리 및 보고
- **비기능 요구 검증**(아래 검증 항목)을 통과했는지 확인한다.
- `_workspace/` 산출물 목록과 데이터 흐름, 배포·스케줄 요약, 신규 사이트 확장 방법을 보고한다.

## 데이터 흐름

```
[Trigger]            [Scraping]              [Cleaning]           [Extracting]            [Load]
CronJob/Redis  ──►  Playwright 렌더링   ──►  BeautifulSoup     ──►  LLM + Instructor   ──►  Supabase
스케줄·큐·락        완전 HTML 확보          무관 태그 제거        Pydantic 스키마 강제      Upsert(on_conflict)
                    (HTML shape) ─────────► (순수 텍스트) ───────► (구조화 JSON) ─────────► (멱등 적재)
   infra              scraper                extraction            extraction              loader
```

- 핵심 인계: scraper→extraction은 **HTML shape**, extraction→loader는 **JSON 스키마·고유키**.

## 에러 핸들링

- **스크래핑 차단(403/CAPTCHA)**: Stealth 강화 → 딜레이 증가 → Proxy 로테이션 순으로 대응. 반복 시 오케스트레이터에 보고, 대상 범위 축소 검토.
- **타임아웃**: 대기 조건을 핵심 셀렉터로 좁히고 지수 백오프 재시도(상한). CronJob `activeDeadlineSeconds`로 실행 예산 강제.
- **메모리 누수/좀비 브라우저**: 모든 경로에서 브라우저 close(try/finally) 보장. 배치는 context 단위로 정리.
- **적재 충돌/중복**: 유니크 제약 + `on_conflict` Upsert로 흡수. 제약 없으면 마이그레이션 선행. 부분 실패는 청크 격리·재시도.
- **크론 중복 트리거**: Redis 분산 락(SETNX+TTL)으로 동시 실행 차단.

## 테스트 시나리오

- **정상 1 — 신규 사이트 파이프라인 구축**: 타겟 URL 하나로 Trigger→Scraping→Cleaning→Extracting→Load 전 구간을 구축한다. scraper가 HTML shape을 extraction에 넘기고, extraction 스키마 고유키가 loader Upsert 키와 맞고, infra가 Docker화+CronJob으로 스케줄 실행되며, 재실행해도 중복 행이 0(멱등)이어야 통과.
- **에러 1 — 스크래핑 차단/타임아웃**: 타겟이 403/CAPTCHA 또는 느린 응답을 반환하는 상황. Stealth·딜레이·Proxy로 차단을 우회하고, 타임아웃+지수 백오프 재시도로 제한 시간 내 완료하며, 실패해도 브라우저가 close되고 부분 성공분은 적재되어야 통과.

## 검증 항목 (비기능 요구 — 반드시 확인)

- [ ] **메모리 close**: 모든 브라우저/컨텍스트가 try/finally(또는 async with)로 닫힌다
- [ ] **타임아웃·재시도**: 모든 대기에 timeout, 재시도에 상한, CronJob에 실행 예산이 있다
- [ ] **중복 방지**: 유니크 제약 + Upsert로 크론 재실행이 멱등하고, Redis 락으로 중복 트리거가 차단된다
- [ ] **Factory 확장성**: scraper(BaseScraper 상속)·extraction(스키마 등록)·loader(테이블·키)·infra(스케줄만)가 공통 모듈 수정 없이 신규 사이트를 추가할 수 있다
- [ ] **스키마 정합**: scraper HTML shape → extraction 스키마 → loader Upsert 키가 일관된다
- [ ] **시크릿 관리**: Supabase·LLM·Proxy·레지스트리 자격증명이 코드에 하드코딩되지 않는다
- [ ] **pytest 게이트 통과**: `uv run pytest -m "not integration"`가 통과하고, GitHub Actions에서 이 게이트가 Docker 빌드·배포의 `needs:` 전제로 걸려 있다
- [ ] **uv.lock 재현성**: 의존성이 `pyproject.toml`에 선언되고 `uv.lock`으로 잠겨 CI/로컬/프로덕션이 동일 버전을 재현한다
- [ ] **Terraform state 원격 관리**: (인프라 프로비저닝 시) state가 S3 remote backend + lock으로 공유·잠금되고, 인프라 레이어와 앱 배포(GHA) 레이어가 분리돼 있다

## 파일 컨벤션

- 워크스페이스 산출물: `_workspace/{phase}_{agent}_{artifact}.{ext}` (예: `_workspace/02_scraper.md`).
- 의존성: `pyproject.toml` + `uv.lock`. 테스트: `tests/fixtures/<site>/sample.html` + `tests/test_*.py`.
- 배포 설정: `Dockerfile`, `.github/workflows/*.yml`(pytest 게이트 포함), `k8s/*.yaml`. 인프라: `infra/terraform/*.tf`.
