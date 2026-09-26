"use client";

import { useEffect, useState, type ReactNode } from "react";
import MirrorFrame from "./MirrorFrame";
import { useCamera } from "./useCamera";
import styles from "./tryOn.module.css";

/** Seconds between tapping "Take photo" and the shot, so the user can step back and pose. */
const COUNTDOWN_SECONDS = 3;

interface Props {
  photoUrl: string | null;
  disabled?: boolean;
  onCapture: (photo: Blob) => void;
  onRetake: () => void;
  /** Rendered on top of the photo, e.g. the loading state */
  overlay?: ReactNode;
}

export default function UserImage({ photoUrl, disabled, onCapture, onRetake, overlay }: Props) {
  const live = photoUrl === null;
  const { videoRef, ready, error, retry, capture } = useCamera(live);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        return;
      }
      setCountdown(null);
      capture()
        .then(onCapture)
        .catch(() => setCaptureError("Couldn't take the photo. Try again."));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, capture, onCapture]);

  function startCountdown() {
    setCaptureError(null);
    setCountdown(COUNTDOWN_SECONDS);
  }

  return (
    <figure className={styles.mirrorFigure}>
      <MirrorFrame>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL
          <img src={photoUrl} alt="Your photo" className={styles.mirrorImage} />
        ) : (
          <>
            <video ref={videoRef} className={styles.mirrorVideo} playsInline muted aria-label="Camera preview" />
            {!ready && <div className={styles.mirrorEmpty}>{error ?? "Starting the camera..."}</div>}
            {countdown !== null && (
              <div className={styles.countdown} aria-live="assertive">
                {countdown}
              </div>
            )}
          </>
        )}
        {overlay}
      </MirrorFrame>

      <figcaption className={styles.caption}>
        <span>{live ? "Stand back so your outfit is in view" : "Your photo"}</span>
        {live ? (
          error ? (
            <button type="button" className={styles.linkButton} onClick={retry}>
              Try the camera again
            </button>
          ) : (
            <button
              type="button"
              className={styles.captureButton}
              onClick={startCountdown}
              disabled={!ready || countdown !== null}
            >
              {countdown !== null ? "Get ready..." : "Take photo"}
            </button>
          )
        ) : (
          <button type="button" className={styles.linkButton} onClick={onRetake} disabled={disabled}>
            Retake photo
          </button>
        )}
      </figcaption>

      {live && captureError && (
        <p className={styles.photoError} role="alert">
          {captureError}
        </p>
      )}
    </figure>
  );
}
