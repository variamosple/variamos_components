import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUG_CATEGORIES_TIMEOUT_MS,
  bugCategoriesUrl,
  categoriesOf,
  FALLBACK_BUG_CATEGORIES,
  fetchBugCategories,
  useBugCategories,
} from "./bugCategories";

const answer = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );

// An answer that never comes, unless the request is stopped
const silent = () =>
  vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bugCategoriesUrl", () => {
  it.each([
    ["/v1", "/bugs/categories"],
    [
      "https://app.variamos.com/variamos_ms_admin/v1",
      "https://app.variamos.com/variamos_ms_admin/bugs/categories",
    ],
    [
      "https://app.variamos.com/variamos_ms_admin/",
      "https://app.variamos.com/variamos_ms_admin/bugs/categories",
    ],
  ])("puts the route next to the API of %s", (base, address) => {
    expect(bugCategoriesUrl(base)).toBe(address);
  });
});

describe("categoriesOf", () => {
  it("keeps the names in their order, once each", () => {
    expect(
      categoriesOf({
        transactionId: "queryCategories",
        data: ["Editor", "Model", "Editor", "Other"],
      }),
    ).toEqual(["Editor", "Model", "Other"]);
  });

  it("keeps a name as it is written", () => {
    expect(categoriesOf({ data: [" Editor"] })).toEqual([" Editor"]);
  });

  it.each([
    ["an error", { errorCode: 500, data: ["Editor"] }],
    ["no data", { transactionId: "tx" }],
    ["an empty list", { data: [] }],
    ["a list that is not one", { data: "Editor" }],
    ["an object", { data: { 0: "Editor" } }],
    ["a number in the list", { data: ["Editor", 3] }],
    ["an empty name", { data: ["Editor", ""] }],
    ["a blank name", { data: ["Editor", "  "] }],
    ["null", null],
    ["a text", "Editor"],
  ])("refuses %s", (_, body) => {
    expect(categoriesOf(body)).toBeNull();
  });
});

describe("fetchBugCategories", () => {
  it("reads the list of the public route without the cookie", async () => {
    const fetchImpl = answer({ data: ["Editor", "Language"] });

    await expect(
      fetchBugCategories("https://app.example.test/v1", { fetchImpl }),
    ).resolves.toEqual(["Editor", "Language"]);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://app.example.test/bugs/categories");
    expect(init?.credentials).toBe("omit");
    expect(init?.method).toBeUndefined();
  });

  it.each([
    ["a refusal", answer({ data: ["Editor"] }, 500)],
    ["an empty list", answer({ data: [] })],
    ["a list badly formed", answer({ data: [{ name: "Editor" }] })],
    [
      "a body that is not JSON",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response("<html>", { status: 200 })),
      ),
    ],
    [
      "no network",
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError("offline"))),
    ],
  ])("resolves to null on %s", async (_, fetchImpl) => {
    await expect(fetchBugCategories("/v1", { fetchImpl })).resolves.toBeNull();
  });

  it("gives up when the answer is late", async () => {
    vi.useFakeTimers();
    const fetchImpl = silent();

    const categories = fetchBugCategories("/v1", { fetchImpl });
    await vi.advanceTimersByTimeAsync(BUG_CATEGORIES_TIMEOUT_MS - 1);
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(categories).resolves.toBeNull();
  });

  it("stops when the caller no longer needs it", async () => {
    const fetchImpl = silent();
    const caller = new AbortController();

    const categories = fetchBugCategories("/v1", {
      fetchImpl,
      signal: caller.signal,
    });
    caller.abort();

    await expect(categories).resolves.toBeNull();
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("asks nothing when the caller already stopped", async () => {
    const fetchImpl = answer({ data: ["Editor"] });
    const caller = new AbortController();
    caller.abort();

    await expect(
      fetchBugCategories("/v1", { fetchImpl, signal: caller.signal }),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("useBugCategories", () => {
  it("gives the fixed list and asks nothing while the form is closed", () => {
    const fetchImpl = answer({ data: ["Editor"] });
    vi.stubGlobal("fetch", fetchImpl);

    const { result } = renderHook(() => useBugCategories("/v1", false));

    expect(result.current).toBe(FALLBACK_BUG_CATEGORIES);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("takes the list of the admin once the form is open, and keeps it", async () => {
    const fetchImpl = answer({ data: ["Editor", "Language"] });
    vi.stubGlobal("fetch", fetchImpl);

    const { result, rerender } = renderHook(
      ({ open }) => useBugCategories("/v1", open),
      { initialProps: { open: true } },
    );
    expect(result.current).toBe(FALLBACK_BUG_CATEGORIES);
    await waitFor(() => expect(result.current).toEqual(["Editor", "Language"]));

    rerender({ open: false });
    rerender({ open: true });
    expect(result.current).toEqual(["Editor", "Language"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps the fixed list after a failure, and asks again at the next opening", async () => {
    const fetchImpl = answer({ errorCode: 500 }, 500);
    vi.stubGlobal("fetch", fetchImpl);

    const { result, rerender } = renderHook(
      ({ open }) => useBugCategories("/v1", open),
      { initialProps: { open: true } },
    );
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    await act(() => Promise.resolve());
    expect(result.current).toBe(FALLBACK_BUG_CATEGORIES);

    fetchImpl.mockImplementation(() =>
      Promise.resolve(Response.json({ data: ["Model"] })),
    );
    rerender({ open: false });
    rerender({ open: true });

    await waitFor(() => expect(result.current).toEqual(["Model"]));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stops the request when the form closes", async () => {
    const fetchImpl = silent();
    vi.stubGlobal("fetch", fetchImpl);

    const { result, rerender } = renderHook(
      ({ open }) => useBugCategories("/v1", open),
      { initialProps: { open: true } },
    );
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    rerender({ open: false });

    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(result.current).toBe(FALLBACK_BUG_CATEGORIES);
  });

  it("asks the new admin when the address changes", async () => {
    const fetchImpl = vi.fn<typeof fetch>((input) =>
      Promise.resolve(
        Response.json({
          data: String(input).startsWith("/other") ? ["Other"] : ["Editor"],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const { result, rerender } = renderHook(
      ({ url }) => useBugCategories(url, true),
      { initialProps: { url: "/v1" } },
    );
    await waitFor(() => expect(result.current).toEqual(["Editor"]));

    rerender({ url: "/other/v1" });
    expect(result.current).toBe(FALLBACK_BUG_CATEGORIES);
    await waitFor(() => expect(result.current).toEqual(["Other"]));
  });
});
