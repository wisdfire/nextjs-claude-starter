#!/usr/bin/env node
// ko.json → en.json LLM 번역 (Claude Code 헤드리스 호출)
// ------------------------------------------------------------
// 목적: 한국어 원본에서 바뀐 UI 문자열만 영어로 번역해 en.json 을 최신으로 유지한다.
//
// 동작 순서:
//   1. check 로 누락(missing)·낡음(stale)·잉여(obsolete) 키를 뽑는다
//   2. 잉여 키는 그냥 버린다 (ko 에서 지운 문구)
//   3. 누락·낡음 키만 모아 `claude -p` 에 구조화 출력(--json-schema)으로 번역 요청
//   4. 결과를 병합해 en.json 을 ko 와 같은 키 순서로 다시 쓴다
//   5. lock 파일에 번역 시점의 ko 해시를 기록한다 (다음 stale 판정 기준)
//   6. 마지막으로 검증을 다시 돌려 LLM 이 ICU 를 망가뜨렸으면 실패시킨다
//
// ⚠️ 6번이 핵심이다. LLM 은 영어 복수형에서 `one` 카테고리를 자주 빠뜨려
//    "5 post" 같은 문구를 만든다. 사람이 안 보고 커밋하는 구조이므로 여기서 막는다.
//
// 사용법:
//   node scripts/i18n/translate.mjs           # 바뀐 것만 번역
//   node scripts/i18n/translate.mjs --all     # 전체 재번역
//   node scripts/i18n/translate.mjs --dry-run # 대상만 출력하고 호출하지 않음
//   node scripts/i18n/translate.mjs --adopt   # LLM 없이 현재 en.json 을 "최신"으로 인정
//
// --adopt 는 두 경우에 쓴다:
//   ① 최초 도입 시 이미 사람이 써 둔 번역을 그대로 채택할 때
//   ② 사람이 en.json 을 손수 고친 뒤 그 번역을 확정할 때 (안 하면 다음 실행에서 덮어쓴다)
//
// 종료 코드: 성공 0, 실패 1

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  MESSAGES_DIR,
  LOCK_FILE,
  readJson,
  writeJson,
  flatten,
  unflattenLike,
  fingerprint,
  diffTranslations,
  validateTranslation,
} from "./lib.mjs";

const argv = process.argv.slice(2);
const retranslateAll = argv.includes("--all");
const dryRun = argv.includes("--dry-run");
const adopt = argv.includes("--adopt");

// 번역 품질과 비용의 균형점. 필요하면 I18N_TRANSLATE_MODEL 로 바꾼다.
const MODEL = process.env.I18N_TRANSLATE_MODEL ?? "sonnet";
// 한 번에 보낼 최대 키 수 (너무 크면 출력이 잘리고, 너무 작으면 호출이 늘어난다)
const BATCH_SIZE = 40;

const koPath = join(MESSAGES_DIR, "ko.json");
const enPath = join(MESSAGES_DIR, "en.json");

const koTree = readJson(koPath);
const source = flatten(koTree);
const target = flatten(readJson(enPath));
const lock = readJson(LOCK_FILE).entries ?? {};

const { missing, stale, obsolete } = diffTranslations(source, target, lock);
const todo = retranslateAll ? [...source.keys()] : [...missing, ...stale];

/**
 * lock 파일을 현재 ko 값 기준으로 다시 쓴다.
 *
 * 여기 기록된 해시가 다음 실행에서 "이 번역이 낡았는가"를 판정하는 기준이 된다.
 *
 * @param {Map<string,string>} sourceMap - ko 평탄 Map
 * @param {Map<string,string>} targetMap - 현재 en 평탄 Map
 */
function writeLock(sourceMap, targetMap) {
  const entries = {};
  for (const [key, value] of sourceMap) {
    if (targetMap.has(key)) entries[key] = fingerprint(value);
  }
  writeJson(LOCK_FILE, {
    note: "ko.json 값의 지문. en.json 이 낡았는지 판정하는 데 쓴다. 직접 수정하지 말 것.",
    sourceLocale: "ko",
    entries,
  });
}

console.log(
  `번역 대상: ${todo.length}개 (누락 ${missing.length} · 낡음 ${stale.length}) · 잉여 정리 ${obsolete.length}개`,
);

if (dryRun) {
  for (const key of todo) console.log(`  - ${key}`);
  process.exit(0);
}

// --adopt: LLM 을 부르지 않고 현재 en.json 을 그대로 "최신"으로 인정한다.
// 번역 내용은 건드리지 않고 lock 만 현재 ko 기준으로 다시 쓴다.
if (adopt) {
  const adopted = new Map(target);
  for (const key of obsolete) adopted.delete(key);

  const missingAfter = [...source.keys()].filter((k) => !adopted.has(k));
  if (missingAfter.length > 0) {
    console.error(
      `❌ en.json 에 없는 키가 ${missingAfter.length}개 있어 채택할 수 없다:`,
    );
    for (const key of missingAfter.slice(0, 20)) console.error(`   - ${key}`);
    console.error("   먼저 번역을 채운 뒤(--adopt 없이 실행) 다시 시도하라.");
    process.exit(1);
  }

  // 채택 전에도 ICU 구조는 검증한다 — 깨진 번역을 "최신"으로 굳히면 안 된다
  const adoptProblems = [];
  for (const [key, sourceValue] of source) {
    adoptProblems.push(
      ...validateTranslation(key, sourceValue, adopted.get(key)),
    );
  }
  if (adoptProblems.length > 0) {
    console.error(`❌ 현재 번역에 문제가 있어 채택할 수 없다:`);
    for (const problem of adoptProblems) console.error(`   - ${problem}`);
    process.exit(1);
  }

  writeJson(enPath, unflattenLike(koTree, adopted));
  writeLock(source, adopted);
  console.log(
    `✅ 현재 en.json 을 최신으로 채택했다 (${adopted.size}개 · LLM 호출 없음).`,
  );
  process.exit(0);
}

