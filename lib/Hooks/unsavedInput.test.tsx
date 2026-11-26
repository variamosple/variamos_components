import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasUnsavedInput,
  isUnsavedInput,
  useHasUnsavedInput,
  useUnsavedInput,
} from "./unsavedInput";

describe("isUnsavedInput", () => {
  it("sees nothing in a form as it opened", () => {
    expect(isUnsavedInput({}, { title: "", file: null })).toBe(false);
    expect(
      isUnsavedInput({ name: "Admin" }, { name: "Admin", note: undefined }),
    ).toBe(false);
  });

  it("does not count blanks", () => {
    expect(isUnsavedInput({}, { title: "   ", description: "\n" })).toBe(false);
    expect(isUnsavedInput({ name: "Admin" }, { name: " Admin " })).toBe(false);
  });

  it("sees a typed text, a changed value and a chosen file", () => {
    expect(isUnsavedInput({}, { title: "Crash" })).toBe(true);
    expect(isUnsavedInput({ name: "Admin" }, { name: "Admins" })).toBe(true);
    expect(isUnsavedInput({ name: "Admin" }, { name: "" })).toBe(true);
    expect(isUnsavedInput({ visible: false }, { visible: true })).toBe(true);
    const file = new File(["x"], "trace.txt");
    expect(isUnsavedInput({ file: null }, { file })).toBe(true);
  });

  it("compares lists and objects by what they hold", () => {
    expect(isUnsavedInput({ roles: ["a"] }, { roles: ["a"] })).toBe(false);
    expect(isUnsavedInput({ roles: ["a"] }, { roles: ["a", "b"] })).toBe(true);
    expect(
      isUnsavedInput({ target: { role: "" } }, { target: { role: "" } }),
    ).toBe(false);
    expect(
      isUnsavedInput({ target: { role: "" } }, { target: { role: "x" } }),
    ).toBe(true);
  });
});

describe("useUnsavedInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("holds the page while a form has input, and lets it go after", () => {
    const watched = renderHook(() => useHasUnsavedInput());
    const form = renderHook(({ holds }) => useUnsavedInput(holds), {
      initialProps: { holds: false },
    });
    expect(hasUnsavedInput()).toBe(false);

    form.rerender({ holds: true });
    expect(hasUnsavedInput()).toBe(true);
    watched.rerender();
    expect(watched.result.current).toBe(true);

    form.rerender({ holds: false });
    expect(hasUnsavedInput()).toBe(false);
  });

  it("lets the page go when the form is closed", () => {
    const form = renderHook(() => useUnsavedInput(true));
    expect(hasUnsavedInput()).toBe(true);
    form.unmount();
    expect(hasUnsavedInput()).toBe(false);
  });

  it("asks the browser to confirm closing the tab only while input is held", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const first = renderHook(() => useUnsavedInput(true));
    const second = renderHook(() => useUnsavedInput(true));

    const beforeUnload = (calls: unknown[][]) =>
      calls.filter(([type]) => type === "beforeunload").length;
    expect(beforeUnload(add.mock.calls)).toBe(1);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    first.unmount();
    expect(beforeUnload(remove.mock.calls)).toBe(0);
    second.unmount();
    expect(beforeUnload(remove.mock.calls)).toBe(1);
  });
});
