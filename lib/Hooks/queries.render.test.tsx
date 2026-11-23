import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PagedModel, ResponseModel } from "../Model";
import { QUERY_FAILED } from "./queryError";
import { filterOfPage, usePaginatedQuery } from "./usePaginatedQuery";
import { useQuery } from "./useQuery";

/** A promise the test resolves when it wants. */
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const page = (items: string[], totalCount = items.length) => {
  const response = new ResponseModel<string[]>(
    undefined,
    undefined,
    undefined,
    totalCount,
  );
  return response.withData(items);
};

class UsersFilter extends PagedModel {
  constructor(
    public name = "",
    pageNumber = 1,
  ) {
    super(pageNumber, 2);
  }
}

describe("useQuery", () => {
  it("keeps the error of a failed answer, then clears it", async () => {
    const queryFunction = vi
      .fn()
      .mockResolvedValueOnce(
        new ResponseModel<string>(undefined, 500, "Admin down"),
      )
      .mockResolvedValueOnce(new ResponseModel<string>().withData("menu"));
    const { result } = renderHook(() =>
      useQuery<object, string>({ queryFunction, initialFilter: {} }),
    );

    await act(() => result.current.loadData({}));
    expect(result.current.error).toBe("Admin down");

    await act(() => result.current.loadData({}));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe("menu");
    expect(result.current.isLoaded).toBe(true);
  });

  it("keeps an error when no answer came, and still rejects", async () => {
    const failure = { reason: "network" };
    const queryFunction = vi.fn().mockRejectedValue(failure);
    const { result } = renderHook(() =>
      useQuery<object, string>({ queryFunction, initialFilter: {} }),
    );

    await act(() => expect(result.current.loadData({})).rejects.toBe(failure));
    expect(result.current.error).toBe(QUERY_FAILED);
  });

  it("ignores an answer older than the last request", async () => {
    const slow = deferred<ResponseModel<string>>();
    const queryFunction = vi
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(new ResponseModel<string>().withData("second"));
    const { result } = renderHook(() =>
      useQuery<object, string>({ queryFunction, initialFilter: {} }),
    );

    act(() => {
      void result.current.loadData({});
    });
    await act(() => result.current.loadData({}));
    await act(async () => {
      slow.resolve(new ResponseModel<string>().withData("first"));
      await slow.promise;
    });

    expect(result.current.data).toBe("second");
    expect(result.current.isLoading).toBe(false);
  });
});

describe("usePaginatedQuery", () => {
  it("counts the pages and keeps the error of the last answer", async () => {
    const queryFunction = vi
      .fn()
      .mockResolvedValueOnce(page(["ada", "alan"], 5))
      .mockResolvedValueOnce(
        new ResponseModel<string[]>(undefined, 403, "Not allowed"),
      );
    const { result } = renderHook(() =>
      usePaginatedQuery<UsersFilter, string>({
        queryFunction,
        initialFilter: new UsersFilter(),
      }),
    );

    await act(() => result.current.loadData(new UsersFilter("a")));
    expect(result.current.data).toEqual(["ada", "alan"]);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.error).toBeNull();

    await act(() => result.current.loadData(new UsersFilter("a")));
    expect(result.current.error).toBe("Not allowed");
  });

  it("changes page on a copy of the filter", async () => {
    const queryFunction = vi.fn((filter: UsersFilter) =>
      Promise.resolve(page([`page ${filter.pageNumber}`], 6)),
    );
    const { result } = renderHook(() =>
      usePaginatedQuery<UsersFilter, string>({
        queryFunction,
        initialFilter: new UsersFilter(),
      }),
    );
    const first = new UsersFilter("a");
    await act(() => result.current.loadData(first));

    act(() => result.current.onPageChange(3));

    await waitFor(() => expect(result.current.data).toEqual(["page 3"]));
    expect(first.pageNumber).toBe(1);
    expect(result.current.currentPage).toBe(3);
    const asked = queryFunction.mock.calls[1][0];
    expect(asked).toBeInstanceOf(UsersFilter);
    expect(asked).toMatchObject({ name: "a", pageNumber: 3, pageSize: 2 });
  });

  it("does nothing on a page change before a first request", () => {
    const queryFunction = vi.fn();
    const { result } = renderHook(() =>
      usePaginatedQuery<UsersFilter, string>({
        queryFunction,
        initialFilter: new UsersFilter(),
      }),
    );

    act(() => result.current.onPageChange(2));

    expect(queryFunction).not.toHaveBeenCalled();
  });

  it("shows the last page asked, not a slower earlier one", async () => {
    const slow = deferred<ResponseModel<string[]>>();
    const queryFunction = vi
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(page(["page 2"]));
    const { result } = renderHook(() =>
      usePaginatedQuery<UsersFilter, string>({
        queryFunction,
        initialFilter: new UsersFilter(),
      }),
    );

    act(() => {
      void result.current.loadData(new UsersFilter("", 1));
    });
    await act(() => result.current.loadData(new UsersFilter("", 2)));
    await act(async () => {
      slow.resolve(page(["page 1"]));
      await slow.promise;
    });

    expect(result.current.data).toEqual(["page 2"]);
  });
});

describe("filterOfPage", () => {
  it("copies the filter with another page and the same class", () => {
    const filter = new UsersFilter("ada", 1);

    const next = filterOfPage(filter, 4);

    expect(next).toBeInstanceOf(UsersFilter);
    expect(next).toMatchObject({ name: "ada", pageNumber: 4 });
    expect(filter.pageNumber).toBe(1);
  });
});
