import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import type { PagedModel, ResponseModel } from "../Model";
import { errorOfFailure, errorOfResponse } from "./queryError";

interface UsePaginatedQueryProps<Filter extends PagedModel, Response> {
  queryFunction: (filter: Filter) => Promise<ResponseModel<Response[]>>;
  initialFilter: Filter;
  initialPage?: number;
}

interface PaginatedQueryResult<Filter extends PagedModel, Response> {
  data: Response[];
  loadData: (filter: Filter) => Promise<ResponseModel<Response[]>>;
  filter: Filter | null;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  /** Why the last request failed; null once a request succeeds. */
  error: string | null;
  onPageChange: (page: number) => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}

/**
 * The filter of another page: a copy with the same prototype, so that the
 * filter classes of the applications keep their type.
 */
export const filterOfPage = <Filter extends PagedModel>(
  filter: Filter,
  pageNumber: number,
): Filter =>
  Object.assign(Object.create(Object.getPrototypeOf(filter)), filter, {
    pageNumber,
  });

export function usePaginatedQuery<Filter extends PagedModel, Response>({
  queryFunction,
  initialPage = 1,
}: UsePaginatedQueryProps<Filter, Response>): PaginatedQueryResult<
  Filter,
  Response
> {
  const [data, setData] = useState<Response[]>([]);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalItems, setTotalItems] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Only the answer of the last request is shown: a slow page 1 arriving
  // after page 2 no longer replaces it (ADM-N13)
  const lastRequestRef = useRef(0);

  const loadData = useCallback(
    (next: Filter) => {
      const request = ++lastRequestRef.current;
      const isLatest = () => request === lastRequestRef.current;
      setFilter(next);
      setIsLoading(true);
      setCurrentPage(next.pageNumber || 1);

      return queryFunction(next)
        .then(
          (response) => {
            if (isLatest()) {
              setData(response.data ?? []);
              setTotalItems(response.totalCount ?? 0);
              setTotalPages(
                Math.ceil((response.totalCount ?? 0) / next.pageSize),
              );
              setError(errorOfResponse(response));
            }
            return response;
          },
          (failure: unknown) => {
            if (isLatest()) setError(errorOfFailure(failure));
            throw failure;
          },
        )
        .finally(() => {
          if (isLatest()) setIsLoading(false);
        });
    },
    [queryFunction],
  );

  const onPageChange = useCallback(
    (pageNumber: number) => {
      // No page to change before a first query
      if (!filter) return;
      // A copy: the filter of the caller and of the last request stay as
      // they were
      void loadData(filterOfPage(filter, pageNumber));
    },
    [filter, loadData],
  );

  return {
    data,
    loadData,
    filter,
    currentPage,
    totalItems,
    totalPages,
    isLoading,
    error,
    onPageChange,
    setCurrentPage,
  };
}
