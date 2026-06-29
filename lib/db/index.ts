import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle ORM 데이터베이스 클라이언트 (서버 전용)
 *
 * Supabase Postgres에 postgres-js 드라이버로 연결한 뒤 Drizzle 인스턴스를 만든다.
 * 서버 컴포넌트 · 라우트 핸들러 · 서버 액션에서만 import 한다. (클라이언트 컴포넌트 금지)
 *
 * 사용 예:
 *   import { db } from "@/lib/db";
 *   const rows = await db.select().from(schema.example);
 */

// DATABASE_URL은 Supabase 연결 문자열. Next.js가 .env.local을 자동 로드한다.
const connectionString = process.env.DATABASE_URL;

// 환경 변수가 없으면 조용히 실패하지 않도록 즉시 에러를 던진다.
if (!connectionString) {
  throw new Error(
    "DATABASE_URL 환경 변수가 설정되지 않았습니다. .env.local 을 확인하세요.",
  );
}

/**
 * postgres-js 클라이언트
 *
 * Supabase 커넥션 풀러(포트 6543, Transaction pool 모드)를 쓰는 경우
 * prepared statement를 지원하지 않으므로 `prepare: false`로 비활성화한다.
 * (직접 연결(포트 5432)만 쓴다면 이 옵션은 없어도 무방하다.)
 */
const client = postgres(connectionString, { prepare: false });

// 스키마를 함께 전달하면 db.query.* 관계형 쿼리 API를 사용할 수 있다.
export const db = drizzle({ client, schema });

// 스키마를 재노출해 호출부에서 한 곳에서 import 할 수 있게 한다.
export * from "./schema";
