import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

/**
 * drizzle-kit 설정 파일
 *
 * drizzle-kit(generate·migrate·push·studio)는 Next.js 런타임 밖에서 실행되므로
 * `.env.local`을 자동으로 읽지 못한다. 그래서 Next.js가 내부적으로 쓰는
 * `@next/env`의 `loadEnvConfig`로 동일한 우선순위(.env.local > .env)로 환경 변수를 직접 로드한다.
 *
 * ★ 필요 환경 변수: **DIRECT_URL** (Neon 직결 — `-pooler` 없는 쪽)
 *   앱 런타임의 `DATABASE_URL`(pooled)이 아니다. DDL은 풀러를 거치면 오류가 날 수 있어 분리한다.
 *   `DIRECT_URL`은 **로컬 전용**이다 — Vercel 등 배포 환경에는 등록하지 않는다.
 *   (마이그레이션은 배포 파이프라인이 아니라 사람이 로컬에서 돌린다 — docs/guides/db-operations.md)
 */

// 프로젝트 루트(process.cwd()) 기준으로 .env* 파일을 로드한다.
loadEnvConfig(process.cwd());

export default defineConfig({
  // Neon Postgres 사용
  dialect: "postgresql",
  // 테이블/관계를 정의하는 스키마 파일 위치
  schema: "./lib/db/schema.ts",
  // 생성된 마이그레이션 SQL이 저장되는 디렉토리
  out: "./drizzle",
  dbCredentials: {
    // ★ 직결(DIRECT_URL) — pooled(DATABASE_URL)이 아니다. 위 독스트링 참조.
    url: process.env.DIRECT_URL!,
  },
  // 마이그레이션/diff 로그를 자세히 출력
  verbose: true,
  // 위험한 작업(데이터 손실 가능) 전 확인 프롬프트
  strict: true,
});
