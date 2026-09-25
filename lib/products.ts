// Shared by the browser (gallery) and the server (API route looks up the
// clothing image by productId, so the client can't point the server at
// arbitrary files or URLs).

export interface Product {
  id: string;
  name: string;
  /** Path under /public, e.g. "/products/dress-1.jpg" */
  imageUrl: string;
  /** Price in rupees */
  price?: number;
}

export const PRODUCTS: Product[] = [
  { id: "dress-1", name: "Indigo wrap dress", imageUrl: "/products/dress-1.jpg", price: 1499 },
  { id: "dress-2", name: "Floral midi dress", imageUrl: "/products/dress-2.jpg", price: 1999 },
  { id: "dress-3", name: "Emerald evening gown", imageUrl: "/products/dress-3.jpg", price: 2499 },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return inr.format(price);
}
