import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * 요청 단위 next-intl 설정
 *
 * next.config.ts 의 next-intl 플러그인이 이 파일을 자동으로 찾아 실행한다.
 * 매 요청마다 아래 순서로 동작한다:
 *   1) requestLocale 로 URL의 [locale] 세그먼트 값을 읽는다 (비동기 — await 필요)
 *   2) 그 값이 지원 목록에 있는지 hasLocale 로 검증한다
 *      → 검증하지 않으면 /xx/about 같은 임의 경로가 그대로 통과해
 *        존재하지 않는 messages 파일을 import하다 런타임 에러가 난다
 *   3) 지원하지 않는 값이면 기본 로케일(ko)로 폴백한다
 *   4) 해당 로케일의 번역 메시지를 동적 import 해서 반환한다
 *      → 동적 import라 요청된 언어의 JSON만 번들에 실린다
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // URL의 [locale] 세그먼트 값 (예: "en"). 없으면 undefined
  const requested = await requestLocale;

  // 지원 목록에 있는 값만 채택하고, 아니면 기본 로케일로 폴백
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
