import type { GarmentSize } from "@/lib/products";
import MirrorFrame from "./MirrorFrame";
import styles from "./tryOn.module.css";

interface Props {
  imageUrl: string;
  productName?: string;
  /** Size the customer asked to see, or null for "the size that fits" */
  size: GarmentSize | null;
  /** Their usual size as estimated from the photo */
  estimatedSize: GarmentSize | null;
  onBack: () => void;
}

function fitNote(size: GarmentSize | null, estimatedSize: GarmentSize | null): string {
  if (size && estimatedSize) {
    return size === estimatedSize
      ? `Size ${size}, your estimated size.`
      : `Size ${size}. Your estimated size is ${estimatedSize}.`;
  }
  if (size) return `Size ${size}.`;
  if (estimatedSize) return `Shown in your estimated size, ${estimatedSize}.`;
  return "";
}

export default function TryOnResult({ imageUrl, productName, size, estimatedSize, onBack }: Props) {
  const note = fitNote(size, estimatedSize);
  return (
    <figure className={styles.mirrorFigure}>
      <h2 className={styles.resultTitle}>Your Virtual Try-On</h2>
      <MirrorFrame>
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the API */}
        <img
          src={imageUrl}
          alt={productName ? `You wearing the ${productName}` : "You wearing the selected outfit"}
          className={styles.mirrorImage}
        />
      </MirrorFrame>
      <figcaption className={styles.caption}>
        <span>
          {note && <>{note} </>}AI-generated preview. Real fit may differ.
        </span>
        <button type="button" className={styles.linkButton} onClick={onBack}>
          Back to your photo
        </button>
      </figcaption>
    </figure>
  );
}
