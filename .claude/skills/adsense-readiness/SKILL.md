---
name: adsense-readiness
description: 구글 애드센스 심사를 통과시키기 위한 필수 요건(MUST) 체크리스트. 이 프로젝트로 만드는 모든 웹서비스는 애드센스 심사 통과가 타협 불가 목표이므로, 화면·콘텐츠·정책 페이지·SEO·광고 배치를 다루는 모든 작업(PRD 작성·기술 검증·프론트 구현·QA·커밋 전 검증)에서 반드시 로드하라. 애드센스 요건의 단일 진실 공급원(SSOT).
---

# 애드센스 심사 통과 요건 (MUST/SHOULD)

> **기준일 2026-07-14.** 모든 MUST 항목은 구글 **공식 문서**에서 확인한 것이며 출처를 병기했다. 정책은 바뀌므로, 심사 직전에는 출처 URL을 WebFetch로 열어 현행인지 재확인한다.

## 목표 정의 — "100% 통과"를 어떻게 검증 가능한 게이트로 만드는가 (중요)

이 프로젝트의 목표는 **애드센스 심사 통과**이며 타협하지 않는다. 다만 구글 심사는 **재량·정성 평가**라 어떤 공식 문서도 "이러면 반드시 통과"를 보장하지 않는다. 그러므로 "100% 통과"를 검증 불가능한 구호로 두지 말고, 아래의 **검증 가능한 게이트**로 구현한다:

> **통과 게이트 = 공식 MUST 10항 전부 충족 + 저가치(low value) 콘텐츠 리스크 제거**

MUST가 하나라도 미충족이면 **구현을 완료로 보지 않는다**. 거절의 대부분은 이 MUST에서 나오므로, 이걸 다 채우는 것이 통과 확률을 최대로 올리는 유일하게 정직한 방법이다.

⚠️ **문서·코드에 쓰면 안 되는 문장**(근거 없음 → 환각): "심사 100% 통과 보장", "글자수 300자 이상이면 통과", "글 20개 이상 필요", "도메인 6개월 필요", "About·Contact 페이지는 애드센스 필수". **구글은 최소 분량·글 수·트래픽·도메인 나이 기준을 어디에도 제시하지 않는다.**

---

## MUST — 공식 정책 근거 있음 (하나라도 빠지면 승인 불가/광고 차단)

### 1. 개인정보처리방침 — 유일한 "공식 필수" 페이지

`app/privacy/page.tsx`를 반드시 만들고, **구글이 지정한 내용을 반드시 포함**한다:

