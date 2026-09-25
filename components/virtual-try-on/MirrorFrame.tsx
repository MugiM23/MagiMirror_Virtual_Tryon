import type { ReactNode } from "react";
import styles from "./tryOn.module.css";

/** Arched frame shared by the user photo and the result, so the result appears "in the mirror". */
export default function MirrorFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <div className={styles.glass}>{children}</div>
    </div>
  );
}
