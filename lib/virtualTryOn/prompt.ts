import { SIZES, type GarmentLayer, type GarmentSize, type JewelleryPlacement } from "@/lib/products";

/**
 * Prompts for Gemini. The images are interleaved with labels in the request
 * (see providers/gemini.ts), so "IMAGE 1" / "IMAGE 2" here match what the model sees.
 */

// ---------- Photo check ----------

export const PHOTO_CHECK_PROMPT = `You are the safety check for a clothing store's virtual fitting-room mirror. Look at the photo and answer in JSON.

"issue" — pick the first that applies:
- "nudity": any exposed genitals, buttocks or female nipples/breasts, a topless person of any gender, or clothing so sheer that intimate areas show through.
- "underwear": the person is in only underwear, lingerie, a bra, boxers or swimwear.
- "sexual": a sexual pose, act or gesture, or sexually suggestive framing.
- "no_person": no real person is clearly visible (empty scene, a screen or printed photo of someone, only a face with no body at all).
- "none": a clothed person in ordinary street, work, gym or festive wear. Shorts, sleeveless tops, short dresses and bare arms or legs are fine.

"clothing" — a short list of every garment the person is visibly wearing, with colour and sleeve length, e.g. "brown half-sleeve T-shirt, blue jeans" or "white full-sleeve shirt, black blazer, grey trousers". Leave out shoes and accessories. Use "" if issue is not "none".

"collection" — which section of the store this person shops from, judged from their apparent gender presentation: "men" or "women". Use "unknown" if you genuinely can't tell or if issue is not "none".

"visibleParts" — which of these are visible in the photo, even partly: "neck", "ears" (at least one earlobe), "wrists" (at least one), "hands" (at least one hand with its fingers). Empty list if issue is not "none".

"estimatedSize" — the standard clothing size (S, M, L or XL) that would normally fit this person, judged from their visible build: shoulder width, chest, waist and overall frame, relative to their height. Rough guide by chest: S about 86–94 cm, M about 94–102 cm, L about 102–110 cm, XL about 110–118 cm. Use "unknown" if too little of the body is visible to judge, or if issue is not "none".

If you are unsure whether the photo shows nudity or underwear, choose the stricter answer.`;

// ---------- Try-on ----------

function layerRules(layer: GarmentLayer, currentClothing: string | null): string {
  const wearing = currentClothing ? `In IMAGE 1 the customer is wearing: ${currentClothing}.` : "";
  const bareSkin =
    "- Wherever the new item leaves skin uncovered (sleeveless, strappy, off-shoulder, open neckline, short sleeves, slits), show the customer's bare skin there, in their own skin tone. Never keep old sleeves, collars or fabric showing underneath or around the new item.";

  switch (layer) {
    case "full":
      return `${wearing}
IMAGE 2 is a complete outfit. REMOVE ${currentClothing ? `the ${currentClothing}` : "everything the customer is wearing"} COMPLETELY, then dress them only in the item from IMAGE 2. The new outfit replaces their clothes; it is NOT worn on top of them.
- No trace of the old clothes may remain: no old sleeves, collar, neckline, cuffs, hem, waistband or trouser legs visible, and no bulges or outlines of clothes underneath.
${bareSkin}
- Keep their glasses, watch and jewellery.`;
    case "top":
      return `${wearing}
IMAGE 2 is a top. REMOVE the customer's current top${currentClothing ? " (from the list above)" : ""} and any jacket over it COMPLETELY, then put this item on instead. It replaces their top; it is NOT worn on top of it.
- No trace of the old top may remain: no old sleeves, collar, neckline, cuffs or hem visible, and no outline of it underneath.
${bareSkin}
- Keep their current trousers, skirt or other bottoms exactly as they are.`;
    case "outer":
      return `${wearing}
IMAGE 2 is an outer layer (a jacket). If the customer already has a jacket, coat, hoodie or blazer on, REMOVE it completely. Put this item on over their existing shirt or top, worn open or closed as in IMAGE 2.
- Their shirt or top underneath should look as it does now, only partly covered by the jacket.
- Keep their current trousers, skirt or other bottoms exactly as they are.`;
  }
}

