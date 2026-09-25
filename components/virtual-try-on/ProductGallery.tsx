import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";
import styles from "./tryOn.module.css";

interface Props {
  products: Product[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export default function ProductGallery({ products, selectedId, disabled, onSelect }: Props) {
  return (
    <ul className={styles.gallery} role="list">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            selected={product.id === selectedId}
            disabled={disabled}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
