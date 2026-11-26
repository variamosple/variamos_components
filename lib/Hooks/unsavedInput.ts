import { useEffect, useSyncExternalStore } from "react";

/**
 * Input that is not saved, in the sense shared by the session (a lost
 * connection or an ended session keeps the page) and by the forms (closing
 * one asks first). A field holds unsaved input when its value differs from
 * the value the form opened with, blanks aside, or when a file was chosen.
 */
export function isUnsavedInput(
  initial: Readonly<Record<string, unknown>>,
  current: Readonly<Record<string, unknown>>,
): boolean {
  const fields = new Set([...Object.keys(initial), ...Object.keys(current)]);
  return [...fields].some(
    (field) => comparable(initial[field]) !== comparable(current[field]),
  );
}

/** A value as the reader sees it: blanks around a text do not count. */
function comparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof File !== "undefined" && value instanceof File) {
    return `file:${value.name}:${value.size}`;
  }
  if (Array.isArray(value)) return JSON.stringify(value.map(comparable));
  if (typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => [
      key,
      comparable(item),
    ]);
    return JSON.stringify(entries.filter(([, item]) => item !== ""));
  }
  return String(value);
}

/** How a form that holds unsaved input lives along the page. */
export interface UnsavedInputOptions {
  /**
   * The form stays when the page changes, as the global bug form of the
   * header does: leaving the page drops nothing of it. The session and the
   * closing of the tab still count it.
   */
  keptOnNavigation?: boolean;
}

/** What is asked of the forms that hold unsaved input. */
export interface UnsavedInputQuery {
  /**
   * Only the input that leaving the page would drop: the forms kept on
   * navigation do not count.
   */
  leavingPage?: boolean;
}

// The forms of the page that hold unsaved input, each by its own key, with
// whether it stays when the page changes
const holders = new Map<symbol, boolean>();
const listeners = new Set<() => void>();

// The browser asks before the tab is closed or reloaded
const askBeforeLeaving = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

function setHolder(key: symbol, holds: boolean, keptOnNavigation = false) {
  const before = holders.size;
  if (holds) holders.set(key, keptOnNavigation);
  else holders.delete(key);
  if (holders.size === before) return;
  if (before === 0) window.addEventListener("beforeunload", askBeforeLeaving);
  if (holders.size === 0) {
    window.removeEventListener("beforeunload", askBeforeLeaving);
  }
  for (const listener of listeners) listener();
}

/**
 * Whether a form of the page holds unsaved input; with `leavingPage`, only
 * a form that leaving the page would drop.
 */
export const hasUnsavedInput = ({
  leavingPage = false,
}: UnsavedInputQuery = {}): boolean =>
  leavingPage
    ? [...holders.values()].some((keptOnNavigation) => !keptOnNavigation)
    : holders.size > 0;

// The snapshot of useHasUnsavedInput takes no argument
const anyUnsavedInput = () => hasUnsavedInput();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Says, while the component is mounted, whether its form holds unsaved
 * input (see isUnsavedInput). The session then keeps the page when the
 * connection is lost or the session ends, and the browser asks before the
 * tab is closed. A form kept on navigation does not stop a change of page
 * (UnsavedInputOptions).
 */
export function useUnsavedInput(
  holdsInput: boolean,
  { keptOnNavigation = false }: UnsavedInputOptions = {},
): void {
  useEffect(() => {
    if (!holdsInput) return;
    const key = Symbol("unsaved input");
    setHolder(key, true, keptOnNavigation);
    return () => setHolder(key, false);
  }, [holdsInput, keptOnNavigation]);
}

/** Whether a form of the page holds unsaved input, kept up to date. */
export const useHasUnsavedInput = (): boolean =>
  useSyncExternalStore(subscribe, anyUnsavedInput, anyUnsavedInput);
