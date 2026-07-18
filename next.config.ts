import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * next-intl 플러그인
 *
 * 빌드 시 `i18n/request.ts`(기본 경로)를 찾아 서버 컴포넌트에 번역 설정을 주입한다.
 * 이 래핑이 없으면 useTranslations/getTranslations 가 설정을 찾지 못해 실패한다.
 */
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
