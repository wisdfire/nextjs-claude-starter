---
name: python-test-ci
description: 스크래핑 파이프라인 파이썬 로직을 pytest로 검증하고 CI 게이트를 걸 때 반드시 사용. 파서/추출 단위테스트, 고정 HTML fixture, Pydantic 스키마 검증, GitHub Actions pytest 게이트(통과해야 Docker 배포)를 다룬다. "테스트", "pytest", "검증", "fixture", "CI 게이트", "회귀 방지", "새 사이트 추가" 요청 시 즉시 로드하라.
---

# 파이썬 테스트 · CI 게이트 하네스

## Why: 왜 스크래핑에 테스트가 필수인가

스크래핑 파이프라인의 진짜 위험은 코드가 죽는 게 아니라 **조용히 잘못된 데이터를 뱉는 것(silent failure)**이다. 타겟 사이트가 DOM 구조를 바꾸면 파서의 셀렉터가 빗나가 **예외 없이 빈 값·엉뚱한 값**이 추출되고, 그대로 DB에 쌓인다. 크론으로 자동 실행되므로 아무도 모르는 사이 오염이 누적된다.

**해결책은 고정 HTML fixture로 파서를 봉인하는 것**이다. 실제 사이트의 렌더링 결과를 스냅샷으로 저장해 두고, 파서가 그 스냅샷에서 기대 필드를 정확히 뽑는지 매 배포 전에 검증한다. 사이트가 바뀌어 파서가 깨지면 **fixture 테스트가 먼저 실패**해 배포를 막는다 — 오염된 데이터가 DB에 닿기 전에.

## 1. 테스트 구조 — 사이트별 fixture + 파서 테스트

**Why**: 파이프라인은 사이트마다 파서가 다르다(Factory 확장). 테스트도 사이트별로 두어야 어느 사이트가 깨졌는지 즉시 드러난다.

```
tests/
  fixtures/
    news_example/
      sample.html          # 실제 렌더링 HTML 스냅샷 (scraper 결과 저장)
    shop_example/
      sample.html
  test_news_example_parser.py
  test_shop_example_parser.py
  test_schemas.py          # Pydantic 스키마 검증 모음
  conftest.py              # fixture 로더 등 공통
```

- **fixture는 실제 렌더링 HTML**이다. Playwright로 확보한 완전 HTML을 저장해 두어야 실전과 같은 조건을 재현한다(정적 뼈대 HTML 금지).
- **BaseScraper Factory에 사이트를 추가하면, 그 사이트의 fixture와 파서 테스트도 함께 추가**한다. 이것이 회귀 방지의 핵심 규약이다.

```python
# conftest.py — fixture HTML을 읽어오는 공통 로더
from pathlib import Path
import pytest

FIXTURES = Path(__file__).parent / "fixtures"

@pytest.fixture
def load_html():
    """지정한 사이트의 고정 HTML 스냅샷을 문자열로 반환한다 (Why: 네트워크 없이 결정적 테스트)."""
    def _load(site: str) -> str:
        return (FIXTURES / site / "sample.html").read_text(encoding="utf-8")
    return _load
```

```python
# test_news_example_parser.py — 파서가 fixture에서 기대 필드를 정확히 뽑는지 봉인
from pipeline.extraction import clean_html   # 정제 함수 (사이트별 셀렉터 적용)

def test_news_parser_extracts_title(load_html):
    """뉴스 사이트 파서가 제목을 정확히 추출하는지 검증 (사이트 DOM 변경 시 여기서 먼저 깨진다)."""
    html = load_html("news_example")
    text = clean_html(html, "article.post")
    # fixture 스냅샷에 실재하는 기대값으로 봉인
    assert "예상 기사 제목" in text
    assert "<script>" not in text          # 노이즈 태그가 제거됐는지도 확인
```

## 2. Pydantic 스키마 검증 테스트

**Why**: extraction은 결과를 Pydantic 모델에 강제 바인딩한다. 그 모델이 **필수 필드 누락·타입 오류를 실제로 걸러내는지**를 테스트로 못 박아야, 스키마를 잘못 느슨하게 바꿨을 때 바로 잡힌다.

```python
# test_schemas.py
import pytest
from pydantic import ValidationError
from pipeline.schemas import Article

def test_article_accepts_valid_payload():
    """정상 페이로드가 스키마를 통과하는지 확인."""
    a = Article(source_url="https://x.com/1", title="제목", body="본문")
    assert a.source_url == "https://x.com/1"

def test_article_rejects_missing_required_field():
    """필수 필드(source_url) 누락 시 ValidationError로 막히는지 확인 (Why: 깨진 로우 차단)."""
    with pytest.raises(ValidationError):
        Article(title="제목", body="본문")   # source_url 없음
```

## 3. 네트워크 미의존 원칙 — 단위테스트는 fixture만

