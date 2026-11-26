import { useLayoutEffect, useState, useSyncExternalStore } from "react";

// A Bootstrap dialog is put at the end of the body, one element per dialog,
// the last one opened on top
const DIALOGS = ":scope > .modal";

/** The dialog on top of the page, or null when none is open. */
export function topDialog(): HTMLElement | null {
  const dialogs = [...document.body.querySelectorAll<HTMLElement>(DIALOGS)];
  return dialogs.pop() ?? null;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true });
  return () => observer.disconnect();
}

const noDialog = () => null;

/**
 * The dialog on top of the page, kept up to date. An open dialog keeps the
 * focus inside it and hides the rest of the page from screen readers
 * (aria-modal): what must stay usable goes into it.
 */
export const useTopDialog = (): HTMLElement | null =>
  useSyncExternalStore(subscribe, topDialog, noDialog);

/**
 * A place at the top of the dialog on top, first in its reading and
 * keyboard order; null when no dialog is open. A portal would put its
 * content at the end of the dialog.
 */
export function useTopDialogSlot(): HTMLElement | null {
  const dialog = useTopDialog();
  const [slot] = useState(() => document.createElement("div"));
  const [placed, setPlaced] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!dialog) {
      setPlaced(null);
      return;
    }
    dialog.prepend(slot);
    setPlaced(slot);
    return () => slot.remove();
  }, [dialog, slot]);

  return dialog ? placed : null;
}
