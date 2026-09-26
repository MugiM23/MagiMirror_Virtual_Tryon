import { SIZES, formatPrice, type GarmentSize, type Product } from "@/lib/products";
import styles from "./tryOn.module.css";

interface Props {
  product: Product;
  selected: boolean;
  /** Size picked for this product; null shows the size that fits the person */
  size: GarmentSize | null;
  disabled?: boolean;
  /** False when there's no photo yet; the quick-try button is disabled. */
  canTry: boolean;
  onSelect: (id: string) => void;
  onTry: (id: string) => void;
  onSize: (id: string, size: GarmentSize | null) => void;
}

export default function ProductCard({ product, selected, size, disabled, canTry, onSelect, onTry, onSize }: Props) {
  return (
    <div className={styles.card} data-selected={selected}>
      <button
        type="button"
        className={styles.cardSelect}
        aria-pressed={selected}
        aria-label={product.name}
        disabled={disabled}
        onClick={() => onSelect(product.id)}
      >
        <span className={styles.cardImageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt="" className={styles.cardImage} />
        </span>
      </button>

      {/* Sizes sit right under the image; tapping one also selects the product. Clothing only. */}
      {product.section === "clothing" && (
        <div className={styles.cardSizes} role="group" aria-label={`Size for ${product.name}`}>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.sizeChip}
              aria-pressed={s === size}
              disabled={disabled}
              onClick={() => onSize(product.id, s === size ? null : s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={styles.cardName}>{product.name}</div>
      <div className={styles.cardMeta}>
        {product.price != null && <span className={styles.cardPrice}>{formatPrice(product.price)}</span>}
        {selected && <span className={styles.cardTag}>Selected</span>}
      </div>

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
