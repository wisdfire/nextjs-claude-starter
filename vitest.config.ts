import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Vitest 설정 파일
 * - jsdom 환경에서 React 컴포넌트를 테스트한다.
 * - globals: true 로 describe/it/expect 등을 import 없이 사용한다.
 * - setupFiles: 테스트 시작 전 jest-dom 매처를 전역 등록한다.
 * - alias: tsconfig 의 "@/*" 경로 별칭을 Vitest 에서도 동일하게 해석한다.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // node_modules 와 빌드 산출물은 테스트 대상에서 제외
    exclude: ["node_modules", ".next", "dist"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
