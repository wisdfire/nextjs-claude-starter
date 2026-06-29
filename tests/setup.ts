/**
 * Vitest 전역 셋업 파일
 * - @testing-library/jest-dom 의 커스텀 매처(toBeInTheDocument 등)를 전역 등록한다.
 * - 각 테스트가 끝날 때마다 렌더링된 DOM 을 정리하여 테스트 간 간섭을 방지한다.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 모든 테스트 종료 후 React Testing Library 가 렌더한 DOM 정리
afterEach(() => {
  cleanup();
});