- 제3자(구글 포함)가 **쿠키를 사용해 이전 방문 기반 광고를 게재**한다는 사실
- 구글이 **광고 쿠키(DoubleClick 등)를 사용**한다는 사실
- 사용자가 **광고 설정(https://www.google.com/settings/ads)에서 맞춤 광고를 거부(opt-out)** 할 수 있다는 안내
- 제3자 애드네트워크를 함께 쓴다면 **그 목록·링크·opt-out 방법**

> 출처: [Required content](https://support.google.com/adsense/answer/1348695) · [Publisher Policies — Privacy disclosures](https://support.google.com/publisherpolicies/answer/10502938)

### 2. EEA·UK·스위스 트래픽이 있다면 인증 CMP(IAB TCF) 필수

유럽 사용자에게 광고를 게재하려면 **Google 인증(certified) CMP + IAB TCF 통합**이 **필수**다. 비인증 CMP를 쓰면 맞춤 광고가 막히고 limited ads만 나간다. 최소 비용 경로는 AdSense 콘솔의 **Privacy & messaging → European regulations 메시지**(TCF 인증 대상)를 켜는 것이다. (EEA·UK 2024-01-16, 스위스 2024-07-31 발효)

> 출처: [CMP 요구사항](https://support.google.com/adsense/answer/13554116) · [EU User Consent Policy](https://www.google.com/about/company/user-consent-policy/)

### 3. HTTPS 강제 + 사이트 공개 접근

유효한 SSL 인증서와 **HTTP→HTTPS 리다이렉트**가 있어야 하고, 사이트는 **비밀번호·베타 게이트 없이 공개**돼야 한다. 구글이 평가할 수 없는 콘텐츠에는 광고를 못 붙인다.

> 출처: [사이트가 광고 게재 준비가 되지 않음](https://support.google.com/adsense/answer/12176698)

### 4. `Mediapartners-Google` 크롤러 차단 금지

`robots.txt`에서 애드센스 크롤러를 막으면 **광고가 아예 게재되지 않는다**. 전역 `Disallow: /`도 금지. Next.js에서는 `app/robots.ts`로 명시적으로 허용을 생성한다.

> 출처: [AdSense 크롤러 차단](https://support.google.com/adsense/answer/10532)

### 5. 저가치 화면에 광고 슬롯 렌더 금지

**콘텐츠가 없거나(No content) · 공사 중(Under construction) · 저가치(Low value)** 화면에는 광고를 게재할 수 없다. 구체적으로 **로그인·에러(404/500)·Thank you·빈 목록·스켈레톤 전용·알림/네비게이션 목적 화면**에는 AdSense 슬롯을 렌더하지 않는다 → **라우트 단위 광고 허용 화이트리스트**로 구현한다.

또한 **"준비 중" 플레이스홀더 화면을 사이트에 남기지 않는다** — 대표 거절 사유다.

> 출처: [Valuable inventory](https://support.google.com/publisherpolicies/answer/11112688)

### 6. 사람의 검토·큐레이션 없는 자동생성/AI 콘텐츠 금지

**수동 검토나 큐레이션 없이 자동 생성된 콘텐츠에는 광고를 게재할 수 없다.** AI 사용 자체가 금지는 아니지만, **사용자 가치를 더하지 않는 페이지를 대량 생성**하는 것은 검색 스팸 정책의 **scaled content abuse** 위반이며, Publisher Policies가 검색 스팸 정책 준수를 요구한다.

> 출처: [Valuable inventory](https://support.google.com/publisherpolicies/answer/11112688) · [검색 스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies) (2026-05-15 갱신)

### 7. 복제·스크랩 콘텐츠 원본 그대로 게시 금지 ★ 이 프로젝트의 최대 리스크

**수정 없이 복사한 콘텐츠에는 광고를 게재할 수 없다.** 수집·크롤링 데이터(모노레포 `jobhub-jobs`가 DB에 적재한 데이터)를 **원본 그대로 렌더링하면 복제 콘텐츠 + 저가치 콘텐츠로 거절된다.**

→ 페이지마다 **편집적 부가가치**를 반드시 더한다: 구조화·비교·집계·요약·큐레이션·해설. 원문 재현이 아니라 **이 사이트에서만 얻을 수 있는 정보**가 되어야 한다.

> 출처: [Publisher Policies — 복제 콘텐츠](https://support.google.com/publisherpolicies/answer/10502938) · [site reputation abuse](https://developers.google.com/search/blog/2024/11/site-reputation-abuse)

### 8. 광고:콘텐츠 비율 및 배치 규칙

- **광고가 콘텐츠보다 많으면 안 된다**(ad-to-content ratio).
- 광고 라벨은 **"Advertisements" 또는 "Sponsored Links"만** 허용(다른 문구 금지).
- **내비게이션·버튼과 인접·혼동되는 배치 금지**(오클릭 유도).
- 광고 **자동 새로고침 금지**, 팝업 남용 금지, 광고가 콘텐츠를 가리지 않을 것.

> 출처: [광고 배치 정책](https://support.google.com/adsense/answer/1346295) · [프로그램 정책](https://support.google.com/adsense/answer/48182)

### 9. 내비게이션이 실제로 동작할 것

사용자가 사이트를 **쉽게 탐색해 약속된 정보에 도달**할 수 있어야 한다(Site behavior 조항). **깨진 링크·404는 그 자체로 정책 위반 소지**다 → `qa-link-integrity` 게이트를 **애드센스 요건으로 승격**해 반드시 통과시킨다.

> 출처: [프로그램 정책 — Site behavior](https://support.google.com/adsense/answer/48182) · [12176698](https://support.google.com/adsense/answer/12176698)

### 10. 자격·코드 삽입

신청자 **만 18세 이상**, 신청 사이트의 **HTML 소스에 광고 코드를 삽입할 수 있어야** 한다(`<head>`에 스니펫 삽입 — Next.js는 루트 `layout.tsx`에서 처리). 콘텐츠는 **"high-quality, original"** 이어야 한다(공식 표현).

> 출처: [자격 요건](https://support.google.com/adsense/answer/9724)

---

## SHOULD — 권장 (공식 권장 또는 업계 관행)

- **`ads.txt`**: 공식적으로 "필수는 아니나 **강력 권장**". `public/ads.txt`에 `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. ([출처](https://support.google.com/adsense/answer/7532444))
- **Better Ads Standards 준수**: 전면 인터스티셜 남발·자동재생 사운드 광고·카운트다운 광고 배제. ([출처](https://support.google.com/publisherpolicies/answer/11127848))
- **About / Contact / Terms 페이지**: **정책상 필수 아님**(널리 퍼진 오해). 다만 "좋은 UX·내비게이션" 요건을 충족시키는 실무 수단이므로 기본 라우트에 포함한다. 문서에 "애드센스 필수"라고 쓰지 말 것.
- **사이트맵(`app/sitemap.ts`) · 핵심 페이지 `noindex` 금지**: 애드센스 심사 요건으로는 공식 확인되지 않음. SEO·트래픽 목적으로 권장.
- **Lighthouse/Core Web Vitals 목표치**: **애드센스 정책 요건이 아니다**(공식 근거 없음). "좋은 사용자 경험"의 내부 대리 지표로만 쓴다.
- **콘텐츠 분량·개수**: **공식 최소치가 없다.** 내부 기준을 정할 거면 근거 등급이 낮은 관행임을 표기하고 쓴다.

---

## 역할별 사용법

- **prd-author**: MUST 10항을 PRD의 "애드센스 필수 요구사항" 섹션에 **검증 가능한 완료 기준과 함께** 명문화한다. 특히 수집 데이터를 쓰는 제품이면 **편집적 부가가치 요구(MUST 7)** 를 요구사항으로 못박는다. MUST/SHOULD를 뒤섞지 않는다.
- **tech-verifier**: MUST 누락은 **Blocker**로 올린다. 정책은 바뀌므로 출처 URL을 WebFetch로 열어 현행인지 대조하고, 스킬 기준이 낡았으면 갱신을 요청한다.
- **design-architect / frontend-engineer**: 정책 페이지 라우트와 **광고 허용 화이트리스트**(MUST 5)를 설계·구현에 반영한다. 플레이스홀더 화면을 남기지 않는다.
- **qa-inspector**: MUST 4·5·9를 **기계적으로 검증**한다 — `robots.ts`가 `Mediapartners-Google`을 막지 않는지, 저가치 라우트에 광고 슬롯이 없는지, 링크 404가 없는지.
- **커밋 전**: `docs/guides/verification.md`의 애드센스 게이트로 자가 점검한다.
