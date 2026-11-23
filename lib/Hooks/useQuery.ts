import { useCallback, useRef, useState } from "react";
import type { ResponseModel } from "../Model";
import { errorOfFailure, errorOfResponse } from "./queryError";

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
  /** Why the last request failed; null once a request succeeds. */
  error: string | null;
}

export function useQuery<Filter, Response>({
  queryFunction,
}: UseQueryProps<Filter, Response>): QueryResult<Filter, Response> {
  const [data, setData] = useState<Response>();
  const [filter, setFilter] = useState<Filter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Only the answer of the last request is shown: an older one arriving
  // later is ignored (ADM-N13)
  const lastRequestRef = useRef(0);

  const loadData = useCallback(
    (next: Filter) => {
      const request = ++lastRequestRef.current;
      const isLatest = () => request === lastRequestRef.current;
      setFilter(next);
      setIsLoading(true);

      return queryFunction(next)
        .then(
          (response) => {
            if (isLatest()) {
              setData(response.data);
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
          if (isLatest()) {
            setIsLoading(false);
            setIsLoaded(true);
          }
        });
    },
    [queryFunction],
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
