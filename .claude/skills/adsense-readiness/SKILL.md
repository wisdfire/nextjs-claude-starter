---
name: adsense-readiness
description: 구글 애드센스 심사를 통과시키기 위한 필수 요건(MUST) 체크리스트. 이 프로젝트로 만드는 모든 웹서비스는 애드센스 심사 통과가 타협 불가 목표이므로, 화면·콘텐츠·정책 페이지·SEO·광고 배치를 다루는 모든 작업(PRD 작성·기술 검증·프론트 구현·QA·커밋 전 검증)에서 반드시 로드하라. 애드센스 요건의 단일 진실 공급원(SSOT).
---

# 애드센스 심사 통과 요건 (MUST/SHOULD)

> **기준일 2026-07-20** (출처 12종을 WebFetch로 전수 재검증 — 죽은 링크 0건). 모든 MUST 항목은 구글 **공식 문서**에서 확인한 것이며 출처를 병기했다. 정책은 바뀌므로, 심사 직전에는 출처 URL을 WebFetch로 열어 현행인지 재확인한다(절차: `adsense-adversarial-audit` Step 0).
>
> **2026년 정책 변경 없음** — [AdSense policy change log](https://support.google.com/adsense/answer/9336650)·[Publisher Standards change log](https://support.google.com/publisherpolicies/answer/10852414) 직접 확인. 2026년 변경은 광고 기술 파트너 갱신·Multiplex 계수 방식 등 **운영 영역**이며 심사 요건과 무관하다. 2026-03 core update는 **검색 랭킹 업데이트이지 애드센스 심사 정책 변경이 아니다**(그것이 scaled content abuse를 타깃했다는 서술은 2차 매체 해석이며 구글 공식 문구에 없다).

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
- 구글이 **광고 쿠키를 사용**한다는 사실 (현행 문구는 "Google's use of advertising cookies" — `DoubleClick`은 현행 페이지에 없는 표현이니 인용하지 말 것)
- 사용자가 **광고 설정(https://www.google.com/settings/ads)에서 맞춤 광고를 거부(opt-out)** 할 수 있다는 안내. 현행 페이지는 **`www.aboutads.info/choices/`** 도 함께 제시한다
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

> 출처: [Google-served ads on screens without publisher-content](https://support.google.com/publisherpolicies/answer/11112688) (문서 실제 제목 — "Valuable inventory"로 인용하지 말 것)

### 6. 사람의 검토·큐레이션 없는 자동생성/AI 콘텐츠 금지

**수동 검토나 큐레이션 없이 자동 생성된 콘텐츠에는 광고를 게재할 수 없다.** AI 사용 자체가 금지는 아니지만, **사용자 가치를 더하지 않는 페이지를 대량 생성**하는 것은 검색 스팸 정책의 **scaled content abuse** 위반이며, Publisher Policies가 검색 스팸 정책 준수를 요구한다.

> 출처: [Google-served ads on screens without publisher-content](https://support.google.com/publisherpolicies/answer/11112688) (문서 실제 제목 — "Valuable inventory"로 인용하지 말 것) · [검색 스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies) (2026-05-15 갱신)

**다국어 적용 (이 프로젝트 직결)**: 이 프로젝트는 한국어 기준 + 영어 추가 지원이다. **본문 콘텐츠를 사람 검토 없이 기계번역해 영어판을 대량 생성하면 이 조항 위반 소지가 크다.** 근거는 3중이다:

- 검색 스팸 정책은 "스크래핑한 콘텐츠를 **자동 변환(동의어 치환·번역 등 난독화 기법)** 해 페이지를 대량 생성하고 사용자 가치를 거의 주지 않는 것"을 scaled content abuse로 규정한다.
- Publisher Policies는 "**자동 기법으로 살짝 변형해 재게시**"를 금지한다.
- 같은 정책이 "**수동 검토·큐레이션 없는 자동 생성 콘텐츠**"를 금지한다.

⚠️ **인용 주의**: 현행 검색 스팸 정책에 **"machine-translated text without human review"라는 독립 예시는 없다**(과거 문서에는 있었으나 현행 문서에서 통합됐다). 그 문구를 구글 공식 인용으로 쓰지 말고 위 3개 근거를 쓴다.

그래서 이 프로젝트의 기본 방침은 **UI 문자열만 양언어, 본문은 한국어 원문 유지**다. 본문을 번역하려면 **사람이 검토한 것만** 게시한다. (규칙 상세: `i18n-localization` 스킬)

> 출처: [spam-policies](https://developers.google.com/search/docs/essentials/spam-policies) · [Replicated content](https://support.google.com/publisherpolicies/answer/11190248) · [11112688](https://support.google.com/publisherpolicies/answer/11112688)

### 7. 복제·스크랩 콘텐츠 원본 그대로 게시 금지 ★ 이 프로젝트의 최대 리스크

**수정 없이 복사한 콘텐츠에는 광고를 게재할 수 없다.** 수집·크롤링 데이터(모노레포 `jobhub-jobs`가 DB에 적재한 데이터)를 **원본 그대로 렌더링하면 복제 콘텐츠 + 저가치 콘텐츠로 거절된다.**

→ 페이지마다 **편집적 부가가치**를 반드시 더한다: 구조화·비교·집계·요약·큐레이션·해설. 원문 재현이 아니라 **이 사이트에서만 얻을 수 있는 정보**가 되어야 한다.

공식 문서가 드는 금지 예시 5종은 이 프로젝트를 정확히 조준한다:

> "Mirroring, framing, scraping or rewriting of content from other sources **without adding value**" · "**Automatically generated content without manual review or curation**" · "Sites that copy and republish content from other sites without adding any original content or value" · "Sites that copy content from other sites, **modify it slightly** (예: 동의어 치환·자동 기법), and republish it" · "Sites dedicated to embedding content ... without substantial added value to the user"

> 출처: [Replicated content](https://support.google.com/publisherpolicies/answer/11190248) — **전용 정책 페이지. 우산 페이지 10502938 대신 이쪽을 인용한다.**
>
> ⚠️ **site reputation abuse를 근거로 인용하지 말 것.** 그 정책은 "제3자 콘텐츠를 호스트 사이트의 기존 랭킹 신호를 이용하려 게시하는 것"에 관한 것으로 **수집 데이터를 자기 사이트에 렌더링하는 상황과는 다른 사안**이다(종전 인용은 부정확했다).

### 8. 광고:콘텐츠 비율 및 배치 규칙

**(a) 광고가 publisher-content보다 많으면 안 된다.** 이 조항의 핵심은 **분모의 정의**다:

> **publisher-content = 이미지·비디오·게임·본문 텍스트·발행자가 관리하는 UGC.**
> **여백(whitespace) · 헤더/푸터 콘텐츠 · 다른 콘텐츠로의 링크는 publisher-content가 아니다.**

⚠️ **이 프로젝트에서 가장 걸리기 쉬운 지점**: 카테고리 인덱스·태그 목록·검색 결과처럼 **링크 목록만 있는 화면은 publisher-content가 사실상 0**이다. 여기에 광고를 붙이면 자동으로 비율 위반이 된다(그리고 MUST 5의 저가치 화면에도 해당한다).

> 출처: [More ads or paid promotional material than publisher-content](https://support.google.com/publisherpolicies/answer/11169917) — **이 조항은 1346295·48182에 없다. 종전 출처 표기는 틀렸다.**

**(b) 배치·라벨 규칙** (아래는 1346295에서 verbatim 확인):

- 광고 라벨은 **"Advertisements" 또는 "Sponsored Links"만** 허용(다른 문구 금지 — "광고"·"스폰서" 같은 자체 문구도 금지).
- **내비게이션·버튼과 인접·혼동되는 배치 금지**(오클릭 유도).
- 광고 **자동 새로고침 금지**, 팝업 남용 금지, 광고가 콘텐츠를 가리지 않을 것.
- **클릭 유도 문구 금지** — "Feel free to click an ad" 류.
- **오도하는 제목 아래 배치 금지** — "resources"·"helpful links" 같은 제목 바로 밑에 광고를 두지 않는다.

> 출처: [광고 배치 정책](https://support.google.com/adsense/answer/1346295) · [프로그램 정책](https://support.google.com/adsense/answer/48182)

### 9. 내비게이션이 실제로 동작할 것

사용자가 사이트를 **쉽게 탐색해 약속된 정보에 도달**할 수 있어야 한다(Site behavior 조항). **깨진 링크·404는 "위반 소지"가 아니라 명시적 금지 항목**이다 — 프로그램 정책이 `"Linking to content that doesn't exist"`를 **verbatim으로 금지**한다. 같은 섹션이 함께 금지하는 것: "False claims of streaming content, or downloads" · "Redirecting users to irrelevant, or misleading webpages" · "Pages where ads are implemented in placements that are intuitively meant for navigation".

또한 거절 사유 페이지는 **"found your site difficult to navigate"** 를 명시한다. → `qa-link-integrity` 게이트를 **애드센스 요건으로 승격**해 반드시 통과시킨다.

**다국어 적용**: 로케일이 붙은 경로에서도 내비게이션이 깨지지 않아야 한다.
- `next/link`를 그대로 쓰면 영어 화면(`/en/...`)에서 접두사가 빠져 **404 또는 언어 이탈**이 발생한다 → 반드시 `@/i18n/navigation`을 쓴다.
- **개인정보처리방침(MUST 1)은 어느 언어에서도 도달 가능해야 한다** — 영어 화면 푸터의 링크가 404면 사실상 필수 페이지 미제공이다.
- 번역 키 누락으로 화면에 원문 키(`Home.title`)나 빈 문구가 노출되면 **미완성 페이지**로 읽힌다(MUST 5의 저가치 화면과 같은 리스크).

> 출처: [프로그램 정책 — Site behavior](https://support.google.com/adsense/answer/48182) · [12176698](https://support.google.com/adsense/answer/12176698) · [계정 미승인 사유](https://support.google.com/adsense/answer/81904)

### 10. 자격·코드 삽입·지원 언어

신청자 **만 18세 이상**, 신청 사이트의 **HTML 소스에 광고 코드를 삽입할 수 있어야** 한다(`<head>`에 스니펫 삽입 — Next.js는 루트 `layout.tsx`에서 처리). 콘텐츠는 **"high-quality, original, and attract an audience"** 여야 한다(공식 표현).

**지원 언어**: 구글은 미승인 사유로 **"사이트 콘텐츠 대부분이 AdSense가 현재 지원하지 않는 언어인 경우"** 를 명시한다. **한국어·영어는 지원 언어**이므로 이 프로젝트는 기본 충족이지만, 다른 언어를 추가할 때는 지원 목록을 먼저 확인한다.

> 출처: [자격 요건](https://support.google.com/adsense/answer/9724) · [계정 미승인 사유](https://support.google.com/adsense/answer/81904)

> **거절 사유 페이지(81904)의 다른 명시 항목** — MUST 5·9에 반영돼 있으나 원문을 남겨둔다: **"too little text"** · **"site was deemed to be 'under construction'"** · **"found your site difficult to navigate"**. ⚠️ 구글은 "too little text"의 **수치 기준을 제시하지 않는다** — 임의의 글자수 임계값을 만들지 말고 "publisher-content가 **0인가 아닌가**"로만 기계 판정한다.

---

## 편집 뎁스 (Editorial Depth) — 저가치 리스크를 낮추는 콘텐츠 설계 (MUST 5·6·7·10 공통)

> **왜 별도 절인가**: MUST 7의 "출처 삭제 테스트"는 파생 산출물이 **0인가 非0인가**만 가른다. 그런데 파생 산출물이 **존재하지만 얇거나(thin) 템플릿에 숫자만 바꿔 끼운(formulaic)** 화면은 이 테스트를 통과하고도 심사관·실사용자에게 저가치로 읽힌다. **실제 사례**: 한 프로젝트(streamprice)가 적대적 감사를 `approve-with-risk`(blocker 0)로 통과했으나 콘텐츠 뎁스가 부족해 배포 후 보완 프롬프트로 개선해야 했다. 뎁스는 **마지막 게이트의 pass/fail이 아니라 설계·구현 단계의 양(陽)의 요구사항**으로 박아야 한다.

⚠️ **뎁스는 새로운 MUST가 아니다 — 구글은 뎁스 임계값(글자수·글 수·단락 수)을 공표하지 않는다.** 그러므로 "글 300자·기사 20개" 같은 **수치 기준을 지어내지 않는다**(§목표 정의의 금지 문장과 동일). 뎁스는 **"어떤 편집 레이어를 갖췄는가(유형 커버리지)"** 와 **"그 레이어가 페이지마다 기계적으로 같지 않은가(비-템플릿성)"** 로만 판정한다.

### 뎁스 = 4종 편집 레이어

데이터를 렌더하는 제품은 아래 4종 중 **복수**를 갖출수록 저가치 리스크가 낮아진다. 화면설계·PRD·프론트 구현이 이 유형들을 요구사항으로 반영한다.

1. **페이지별 편집 해설 심화** — 데이터 행 위에 **그 페이지 고유의** 해석을 얹는다: 순위 근거, 변동 원인·맥락, 비교 결론, "무엇을 골라야 하나" 판단. ⚠️ **템플릿 한 문장에 숫자만 바꿔 끼우는 것은 심화가 아니다**("N번째로 낮습니다"가 전 페이지에 동일하면 = 대량 자동생성 신호). 데이터 조건(신규/인상/동률/결측)에 따라 **해설의 구조 자체가 갈라져야** 한다.
2. **에버그린 가이드/글** — 데이터 행에서 파생되지 않는, **사람이 쓴** 설명 콘텐츠(가이드·해설 아티클·비교 방법론 글). 순수 데이터 파생만으로 이뤄진 사이트는 데이터가 얇은 조합에서 저가치로 무너지지만, 에버그린 레이어는 데이터와 무관하게 고유 가치를 준다. **검토 없는 대량 기계번역은 금지**(MUST 6) — 에버그린도 사람 검토 산출물이어야 한다.
3. **큐레이션·상호연결** — 관련 조합 추천, "X vs Y" 대조 페이지, 상위 개념 허브에서 하위로 잇는 내부 링크 구조. 링크 목록만인 인덱스는 publisher-content 0(MUST 8)이므로, 허브에도 집계·비교 등 **자체 콘텐츠 블록**을 함께 둔다.
4. **방법론·FAQ·용어 설명** — 데이터 출처·집계 방법·갱신 주기를 밝히는 방법론 페이지, 자주 묻는 질문, 용어집. 신뢰성·완성도를 높이고 "약속된 정보에 도달"(MUST 9) 경험을 보강한다.

### 판정 기준 (임계값 아님)

- **유형 커버리지**: 광고를 붙이는 콘텐츠 화면이 위 4종 중 **최소 1종 이상의 실질 레이어**를 갖는가. 전 사이트가 유형 1의 **템플릿 한 줄**만으로 이뤄져 있으면 저가치·scaled content 리스크다.
- **비-템플릿성**: 표본 페이지 여러 개를 나란히 놓았을 때 편집 레이어가 **숫자·고유명사만 다른 동일 문장**인가. 그렇다면 유형 1을 갖췄어도 뎁스로 인정하지 않는다.
- 이 판정은 **정성**이며 증거(표본 페이지 나열·템플릿 문자열 지목)와 함께 기록한다. 검증 절차는 `adsense-adversarial-audit`의 L1 렌즈가 담당한다.

---

## SHOULD — 권장 (공식 권장 또는 업계 관행)

- **`ads.txt`**: 공식적으로 "필수는 아니나 **강력 권장**". `public/ads.txt`에 `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. ([출처](https://support.google.com/adsense/answer/7532444))
- **Better Ads Standards 준수**: 전면 인터스티셜 남발·자동재생 사운드 광고·카운트다운 광고 배제. ([출처](https://support.google.com/publisherpolicies/answer/11127848))
- **About / Contact / Terms 페이지**: **정책상 필수 아님**(널리 퍼진 오해). 다만 "좋은 UX·내비게이션" 요건을 충족시키는 실무 수단이므로 기본 라우트에 포함한다. 문서에 "애드센스 필수"라고 쓰지 말 것.
- **사이트맵(`app/sitemap.ts`) · 핵심 페이지 `noindex` 금지**: 애드센스 심사 요건으로는 공식 확인되지 않음. SEO·트래픽 목적으로 권장.
- **다국어 `hreflang`·`canonical`**: **애드센스 정책 요건이 아니다**(공식 근거 없음). 다만 언어별 URL이 분리된 사이트에서 이를 빠뜨리면 검색엔진이 **중복 콘텐츠**로 볼 수 있어, MUST 7(복제 콘텐츠)의 리스크를 낮추는 실무 수단으로 권장한다. **본문이 번역되지 않은 문서**는 영어 라우트에서 `canonical`을 한국어 URL로 지정하고 `hreflang="en"`을 붙이지 않는다.
- **Lighthouse/Core Web Vitals 목표치**: **애드센스 정책 요건이 아니다**(공식 근거 없음). "좋은 사용자 경험"의 내부 대리 지표로만 쓴다.
- **콘텐츠 분량·개수**: **공식 최소치가 없다.** 내부 기준을 정할 거면 근거 등급이 낮은 관행임을 표기하고 쓴다.

---

## 역할별 사용법

- **prd-author**: MUST 10항을 PRD의 "애드센스 필수 요구사항" 섹션에 **검증 가능한 완료 기준과 함께** 명문화한다. 특히 수집 데이터를 쓰는 제품이면 **편집적 부가가치 요구(MUST 7)** 와 **§편집 뎁스 4종 레이어**를 요구사항으로 못박는다(뎁스를 사후 보완 대상이 아니라 초기 요구로). MUST/SHOULD를 뒤섞지 않는다.
- **tech-verifier**: MUST 누락은 **Blocker**로 올린다. 정책은 바뀌므로 출처 URL을 WebFetch로 열어 현행인지 대조하고, 스킬 기준이 낡았으면 갱신을 요청한다.
- **design-architect / frontend-engineer**: 정책 페이지 라우트와 **광고 허용 화이트리스트**(MUST 5)를 설계·구현에 반영하고, **§편집 뎁스 4종 레이어**를 화면 구조·구현에 반영한다(유형 1 템플릿 한 줄로 끝내지 않는다). 플레이스홀더 화면을 남기지 않는다.
- **qa-inspector**: MUST 4·5·9를 **기계적으로 검증**한다 — `robots.ts`가 `Mediapartners-Google`을 막지 않는지, 저가치 라우트에 광고 슬롯이 없는지, 링크 404가 없는지.
- **adsense-auditor**: 기계 검증이 통과한 뒤 **심사관 역할로 거절 사유를 찾는다**. 절차는 `adsense-adversarial-audit` 스킬을 따른다.
- **커밋 전**: `docs/guides/verification.md`의 애드센스 게이트로 자가 점검한다.

---

## 이 문서의 경계 — 요건 vs 검증

이 스킬은 **"무엇을 충족해야 하는가"(요건)** 만 정의한다. **"충족됐는지 어떻게 확인하는가"(검증 절차)** 는 두 곳이 나눠 담당한다:

| 축 | 담당 | 판정 |
|---|---|---|
| 존재·문자열·링크 무결성 | `qa-inspector` (`qa-link-integrity`) | 결정적(Grep·스크립트) |
| **콘텐츠 가치·독창성·실질 내용·완성도** | `adsense-auditor` (**`adsense-adversarial-audit`**) | 정성 심사 + 증거 · 최대 3라운드 |

**존재는 충족이 아니다.** `app/privacy/page.tsx`가 있어도 내용이 껍데기면 Grep은 통과하고 심사는 떨어진다. 기계 검증만으로 애드센스 게이트를 닫지 마라.
