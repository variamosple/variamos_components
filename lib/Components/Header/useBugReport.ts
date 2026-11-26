import { useCallback, useEffect, useState } from "react";
import { Events } from "../../Common";
import { useSession } from "../../Context";
import { type BugReport, submitBugReport } from "./submitBugReport";

/**
 * The global bug form: opened from the menu or by the "openReportBugModal"
 * event, closed only once the report is sent; a refusal stays in the form.
 */
export function useBugReport(adminApiUrl: string) {
  const { user, checkSession } = useSession();
  const [show, setShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    setError(null);
    setShow(true);
  }, []);

  useEffect(() => {
    Events.subscribe<Record<string, never>>("openReportBugModal", open);
    return () => {
      Events.unsubscribe<Record<string, never>>("openReportBugModal", open);
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
    open,
    close: () => setShow(false),
    submit,
    isSubmitting,
    error,
  };
}
