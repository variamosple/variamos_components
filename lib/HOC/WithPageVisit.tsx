import React from "react";
import { Events } from "../Common";
import { PAGE_VISIT_EVENT } from "../Context/AnalyticsContext";

export function withPageVisit<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  id: string
) {
  return (props: T) => {
    React.useEffect(() => {
      Events.publish(PAGE_VISIT_EVENT, { id });
    }, []);

    return <WrappedComponent {...props} />;
  };
}
