// Shared by the browser (gallery) and the server (API route looks up the
// product image by productId, so the client can't point the server at
// arbitrary files or URLs).

export type ProductSection = "clothing" | "jewellery";

export const SECTIONS: { id: ProductSection; label: string }[] = [
  { id: "clothing", label: "Clothing" },
  { id: "jewellery", label: "Jewellery" },
];

export type ProductCategory = "women" | "men";

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
];

export const SIZES = ["S", "M", "L", "XL"] as const;
export type GarmentSize = (typeof SIZES)[number];

export function isGarmentSize(value: unknown): value is GarmentSize {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

/**
 * What the item replaces on the person, so the model swaps clothes instead of layering them:
 * - full: a complete outfit (dress, suit, saree, sherwani); replaces everything they're wearing
 * - top: replaces their top, keeps their own trousers/skirt
 * - outer: jacket worn over their existing top; replaces any jacket they already have on
 */
export type GarmentLayer = "full" | "top" | "outer";

/** Where a piece of jewellery is worn; the photo has to show that part of the body. */
export type JewelleryPlacement = "neck" | "ears" | "wrist" | "finger";

interface BaseProduct {
  id: string;
  name: string;
  category: ProductCategory;
  /** Path under /public, e.g. "/products/navy-slim-fit-suit.jpg" */
  imageUrl: string;
  /** Price in rupees */
  price?: number;
}

export interface ClothingProduct extends BaseProduct {
  section: "clothing";
  layer: GarmentLayer;
}

export interface JewelleryProduct extends BaseProduct {
  section: "jewellery";
  placement: JewelleryPlacement;
}

export type Product = ClothingProduct | JewelleryProduct;

// Photos are from Unsplash; see public/products/CREDITS.md.
const product = (
  category: ProductCategory,
  id: string,
  name: string,
  price: number,
  layer: GarmentLayer = "full",
): ClothingProduct => ({
  section: "clothing",
  id,
  name,
  category,
  imageUrl: `/products/${id}.jpg`,
  price,
  layer,
});

// Photos are from Unsplash; see public/jewellery/CREDITS.md.
const jewel = (
  category: ProductCategory,
  id: string,
  name: string,
  price: number,
  placement: JewelleryPlacement,
): JewelleryProduct => ({
  section: "jewellery",
  id,
  name,
  category,
  imageUrl: `/jewellery/${id}.jpg`,
  price,
  placement,
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
  product("men", "lavender-polo-t-shirt", "Lavender polo T-shirt", 799, "top"),
  product("men", "printed-half-sleeve-shirt", "Printed half-sleeve shirt", 999, "top"),
  product("men", "mint-pullover-hoodie", "Mint pullover hoodie", 1499, "top"),
  product("men", "blue-denim-jacket", "Blue denim trucker jacket", 2499, "outer"),
  product("men", "black-leather-jacket", "Black leather jacket", 5999, "outer"),
  product("men", "tan-leather-biker-jacket", "Tan leather biker jacket", 6499, "outer"),
  product("men", "navy-slim-fit-suit", "Navy slim-fit two-piece suit", 7999),
  product("men", "grey-pinstripe-double-breasted-suit", "Grey pinstripe double-breasted suit", 11999),
  // Men: ethnic
  product("men", "black-cotton-kurta", "Black cotton kurta", 1299, "top"),
  product("men", "yellow-cotton-kurta", "Yellow cotton kurta", 1499, "top"),
  product("men", "cream-mandarin-collar-kurta", "Cream mandarin-collar kurta", 1799, "top"),
  product("men", "blue-kurta-pyjama-set", "Blue kurta pyjama set", 2299),
  product("men", "navy-bandhgala-sherwani", "Navy bandhgala sherwani", 8999),
  product("men", "ivory-embroidered-sherwani", "Ivory embroidered sherwani", 14999),
  product("men", "white-sherwani-with-dupatta", "White embroidered sherwani with dupatta", 18999),

  // Jewellery: women
  jewel("women", "gold-filigree-necklace-set", "Gold filigree necklace set", 64999, "neck"),
  jewel("women", "diamond-pearl-pendant-necklace", "Diamond and pearl pendant necklace", 89999, "neck"),
  jewel("women", "oxidised-silver-kundan-necklace", "Oxidised silver kundan necklace", 2499, "neck"),
  jewel("women", "classic-pearl-strand-necklace", "Classic pearl strand necklace", 14999, "neck"),
  jewel("women", "two-tone-silver-jhumkas", "Two-tone silver jhumkas", 1899, "ears"),
  jewel("women", "diamond-halo-stud-earrings", "Diamond halo stud earrings", 45999, "ears"),
  jewel("women", "gold-bangle-stack", "Gold bangle stack", 74999, "wrist"),
  jewel("women", "ruby-studded-gold-bangles", "Ruby-studded gold bangles", 39999, "wrist"),
  jewel("women", "kundan-cocktail-ring", "Kundan cocktail ring", 5999, "finger"),
  // Jewellery: men
  jewel("men", "thin-gold-chain", "Thin gold chain", 34999, "neck"),
  jewel("men", "silver-cuban-link-chain", "Silver Cuban link chain", 6999, "neck"),
  jewel("men", "silver-studded-kada", "Silver studded kada", 4999, "wrist"),
  jewel("men", "tigers-eye-bead-bracelet", "Tiger's eye bead bracelet", 1299, "wrist"),
  jewel("men", "gold-coin-signet-ring", "Gold coin signet ring", 24999, "finger"),
  jewel("men", "turquoise-statement-ring", "Turquoise statement ring", 3499, "finger"),
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
