import type { FC } from "react";
import { focusMainContent } from "./keyboardAccess";
import styles from "./styles.module.css";

/** The first stop of the keyboard: hidden until it has the focus. */
export const SkipLink: FC<{ targetId: string }> = ({ targetId }) => (
  <a
    href={`#${targetId}`}
    className={`visually-hidden-focusable ${styles.skipLink}`}
    onClick={(event) => {
      event.preventDefault();
      focusMainContent(targetId);
    }}
  >
    Skip to main content
  </a>
);
