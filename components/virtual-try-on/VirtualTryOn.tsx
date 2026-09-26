"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bodoni_Moda, Figtree } from "next/font/google";
import {
  CATEGORIES,
  PRODUCTS,
  SECTIONS,
  findProduct,
  type GarmentSize,
  type ProductCategory,
  type ProductSection,
} from "@/lib/products";
import {
  RETAKE_CODES,
  TryOnRequestError,
  prepareImage,
  requestTryOn,
  type TryOnResponse,
} from "@/lib/tryOnClient";
import ProductGallery from "./ProductGallery";
import TryOnButton from "./TryOnButton";
import TryOnLoading from "./TryOnLoading";
import TryOnResult from "./TryOnResult";
import UserImage from "./UserImage";
import styles from "./tryOn.module.css";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

type Status = "idle" | "loading" | "success" | "error";

/** Errors where trying the same thing again can't help, so there's no "Try again" button. */
const NO_RETRY_CODES = new Set(["WRONG_COLLECTION", "PART_NOT_VISIBLE"]);

interface UserPhoto {
  blob: Blob;
  url: string;
}

export default function VirtualTryOn() {
  const [userPhoto, setUserPhoto] = useState<UserPhoto | null>(null);
  const [section, setSection] = useState<ProductSection>("clothing");
  const [category, setCategory] = useState<ProductCategory>(CATEGORIES[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, GarmentSize | null>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<(TryOnResponse & { size: GarmentSize | null }) | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const selectedProduct = selectedId ? findProduct(selectedId) : undefined;
  const isLoading = status === "loading";

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
    setResult(null);
    setErrorMessage(null);
    setErrorCode(null);
  }, []);

  const handleCapture = useCallback(
    async (photo: Blob) => {
      resetResult();
      const blob = await prepareImage(photo);
      setUserPhoto({ blob, url: URL.createObjectURL(blob) });
    },
    [resetResult],
  );

  const handleRetake = useCallback(() => {
    resetResult();
    setUserPhoto(null);
  }, [resetResult]);

  function handleSelect(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    resetResult();
  }

  /** Picking a size on a card also selects that product. */
  function handleSize(id: string, size: GarmentSize | null) {
    setSizes((prev) => ({ ...prev, [id]: size }));
    setSelectedId(id);
    resetResult();
  }

  async function handleTryOn(productId = selectedId) {
    if (!userPhoto || !productId) return;
    const size = sizes[productId] ?? null;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setStatus("loading");
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const response = await requestTryOn({
        userImage: userPhoto.blob,
        productId,
        size,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResult({ ...response, size });
      setStatus("success");
    } catch (err) {
      if (err instanceof TryOnRequestError && err.code === "CANCELLED") return;
      if (controller.signal.aborted) return;
      setErrorMessage(err instanceof TryOnRequestError ? err.message : "Something went wrong. Try again.");
      setErrorCode(err instanceof TryOnRequestError ? err.code : null);
      setStatus("error");
      // The server refused the photo itself: throw it away and go back to the camera.
      if (err instanceof TryOnRequestError && RETAKE_CODES.has(err.code)) {
        setUserPhoto(null);
      }
      // Outfit from the other collection: take them to the right one.
      if (err instanceof TryOnRequestError && err.code === "WRONG_COLLECTION") {
        const tried = findProduct(productId)?.category;
        const other = CATEGORIES.find((c) => c.id !== tried);
        if (other) setCategory(other.id);
        setSelectedId(null);
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  function handleSection(next: ProductSection) {
    if (next === section) return;
    setSection(next);
    setSelectedId(null);
    resetResult();
  }

  /** The hover "Try it on" button: select the product and start straight away. */
  function handleQuickTry(id: string) {
    setSelectedId(id);
    void handleTryOn(id);
  }

  const isJewellery = section === "jewellery";
  const selectedSize = selectedId ? (sizes[selectedId] ?? null) : null;
  const hint = !userPhoto
    ? "Take a photo of yourself to continue."
    : !selectedId
      ? isJewellery
        ? "Choose a piece to continue."
        : "Choose an outfit to continue."
      : isJewellery
        ? null
        : selectedSize
          ? `Showing how a size ${selectedSize} would fit you.`
          : "No size picked: we'll show the size that fits you.";

  return (
    <main className={`${styles.page} ${display.variable} ${body.variable}`}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fitting room</h1>
          <p className={styles.lede}>
            {isJewellery
              ? "Pick a piece of jewellery and see how it looks on you."
              : "Pick an outfit and see how it looks on you."}
          </p>
        </div>
        <div className={styles.sections} role="group" aria-label="What to try on">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.sectionButton}
              aria-pressed={s.id === section}
              disabled={isLoading}
              onClick={() => handleSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.stage} aria-live="polite">
          {status === "success" && result ? (
            <TryOnResult
              imageUrl={result.image}
              productName={selectedProduct?.name}
              size={result.size}
              estimatedSize={result.estimatedSize}
              onBack={resetResult}
            />
          ) : (
            <UserImage
              photoUrl={userPhoto?.url ?? null}
              disabled={isLoading}
              onCapture={handleCapture}
              onRetake={handleRetake}
              overlay={isLoading ? <TryOnLoading /> : null}
            />
          )}
        </section>

        <section className={styles.panel} aria-labelledby="outfits-heading">
          <h2 id="outfits-heading" className={styles.panelTitle}>
            {isJewellery ? "Choose jewellery" : "Choose an outfit"}
          </h2>
          <ProductGallery
            products={PRODUCTS.filter((p) => p.section === section)}
            category={category}
            onCategory={setCategory}
            selectedId={selectedId}
            sizes={sizes}
            disabled={isLoading}
            canTry={userPhoto !== null}
            onSelect={handleSelect}
            onTry={handleQuickTry}
            onSize={handleSize}
          />

          <TryOnButton
            disabled={!userPhoto || !selectedId || isLoading}
            loading={isLoading}
            label={isJewellery ? "Try This Piece" : "Try This Outfit"}
            hint={hint}
            onClick={() => handleTryOn()}
          />

          {status === "error" && (
            <div className={styles.error} role="alert">
              <p className={styles.errorTitle}>Unable to generate the virtual try-on.</p>
              {errorMessage && <p className={styles.errorDetail}>{errorMessage}</p>}
              {!NO_RETRY_CODES.has(errorCode ?? "") && !RETAKE_CODES.has(errorCode ?? "") && (
                <button type="button" className={styles.secondaryButton} onClick={() => handleTryOn()}>
                  Try again
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
