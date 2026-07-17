import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle ORM 데이터베이스 클라이언트 (서버 전용)
 *
 * Neon Postgres에 postgres-js 드라이버로 연결한 뒤 Drizzle 인스턴스를 만든다.
 * 서버 컴포넌트 · 라우트 핸들러 · 서버 액션에서만 import 한다. (클라이언트 컴포넌트 금지)
 *
 * ★ DB는 외부에 노출되지 않는다 — 브라우저가 DB에 직접 붙는 경로가 없다.
 *   모든 접근은 이 파일을 거치는 **서버 사이드 단일 경로**이고, 공개 데이터는
 *   서버에서 읽어 ISR로 내보낸다. 그래서 RLS 같은 행 수준 방어가 필요 없다.
 *   ⚠️ 뒤집어 말하면, "무엇을 공개할지"를 걸러 줄 계층이 DB에 없다 —
 *   **공개 조건은 쿼리(where 절)가 책임진다.** 이 파일을 클라이언트 컴포넌트에서
 *   import 하는 순간 그 전제가 깨진다.
 *
 * 사용 예:
 *   import { db } from "@/lib/db";
 *   const rows = await db.select().from(schema.example);
 */

// DATABASE_URL은 Neon의 pooled 연결 문자열(호스트명에 `-pooler`).
// Next.js가 .env.local을 자동 로드한다.
// ※ 마이그레이션은 이 URL이 아니라 DIRECT_URL을 쓴다(drizzle.config.ts 참조).
const connectionString = process.env.DATABASE_URL;

// 환경 변수가 없으면 조용히 실패하지 않도록 즉시 에러를 던진다.
// (조용히 빈 결과를 돌려주면 운영에서 빈 화면이 뜨고도 아무도 모른다.)
if (!connectionString) {
  throw new Error(
    "DATABASE_URL 환경 변수가 설정되지 않았습니다. .env.local 을 확인하세요.",
  );
}

/**
 * postgres-js 클라이언트
 *
 * Neon의 pooled 엔드포인트는 PgBouncer의 transaction 모드로 동작한다.
 * 이 모드에서는 커넥션이 트랜잭션 단위로 재사용되므로 세션에 묶이는
 * prepared statement를 쓰지 않도록 `prepare: false`로 비활성화한다.
 * (Neon의 PgBouncer는 프로토콜 레벨 prepared statement를 지원해 필수는 아니지만,
 *  풀러를 거치는 구성에서 안전한 기본값으로 유지한다.)
 */
const client = postgres(connectionString, { prepare: false });

// 스키마를 함께 전달하면 db.query.* 관계형 쿼리 API를 사용할 수 있다.
export const db = drizzle({ client, schema });

// 스키마를 재노출해 호출부에서 한 곳에서 import 할 수 있게 한다.
export * from "./schema";
