import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

/**
 * drizzle-kit 설정 파일
 *
 * drizzle-kit(generate·migrate·push·studio)는 Next.js 런타임 밖에서 실행되므로
 * `.env.local`을 자동으로 읽지 못한다. 그래서 Next.js가 내부적으로 쓰는
 * `@next/env`의 `loadEnvConfig`로 동일한 우선순위(.env.local > .env)로 환경 변수를 직접 로드한다.
 *
 * 필요 환경 변수: DATABASE_URL (Supabase Postgres 연결 문자열)
 */

// 프로젝트 루트(process.cwd()) 기준으로 .env* 파일을 로드한다.
loadEnvConfig(process.cwd());

export default defineConfig({
  // Postgres(Supabase) 사용
  dialect: "postgresql",
  // 테이블/관계를 정의하는 스키마 파일 위치
  schema: "./lib/db/schema.ts",
  // 생성된 마이그레이션 SQL이 저장되는 디렉토리
  out: "./drizzle",
  dbCredentials: {
    // Supabase 대시보드 > Project Settings > Database > Connection string 에서 복사한 값
    url: process.env.DATABASE_URL!,
  },
  // 마이그레이션/diff 로그를 자세히 출력
  verbose: true,
  // 위험한 작업(데이터 손실 가능) 전 확인 프롬프트
  strict: true,
});
