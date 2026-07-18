// 번역 파일(messages/*.json) 처리 공용 유틸
// ------------------------------------------------------------
// check.mjs(검증)와 translate.mjs(LLM 번역)가 함께 쓴다.
// 한국어 원본(ko.json)이 진실이고, en.json은 여기서 파생된다.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const ROOT = process.cwd();
export const MESSAGES_DIR = join(ROOT, "messages");
export const LOCK_FILE = join(MESSAGES_DIR, ".translations.lock.json");

/** 영어(CLDR)에서 반드시 있어야 하는 복수형 카테고리 */
const EN_REQUIRED_PLURAL_CATEGORIES = ["one", "other"];

/**
 * JSON 파일을 읽어 객체로 반환한다.
 * @param {string} path - 파일 절대경로
 * @returns {any} 파싱된 객체 (파일이 없으면 빈 객체)
 */
export function readJson(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * 객체를 보기 좋은 JSON으로 저장한다(끝에 개행 — prettier 규약).
 * @param {string} path - 저장할 절대경로
 * @param {any} data - 저장할 객체
 */
export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/**
 * 중첩 객체를 "a.b.c" → 값 형태의 평탄한 Map으로 만든다.
 *
 * 번역 파일은 네임스페이스로 중첩돼 있지만(Home.features.next.title),
 * 비교·번역은 평탄한 키로 하는 것이 단순하다.
 *
 * @param {any} obj - 번역 객체
 * @param {string} prefix - 재귀 시 누적되는 상위 경로
 * @returns {Map<string,string>} 키 경로 → 문자열 값
 */
export function flatten(obj, prefix = "") {
  const out = new Map();
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      // 중첩 객체면 재귀해서 하위 키를 모두 펼친다
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

/**
 * 평탄한 Map을 원본(ko) 구조와 같은 순서·모양의 중첩 객체로 되돌린다.
 *
 * ko.json의 키 순서를 그대로 따라가므로 en.json의 diff가 안정적이다
 * (키 순서가 매번 바뀌면 리뷰가 불가능해진다).
 *
 * @param {any} shape - 구조·순서의 기준이 되는 객체 (보통 ko.json)
 * @param {Map<string,string>} values - 평탄한 키 → 값
 * @param {string} prefix - 재귀 시 누적 경로
 * @returns {any} 중첩 객체
 */
export function unflattenLike(shape, values, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(shape ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      out[key] = unflattenLike(value, values, path);
    } else if (values.has(path)) {
      out[key] = values.get(path);
    }
  }
  return out;
}

/**
 * 문자열의 내용 지문(해시)을 만든다.
 *
 * ko 값이 바뀌었는데 en이 옛 번역 그대로인 상태(stale)를 탐지하는 데 쓴다.
 * 번역 시점의 ko 해시를 lock 파일에 적어두고, 나중에 현재 ko 해시와 비교한다.
 *
 * @param {string} text - 원본 문자열
 * @returns {string} sha256 앞 12자리
 */
export function fingerprint(text) {
  return createHash("sha256").update(String(text)).digest("hex").slice(0, 12);
}

/**
 * ICU 메시지에서 인자(placeholder)를 파싱한다.
 *
 * ICU 문법 예:
 *   "안녕 {name}"                          → name (단순 인자)
 *   "{count, plural, one {#개} other {#개}}" → count (plural, 카테고리 one/other)
 *
 * 번역 시 LLM이 플레이스홀더를 빠뜨리거나 이름을 바꾸면 런타임에서 깨지므로,
 * 원본과 번역본의 인자 집합을 대조하기 위해 필요하다.
 *
 * 파싱 방식: `{` 를 만나면 바로 뒤의 식별자를 읽고, `,` 나 `}` 가 오는지 확인한다.
 * plural 옵션 본문(`other {# posts}`)의 `{` 뒤에는 식별자가 없으므로 자연히 걸러진다.
 *
 * @param {string} message - ICU 메시지 문자열
 * @returns {Map<string,{type:string, categories:Set<string>}>} 인자명 → 정보
 */
export function parseIcuArgs(message) {
  const args = new Map();
  const text = String(message);

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;

    // `{` 뒤의 식별자를 읽는다
    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    const start = j;
    while (j < text.length && /[a-zA-Z0-9_]/.test(text[j])) j++;
    const name = text.slice(start, j);
    if (!name || !/^[a-zA-Z_]/.test(name)) continue; // `{# posts}` 같은 옵션 본문은 제외

    while (j < text.length && /\s/.test(text[j])) j++;
    const next = text[j];
    if (next !== "," && next !== "}") continue; // 인자 형태가 아니면 무시

    // 인자 전체 범위를 중괄호 짝을 세어 찾는다
    const end = matchBrace(text, i);
    const body = end === -1 ? "" : text.slice(i, end + 1);

    // 인자 타입(plural·select·date 등)과 plural 카테고리를 뽑는다
    const typeMatch = body.match(/^\{\s*[a-zA-Z0-9_]+\s*,\s*([a-zA-Z]+)/);
    const type = typeMatch ? typeMatch[1] : "simple";

    const categories = new Set();
    if (type === "plural" || type === "selectordinal" || type === "select") {
      // `one {`, `other {`, `=0 {` 형태의 카테고리 라벨을 수집한다
      for (const m of body.matchAll(/(?:^|[\s}])(=?\w+)\s*\{/g)) {
        const label = m[1];
        if (label !== name && label !== type) categories.add(label);
      }
    }

    args.set(name, { type, categories });
  }

  return args;
}

/**
 * 여는 중괄호 위치에서 짝이 맞는 닫는 중괄호 위치를 찾는다.
 * @param {string} text - 대상 문자열
 * @param {number} openIndex - `{` 의 인덱스
 * @returns {number} 짝이 되는 `}` 인덱스 (없으면 -1)
 */
function matchBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 메시지에 쓰인 리치 텍스트 태그(<code>…</code>)의 이름 집합을 뽑는다.
 *
 * 번역본에서 태그가 사라지면 t.rich 가 렌더할 요소를 잃는다.
 *
 * @param {string} message - ICU 메시지
 * @returns {Set<string>} 태그명 집합
 */
export function parseTags(message) {
  const tags = new Set();
  for (const m of String(message).matchAll(/<\s*([a-zA-Z][a-zA-Z0-9]*)\s*>/g)) {
    tags.add(m[1]);
  }
  return tags;
}

/**
 * 원본(ko) 메시지와 번역본(en) 메시지를 대조해 문제를 찾는다.
 *
 * LLM 번역은 그럴듯해 보여도 ICU 구조를 자주 망가뜨린다
 * (특히 영어 복수형에서 `one` 카테고리를 빠뜨려 "5 post" 가 되는 사례).
 * 그래서 사람이 눈으로 보는 대신 여기서 기계적으로 막는다.
 *
 * @param {string} key - 번역 키 (오류 메시지용)
 * @param {string} source - 원본(ko) 문자열
 * @param {string} target - 번역본(en) 문자열
 * @returns {string[]} 문제 설명 목록 (없으면 빈 배열)
 */
export function validateTranslation(key, source, target) {
  const problems = [];

  if (typeof target !== "string" || target.trim() === "") {
    problems.push(`${key}: 번역이 비어 있다`);
    return problems;
  }

  const sourceArgs = parseIcuArgs(source);
  const targetArgs = parseIcuArgs(target);

  // ① 플레이스홀더 이름 집합이 같아야 한다 — 빠지면 런타임에 값이 안 채워진다
  for (const name of sourceArgs.keys()) {
    if (!targetArgs.has(name)) {
      problems.push(`${key}: 플레이스홀더 {${name}} 이(가) 번역에서 누락됐다`);
    }
  }
  for (const name of targetArgs.keys()) {
    if (!sourceArgs.has(name)) {
      problems.push(
        `${key}: 원본에 없는 플레이스홀더 {${name}} 이(가) 번역에 생겼다`,
      );
    }
  }

  // ② 복수형은 영어 카테고리(one·other)를 모두 갖춰야 한다
  //    한국어는 복수형 구분이 없어 other 하나로 끝나지만, 영어는 one 이 없으면
  //    "5 post" 처럼 단수형이 그대로 나온다 (LLM이 실제로 자주 틀리는 지점)
  for (const [name, info] of sourceArgs) {
    const targetInfo = targetArgs.get(name);
    if (!targetInfo) continue;
    if (info.type === "plural" || info.type === "selectordinal") {
      if (targetInfo.type !== info.type) {
        problems.push(
          `${key}: {${name}} 이(가) 원본에서는 ${info.type} 인데 번역에서는 ${targetInfo.type} 이다`,
        );
        continue;
      }
      for (const category of EN_REQUIRED_PLURAL_CATEGORIES) {
        if (!targetInfo.categories.has(category)) {
          problems.push(
            `${key}: 영어 복수형에 "${category}" 카테고리가 없다 (예: {${name}, plural, one {# item} other {# items}})`,
          );
        }
      }
    }
  }

  // ③ 리치 텍스트 태그가 보존돼야 한다 — 없어지면 t.rich 가 렌더할 요소를 잃는다
  const sourceTags = parseTags(source);
  const targetTags = parseTags(target);
  for (const tag of sourceTags) {
    if (!targetTags.has(tag)) {
      problems.push(`${key}: 태그 <${tag}> 이(가) 번역에서 누락됐다`);
    }
  }

  return problems;
}

/**
 * 원본·번역본·lock 을 비교해 번역 작업 대상을 분류한다.
 *
 * @param {Map<string,string>} source - ko 평탄 Map
 * @param {Map<string,string>} target - en 평탄 Map
 * @param {Record<string,string>} lock - 키 → 번역 당시 ko 해시
 * @returns {{missing:string[], stale:string[], obsolete:string[]}}
 */
export function diffTranslations(source, target, lock) {
  const missing = []; // en 에 아직 없는 키
  const stale = []; // ko 가 바뀌었는데 en 이 옛 번역인 키
  const obsolete = []; // ko 에서 사라졌는데 en 에 남은 키

  for (const [key, value] of source) {
    if (!target.has(key)) {
      missing.push(key);
    } else if (lock[key] !== fingerprint(value)) {
      stale.push(key);
    }
  }
  for (const key of target.keys()) {
    if (!source.has(key)) obsolete.push(key);
  }

  return { missing, stale, obsolete };
}
