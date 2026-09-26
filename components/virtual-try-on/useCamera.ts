"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Same shape as the mirror frame, so the photo is exactly what the user saw. */
const PHOTO_ASPECT = 3 / 4;

function describeError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow the camera in the browser and try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found.";
  if (name === "NotReadableError") return "The camera is in use by another app.";
  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return "This browser can't use the camera. Open the page over https or on localhost.";
  }
  return "Couldn't start the camera.";
}

/**
 * Streams the front camera into a <video> while `active` is true and stops it otherwise.
 * `capture()` grabs the current frame, cropped to 3:4 and flipped to match the mirrored preview.
 */
export function useCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setReady(false);
      setError(null);
    };
  }, [active, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const capture = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) throw new Error("Camera not ready");

    const { videoWidth: vw, videoHeight: vh } = video;
    let sw = vw;
    let sh = vh;
    if (vw / vh > PHOTO_ASPECT) sw = Math.round(vh * PHOTO_ASPECT);
    else sh = Math.round(vw / PHOTO_ASPECT);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);

    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.92),
    );
  }, []);

  return { videoRef, ready, error, retry, capture };
}
