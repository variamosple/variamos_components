import { describe, expect, it, vi } from "vitest";
import { focusMainContent, isPlainClick } from "./keyboardAccess";

const click = {
  button: 0,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
};

describe("focusMainContent (ADM-N15)", () => {
  it("gives the focus to the main content", () => {
    const focus = vi.fn();
    const getElementById = vi.fn(() => ({ focus }) as unknown as HTMLElement);

    expect(focusMainContent("main-content", { getElementById })).toBe(true);
    expect(getElementById).toHaveBeenCalledWith("main-content");
    expect(focus).toHaveBeenCalledOnce();
  });

  it("does nothing when the page has no such element", () => {
    expect(
      focusMainContent("main-content", { getElementById: () => null }),
    ).toBe(false);
  });
});

describe("isPlainClick", () => {
  it("handles a click of the main button, and Enter on the link", () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it.each([
    ["the middle button", { button: 1 }],
    ["Ctrl", { ctrlKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["Meta", { metaKey: true }],
  ])("leaves %s to the browser", (_, change) => {
    expect(isPlainClick({ ...click, ...change })).toBe(false);
  });
});
