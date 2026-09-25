// Shared by the browser (gallery) and the server (API route looks up the
// clothing image by productId, so the client can't point the server at
// arbitrary files or URLs).

export type ProductCategory = "women" | "men";

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
];

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Path under /public, e.g. "/products/navy-slim-fit-suit.jpg" */
  imageUrl: string;
  /** Price in rupees */
  price?: number;
}

// Photos are from Unsplash; see public/products/CREDITS.md.
const product = (category: ProductCategory, id: string, name: string, price: number): Product => ({
  id,
  name,
  category,
  imageUrl: `/products/${id}.jpg`,
  price,
});

export const PRODUCTS: Product[] = [
  // Women: western
  product("women", "white-floral-midi-dress", "White floral midi dress", 1799),
  product("women", "black-floral-sundress", "Black floral strappy sundress", 1299),
  product("women", "navy-floral-midi-dress", "Navy floral puff-sleeve midi dress", 1599),
  product("women", "teal-wrap-maxi-dress", "Teal wrap maxi dress", 2199),
  product("women", "green-tiered-maxi-dress", "Green tiered maxi dress", 1999),
  product("women", "red-draped-slit-dress", "Red draped slit dress", 3499),
  product("women", "black-satin-slit-gown", "Black satin slit gown", 4299),
  product("women", "maroon-tulle-gown", "Maroon floral tulle gown", 6999),
  product("women", "sequin-mermaid-gown", "Silver sequin mermaid gown", 8499),
  product("women", "floral-tiered-ball-gown", "Floral tiered ball gown", 12999),
  // Women: ethnic
  product("women", "mustard-lehenga-set", "Mustard lehenga with crop top", 3999),
  product("women", "purple-silk-saree", "Purple silk saree", 5499),
  product("women", "pink-kanjivaram-saree", "Pink Kanjivaram silk saree", 7999),
  product("women", "saffron-embroidered-lehenga", "Saffron embroidered lehenga", 9999),
  product("women", "red-bridal-lehenga", "Red bridal lehenga", 24999),
  // Men: western
  product("men", "lavender-polo-t-shirt", "Lavender polo T-shirt", 799),
  product("men", "printed-half-sleeve-shirt", "Printed half-sleeve shirt", 999),
  product("men", "mint-pullover-hoodie", "Mint pullover hoodie", 1499),
  product("men", "blue-denim-jacket", "Blue denim trucker jacket", 2499),
  product("men", "black-leather-jacket", "Black leather jacket", 5999),
  product("men", "tan-leather-biker-jacket", "Tan leather biker jacket", 6499),
  product("men", "navy-slim-fit-suit", "Navy slim-fit two-piece suit", 7999),
  product("men", "grey-pinstripe-double-breasted-suit", "Grey pinstripe double-breasted suit", 11999),
  // Men: ethnic
  product("men", "black-cotton-kurta", "Black cotton kurta", 1299),
  product("men", "yellow-cotton-kurta", "Yellow cotton kurta", 1499),
  product("men", "cream-mandarin-collar-kurta", "Cream mandarin-collar kurta", 1799),
  product("men", "blue-kurta-pyjama-set", "Blue kurta pyjama set", 2299),
  product("men", "navy-bandhgala-sherwani", "Navy bandhgala sherwani", 8999),
  product("men", "ivory-embroidered-sherwani", "Ivory embroidered sherwani", 14999),
  product("men", "white-sherwani-with-dupatta", "White embroidered sherwani with dupatta", 18999),
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
