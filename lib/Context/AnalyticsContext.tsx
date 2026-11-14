import { createContext, type FC, type ReactNode, useEffect } from "react";

import { Events } from "../Common";
import { useDebouncedValue } from "../Hooks/useDebouncedValue";
import type { ResponseModel } from "../Model";

export const AnalyticsContext = createContext<unknown>({});

export const PAGE_VISIT_EVENT = "page-visit";

export interface AnalyticsProviderProps {
  onVisit: (pageId: string) => Promise<ResponseModel<void>>;
  children?: ReactNode;
}

export const AnalyticsProvider: FC<AnalyticsProviderProps> = ({
  onVisit,
  children,
}) => {
  const [pageId, setPageId] = useDebouncedValue<string | null>(null, 10_000);

  useEffect(() => {
    const onPageVisit = (event: CustomEvent<{ id: string }>) => {
      setPageId(event.detail.id);
    };
    Events.subscribe(PAGE_VISIT_EVENT, onPageVisit);
    // Without it, every new provider left its listener behind
    return () => Events.unsubscribe(PAGE_VISIT_EVENT, onPageVisit);
  }, [setPageId]);

  useEffect(() => {
    if (pageId) {
      void onVisit(pageId);
    }
  }, [pageId, onVisit]);

  return (
    <AnalyticsContext.Provider value={{}}>{children}</AnalyticsContext.Provider>
  );
};
