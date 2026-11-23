import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives a new value once it stopped changing for the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "abc" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current[0]).toBe("a");

    act(() => vi.advanceTimersByTime(100));
    expect(result.current[0]).toBe("abc");
  });

  it("keeps a value set right after mounting", () => {
    const { result } = renderHook(() =>
      useDebouncedValue<string | null>(null, 300),
    );

    act(() => result.current[1]("projects"));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current[0]).toBe("projects");
  });
});
