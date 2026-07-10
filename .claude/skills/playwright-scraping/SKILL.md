---
name: playwright-scraping
description: Playwright로 동적 렌더링 페이지를 스크래핑할 때 반드시 사용. JS 렌더링 완료 대기(networkidle/셀렉터), Anti-Bot 우회(Stealth·랜덤딜레이·Proxy), 메모리 누수 방지(브라우저 close 필수·try/finally), 타임아웃·재시도(제한시간 내 완료), 사이트별 BaseScraper 상속 Factory 구조를 다룬다. "스크래퍼", "크롤러", "Playwright", "동적 페이지", "차단 우회", "새 사이트 추가" 작업에서 즉시 로드하라.
---

# Playwright 동적 스크래핑 하네스

> ⚠️ **크롤링 워커(MAS) 트랙에서 이 스킬을 쓸 때**: 아래 예제는 async API로 쓰여 있지만, 워커는 Celery prefork와의 정합을 위해 **sync API를 강제**한다(`chromium.launch()` / `page.wait_for_selector()`). 브라우저 수명주기·메모리 예산(컨테이너 700M, `--disable-dev-shm-usage`)은 **`celery-crawl-worker` 계약이 우선**한다. 여기서 가져갈 것은 *대기 전략·타임아웃/재시도·Anti-Bot·Factory 구조*이며, API 형태와 리소스 규약이 아니다.

## Why: 왜 각 방어 기법이 필요한가

정적 `requests`로는 JS로 그려지는 콘텐츠를 못 본다. 그래서 실제 브라우저(Playwright)를 띄운다. 하지만 브라우저는 (1) **무겁고 메모리를 먹으며**, (2) **봇으로 탐지·차단되고**, (3) **네트워크가 느리면 무한 대기**한다. 아래 기법들은 각각 이 세 가지 실패를 막기 위한 것이다. 이유를 이해하고 적용하라 — 습관적 복붙이 아니라.

## 1. 완전 렌더링 대기 — 빈 HTML을 막는다

**Why**: 페이지 로드 직후 HTML은 뼈대뿐이고 데이터는 아직 없다. 데이터가 채워질 때까지 기다려야 한다.

- 우선순위: **핵심 셀렉터 대기 > networkidle**. `networkidle`은 광고·트래킹 요청 때문에 영원히 안 끝날 수 있다.
- `page.wait_for_selector("목표 컨테이너")`로 목표 데이터가 DOM에 나타난 시점을 정확히 잡는다.

```python
await page.goto(url, wait_until="domcontentloaded")
# 목표 데이터 컨테이너가 나타날 때까지 대기 (networkidle보다 안정적)
await page.wait_for_selector("main .item-list", timeout=15000)
html = await page.content()  # 완전 렌더링된 HTML 확보
```

## 2. 메모리 누수 방지 — close는 선택이 아니라 필수

**Why**: browser/context/page를 안 닫으면 프로세스마다 브라우저가 쌓여 컨테이너 메모리를 터뜨린다(좀비 브라우저). 예외가 나도 반드시 닫혀야 한다 → **try/finally 또는 async with**.

```python
browser = await playwright.chromium.launch()
try:
    context = await browser.new_context()
    page = await context.new_page()
    # ... 스크래핑 ...
finally:
    await browser.close()   # 예외가 나도 반드시 실행 → 리소스 회수
```

- 배치 처리 시 URL마다 새 **context**를 만들고 닫아 세션 격리 + 메모리 회수를 동시에.
- `async with async_playwright() as p:` 컨텍스트 매니저로 최상위 정리도 보장.

## 3. 타임아웃 · 재시도 — 제한 시간 내 완료

**Why**: 스크래핑은 실행 시간 예산(워커 태스크 300초 등) 안에 끝나야 한다. 느린 요청 하나가 전체를 잡아먹지 않도록 타임아웃을 걸고, 일시적 실패는 재시도로 흡수한다.

- 모든 대기에 명시적 `timeout`. 기본 무한 대기에 의존하지 마라.
- **지수 백오프 재시도**(상한 명시). 무한 재시도는 예산을 초과한다. `tenacity` 같은 라이브러리 우선.

