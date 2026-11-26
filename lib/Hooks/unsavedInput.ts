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

// The forms of the page that hold unsaved input, each by its own key
const holders = new Set<symbol>();
const listeners = new Set<() => void>();

// The browser asks before the tab is closed or reloaded
const askBeforeLeaving = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

function setHolder(key: symbol, holds: boolean) {
  const before = holders.size;
  if (holds) holders.add(key);
  else holders.delete(key);
  if (holders.size === before) return;
  if (before === 0) window.addEventListener("beforeunload", askBeforeLeaving);
  if (holders.size === 0) {
    window.removeEventListener("beforeunload", askBeforeLeaving);
  }
  for (const listener of listeners) listener();
}

/** Whether a form of the page holds unsaved input. */
export const hasUnsavedInput = (): boolean => holders.size > 0;

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
 * tab is closed.
 */
export function useUnsavedInput(holdsInput: boolean): void {
  useEffect(() => {
    if (!holdsInput) return;
    const key = Symbol("unsaved input");
    setHolder(key, true);
    return () => setHolder(key, false);
  }, [holdsInput]);
}

/** Whether a form of the page holds unsaved input, kept up to date. */
export const useHasUnsavedInput = (): boolean =>
  useSyncExternalStore(subscribe, hasUnsavedInput, hasUnsavedInput);
