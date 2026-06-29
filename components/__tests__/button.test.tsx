import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

/**
 * Button 컴포넌트 예제 테스트
 *
 * 스타터킷의 Vitest + Testing Library 설정이 정상 동작하는지 검증하는 본보기 테스트.
 * 새 컴포넌트를 만들 때 이 파일을 참고하여 테스트를 작성한다.
 */
describe("Button", () => {
  it("자식 텍스트를 렌더링한다", () => {
    render(<Button>확인</Button>);
    // 버튼 역할 + 접근성 이름으로 요소를 찾아 존재를 확인
    expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
  });

  it("클릭하면 onClick 핸들러를 호출한다", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>클릭</Button>);
    // 실제 사용자 클릭 이벤트를 시뮬레이션
    await user.click(screen.getByRole("button", { name: "클릭" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