**Why**: 단위테스트가 실제 사이트에 접속하면 (1) 느리고, (2) 사이트 상태·네트워크에 따라 **결과가 흔들려**(flaky) CI를 신뢰할 수 없게 된다. 단위테스트는 **고정 fixture만** 사용해 빠르고 결정적으로 유지한다.

- 실제 Playwright 접속·엔드투엔드 검증은 필요하지만, 이는 **integration 테스트로 분리**하고 마킹한다.
- CI 게이트에서는 **단위테스트만 필수**로 돌린다(integration은 별도 스케줄/수동).

```python
# pyproject.toml 의 pytest 설정에 마커를 등록해 두고
# [tool.pytest.ini_options]
# markers = ["integration: 실제 사이트 접속이 필요한 느린 테스트"]

import pytest

@pytest.mark.integration   # 이 마커가 붙은 테스트는 게이트에서 제외된다
def test_live_site_reachable():
    """실제 타겟 사이트에 접속되는지 확인 (게이트 제외, 별도 실행)."""
    ...
```

## 4. CI 게이트 — pytest 통과해야 배포

**Why**: 테스트가 있어도 배포를 막지 못하면 무의미하다. GitHub Actions에서 **pytest job이 통과해야만** Docker 빌드→배포 job이 `needs:`로 이어지게 해, 파서가 깨진 채로는 배포가 불가능하게 한다.

```yaml
jobs:
  test:                                # 게이트 job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with: { enable-cache: true }
      - run: uv sync --frozen           # 락파일 그대로 재현 설치
      - run: uv run ruff check .        # 린트 게이트 (통과해야 build-push로 진행)
      - run: uv run mypy .              # 타입 체크 게이트
      # 단위테스트만 게이트 (실제 접속 integration 제외 → 빠르고 결정적)
      - run: uv run pytest -m "not integration"
  build-push:
    needs: test                         # ← 테스트 통과가 빌드·배포의 전제
    # ★ arm64 네이티브 러너. 대상 서버가 Graviton(t4g)이므로 아키텍처를 맞춘다.
    #   x86 러너 + QEMU는 5~10배 느리고, 틀리면 서버에서 exec format error가 난다.
    runs-on: ubuntu-24.04-arm
    steps: [ ... arm64 이미지 빌드 → ECR push → SSM 배포 ... ]
```

- `uv run pytest -m "not integration"` 실패 시 `build-push`가 실행되지 않아 **배포가 차단**된다.
- 테스트 잡은 `ubuntu-latest`로 충분하지만, **빌드 잡은 반드시 `ubuntu-24.04-arm`** 이어야 한다.
- 배포 파이프라인 전체 구성은 워커 트랙 계약(`celery-crawl-worker` 스킬: arm64 빌드→ECR push→SSM send-command→**결과 폴링 확인**)과 정합한다(같은 `needs:` 체인 — pytest 통과가 빌드·push의 전제).

## 5. fixture 갱신 규약 — 테스트를 무력화하지 말 것

**Why**: 사이트 구조가 바뀌어 fixture 테스트가 깨지면, 그 실패는 **"파서를 고쳐라"는 신호**다. 테스트를 지우거나 assert를 느슨하게 풀어 통과시키면 silent failure 방어가 사라진다.

- 올바른 대응: (1) 새 렌더링 HTML로 **fixture 스냅샷을 갱신**하고, (2) 그에 맞게 **파서 셀렉터를 수정**한 뒤, (3) 테스트가 새 기대값으로 통과하게 만든다.
- fixture 갱신은 아래 헬퍼로 자동화한다.

## 스크립트 번들 — fixture 캡처 헬퍼

반복되는 fixture 캡처는 `scripts/capture_fixture.py`로 묶어 둔다. Playwright로 타겟 URL의 완전 렌더링 HTML을 `tests/fixtures/<site>/sample.html`에 저장한다.

```bash
# 새 사이트 fixture 캡처 (예)
uv run python .claude/skills/python-test-ci/scripts/capture_fixture.py \
  --url https://news.example.com/article/1 \
  --site news_example \
  --wait "article.post"
```

## 체크리스트

- [ ] 사이트별 `tests/fixtures/<site>/sample.html`(실제 렌더링 스냅샷) + `test_<site>_parser.py`가 있다
- [ ] Pydantic 스키마의 필수 필드 누락·타입 오류를 잡는 테스트가 있다
- [ ] 단위테스트는 네트워크 없이 fixture만 쓰고, 실제 접속은 `@pytest.mark.integration`으로 분리된다
- [ ] CI에서 `uv run pytest -m "not integration"` 통과가 Docker 빌드·배포의 `needs:` 전제다
- [ ] 새 사이트를 Factory에 추가할 때 fixture·파서 테스트도 함께 추가된다
- [ ] 테스트가 깨지면 fixture·파서를 고치지, 테스트를 무력화하지 않는다

pytest/Playwright API가 불확실하면 추측하지 말고 **Context7 MCP/공식 문서**로 먼저 확인하라.
