import { useState } from "react";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/products";
import ProductCard from "./ProductCard";
import styles from "./tryOn.module.css";

interface Props {
  products: Product[];
  selectedId: string | null;
  disabled?: boolean;
  canTry: boolean;
  onSelect: (id: string) => void;
  onTry: (id: string) => void;
}

export default function ProductGallery({ products, selectedId, disabled, canTry, onSelect, onTry }: Props) {
  const [category, setCategory] = useState<ProductCategory>(CATEGORIES[0].id);
  const visible = products.filter((p) => p.category === category);

  return (
    <>
      <div className={styles.tabs} role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.tab}
            aria-pressed={c.id === category}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className={styles.gallery} role="list">
        {visible.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              selected={product.id === selectedId}
              disabled={disabled}
              canTry={canTry}
              onSelect={onSelect}
              onTry={onTry}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
