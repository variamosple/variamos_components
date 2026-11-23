/** The element the skip link moves to, unless the app names another. */
export const DEFAULT_MAIN_CONTENT_ID = "main-content";

/**
 * Moves the focus to the main content (WCAG 2.4.1). Not a jump to the
 * anchor: under a hash router, "#main-content" would be read as a route.
 * The target needs tabIndex={-1} to take the focus.
 */
export function focusMainContent(
  id: string,
  doc: Pick<Document, "getElementById"> = document,
): boolean {
  const target = doc.getElementById(id);
  if (!target) return false;
  target.focus();
  return true;
}

/**
 * A click the page handles itself: the main button without a modifier.
 * Ctrl, Shift, Alt, Meta or the middle button keep the browser's own
 * behavior (new tab, new window), since the logo is a real link.
 */
export function isPlainClick(event: {
  button: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey
  );
}