const FIT_BY_GAP: Record<string, string> = {
  "-3": "three sizes too small: very tight and clearly the wrong size. Fabric strains hard across the chest, shoulders and upper arms, buttons pull and gape, sleeves stop well above the wrists and the hem rides up short.",
  "-2": "two sizes too small: clearly tight. Fabric is stretched across the chest and shoulders with visible tension lines, buttons pull, sleeves end above the wrists and the hem sits noticeably short.",
  "-1": "one size small: snug and close to the body. Slight pulling across the chest and shoulders, sleeves and hem a little shorter than intended.",
  "0": "their true size: a clean, comfortable fit as the product photo intends. Shoulder seams sit on the shoulders, sleeves end at the wrists, no strain and no excess fabric.",
  "1": "one size large: relaxed and slightly loose. Shoulder seams sit just past the shoulders, a little extra fabric at the chest and waist, sleeves slightly long.",
  "2": "two sizes large: clearly loose. Shoulder seams drop onto the upper arms, fabric hangs and folds around the torso, sleeves reach onto the hands and the hem sits longer.",
  "3": "three sizes large: very baggy and clearly oversized. Shoulder seams hang well down the arms, lots of loose folds, sleeves cover much of the hands and the hem is noticeably long.",
};

function sizeRules(size: GarmentSize | undefined, personSize: GarmentSize | null): string {
  if (!size) {
    return "Show the item in the size that fits this person well: shoulder seams on the shoulders, sleeves ending at the wrists, no strain and no excess fabric.";
  }
  if (!personSize) {
    return `The customer chose size ${size}. Judge from their build which size (S, M, L or XL) would normally fit them, and show how a size ${size} would really fit: tighter and shorter if it is smaller than their size, looser and longer if it is larger.`;
  }
  const gap = SIZES.indexOf(size) - SIZES.indexOf(personSize);
  return `The customer chose size ${size}. Their usual size is ${personSize}, so this item is ${FIT_BY_GAP[String(gap)]}`;
}

export function buildTryOnPrompt({
  productName,
  layer = "full",
  size,
  personSize,
  currentClothing,
}: {
  productName?: string;
  layer?: GarmentLayer;
  size?: GarmentSize;
  personSize: GarmentSize | null;
  /** What the customer has on now, from the photo check, e.g. "brown half-sleeve T-shirt" */
  currentClothing: string | null;
}): string {
  const garment = productName ? ` (${productName})` : "";

  return `You are creating a virtual fitting-room preview.

IMAGE 1 is a photo of a customer. IMAGE 2 is a product photo of a clothing item${garment}.

Edit IMAGE 1 so the customer is wearing the item from IMAGE 2 instead of their current clothes. Change the clothing and nothing else.

STEP 1: SWAP THE CLOTHES (replace, never layer)
${layerRules(layer, currentClothing)}

STEP 2: KEEP EVERYTHING ELSE EXACTLY AS IN IMAGE 1
- Face: identical face, facial features, expression, eyes, eyebrows, facial hair, glasses and makeup. It must be recognisably the same person. Do not beautify, smooth, slim or "improve" the face.
- Body: identical body structure, height, build, weight, shoulder width, proportions and posture. Do not slim, widen, stretch or reshape the body in any way, even to make the clothes fit.
- Skin and hair: identical skin tone, complexion, texture, marks and hairstyle. Where the new item shows skin the old clothes covered (shoulders, arms, neck, legs), render bare skin that matches the customer's own skin tone exactly.
- Photo: identical colour tone, white balance, exposure, contrast, lighting, grain and sharpness. No filters, colour grading or relighting.
- Scene: identical pose, hands, camera angle, framing, crop and background.

SIZE AND FIT
${sizeRules(size, personSize)}
Only the garment's fit changes with size. The customer's body stays exactly as it is.

REPRODUCE THE ITEM FAITHFULLY
- Match its colour, pattern or print, fabric and texture, neckline, collar, sleeves, length and silhouette, including buttons, zips, embroidery and trims.
- Drape and fold it naturally on this body, with shadows that match the lighting in IMAGE 1.
- If IMAGE 2 shows the item on a model or mannequin, use only the garment. Ignore that model, their body, the background, and any tags, logos or text overlays.
- The output must visibly show the new item. Never return IMAGE 1 unchanged.

MODESTY
- The customer must be fully dressed in the result. Never show them undressed, in underwear, or with more skin than the item itself is designed to show.
- Do not make the item more revealing than in IMAGE 2: no added slits, lower necklines, shorter hems or see-through fabric.

Output one photorealistic photo of the customer from IMAGE 1 wearing the item. No text, watermarks, borders, collage or side-by-side comparison.`;
}

