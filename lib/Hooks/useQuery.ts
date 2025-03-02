import { useCallback, useState } from "react";
import { ResponseModel } from "../Model";

interface UseQueryProps<Filter, Response> {
  queryFunction: (filter: Filter) => Promise<ResponseModel<Response>>;
  initialFilter: Filter;
}

interface QueryResult<Filter, Response> {
  data?: Response;
  loadData: (filter: Filter) => Promise<ResponseModel<Response>>;
  filter: Filter | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export function useQuery<Filter, Response>({
  queryFunction,
}: UseQueryProps<Filter, Response>): QueryResult<Filter, Response> {
  const [data, setData] = useState<Response>();
  const [filter, setFilter] = useState<Filter | null>(null);
  const [isLoading, setIsloading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const loadData = useCallback(
    (filter: Filter) => {
      setFilter(filter);
      setIsloading(true);

      return queryFunction(filter)
        .then((response) => {
          setData(response.data);

          return response;
        })
        .finally(() => {
          setIsloading(false);
          setIsLoaded(true);
        });
    },
    [queryFunction]
  );

  return {
    data,
    loadData,
    filter,
    isLoading,
    isLoaded,
    error,
  };
}
