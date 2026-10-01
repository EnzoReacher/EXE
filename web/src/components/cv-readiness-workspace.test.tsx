import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CvReadinessWorkspace } from "./cv-readiness-workspace";

describe("CvReadinessWorkspace", () => {
  it("loads fictional sample data and renders the four-state report", async () => {
    const user = userEvent.setup();
    render(<CvReadinessWorkspace />);

    await user.click(screen.getByRole("button", { name: /điền dữ liệu mẫu/i }));
    expect(screen.getByLabelText(/nội dung hồ sơ/i)).toHaveProperty("value");
    expect(screen.getByLabelText(/tên vị trí/i)).toHaveProperty("value", "Backend Developer Intern");

    await user.click(screen.getByRole("button", { name: /đối chiếu cv với jd/i }));

    expect(screen.getByRole("heading", { name: /những gì cv đang thể hiện/i })).toBeDefined();
    expect(screen.getAllByText("Có bằng chứng").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Một phần").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa rõ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa thấy trong CV").length).toBeGreaterThan(0);
    expect(screen.getByText(/không phải chấm điểm tuyển dụng/i)).toBeDefined();
  });

  it("shows a recoverable validation message and keeps the form available", () => {
    render(<CvReadinessWorkspace />);
    fireEvent.submit(screen.getByRole("button", { name: /đối chiếu cv với jd/i }).closest("form")!);

    expect(screen.getByRole("status").textContent).toMatch(/ít nhất 30 ký tự nội dung CV/);
    expect(screen.getByLabelText(/nội dung hồ sơ/i)).toBeDefined();
  });
});
