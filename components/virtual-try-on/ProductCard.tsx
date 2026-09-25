import { formatPrice, type Product } from "@/lib/products";
import styles from "./tryOn.module.css";

interface Props {
  product: Product;
  selected: boolean;
  disabled?: boolean;
  /** False when there's no photo yet; the quick-try button is disabled. */
  canTry: boolean;
  onSelect: (id: string) => void;
  onTry: (id: string) => void;
}

export default function ProductCard({ product, selected, disabled, canTry, onSelect, onTry }: Props) {
  return (
    <div className={styles.card} data-selected={selected}>
      <button
        type="button"
        className={styles.cardSelect}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(product.id)}
      >
        <span className={styles.cardImageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt="" className={styles.cardImage} />
        </span>
        <span className={styles.cardName}>{product.name}</span>
        <span className={styles.cardMeta}>
          {product.price != null && <span className={styles.cardPrice}>{formatPrice(product.price)}</span>}
          {selected && <span className={styles.cardTag}>Selected</span>}
        </span>
      </button>

      {/* Sits over the image; a sibling rather than a child because buttons can't nest. */}
      <div className={styles.cardOverlay}>
        <button
          type="button"
          className={styles.cardTry}
          disabled={disabled || !canTry}
          aria-label={`Try on ${product.name}`}
          onClick={() => onTry(product.id)}
        >
          Try it on
        </button>
      </div>
    </div>
  );
}
