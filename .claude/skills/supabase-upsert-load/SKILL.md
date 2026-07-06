---
name: supabase-upsert-load
description: 추출한 JSON을 Supabase(PostgreSQL)에 적재할 때 반드시 사용. 크론 반복 실행이 만드는 중복을 고유키 기준 Upsert(insert+update, on_conflict)로 원천 차단하고, 배치 적재·트랜잭션·충돌 처리로 무결성을 보장한다. "적재", "로드", "Upsert", "중복 방지", "on_conflict", "DB 저장", "새 사이트 추가" 작업에서 즉시 로드하라.
---

# Supabase Upsert 적재 하네스

## Why: 크론 중복은 왜 생기고 Upsert가 왜 답인가

스크래핑 파이프라인은 **크론으로 같은 대상을 반복 수집**한다. 단순 `INSERT`로 적재하면 실행할 때마다 **같은 데이터가 새 행으로 쌓여** 중복이 폭증한다. 해결책은 **고유 식별 키 기준 Upsert**다:

- 같은 키가 **없으면 INSERT**, **있으면 UPDATE** → 몇 번을 돌려도 결과가 같다(**멱등성**).
- 이 멱등성이 크론 재실행·수동 재시도·부분 실패 재처리를 안전하게 만든다.

전제: DB에 **유니크 제약**이 있어야 `on_conflict`가 동작한다. 제약이 없으면 Upsert도 중복을 못 막는다 — 제약을 먼저 건다.

## 1. 테이블 — 유니크 제약 먼저

**Why**: `on_conflict`는 유니크 제약(또는 유니크 인덱스)을 기준으로 충돌을 판정한다. 고유 식별 컬럼(예: 원본 URL·외부 ID)에 유니크 제약이 없으면 중복 방지가 성립하지 않는다.

```sql
create table if not exists articles (
  id           bigint generated always as identity primary key,
  source_url   text not null,          -- 고유 식별 키
  title        text not null,
  published_at timestamptz,
  body         text,
  updated_at   timestamptz default now(),
  constraint articles_source_url_key unique (source_url)  -- Upsert 충돌 기준
);
```

- 고유키는 **extraction의 Pydantic 고유 필드와 반드시 일치**시킨다(`source_url` ↔ `on_conflict`).

## 2. Upsert — on_conflict로 중복 흡수

**Why**: Supabase 클라이언트의 `upsert()` + `on_conflict`가 INSERT/UPDATE 분기를 DB 레벨에서 원자적으로 처리한다. 애플리케이션에서 "있나 확인 후 분기"하면 경쟁 상태가 생긴다 — DB에 맡겨라.

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upsert_articles(rows: list[dict]) -> None:
    """고유키(source_url) 기준 Upsert로 중복 없이 적재 (Why: 크론 반복 멱등성)."""
    (supabase.table("articles")
        .upsert(rows, on_conflict="source_url")  # 충돌 시 UPDATE
        .execute())
```

- `on_conflict="source_url"` — 유니크 제약 컬럼명을 지정. 없는 컬럼을 주면 실패한다.
- `ignore_duplicates=False`(기본)로 두면 충돌 시 **UPDATE**(최신값 반영). 갱신 없이 무시하려면 `True`.

## 3. 배치 적재 — 왕복을 줄인다

**Why**: 한 행씩 적재하면 네트워크 왕복·트랜잭션 오버헤드가 수백 배다. 배치로 한 번에 보낸다. 단, 너무 크면 페이로드 한계·타임아웃에 걸리므로 청크로 나눈다.

```python
def batch_upsert(rows: list[dict], chunk_size: int = 500) -> None:
    """대량 행을 청크 단위 배치 Upsert (Why: 왕복·트랜잭션 비용 절감)."""
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        supabase.table("articles").upsert(chunk, on_conflict="source_url").execute()
```

- 청크 크기는 행 크기에 맞춰 조정(수백~수천). 각 청크는 독립적으로 커밋된다.

## 4. 무결성 · 충돌 · 부분 실패

- **부분 실패 격리**: 청크 단위로 실패를 잡아 성공분은 유지하고 실패 청크만 재시도한다. 전체 롤백이 필요한지는 정책으로 결정.
- **필수 필드 방어**: NOT NULL·기본값·CHECK 제약으로 깨진 로우가 들어오지 못하게 막는다.
- **적재 후 검증**: 기대 키 수 대비 실제 행 수를 확인해 누락을 감지한다.
- **updated_at 갱신**: UPDATE 시 `updated_at`을 트리거나 컬럼 기본값으로 자동 갱신해 최신성 추적.

## 5. Factory 확장 — 새 사이트는 테이블·키만 추가

**Why**: 적재 로직(Upsert·배치·충돌 처리)은 사이트가 달라도 동일하다. **공통 적재 함수는 재사용**하고 대상 테이블명과 `on_conflict` 키만 사이트별로 넘긴다.

```python
def load(table: str, rows: list[dict], conflict_key: str, chunk_size: int = 500) -> None:
    """공통 적재기 — 테이블·충돌키만 주입받아 재사용. 신규 사이트는 이 함수를 그대로 호출."""
    for i in range(0, len(rows), chunk_size):
        supabase.table(table).upsert(rows[i:i+chunk_size], on_conflict=conflict_key).execute()

# 신규 사이트 = 테이블·키만 지정. 공통 로직 무수정.
# load("products", product_rows, conflict_key="external_id")
```

## 실행 환경 — uv로 통일

**Why**: 적재 클라이언트(`supabase-py` 등) 버전이 환경마다 갈리면 Upsert 동작·에러 처리가 달라진다. `pip`/`requirements.txt` 대신 `pyproject.toml`에 의존성을 선언하고 `uv.lock`으로 잠가 재현성을 확보한다.

- 런타임 의존성(`supabase`)은 `pyproject.toml`에, 테스트 의존성(pytest)은 `[dependency-groups] dev`에 둔다.
- 설치는 `uv sync`, 적재 스크립트·테스트는 `uv run`으로 실행한다.

## 체크리스트

- [ ] 고유 식별 컬럼에 유니크 제약이 있다
- [ ] `on_conflict` 키가 extraction Pydantic 고유 필드와 일치한다
- [ ] Upsert로 크론 재실행이 멱등하다(중복 행 0)
- [ ] 대량은 청크 배치로 적재하고 부분 실패를 격리한다
- [ ] 신규 사이트가 테이블·키 지정만으로 확장된다

Supabase/PostgreSQL API가 불확실하면 추측하지 말고 **Context7 MCP/공식 문서/Supabase MCP**로 먼저 확인하라.