```python
from tenacity import retry, stop_after_attempt, wait_exponential

# 일시적 네트워크 실패를 지수 백오프로 최대 3회 재시도 (Why: 예산 초과 방지)
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20))
async def fetch(page, url):
    await page.goto(url, timeout=20000)
    await page.wait_for_selector("main .item-list", timeout=15000)
    return await page.content()
```

## 4. Anti-Bot 우회 — 차단을 피한다

**Why**: 사이트는 자동화 브라우저를 탐지해 403/CAPTCHA로 막는다. 사람처럼 보이게 만든다. (단, robots.txt·이용약관·법적 범위를 존중하라.)

- **Stealth**: `navigator.webdriver` 제거, 실제 User-Agent·언어·뷰포트 설정. `playwright-stealth` 활용.
- **랜덤 딜레이**: 요청 사이에 `random.uniform(1, 4)`초 지연 — 기계적 등간격 패턴 회피.
- **Proxy 로테이션**: 반복 차단 시 `launch(proxy=...)`로 IP 순환. 세션당 프록시 교체.

```python
context = await browser.new_context(
    user_agent="Mozilla/5.0 ...",       # 실제 브라우저 UA
    locale="ko-KR",
    viewport={"width": 1280, "height": 800},
)
await asyncio.sleep(random.uniform(1, 4))  # 랜덤 딜레이로 봇 패턴 회피
```

## 5. Factory 패턴 — BaseScraper 상속

**Why**: 사이트가 늘 때마다 스크래퍼를 통째로 복붙하면 공통 로직(브라우저 관리·재시도·정리)이 흩어져 유지보수가 무너진다. **공통은 BaseScraper에 한 번만**, 사이트별 차이(URL·대기 셀렉터·페이지네이션)만 하위 클래스에.

```python
class BaseScraper:
    """공통 스크래퍼: 브라우저 수명주기·재시도·정리를 담당. 하위 클래스는 파싱 지점만 오버라이드."""
    async def run(self, url: str) -> str:
        browser = await self._launch()
        try:
            page = await (await browser.new_context()).new_page()
            await self.wait_ready(page, url)   # 사이트별 대기 조건
            return await page.content()
        finally:
            await browser.close()              # 정리는 공통이 보장

    async def wait_ready(self, page, url):     # 하위 클래스가 오버라이드
        raise NotImplementedError

class NewsSiteScraper(BaseScraper):
    """새 사이트: 대기 셀렉터만 지정. 공통 모듈은 건드리지 않는다."""
    async def wait_ready(self, page, url):
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_selector("article.post", timeout=15000)
```

- **신규 사이트 추가 = 하위 클래스 하나 추가**. 공통 BaseScraper는 절대 수정하지 않는다.

## 실행 환경 — uv로 통일

**Why**: `pip`/`requirements.txt`는 설치 버전이 환경마다 갈려 "로컬에선 됐는데"를 만든다. 의존성은 `pyproject.toml`에 선언하고 `uv.lock`으로 잠가 재현성을 확보한다.

- 런타임 의존성(`playwright`, `playwright-stealth`, `tenacity` 등)은 `pyproject.toml`에, 개발 의존성(pytest 등)은 `[dependency-groups] dev`에 둔다.
- 설치는 `uv sync`, 실행은 `uv run python -m ...`. 브라우저 바이너리는 `uv run playwright install --with-deps chromium`으로 uv 환경 안에 설치한다.

## 책임 경계

이 스킬의 산출물은 **완전 렌더링된 원본 HTML + HTML shape(목표 셀렉터·구조)** 다. 그 HTML을 구조화 데이터로 바꾸는 일(파싱·검증·LLM 폴백)은 **워커의 하이브리드 파싱 프레임**이 맡는다 — `celery-crawl-worker` 계약의 "데이터 파싱 전략(80/20)"을 따르고, 결과는 `CrawlResult` Pydantic 모델로 검증한다.

## 체크리스트

- [ ] 모든 브라우저가 try/finally(또는 async with)로 닫힌다
- [ ] 모든 대기에 명시적 timeout이 있고 재시도 상한이 있다
- [ ] Stealth·랜덤 딜레이가 적용되고, 차단 시 Proxy 대안이 있다
- [ ] 신규 사이트가 BaseScraper 상속으로만 추가된다
- [ ] HTML shape을 extraction에 전달할 준비가 됐다

Playwright API가 불확실하면 추측하지 말고 **Context7 MCP/공식 문서**로 먼저 확인하라.
