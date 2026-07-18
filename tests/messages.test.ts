import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { routing } from "@/i18n/routing";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";

/**
 * 중첩 객체의 모든 리프(leaf) 키를 "a.b.c" 형태의 평탄한 경로 목록으로 만든다.
 *
 * @param value - 검사할 번역 객체(중첩 가능)
 * @param prefix - 재귀 호출 시 누적되는 상위 키 경로
 * @returns 정렬된 키 경로 배열
 */
function flattenKeys(value: unknown, prefix = ""): string[] {
  // 리프 노드(문자열 등)에 도달하면 현재까지의 경로를 반환
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  // 객체면 각 프로퍼티로 재귀하며 경로를 이어붙인다
  return Object.entries(value)
    .flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}

/**
 * 번역 메시지 정합성 테스트
 *
 * 언어별 JSON의 키가 어긋나면 해당 언어에서 원문 키("Home.title")가
 * 그대로 화면에 노출된다. 이런 화면은 애드센스 심사에서 미완성 페이지로
 * 읽히므로, 키 불일치를 빌드 전에 테스트로 잡는다.
 */
describe("번역 메시지", () => {
  it("지원 로케일마다 messages 파일이 존재한다", () => {
    const files: Record<string, unknown> = { ko, en };
    for (const locale of routing.locales) {
      expect(files[locale], `${locale}.json 이 없다`).toBeDefined();
    }
  });

  it("ko와 en의 번역 키 집합이 완전히 동일하다", () => {
    // 어느 한쪽에만 있는 키가 있으면 그 언어에서 문구가 깨진다
    expect(flattenKeys(en)).toEqual(flattenKeys(ko));
  });

  /**
   * ICU 구조·최신성 검증
   *
   * en.json 은 LLM이 생성하므로 그럴듯하지만 구조가 깨진 번역이 섞일 수 있다.
   * 특히 영어 복수형에서 `one` 카테고리를 빠뜨려 "5 post"가 되는 실수가 잦다.
   * 커밋 훅이 막지만, 훅을 건너뛴(--no-verify) 커밋과 CI를 위해 여기서도 고정한다.
   */
  it("ko와 en의 ICU 구조가 일치하고 번역이 최신이다", () => {
    // check.mjs 를 그대로 재사용한다 — 검증 규칙이 두 곳으로 갈라지지 않게.
    const result = spawnSync("node", ["scripts/i18n/check.mjs"], {
      encoding: "utf8",
    });
    expect(result.stdout, result.stdout).not.toContain("❌");
    expect(result.status).toBe(0);
  });

  it("빈 문자열인 번역 값이 없다", () => {
    // 빈 값은 화면에 아무것도 안 나오는 미완성 UI로 이어진다
    const findEmpty = (value: unknown, path = ""): string[] => {
      if (typeof value === "string") {
        return value.trim() === "" ? [path] : [];
      }
      if (typeof value !== "object" || value === null) return [];
      return Object.entries(value).flatMap(([key, child]) =>
        findEmpty(child, path ? `${path}.${key}` : key),
      );
    };

    expect(findEmpty(ko)).toEqual([]);
    expect(findEmpty(en)).toEqual([]);
  });
});
