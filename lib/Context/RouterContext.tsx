import { createContext, useContext } from "react";
import { Target } from "../Model";

export interface RouterContextProps {
  navigate: (
    path: string,
    options?: { replace?: boolean; target?: Target }
  ) => void;
  params: Record<string, string | undefined>;
  queryParams: URLSearchParams;
  pathname: string;
  basePath: string;
}

export const RouterContext = createContext<RouterContextProps | undefined>(
  undefined
);

export const getBasePath = () =>
  document.querySelector("base")?.getAttribute("href") || "/";

export const isAbsoluteUrl = (url: string) => /^[a-z]+:\/\/[^/]+/i.test(url);

export const useRouter = (): RouterContextProps => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
};
