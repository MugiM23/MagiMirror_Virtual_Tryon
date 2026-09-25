import MirrorFrame from "./MirrorFrame";
import styles from "./tryOn.module.css";

interface Props {
  imageUrl: string;
  productName?: string;
  onBack: () => void;
}

export default function TryOnResult({ imageUrl, productName, onBack }: Props) {
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
        <span>AI-generated preview. Fit and sizing may differ.</span>
        <button type="button" className={styles.linkButton} onClick={onBack}>
          Back to your photo
        </button>
      </figcaption>
    </figure>
  );
}
