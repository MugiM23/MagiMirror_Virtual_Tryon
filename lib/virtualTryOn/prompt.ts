/**
 * Prompt for Gemini image models. The images are interleaved with labels in
 * the request (see providers/gemini.ts), so "IMAGE 1" / "IMAGE 2" here match
 * what the model sees.
 */
export function buildTryOnPrompt(productName?: string): string {
  const garment = productName ? ` (${productName})` : "";

  return `You are creating a virtual fitting-room preview.

IMAGE 1 is a photo of a person. IMAGE 2 is a product photo of a clothing item${garment}.

Edit IMAGE 1 so the same person is wearing the clothing item from IMAGE 2.

Keep the person exactly as they are:
- Same face, facial features, skin tone, hair and expression. Do not beautify or change their identity.
- Same body shape and proportions. Do not slim, stretch or reshape the body.
- Same pose, camera angle, framing, background and lighting wherever possible.

Reproduce the clothing faithfully:
- Match its color, pattern or print, fabric texture, neckline, sleeves, length and overall silhouette, including details such as buttons, trims and prints.
- Replace only the clothing the new item would cover, and make it drape and fold naturally on this person's body, with shadows consistent with the scene's lighting.
- If IMAGE 2 shows the item on a model or mannequin, use only the garment. Ignore that model, their background, and any tags, logos or text overlays.

Output one photorealistic photo of the person from IMAGE 1 wearing the item. Do not add text, watermarks, borders, a collage or a side-by-side comparison, and do not change anything that isn't part of the outfit.`;
}
