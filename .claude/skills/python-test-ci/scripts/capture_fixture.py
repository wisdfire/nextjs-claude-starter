"""타겟 사이트의 완전 렌더링 HTML을 pytest fixture로 저장하는 헬퍼.

Why: 단위테스트는 실제 사이트에 접속하지 않고 '고정된 HTML 스냅샷'만으로 파서를 검증한다.
그 스냅샷을 손으로 저장하면 실수가 잦으므로, Playwright로 렌더링을 끝까지 기다린 뒤
tests/fixtures/<site>/sample.html 에 저장하는 과정을 이 스크립트로 자동화한다.

사용 예:
  uv run python capture_fixture.py --url https://news.example.com/a/1 --site news_example --wait "article.post"
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


async def capture(url: str, site: str, wait_selector: str | None, out_root: Path) -> Path:
    """지정 URL을 렌더링해 완전 HTML을 fixture 파일로 저장한다.

    매개변수:
        url          - 캡처할 타겟 페이지 URL
        site          - fixture를 담을 사이트 폴더명(tests/fixtures/<site>/)
        wait_selector - 렌더링 완료를 판정할 핵심 셀렉터(없으면 domcontentloaded까지만 대기)
        out_root      - fixtures 루트 경로(기본 tests/fixtures)
    반환값:
        저장된 sample.html의 경로
    """
    # 사이트별 fixture 디렉토리 준비 (없으면 생성)
    out_dir = out_root / site
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "sample.html"

    async with async_playwright() as p:
        # 브라우저 기동 → 예외가 나도 async with가 정리를 보장한다(좀비 브라우저 방지)
        browser = await p.chromium.launch()
        try:
            page = await (await browser.new_context()).new_page()
            # 1) 먼저 DOM 로드까지 이동
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            # 2) 핵심 셀렉터가 지정되면 그것이 나타날 때까지 대기(실전 파서와 같은 조건 재현)
            if wait_selector:
                await page.wait_for_selector(wait_selector, timeout=15000)
            # 3) 완전 렌더링된 HTML 확보 후 파일로 저장
            html = await page.content()
            out_file.write_text(html, encoding="utf-8")
        finally:
            await browser.close()  # 리소스는 반드시 회수

    return out_file


def main() -> None:
    """CLI 인자를 파싱해 캡처를 실행하고 저장 경로를 출력한다."""
    parser = argparse.ArgumentParser(description="Playwright로 타겟 HTML을 fixture로 저장")
    parser.add_argument("--url", required=True, help="캡처할 타겟 페이지 URL")
    parser.add_argument("--site", required=True, help="fixture 사이트 폴더명")
    parser.add_argument("--wait", default=None, help="렌더링 완료 판정 셀렉터(선택)")
    parser.add_argument(
        "--out",
        default="tests/fixtures",
        help="fixtures 루트 경로(기본: tests/fixtures)",
    )
    args = parser.parse_args()

    saved = asyncio.run(capture(args.url, args.site, args.wait, Path(args.out)))
    print(f"fixture 저장 완료: {saved}")


if __name__ == "__main__":
    main()
