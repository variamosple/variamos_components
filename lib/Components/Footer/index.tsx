import { FC } from "react";
import styles from "./styles.module.css";

export interface FooterProps {
  version?: string;
}

export const Footer: FC<FooterProps> = ({ version = "" }) => {
  return (
    <footer className={`container-fluid ${styles.footer}`}>
      <div className="row copyright">
        <p className="mb-0">
          {"\u00A9"} Copyright 2023 VariaMos.{version && ` ${version}`}
        </p>
      </div>
    </footer>
  );
};
