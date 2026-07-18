import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import messages from "@/messages/ko.json";

// 라우터는 외부 경계이므로 모킹한다 (컴포넌트 자체는 모킹하지 않는다)
const replace = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/about",
}));

/**
 * LocaleSwitcher 컴포넌트 테스트
 *
 * 언어 전환의 핵심 계약을 고정한다:
 *   - 현재 로케일이 선택 상태로 표시되는가
 *   - 다른 언어를 고르면 "현재 경로를 유지한 채" 해당 로케일로 이동하는가
 *   - 같은 언어를 다시 고르면 불필요한 이동을 하지 않는가
 */
describe("LocaleSwitcher", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  // 한국어 로케일 컨텍스트로 감싸 렌더하는 헬퍼
  const renderSwitcher = (locale = "ko") =>
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );

  it("언어 선택 버튼을 접근 가능한 이름으로 렌더한다", () => {
    renderSwitcher();
    expect(
      screen.getByRole("button", { name: "언어 선택" }),
    ).toBeInTheDocument();
  });

  it("현재 로케일이 선택된 상태로 표시된다", async () => {
    const user = userEvent.setup();
    renderSwitcher("ko");

    await user.click(screen.getByRole("button", { name: "언어 선택" }));

    // 드롭다운이 열리면 한국어 항목이 선택(checked) 상태여야 한다
    const koItem = await screen.findByRole("menuitemradio", {
      name: "한국어",
    });
    expect(koItem).toHaveAttribute("aria-checked", "true");
  });

  it("다른 언어를 고르면 현재 경로를 유지한 채 해당 로케일로 이동한다", async () => {
    const user = userEvent.setup();
    renderSwitcher("ko");

    await user.click(screen.getByRole("button", { name: "언어 선택" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "English" }),
    );

    // 경로(/about)는 그대로 두고 locale 만 en 으로 바뀌어야 한다
    expect(replace).toHaveBeenCalledWith("/about", { locale: "en" });
  });

  it("현재와 같은 언어를 고르면 이동하지 않는다", async () => {
    const user = userEvent.setup();
    renderSwitcher("ko");

    await user.click(screen.getByRole("button", { name: "언어 선택" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "한국어" }),
    );

    expect(replace).not.toHaveBeenCalled();
  });
});
