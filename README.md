# Virtual try-on

AI virtual try-on for a future smart mirror. Pick an outfit, and Gemini (Nano Banana) generates a photo of you wearing it.

Built with Next.js (App Router), React and TypeScript. This is Phase 1: no camera, Raspberry Pi or mirror hardware yet.

## Requirements

- Node.js 20.9 or newer
- A Gemini API key from Google AI Studio

## Getting started

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env.local   # key from https://aistudio.google.com/apikey
```

Add a photo of a person at `public/test/user.jpg` (full or three-quarter body, facing the camera, works best). This folder is gitignored so personal photos stay off GitHub. You can also upload a photo from the page.

```bash
npm run dev
```

Open http://localhost:3000 (it redirects to `/try-on`).

The 30 products (15 women's, 15 men's) in `public/products/` are Unsplash photos (credits in `public/products/CREDITS.md`). Edit names, prices and categories in `lib/products.ts`; image files must be named `<id>.jpg`.

## Scripts

| command             | what it does                                                    |
|---------------------|-----------------------------------------------------------------|
| `npm run dev`       | development server on localhost                                 |
| `npm run dev:lan`   | development server reachable from other devices, such as the Pi |
| `npm run build`     | production build                                                |
| `npm start`         | serve the production build                                      |
| `npm run lint`      | ESLint                                                          |
| `npm run typecheck` | TypeScript check                                                |

## Project structure

```
app/
  api/virtual-try-on/route.ts        validates the request, calls generateVirtualTryOn
  try-on/page.tsx                    the try-on page
components/virtual-try-on/
  VirtualTryOn.tsx                   UI state: idle, loading, success, error
  UserImage, ProductGallery, ProductCard, TryOnButton, TryOnLoading, TryOnResult, MirrorFrame
lib/
  products.ts                        product catalogue
  tryOnClient.ts                     resizes the photo, calls the API, maps errors
  virtualTryOn/
    index.ts                         provider-agnostic entry point with timeout
    providers/gemini.ts              the only file that knows about Gemini
    prompt.ts                        the try-on prompt
```

To switch AI providers later, add `lib/virtualTryOn/providers/<name>.ts` implementing `TryOnProvider`, register it in `index.ts`, and set `TRYON_PROVIDER`.

## API

`POST /api/virtual-try-on` as `multipart/form-data`:

| field       | value                            |
|-------------|----------------------------------|
| `userImage` | JPEG, PNG or WEBP file, max 8 MB |
| `productId` | an id from `lib/products.ts`     |

Success: `{ "image": "data:image/png;base64,...", "productId": "white-floral-midi-dress" }`
Failure: `{ "error": { "code": "...", "message": "safe to display" } }`

The server looks up the garment image from `productId` instead of accepting an image or URL from the browser. Images stay in memory for the request only; nothing is written to disk. The API key is read only on the server and is never sent to the browser.

Test without the UI:

```bash
curl -F userImage=@public/test/user.jpg -F productId=white-floral-midi-dress localhost:3000/api/virtual-try-on
```

## Configuration

| variable             | default                  |
|----------------------|--------------------------|
| `GEMINI_API_KEY`     | required                 |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` |
| `TRYON_PROVIDER`     | `gemini`                 |
| `ACCESS_CODE`        | unset (no gate)          |

When `ACCESS_CODE` is set, every page, image and API call returns 401 until the visitor opens the app once with `?key=<code>`, which sets a one-year cookie. Set it on any public deployment so strangers can't run up your Gemini bill.

Output is requested as a 3:4 portrait to suit the mirror. The server times out after 60 seconds and the browser after 90. Results are an AI preview, not a sizing tool, and the UI says so.

## Deploy (Vercel) and run on the Pi

1. In [Vercel](https://vercel.com/new), import this GitHub repo. The Next.js defaults are correct.
2. Under **Environment Variables**, add `GEMINI_API_KEY` and a long random `ACCESS_CODE`, then deploy.
3. Open `https://<your-app>.vercel.app/try-on?key=<ACCESS_CODE>` to check it works.

Every push to `main` redeploys automatically.

On the Pi (Raspberry Pi OS with desktop):

```bash
git clone https://github.com/MugiM23/MagiMirror_Virtual_Tryon.git
cd MagiMirror_Virtual_Tryon
./scripts/pi-kiosk.sh install   # paste the URL from step 3
sudo reboot
```

The Pi opens the mirror full-screen in Chromium at every login. The URL and code are stored in `~/.config/magimirror/url`, not in the repo. The Pi doesn't need Node.js or the Gemini key.

## Roadmap

1. Hard-coded photo and three products (this version)
2. Photo upload, more products, retry and error handling (mostly done)
3. Camera capture, Raspberry Pi, touch controls, mirror display
4. Generation quality, speed, image optimisation, caching, catalogue
