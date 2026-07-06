---
name: html-clean-llm-extract
description: 원본 HTML을 정제하고 LLM으로 구조화 데이터를 추출할 때 반드시 사용. BeautifulSoup4로 script·style·SVG 등 무관 태그를 제거해 순수 텍스트만 남겨 LLM 토큰 비용을 최소화하고, Instructor + Pydantic으로 사전 정의 JSON 스키마 형태로만 반환하도록 강제한다. 사이트별 스키마만 추가하는 Factory 확장 규약 포함. "정제", "클리닝", "LLM 추출", "구조화", "스키마", "Instructor", "Pydantic", "새 사이트 추가" 작업에서 즉시 로드하라.
---

# HTML 정제 · LLM 구조화 추출 하네스

## Why: 두 단계로 나누는 이유

원본 HTML을 통째로 LLM에 넣으면 (1) `<script>`·`<style>`·SVG·인라인 CSS 같은 **노이즈가 토큰의 대부분을 차지해 비용이 폭증**하고, (2) 자유 텍스트로 답하면 **필드가 빠지거나 환각 필드가 섞여** DB에 못 넣는다. 그래서:

- **Cleaning(정제)** — 데이터와 무관한 마크업을 걷어내 순수 텍스트만 남긴다 → 토큰 비용 최소화.
- **Extracting(추출)** — Instructor + Pydantic으로 **스키마 밖 출력을 원천 차단**한다 → 항상 적재 가능한 JSON.

## 1. Cleaning — 토큰 비용을 최소화한다

**Why**: LLM 비용은 입력 토큰에 비례한다. 렌더링용 마크업은 데이터에 기여하지 않으므로 전부 제거한다. scraper가 준 **HTML shape(목표 셀렉터)**로 관심 영역만 잘라내면 토큰이 극적으로 준다.

```python
from bs4 import BeautifulSoup

def clean_html(html: str, target_selector: str | None = None) -> str:
    """렌더링 무관 태그를 제거해 순수 텍스트만 남긴다 (Why: LLM 토큰 비용 최소화).
    target_selector가 있으면 그 영역만 잘라 노이즈를 더 줄인다."""
    soup = BeautifulSoup(html, "html.parser")
    # 데이터와 무관한 태그 통째 제거
    for tag in soup(["script", "style", "svg", "noscript", "iframe", "nav", "footer"]):
        tag.decompose()
    # scraper가 알려준 목표 영역만 선택 (있으면)
    root = soup.select_one(target_selector) if target_selector else soup
    # 텍스트만 추출, 공백 정규화
    return root.get_text(separator="\n", strip=True) if root else ""
```

- 제거 대상: `script`, `style`, `svg`, `noscript`, `iframe`, 주석, 그리고 데이터와 무관한 `nav`/`footer`/광고 컨테이너.
- **관심 영역 우선**: 전체 텍스트보다 목표 셀렉터 안 텍스트만 넘기면 비용·정확도 모두 좋아진다.

## 2. Extracting — 스키마를 강제한다

**Why**: LLM은 그냥 두면 형식이 흔들리고 없는 필드를 지어낸다. **Pydantic 모델로 스키마를 정의**하고 **Instructor로 응답을 그 모델에 바인딩**하면, 검증 실패 시 자동 재요청해 스키마를 만족하는 JSON만 나온다. 환각 필드가 낄 자리가 없다.

```python
import instructor
from pydantic import BaseModel, Field
from openai import OpenAI

class Article(BaseModel):
    """추출 스키마. 각 필드 description이 LLM 추출 정확도를 높인다."""
    source_url: str = Field(description="원본 기사 URL — loader의 Upsert 고유키")
    title: str = Field(description="기사 제목")
    published_at: str | None = Field(default=None, description="발행일 ISO8601, 없으면 null")
    body: str = Field(description="본문 텍스트")

# Instructor로 LLM 클라이언트를 감싸 응답을 Pydantic 모델에 강제 바인딩
client = instructor.from_openai(OpenAI())

def extract(clean_text: str) -> Article:
    """정제 텍스트에서 Article 스키마로만 추출 (Why: 스키마 밖 출력·환각 차단)."""
    return client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=Article,        # 이 모델 형태로만 응답 강제
        max_retries=2,                 # 검증 실패 시 자동 재요청
        temperature=0,                 # 결정성 확보
        messages=[{"role": "user", "content": clean_text}],
    )
```

- `response_model`이 스키마 강제의 핵심. `max_retries`로 검증 실패를 자동 교정.
- **필수 필드에 `Field(description=...)`**를 달아 추출 정확도·일관성을 높인다.
- `temperature=0`으로 같은 입력에 같은 출력.

## 3. 스키마 ↔ Upsert 키 정합

**Why**: loader는 고유키로 Upsert한다. Pydantic 모델의 고유 식별 필드(예: `source_url`)를 loader의 `on_conflict` 키와 **반드시 일치**시켜야 크론 중복이 막힌다. 스키마 확정 시 loader-engineer와 SendMessage로 키를 맞춰라.

## 4. Factory 패턴 — 사이트별 스키마만 추가

**Why**: 사이트가 늘어도 정제·LLM 호출·검증·재시도 로직은 동일하다. **공통 파이프라인은 재사용**하고 사이트마다 다른 것(스키마·목표 셀렉터·프롬프트 힌트)만 등록한다.

```python
# 공통 추출 파이프라인 — 스키마와 셀렉터만 주입받아 재사용
def run_extraction(html: str, schema: type[BaseModel], selector: str | None) -> BaseModel:
    text = clean_html(html, selector)          # 공통 정제
    return client.chat.completions.create(     # 공통 LLM 추출
        model="gpt-4o-mini", response_model=schema,
        max_retries=2, temperature=0,
        messages=[{"role": "user", "content": text}],
    )

# 신규 사이트 추가 = 스키마 + 셀렉터 등록만. 공통 파이프라인은 건드리지 않는다.
SITE_REGISTRY = {
    "news.example.com": (Article, "article.post"),
    # "shop.example.com": (Product, ".product-detail"),  ← 이렇게 한 줄 추가
}
```

- **신규 사이트 추가 = 레지스트리에 (Pydantic 스키마, 셀렉터) 한 줄 추가**. 공통 코드 무수정.

## 실행 환경 — uv로 통일

**Why**: 의존성 버전이 환경마다 갈리면 LLM 클라이언트·Pydantic 동작이 미묘하게 달라진다. `pip`/`requirements.txt` 대신 `pyproject.toml`에 의존성을 선언하고 `uv.lock`으로 잠가 재현성을 확보한다.

- 런타임 의존성(`beautifulsoup4`, `instructor`, `pydantic`, LLM SDK)은 `pyproject.toml`에, 테스트 의존성(pytest)은 `[dependency-groups] dev`에 둔다.
- 설치는 `uv sync`, 실행·스크립트는 `uv run`으로 프로젝트 가상환경에서 돌린다.

## 체크리스트

- [ ] script·style·svg 등 무관 태그가 제거되고 관심 영역만 남는다
- [ ] Pydantic 모델 + Instructor `response_model`로 스키마가 강제된다
- [ ] 고유 식별 필드가 loader Upsert 키와 정합된다
- [ ] 신규 사이트가 레지스트리 한 줄 추가로 확장된다
- [ ] temperature=0 · max_retries로 결정성·검증이 보장된다

LLM/Instructor/Pydantic API가 불확실하면 추측하지 말고 **Context7 MCP/공식 문서**로 먼저 확인하라.
