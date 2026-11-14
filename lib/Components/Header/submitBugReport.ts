import { fieldOf } from "../../Common/fieldOf";

export interface BugReport {
  title: string;
  description: string;
  category: string;
}

export interface BugReportSender {
  adminApiUrl: string;
  reporterEmail?: string;
  fetchImpl?: typeof fetch;
}

const SUBMIT_FAILED = "Failed to submit bug. Please try again.";

/** The bug route, next to the versioned API: ".../v1" and ".../" give "/bugs". */
export const bugReportUrl = (adminApiUrl: string) =>
  `${adminApiUrl.replace(/\/v1$/, "").replace(/\/$/, "")}/bugs`;

/** Sends the report; resolves to null once sent, or to the message to show. */
export async function submitBugReport(
  report: BugReport,
  file: File | undefined,
  { adminApiUrl, reporterEmail, fetchImpl = fetch }: BugReportSender,
): Promise<string | null> {
  const formData = new FormData();
  formData.append("title", report.title);
  formData.append("description", report.description);
  formData.append("priority", "medium");
  formData.append("category", report.category);
  if (reporterEmail) formData.append("reporterEmail", reporterEmail);
  if (file) formData.append("file", file);

  try {
    const response = await fetchImpl(bugReportUrl(adminApiUrl), {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const body: unknown = await response.json();
    if (response.ok && !fieldOf(body, "errorCode")) return null;
    const message = fieldOf(body, "message");
    return typeof message === "string" && message !== ""
      ? message
      : SUBMIT_FAILED;
  } catch (error) {
    console.error(error);
    return SUBMIT_FAILED;
  }
}
