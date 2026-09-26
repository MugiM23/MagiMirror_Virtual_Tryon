import { CATEGORIES, type GarmentSize, type Product, type ProductCategory } from "@/lib/products";
import ProductCard from "./ProductCard";
import styles from "./tryOn.module.css";

interface Props {
  products: Product[];
  category: ProductCategory;
  onCategory: (category: ProductCategory) => void;
  selectedId: string | null;
  sizes: Record<string, GarmentSize | null>;
  disabled?: boolean;
  canTry: boolean;
  onSelect: (id: string) => void;
  onTry: (id: string) => void;
  onSize: (id: string, size: GarmentSize | null) => void;
}

export default function ProductGallery({
  products,
  category,
  onCategory,
  selectedId,
  sizes,
  disabled,
  canTry,
  onSelect,
  onTry,
  onSize,
}: Props) {
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
            onClick={() => onCategory(c.id)}
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
              size={sizes[product.id] ?? null}
              disabled={disabled}
              canTry={canTry}
              onSelect={onSelect}
              onTry={onTry}
              onSize={onSize}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
