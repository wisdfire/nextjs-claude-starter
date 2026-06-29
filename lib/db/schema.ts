import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * 데이터베이스 스키마 정의
 *
 * 여기에 테이블을 선언하면 `npm run db:generate`로 마이그레이션 SQL을 만들고
 * `npm run db:migrate`(또는 개발용 `npm run db:push`)로 DB에 반영한다.
 *
 * 아래 `example` 테이블은 사용 예시이자 플레이스홀더다.
 * 실제 도메인 테이블을 추가한 뒤 필요 없으면 삭제해도 된다.
 */
export const example = pgTable("example", {
  // 기본 키 (Postgres gen_random_uuid()로 서버에서 자동 생성)
  id: uuid("id").primaryKey().defaultRandom(),
  // 예시 텍스트 컬럼
  name: text("name").notNull(),
  // 생성 시각 (타임존 포함, 기본값은 현재 시각)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 조회/삽입 시 사용할 추론 타입 (선택적으로 활용)
export type Example = typeof example.$inferSelect;
export type NewExample = typeof example.$inferInsert;
