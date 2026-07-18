#!/usr/bin/env node
// 번역 정합성 검증 (LLM 호출 없음 · 순수 검사)
// ------------------------------------------------------------
// 목적: ko.json(원본)과 en.json(번역본)이 어긋난 상태를 커밋 전에 막는다.
//
//   - 누락(missing)  : ko 에 있는데 en 에 없음 → 화면에 원문 키가 그대로 노출된다
//   - 낡음(stale)    : ko 가 바뀌었는데 en 은 옛 번역 → 영어 사용자가 틀린 정보를 본다
//   - 잉여(obsolete) : ko 에서 지웠는데 en 에 남음 → 죽은 번역이 쌓인다
//   - ICU 파손       : 플레이스홀더 누락·영어 복수형 카테고리 누락·태그 소실
//
// 사용법:
//   node scripts/i18n/check.mjs          # 사람이 읽는 리포트
//   node scripts/i18n/check.mjs --json   # 스크립트가 읽는 JSON
//
// 종료 코드: 문제 없으면 0, 있으면 1

import { join } from "node:path";
import {
  MESSAGES_DIR,
  LOCK_FILE,
  readJson,
  flatten,
  diffTranslations,
  validateTranslation,
} from "./lib.mjs";

const asJson = process.argv.includes("--json");

const source = flatten(readJson(join(MESSAGES_DIR, "ko.json")));
const target = flatten(readJson(join(MESSAGES_DIR, "en.json")));
const lock = readJson(LOCK_FILE).entries ?? {};

const { missing, stale, obsolete } = diffTranslations(source, target, lock);

// 양쪽에 다 있는 키만 ICU 구조를 대조한다(없는 키는 위에서 이미 잡혔다)
const broken = [];
for (const [key, sourceValue] of source) {
  if (!target.has(key)) continue;
  broken.push(...validateTranslation(key, sourceValue, target.get(key)));
}

const hasProblems =
  missing.length > 0 ||
  stale.length > 0 ||
  obsolete.length > 0 ||
  broken.length > 0;

if (asJson) {
  // translate.mjs 가 작업 대상을 읽어가는 경로
  console.log(JSON.stringify({ missing, stale, obsolete, broken }, null, 2));
  process.exit(hasProblems ? 1 : 0);
}

console.log("=== 번역 정합성 검증 (ko → en) ===\n");
console.log(`원본 키: ${source.size}개 · 번역 키: ${target.size}개\n`);

/**
 * 문제 목록을 제목과 함께 출력한다.
 * @param {string} title - 섹션 제목
 * @param {string[]} items - 출력할 항목
 * @param {string} hint - 해결 방법 안내
 */
function report(title, items, hint) {
  if (items.length === 0) return;
  console.log(`❌ ${title} (${items.length}개)`);
  for (const item of items.slice(0, 20)) console.log(`   - ${item}`);
  if (items.length > 20) console.log(`   … 외 ${items.length - 20}개`);
  if (hint) console.log(`   ↳ ${hint}`);
  console.log("");
}

report("번역 누락", missing, "npm run i18n:translate 로 채운다");
report(
  "번역 낡음 (ko 가 바뀜)",
  stale,
  "npm run i18n:translate 로 다시 번역한다",
);
report(
  "잉여 번역 (ko 에 없음)",
  obsolete,
  "npm run i18n:translate 가 자동으로 정리한다",
);
report("ICU 구조 파손", broken, "번역문을 직접 고치거나 다시 번역한다");

if (!hasProblems) {
  console.log("✅ 문제 없음 — ko 와 en 이 일치하고 ICU 구조도 정상이다.");
}

process.exit(hasProblems ? 1 : 0);
