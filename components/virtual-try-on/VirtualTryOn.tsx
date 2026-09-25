"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bodoni_Moda, Figtree } from "next/font/google";
import { PRODUCTS, findProduct } from "@/lib/products";
import { TryOnRequestError, prepareImage, requestTryOn, validatePhoto } from "@/lib/tryOnClient";
import ProductGallery from "./ProductGallery";
import TryOnButton from "./TryOnButton";
import TryOnLoading from "./TryOnLoading";
import TryOnResult from "./TryOnResult";
import UserImage from "./UserImage";
import styles from "./tryOn.module.css";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

/** Phase 1 test photo. Replace with camera capture in Phase 3. */
const DEFAULT_USER_PHOTO = "/test/user.jpg";

type Status = "idle" | "loading" | "success" | "error";

interface UserPhoto {
  blob: Blob;
  url: string;
}

export default function VirtualTryOn() {
  const [userPhoto, setUserPhoto] = useState<UserPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const selectedProduct = selectedId ? findProduct(selectedId) : undefined;
  const isLoading = status === "loading";

  // Load the hard-coded test photo on first render.
  useEffect(() => {
    let cancelled = false;
    fetch(DEFAULT_USER_PHOTO)
      .then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.blob();
      })
      .then(prepareImage)
      .then((blob) => {
        if (!cancelled) setUserPhoto({ blob, url: URL.createObjectURL(blob) });
      })
      .catch(() => {
        if (!cancelled) setPhotoError("No test photo found. Upload a photo to continue.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Free the previous object URL whenever the photo changes.
  useEffect(() => {
    return () => {
      if (userPhoto) URL.revokeObjectURL(userPhoto.url);
    };
  }, [userPhoto]);

  // Cancel any request still running if the component unmounts.
  useEffect(() => () => inFlight.current?.abort(), []);

  const resetResult = useCallback(() => {
    inFlight.current?.abort();
    setStatus("idle");
    setResultUrl(null);
    setErrorMessage(null);
  }, []);

  async function handleFile(file: File) {
    const problem = validatePhoto(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    resetResult();
    setPhotoError(null);
    const blob = await prepareImage(file);
    setUserPhoto({ blob, url: URL.createObjectURL(blob) });
  }

  function handleSelect(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    resetResult();
  }

  async function handleTryOn(productId = selectedId) {
    if (!userPhoto || !productId) return;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const image = await requestTryOn({
        userImage: userPhoto.blob,
        productId,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResultUrl(image);
      setStatus("success");
    } catch (err) {
      if (err instanceof TryOnRequestError && err.code === "CANCELLED") return;
      if (controller.signal.aborted) return;
      setErrorMessage(err instanceof TryOnRequestError ? err.message : "Something went wrong. Try again.");
      setStatus("error");
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  /** The hover "Try it on" button: select the product and start straight away. */
  function handleQuickTry(id: string) {
    setSelectedId(id);
    void handleTryOn(id);
  }

  const hint = !userPhoto
    ? "Add a photo of yourself to continue."
    : !selectedId
      ? "Choose an outfit to continue."
      : null;

  return (
    <main className={`${styles.page} ${display.variable} ${body.variable}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Fitting room</h1>
        <p className={styles.lede}>Pick an outfit and see how it looks on you.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.stage} aria-live="polite">
          {status === "success" && resultUrl ? (
            <TryOnResult imageUrl={resultUrl} productName={selectedProduct?.name} onBack={resetResult} />
          ) : (
            <UserImage
              photoUrl={userPhoto?.url ?? null}
              error={photoError}
              disabled={isLoading}
              onFileSelected={handleFile}
              overlay={isLoading ? <TryOnLoading /> : null}
            />
          )}
        </section>

        <section className={styles.panel} aria-labelledby="outfits-heading">
          <h2 id="outfits-heading" className={styles.panelTitle}>
            Choose an outfit
          </h2>
          <ProductGallery
            products={PRODUCTS}
            selectedId={selectedId}
            disabled={isLoading}
            canTry={userPhoto !== null}
            onSelect={handleSelect}
            onTry={handleQuickTry}
          />

          <TryOnButton
            disabled={!userPhoto || !selectedId || isLoading}
            loading={isLoading}
            hint={hint}
            onClick={() => handleTryOn()}
          />

          {status === "error" && (
            <div className={styles.error} role="alert">
              <p className={styles.errorTitle}>Unable to generate the virtual try-on.</p>
              {errorMessage && <p className={styles.errorDetail}>{errorMessage}</p>}
              <button type="button" className={styles.secondaryButton} onClick={() => handleTryOn()}>
                Try again
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
