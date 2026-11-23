import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Paginator } from "./index";

const pageNumbers = () =>
  screen
    .getAllByRole("listitem")
    // Only the digits and the ellipsis: "(current)" and "More" are hidden
    .map((item) => item.textContent?.replace(/[^\d…]/g, ""))
    .filter((text) => text !== "");

describe("Paginator", () => {
  it("shows the pages around the current one, with ellipses", () => {
    render(
      <Paginator currentPage={10} totalPages={20} onPageChange={vi.fn()} />,
    );

    expect(pageNumbers()).toEqual([
      "1",
      "…",
      "8",
      "9",
      "10",
      "11",
      "12",
      "…",
      "20",
    ]);
  });

  it("shows every page of a short list", () => {
    render(<Paginator currentPage={2} totalPages={4} onPageChange={vi.fn()} />);

    expect(pageNumbers()).toEqual(["1", "2", "3", "4"]);
  });

  it("goes to the page chosen, and locks the way back on the first page", async () => {
    const onPageChange = vi.fn();
    render(
      <Paginator currentPage={1} totalPages={8} onPageChange={onPageChange} />,
    );

    await userEvent.click(screen.getByText("3"));
    await userEvent.click(screen.getByText("Next"));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
    expect(screen.getByText("Previous").closest("li")).toHaveClass("disabled");
  });
});
