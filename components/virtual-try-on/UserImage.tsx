"use client";

import { useRef, type ReactNode } from "react";
import MirrorFrame from "./MirrorFrame";
import styles from "./tryOn.module.css";
import { ACCEPTED_TYPES } from "@/lib/tryOnClient";

interface Props {
  photoUrl: string | null;
  error: string | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  /** Rendered on top of the photo, e.g. the loading state */
  overlay?: ReactNode;
}

export default function UserImage({ photoUrl, error, disabled, onFileSelected, overlay }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <figure className={styles.mirrorFigure}>
      <MirrorFrame>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL
          <img src={photoUrl} alt="Your photo" className={styles.mirrorImage} />
        ) : (
          <div className={styles.mirrorEmpty}>{error ?? "Loading your photo..."}</div>
        )}
        {overlay}
      </MirrorFrame>

      <figcaption className={styles.caption}>
        <span>Your photo</span>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {photoUrl ? "Change photo" : "Upload a photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = ""; // allow picking the same file again
          }}
        />
      </figcaption>

      {photoUrl && error && (
        <p className={styles.photoError} role="alert">
          {error}
        </p>
      )}
    </figure>
  );
}
