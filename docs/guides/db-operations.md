# DB 운영 — 배포 시 스키마 반영 절차

> `git push` → Vercel 자동 배포 환경에서 **DDL(스키마 변경)이 포함된 배포**를 안전하게 반영하는 표준 절차.
> 이 문서는 규칙이다. 프로토타이핑 중에는 A-5만 보면 된다.

## 왜 절차가 필요한가

Vercel은 `git push`에 반응해 코드를 자동 배포하지만 **DB는 아무도 자동으로 옮겨 주지 않는다.**
그래서 코드와 스키마가 어긋나는 순간이 생기고, 그 순간은 **배포가 성공한 것처럼 보인다.**

## A-1. 원칙

1. **DB 먼저, 코드 나중** — 마이그레이션을 먼저 적용하고 코드를 배포한다.
   따라서 모든 DDL은 **직전 버전 코드와 호환**(backward-compatible)이어야 한다.
2. **`db:push`는 로컬 프로토타이핑 전용** — 운영 DB에는 반드시
   `db:generate`(SQL 파일 생성) → 리뷰 → `db:migrate` 경로만 쓴다.
   마이그레이션 SQL은 **코드와 같은 PR에 커밋**한다(리뷰 대상이다).
3. **마이그레이션은 항상 `DIRECT_URL`로** — pooled URL(PgBouncer transaction 모드)로 DDL을
   흘리지 않는다. `drizzle.config.ts`가 이미 `DIRECT_URL`을 쓰도록 되어 있다.
   **`DIRECT_URL`은 로컬 전용** — Vercel에는 `DATABASE_URL`(pooled)만 등록한다.
4. **다른 저장소가 같은 테이블을 쓴다면 양쪽을 동시에 리뷰한다** — 수집 잡(별도 저장소)이
   이 DB에 적재하는 구조라면, 그 잡이 의존하는 **컬럼·UNIQUE 제약**을 바꿀 때 반드시
   그쪽 영향 검토를 **먼저** 한다. 잡의 `ON CONFLICT`가 사라진 제약을 가리키면 런타임에 터진다.

## A-2. 표준 배포 절차 (DDL 포함 시)

```text
① 스키마 수정 (lib/db/schema.ts)
② npm run db:generate          # 마이그레이션 SQL 생성 → 내용 리뷰
③ 브랜치 DB에서 검증            # Neon 브랜치 활용: 아래 A-4
④ PR에 코드 + 마이그레이션 SQL 함께 커밋
⑤ npm run db:migrate           # 운영 Neon에 적용 (DIRECT_URL) — 배포 전 수동 실행
⑥ git push → Vercel 자동 배포
⑦ 이상 시: Vercel 즉시 롤백(코드) + Neon instant restore(데이터)
```

## A-3. 파괴적 변경(컬럼 삭제·이름 변경·타입 축소)은 2단계 배포

```text
배포 1: 새 컬럼 추가(nullable) → 코드가 신·구 컬럼 모두 기록 → 백필
배포 2: 코드가 새 컬럼만 사용 → 관찰 기간 후 구 컬럼 DROP (별도 마이그레이션)
```

한 번의 배포로 "컬럼 rename + 코드 교체"를 동시에 하지 않는다 — 마이그레이션 적용(⑤)과
코드 반영(⑥) **사이에 구 코드가 새 스키마를 만나는 순간이 반드시 존재한다.**

## A-4. Neon 브랜치로 안전하게 검증한다

Neon의 브랜치는 **copy-on-write 복제본**이라 즉시 만들어지고 운영 데이터를 건드리지 않는다.
위험한 마이그레이션은 브랜치에서 먼저 돌려 본다.

```bash
neon branches create --name test-migration          # 운영 데이터 복제본(즉시)
neon connection-string --branch test-migration      # 그 브랜치의 DIRECT_URL
# → DIRECT_URL을 잠시 바꿔 db:migrate 후 확인
neon branches delete test-migration                 # 정리
```

## A-5. DDL 없는 일반 배포

마이그레이션 파일이 없는 PR은 그냥 `git push` — DB 절차 불필요.
**판별 기준: PR diff에 `drizzle/*.sql` 신규 파일이 있는가.**

## A-6. 프로토타이핑 (아직 배포 전)

운영 DB가 없는 단계에서는 `npm run db:push`로 스키마를 바로 밀어도 된다.
**단, 첫 배포 이후로는 A-2 경로만 쓴다** — `db:push`는 마이그레이션 이력을 남기지 않아
"지금 DB가 어떤 상태인지"를 코드에서 알 수 없게 만든다.
