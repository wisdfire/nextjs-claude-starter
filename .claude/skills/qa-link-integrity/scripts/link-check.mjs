#!/usr/bin/env node
// 링크/라우팅 정합성 자동 검증 스크립트
// ------------------------------------------------------------
// 목적: app/ 하위 page 파일에서 실제 URL 라우트를 추출하고,
//       코드 전체의 href / <Link href> / router.push / redirect 값과 대조하여
//       실제 존재하지 않는 경로를 가리키는 링크(404 유발 후보)를 찾아낸다.
//
// 사용법 (프로젝트 루트에서 실행):
//   node .claude/skills/qa-link-integrity/scripts/link-check.mjs
//
// 종료 코드: 문제 없으면 0, 매칭 실패 링크가 있으면 1 (CI/오케스트레이터가 판단)
//
// 주의: 정적 분석이므로 동적으로 조립되는 경로는 완전히 검증하지 못한다.
//       (${...} 부분은 파라미터로 정규화해 최대한 매칭을 시도한다.)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "app");
// 링크를 수집할 소스 디렉토리 (프로젝트 구조에 맞춰 존재하는 것만 스캔)
const SOURCE_DIRS = ["app", "components", "hooks", "lib", "src"].filter((d) =>
  existsSync(join(ROOT, d)),
);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * 디렉토리를 재귀적으로 순회하며 조건에 맞는 파일 경로를 모은다.
 * @param {string} dir - 시작 디렉토리 절대경로
 * @param {(p: string) => boolean} filter - 수집 조건
 * @returns {string[]} 절대경로 목록
 */
function walk(dir, filter) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    // node_modules / .next / .git 등은 스캔 대상에서 제외
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

/**
 * app/ 하위 page 파일 경로를 실제 URL 패턴으로 변환한다.
 * - route group (group) 은 URL에서 제거
 * - 동적 세그먼트 [param] 은 :param 으로, [...slug] 는 :slug* 로 정규화
 * @param {string} pageFile - page 파일 절대경로
 * @returns {string} URL 패턴 (예: /dashboard/:id)
 */
function pageFileToRoute(pageFile) {
  // app/ 기준 상대경로에서 마지막 파일명(page.tsx 등)을 떼어낸다.
  let rel = relative(APP_DIR, pageFile).replace(/\\/g, "/");
  rel = rel.replace(/\/?(page|route)\.(tsx?|jsx?)$/, "");
  const segments = rel
    .split("/")
    .filter((s) => s.length > 0)
    // (group) 세그먼트는 URL에 나타나지 않으므로 제거
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
    // 병렬 라우트(@slot)는 URL에 영향 없음 → 제거
    .filter((s) => !s.startsWith("@"))
    .map((s) => {
      // [...slug] catch-all → :slug*
      const catchAll = s.match(/^\[\.\.\.(.+)\]$/);
      if (catchAll) return `:${catchAll[1]}*`;
      // [param] 동적 세그먼트 → :param
      const dyn = s.match(/^\[(.+)\]$/);
      if (dyn) return `:${dyn[1]}`;
      return s;
    });
  return "/" + segments.join("/");
}

/**
 * 라우트 패턴을 매칭용 정규식으로 변환한다.
 * :param 은 한 세그먼트, :slug* 는 나머지 전체를 매칭한다.
 * @param {string} route - URL 패턴
 * @returns {RegExp}
 */
function routeToRegex(route) {
  const escaped = route
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":") && seg.endsWith("*")) return "(?:.+)?"; // catch-all
      if (seg.startsWith(":")) return "[^/]+"; // 동적 세그먼트
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // 리터럴 이스케이프
    })
    .join("/");
  return new RegExp("^" + escaped + "/?$");
}

/**
 * 코드에서 링크 값을 정규화한다.
 * - 쿼리/해시 제거
 * - 템플릿 리터럴의 ${...} 를 :param 자리로 치환
 * @param {string} raw
 * @returns {string}
 */
