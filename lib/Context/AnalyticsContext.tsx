import { createContext, FC, useEffect } from "react";

import { Events } from "../Common";
import { useDebouncedValue } from "../Hooks/useDebouncedValue";
import { ResponseModel } from "../Model";

export const AnalyticsContext = createContext<unknown>({});

export const PAGE_VISIT_EVENT = "page-visit";

export interface AnalyticsProviderProps {
  onVisit: (pageId: string) => Promise<ResponseModel<void>>;
  children?: React.ReactNode;
}

export const AnalyticsProvider: FC<AnalyticsProviderProps> = ({
  onVisit,
  children,
}) => {
  const [pageId, setPageId] = useDebouncedValue<string | null>(null, 10_000);

  useEffect(() => {
    Events.subscribe<{ id: string }>(PAGE_VISIT_EVENT, (event) => {
      setPageId(event.detail.id);
    });
  }, [setPageId]);

  useEffect(() => {
    if (pageId) {
      onVisit(pageId).then(() => {});
    }
  }, [pageId, onVisit]);

  return (
    <AnalyticsContext.Provider value={{}}>{children}</AnalyticsContext.Provider>
  );
};
