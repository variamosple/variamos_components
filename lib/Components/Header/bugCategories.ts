import { useEffect, useState } from "react";
import { fieldOf } from "../../Common/fieldOf";
import { bugReportUrl } from "./submitBugReport";

/**
 * The categories the admin accepted when this version was published: the
 * form shows them at once, and keeps them when the admin list cannot be
 * read (EV-41).
 */
export const FALLBACK_BUG_CATEGORIES: readonly string[] = Object.freeze([
  "Editor",
  "Model",
  "Language",
  "Project",
  "Simulation",
  "Account/Security",
  "Other",
]);

/** How long the form waits for the admin list before it gives up. */
export const BUG_CATEGORIES_TIMEOUT_MS = 3000;

/** The public route of the admin list, next to the bug route. */
export const bugCategoriesUrl = (adminApiUrl: string) =>
  `${bugReportUrl(adminApiUrl)}/categories`;

/**
 * The categories of an answer of the admin, or null when it holds none
 * that can be used: an error, no list, an empty list, or anything else
 * than names. The names are kept as they are, since the admin compares
 * them exactly when a report is sent.
 */
export const categoriesOf = (body: unknown): string[] | null => {
  if (fieldOf(body, "errorCode")) return null;
  const data = fieldOf(body, "data");
  if (!Array.isArray(data) || data.length === 0) return null;
  const names: string[] = [];
  for (const name of data) {
    if (typeof name !== "string" || name.trim() === "") return null;
    if (!names.includes(name)) names.push(name);
  }
  return names;
};

export interface BugCategoriesRequest {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Stops the request, when the form no longer needs it. */
  signal?: AbortSignal;
}

/**
 * Reads the categories of the admin; resolves to null, and never rejects,
 * when they cannot be read in time.
 */
export async function fetchBugCategories(
  adminApiUrl: string,
  {
    fetchImpl = fetch,
    timeoutMs = BUG_CATEGORIES_TIMEOUT_MS,
    signal,
  }: BugCategoriesRequest = {},
): Promise<string[] | null> {
  if (signal?.aborted) return null;
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal?.addEventListener("abort", stop, { once: true });
  // The wait covers the answer and its body
  const timer = setTimeout(stop, timeoutMs);
  try {
    // The route is public: no cookie is sent
    const response = await fetchImpl(bugCategoriesUrl(adminApiUrl), {
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return categoriesOf(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}

interface LoadedCategories {
  adminApiUrl: string;
  categories: readonly string[];
}

/**
 * The categories of the bug form: the fixed list at once, then the list of
 * the admin once read. It is asked only when the form is open (`wanted`),
 * once it has been read; a failure keeps the fixed list and is tried again
 * at the next opening.
 */
export function useBugCategories(
  adminApiUrl: string,
  wanted: boolean,
): readonly string[] {
  const [loaded, setLoaded] = useState<LoadedCategories | null>(null);
  const isLoaded = loaded?.adminApiUrl === adminApiUrl;

  useEffect(() => {
    if (!wanted || isLoaded) return;
    const controller = new AbortController();
    void fetchBugCategories(adminApiUrl, { signal: controller.signal }).then(
      (categories) => {
        if (categories && !controller.signal.aborted) {
          setLoaded({ adminApiUrl, categories });
        }
      },
    );
    return () => controller.abort();
  }, [adminApiUrl, wanted, isLoaded]);

  return isLoaded ? loaded.categories : FALLBACK_BUG_CATEGORIES;
}
