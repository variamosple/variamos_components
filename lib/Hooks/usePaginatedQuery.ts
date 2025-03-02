import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { PagedModel, ResponseModel } from "../Model";

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
  error: string | null;
  onPageChange: (page: number) => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}

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
  const [isLoading, setIsloading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const loadData = useCallback(
    (filter: Filter) => {
      setFilter(filter);
      setIsloading(true);
      setCurrentPage(filter.pageNumber || 1);

      return queryFunction(filter)
        .then((response) => {
          setData(response.data ?? []);
          setTotalItems(response.totalCount || 0);
          setTotalPages(
            Math.ceil((response.totalCount || 0) / filter.pageSize)
          );

          return response;
        })
        .finally(() => {
          setIsloading(false);
        });
    },
    [queryFunction]
  );

  const onPageChange = useCallback(
    (pageNumber: number) => {
      loadData(
        Object.assign(filter!, {
          pageNumber,
        })
      );
    },
    [filter, loadData]
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
