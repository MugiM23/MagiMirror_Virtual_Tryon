import { formatPrice, type Product } from "@/lib/products";
import styles from "./tryOn.module.css";

interface Props {
  product: Product;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export default function ProductCard({ product, selected, disabled, onSelect }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      data-selected={selected}
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
  );
}
