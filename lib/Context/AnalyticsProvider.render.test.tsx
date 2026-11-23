import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withPageVisit } from "../HOC/WithPageVisit";
import { usePageVisibility } from "../Hooks/usePageVisibility";
import { ResponseModel } from "../Model";
import { AnalyticsProvider } from "./AnalyticsContext";

const Page = () => <p>Projects page</p>;
const VisitedPage = withPageVisit(Page, "projects");

describe("AnalyticsProvider and withPageVisit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records the page a user stays on, once, after 10 s", async () => {
    vi.useFakeTimers();
    const onVisit = vi.fn(() => Promise.resolve(new ResponseModel<void>()));
    render(
      <AnalyticsProvider onVisit={onVisit}>
        <VisitedPage />
      </AnalyticsProvider>,
    );

    expect(screen.getByText("Projects page")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(9_000));
    expect(onVisit).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(onVisit).toHaveBeenCalledExactlyOnceWith("projects");
  });
});

const Visibility = () => <p>{usePageVisibility() ? "shown" : "hidden"}</p>;

describe("usePageVisibility", () => {
  it("follows the tab being hidden and shown again", () => {
    render(<Visibility />);
    expect(screen.getByText("shown")).toBeInTheDocument();

    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden,
      });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
    };
    setHidden(true);
    expect(screen.getByText("hidden")).toBeInTheDocument();
    setHidden(false);
    expect(screen.getByText("shown")).toBeInTheDocument();
  });
});
