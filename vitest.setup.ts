// Matchers of jest-dom (toBeInTheDocument, toHaveAttribute...) for the
// render tests; Testing Library unmounts what a test rendered after it
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no matchMedia, which the Offcanvas of react-bootstrap reads:
// no media query matches, as in a wide window
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// The transitions of react-bootstrap (Modal, Offcanvas, Fade) end on a
// timer of dom-helpers: the CSS duration, 0 in jsdom, plus 5 ms. Unmounting
// does not clear it, and it is a timer of Node, which outlives jsdom: when
// the last test of a file ends within those 5 ms, it fires once document is
// gone and Vitest reports "document is not defined". Node fires its timers
// in the order they are due, so waiting longer than that delay, after the
// unmount, lets every such timer fire while jsdom is still there. The real
// setTimeout is kept here, so that a test left on fake timers does not stop
// the wait.
const TRANSITION_END_DELAY_MS = 10;
const realSetTimeout = globalThis.setTimeout;

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => {
    realSetTimeout(resolve, TRANSITION_END_DELAY_MS);
  });
});
