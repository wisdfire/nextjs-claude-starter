import { defineRouting } from "next-intl/routing";

/**
 * 앱 전역 로케일 라우팅 설정 (단일 진실 공급원)
 *
 * - locales: 지원 언어 목록. **한국어(ko)가 기준 언어**이고 영어(en)를 추가 지원한다.
 * - defaultLocale: 로케일을 판별할 수 없을 때 사용하는 기본값 → 항상 "ko".
 * - localePrefix "as-needed": 기본 로케일(ko)은 URL에 접두사를 붙이지 않고,
 *   나머지 로케일만 접두사를 붙인다.
 *     /        · /about     → 한국어
 *     /en      · /en/about  → 영어
 *   이렇게 언어별 URL이 분리돼야 검색엔진이 각 언어를 따로 색인하고
 *   hreflang을 붙일 수 있다(애드센스 심사에서 중복 콘텐츠로 오인되지 않는다).
 *
 * ⚠️ 언어를 추가할 때는 반드시 이 파일의 locales만 고치고,
 *    messages/<locale>.json 을 같이 추가한다. 로케일 목록을 다른 곳에
 *    복제하지 말 것(불일치 시 404·번역 누락이 조용히 발생한다).
 */
export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localePrefix: "as-needed",
});

/** 지원 로케일의 유니온 타입 ("ko" | "en") — 컴포넌트 props 타입 등에 사용 */
export type AppLocale = (typeof routing.locales)[number];

/**
 * 언어 선택 UI에 표시할 로케일별 라벨
 *
 * 각 언어는 **그 언어 자체의 표기**로 적는다(자국어 표기, endonym).
 * 사용자가 현재 읽지 못하는 언어로 적으면 전환할 언어를 찾지 못하기 때문이다.
 */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  ko: "한국어",
  en: "English",
};
