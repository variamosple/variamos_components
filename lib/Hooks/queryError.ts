import type { ResponseModel } from "../Model";

/** Shown when a failed answer gives no message of its own. */
export const QUERY_FAILED = "The request failed. Please try again.";

/** The error of an answer: its message when it carries an error code. */
export const errorOfResponse = (response: ResponseModel<unknown>) =>
  response.errorCode ? response.message || QUERY_FAILED : null;

/** The error of a request that did not get an answer at all. */
export const errorOfFailure = (failure: unknown) =>
  failure instanceof Error && failure.message ? failure.message : QUERY_FAILED;