if (todo.length === 0 && obsolete.length === 0) {
  console.log("✅ 이미 최신이다 — 번역할 것이 없다.");
  process.exit(0);
}

/**
 * Claude Code 를 헤드리스로 호출해 UI 문자열 묶음을 번역한다.
 *
 * `--json-schema` 로 구조화 출력을 강제하므로 응답 파싱이 안전하다.
 * 도구는 전부 막는다 — 이 작업에 파일 접근이 필요 없고, 훅 안에서 도는
 * 프로세스가 저장소를 건드리면 안 되기 때문이다.
 *
 * @param {Record<string,string>} batch - 번역 키 → 한국어 원문
 * @returns {Record<string,string>} 번역 키 → 영어 번역
 */
function translateBatch(batch) {
  const schema = JSON.stringify({
    type: "object",
    properties: {
      translations: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    },
    required: ["translations"],
    additionalProperties: false,
  });

  const prompt = [
    "너는 웹 애플리케이션 UI 문자열 번역기다. 한국어(ko) 원문을 영어(en)로 번역하라.",
    "",
    "규칙:",
    "1. 입력 JSON의 키는 그대로 두고 값만 번역한다. 모든 키를 빠짐없이 반환한다.",
    "2. UI 문자열이다 — 간결하고 자연스러운 제품 영어로 쓴다. 직역투를 피한다.",
    "3. ICU 플레이스홀더 `{name}` 은 이름을 바꾸지 말고 그대로 보존한다.",
    "4. 복수형은 반드시 영어 카테고리를 모두 갖춘다:",
    "   한국어 `{count, plural, other {게시물 #개}}`",
    "   → 영어 `{count, plural, one {# post} other {# posts}}`",
    "   `one` 을 빠뜨리면 '5 post' 가 되어 틀린 문장이 된다. 절대 생략하지 마라.",
    "5. `<code>…</code>` 같은 리치 텍스트 태그는 위치와 이름을 보존한다.",
    "6. 고유명사·제품명·코드 조각(.env.local, npm run dev 등)은 번역하지 않는다.",
    "7. 번역문만 반환한다. 설명·주석을 덧붙이지 않는다.",
    "",
    "번역할 항목:",
    JSON.stringify(batch, null, 2),
  ].join("\n");

  const result = spawnSync(
    "claude",
    [
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      schema,
      "--model",
      MODEL,
      // 기본 시스템 프롬프트·프로젝트 컨텍스트를 걷어내 토큰과 비용을 줄인다
      "--system-prompt",
      "You are a UI string translator. Return only the requested JSON.",
      // 파일·네트워크 도구를 전부 차단한다 (번역에 불필요하고, 훅 안에서 위험하다)
      "--disallowed-tools",
      "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,Agent,NotebookEdit",
    ],
    { input: prompt, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );

  if (result.error) {
    throw new Error(
      `claude 실행 실패: ${result.error.message}\n` +
        "Claude Code CLI가 설치돼 있고 로그인돼 있는지 확인하라.",
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `claude 종료 코드 ${result.status}\n${result.stderr || result.stdout}`,
    );
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `claude 응답을 JSON으로 파싱하지 못했다:\n${result.stdout}`,
    );
  }

  // --json-schema 를 쓰면 검증된 객체가 structured_output 에 담겨 온다
  const translations = payload.structured_output?.translations;
  if (!translations || typeof translations !== "object") {
    throw new Error(
      `구조화 출력에 translations 가 없다:\n${JSON.stringify(payload).slice(0, 800)}`,
    );
  }
  return translations;
}

// ── 번역 실행 (배치로 나눠 호출) ────────────────────────────────
const merged = new Map(target);

// ko 에서 사라진 키는 en 에서도 지운다
for (const key of obsolete) merged.delete(key);

for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  const slice = todo.slice(i, i + BATCH_SIZE);
  const batch = Object.fromEntries(slice.map((k) => [k, source.get(k)]));

  console.log(
    `  번역 중 ${i + 1}–${i + slice.length} / ${todo.length} (모델: ${MODEL})…`,
  );
  const translated = translateBatch(batch);

  for (const key of slice) {
    const value = translated[key];
    if (typeof value !== "string" || value.trim() === "") {
      console.error(`  ⚠️  ${key}: 번역이 비어 돌아왔다 — 기존 값을 유지한다`);
      continue;
    }
    merged.set(key, value);
  }
}

// ── 저장 ────────────────────────────────────────────────────────
// ko 트리 구조·키 순서를 그대로 따라 써서 diff 를 안정적으로 유지한다
writeJson(enPath, unflattenLike(koTree, merged));

// lock 갱신: 지금 en 에 반영된 키의 "번역 당시 ko 해시"를 기록한다
writeLock(source, merged);

// ── 최종 검증: LLM 출력이 ICU 를 망가뜨렸는지 확인한다 ──────────
const problems = [];
for (const [key, sourceValue] of source) {
  if (!merged.has(key)) continue;
  problems.push(...validateTranslation(key, sourceValue, merged.get(key)));
}

if (problems.length > 0) {
  console.error(`\n❌ 번역 결과에 문제가 있다 (${problems.length}건):`);
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error(
    "\n번역문(messages/en.json)을 직접 고치거나 다시 실행하라. 커밋을 중단한다.",
  );
  process.exit(1);
}

console.log(
  `\n✅ 번역 완료 — ${todo.length}개 갱신, ${obsolete.length}개 정리. messages/en.json 저장됨.`,
);