// ---------- Jewellery ----------

const PLACEMENT_RULES: Record<JewelleryPlacement, string> = {
  neck: `Put it around the customer's neck, lying as a real necklace or chain of this length would: following the curve of the neck and collarbones, resting on the skin or over their clothing at the neckline, with the clasp hidden at the back.
- If they already wear a necklace or chain, remove it so only this piece is worn.
- If IMAGE 2 shows a matching set (a necklace with earrings), put on the whole set, earrings included.`,
  ears: `Put the earrings on both of the customer's earlobes (on the visible ear if only one shows), hanging with gravity.
- If they already wear earrings, remove them so only this pair is worn.
- If hair partly covers an ear, let the earring show where it naturally would; do not restyle the hair.`,
  wrist: `Put it on the customer's wrist, sitting just above the wrist bone as it would in real life. If IMAGE 2 shows a stack or pair, wear it the same way (a stack on one wrist, a pair split between both wrists if both are visible).
- If they already wear bracelets or bangles, remove them so only this piece is worn. Keep their watch.`,
  finger: `Put the ring on the ring finger of the customer's most visible hand, fitting snugly at the base of the finger.
- If they already wear a ring on that finger, remove it. Keep any rings on other fingers.`,
};

export function buildJewelleryPrompt({
  productName,
  placement,
}: {
  productName?: string;
  placement: JewelleryPlacement;
}): string {
  const piece = productName ? ` (${productName})` : "";

  return `You are creating a virtual try-on preview for a jewellery store.

IMAGE 1 is a photo of a customer. IMAGE 2 is a product photo of a piece of jewellery${piece}.

Edit IMAGE 1 so the customer is wearing the jewellery from IMAGE 2. Add the jewellery and change nothing else.

WHERE IT GOES
${PLACEMENT_RULES[placement]}

REPRODUCE THE PIECE FAITHFULLY
- Match its metal and colour (yellow gold, rose gold, silver, oxidised), stones and their colours, pearls, beads, pattern, size of each element and overall design.
- True real-life scale for this person: judge the size from IMAGE 2 and the customer's own proportions. Do not enlarge the piece to make it more visible.
- Realistic metal and stone reflections that match the lighting and colour of IMAGE 1, with small contact shadows where it touches skin or fabric.
- If IMAGE 2 shows the piece on a model, bust, stand or in a box, use only the jewellery. Ignore the model, display, background and any tags or text.
- The output must visibly show the new piece. Never return IMAGE 1 unchanged.

KEEP EVERYTHING ELSE EXACTLY AS IN IMAGE 1
- Face: identical face, features, expression, makeup and facial hair. It must be recognisably the same person. Do not beautify or smooth.
- Body: identical body, proportions, pose and hands.
- Clothes: identical clothes. Do not change, remove or add any clothing.
- Skin and hair: identical skin tone, texture and hairstyle.
- Photo: identical colour tone, white balance, exposure, lighting, grain and sharpness. No filters or relighting.
- Scene: identical camera angle, framing, crop and background. Do not zoom in, zoom out or recompose.

Output one photorealistic photo of the customer from IMAGE 1 wearing the jewellery. No text, watermarks, borders, collage, close-up inset or side-by-side comparison.`;
}