function normalizeLink(raw) {
  let v = raw.trim();
  v = v.split("?")[0].split("#")[0]; // 쿼리/해시 제거
  v = v.replace(/\$\{[^}]*\}/g, ":param"); // 템플릿 표현식 → 파라미터 자리
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1); // 끝 슬래시 정리
  return v;
}

/**
 * 링크가 검증 대상 내부 경로인지 판단한다(외부 URL/앵커/특수 스킴 제외).
 * @param {string} v
 * @returns {boolean}
 */
function isInternalPath(v) {
  if (!v.startsWith("/")) return false; // 절대 내부 경로만 검증
  if (v.startsWith("//")) return false; // 프로토콜 상대 URL(외부)
  return true;
}

// ── 1) 라우트 목록 구성 ────────────────────────────────────
const pageFiles = walk(APP_DIR, (p) => /\/(page|route)\.(tsx?|jsx?)$/.test(p));
const routes = pageFiles.map(pageFileToRoute);
const routeRegexes = routes.map((r) => ({ route: r, re: routeToRegex(r) }));

// ── 2) 링크 수집 ──────────────────────────────────────────
// href="...", href={'...'}, <Link href="...">, router.push('...'), redirect('...') 등
const LINK_PATTERNS = [
  /href\s*=\s*["'`]([^"'`]+)["'`]/g,
  /href\s*=\s*\{\s*["'`]([^"'`]+)["'`]\s*\}/g,
  /router\.(?:push|replace|prefetch)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /(?:^|[^.\w])(?:permanentR|r)edirect\s*\(\s*["'`]([^"'`]+)["'`]/g,
];

const codeFiles = SOURCE_DIRS.flatMap((d) =>
  walk(join(ROOT, d), (p) => CODE_EXT.has(p.slice(p.lastIndexOf(".")))),
);

/** @type {{file:string,line:number,value:string,normalized:string}[]} */
const links = [];
for (const file of codeFiles) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((lineText, idx) => {
    for (const pat of LINK_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(lineText)) !== null) {
        const value = m[1];
        const normalized = normalizeLink(value);
        if (!isInternalPath(normalized)) continue; // 내부 경로만 검증
        links.push({
          file: relative(ROOT, file),
          line: idx + 1,
          value,
          normalized,
        });
      }
    }
  });
}

// ── 3) 대조 ───────────────────────────────────────────────
/** @type {typeof links} */
const broken = [];
for (const link of links) {
  const ok = routeRegexes.some(({ re }) => re.test(link.normalized));
  if (!ok) broken.push(link);
}

// ── 4) 리포트 출력 ────────────────────────────────────────
console.log("=== 링크 정합성 검증 결과 ===\n");
console.log(`발견한 라우트 (${routes.length}개):`);
[...new Set(routes)].sort().forEach((r) => console.log(`  ${r}`));
console.log(`\n수집한 내부 링크: ${links.length}개`);

if (broken.length === 0) {
  console.log("\n✅ 매칭 실패 링크 없음 — 모든 내부 링크가 실제 라우트를 가리킨다.");
  process.exit(0);
}

console.log(`\n❌ 매칭 실패 링크 ${broken.length}개 (404 유발 후보):\n`);
for (const b of broken) {
  // 끝 세그먼트가 같은 라우트가 있으면 접두사 누락 가능성을 힌트로 제시
  const lastSeg = b.normalized.split("/").filter(Boolean).pop() ?? "";
  const hint = routes.find((r) => r.split("/").filter(Boolean).pop() === lastSeg && r !== b.normalized);
  console.log(`  ${b.file}:${b.line}`);
  console.log(`    링크: ${b.value}  (정규화: ${b.normalized})`);
  if (hint) console.log(`    ↳ route group/접두사 누락 의심 — 유사 라우트: ${hint}`);
  console.log("");
}
process.exit(1);
