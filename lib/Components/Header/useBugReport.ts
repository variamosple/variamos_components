import { useCallback, useEffect, useState } from "react";
import { Events } from "../../Common";
import { useSession } from "../../Context";
import { type BugReport, submitBugReport } from "./submitBugReport";

/** What the global bug form opens with, the reporter still free to change. */
export interface BugReportPrefill {
  title?: string;
  description?: string;
}

const OPEN_BUG_REPORT_EVENT = "openReportBugModal";

/**
 * Opens the global bug form of the header, filled with `prefill`: a page
 * that failed reports its own error, for instance.
 */
export const openBugReport = (prefill: BugReportPrefill = {}) => {
  Events.publish<BugReportPrefill>(OPEN_BUG_REPORT_EVENT, prefill);
};

// Only texts are taken from the event, whoever published it
const prefillOf = (detail: unknown): BugReportPrefill => {
  if (typeof detail !== "object" || detail === null) return {};
  const title = "title" in detail ? detail.title : undefined;
  const description = "description" in detail ? detail.description : undefined;
  return {
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof description === "string" ? { description } : {}),
  };
};

/**
 * The global bug form: opened from the menu or by the "openReportBugModal"
 * event (openBugReport), closed only once the report is sent; a refusal
 * stays in the form.
 */
export function useBugReport(adminApiUrl: string) {
  const { user, checkSession } = useSession();
  const [show, setShow] = useState(false);
  const [prefill, setPrefill] = useState<BugReportPrefill>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((initial: BugReportPrefill = {}) => {
    setError(null);
    setPrefill(initial);
    setShow(true);
  }, []);

  useEffect(() => {
    const onOpen = (event: CustomEvent<unknown>) =>
      open(prefillOf(event.detail));
    Events.subscribe(OPEN_BUG_REPORT_EVENT, onOpen);
    return () => {
      Events.unsubscribe(OPEN_BUG_REPORT_EVENT, onOpen);
    };
  }, [open]);

  const submit = async (report: BugReport, file?: File) => {
    setIsSubmitting(true);
    setError(null);
    const refusal = await submitBugReport(report, file, {
      adminApiUrl,
      reporterEmail: user?.email,
    });
    setIsSubmitting(false);
    if (refusal) {
      setError(refusal);
      // A refused session is renewed or said, and the report stays open
      checkSession();
    } else {
      setShow(false);
    }
  };

  return {
    show,
    prefill,
    open,
    close: () => setShow(false),
    submit,
    isSubmitting,
    error,
  };
}
