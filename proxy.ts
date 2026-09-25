import { NextResponse, type NextRequest } from "next/server";

/**
 * Access gate for public deployments, so strangers can't run up the Gemini bill.
 *
 * Set ACCESS_CODE on the host to turn it on. Open the app once with
 * ?key=<code> (e.g. the Pi's kiosk URL); that sets a cookie and every later
 * request goes straight through. With ACCESS_CODE unset (local dev) this does nothing.
 */

const COOKIE = "mm_access";
const ONE_YEAR = 60 * 60 * 24 * 365;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const LOCKED_PAGE = `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fitting room</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #231a26; color: #f1ece6; font: 16px system-ui, sans-serif; }
  form { display: grid; gap: 0.75rem; width: min(20rem, 90vw); }
  input, button { padding: 0.75rem 1rem; border-radius: 999px; font: inherit; }
  input { border: 1.5px solid #4a3e4d; background: #2f2433; color: inherit; }
  button { border: 0; background: #c4a06a; color: #231a26; font-weight: 600; cursor: pointer; }
</style>
<form method="get">
  <label for="key">Enter the access code</label>
  <input id="key" name="key" type="password" autocomplete="current-password" required autofocus>
  <button>Open</button>
</form>`;

export async function proxy(request: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();

  const expected = await sha256(code);
  const { nextUrl } = request;
  const key = nextUrl.searchParams.get("key");

  if (key !== null) {
    // Strip the code from the address bar either way.
    const clean = nextUrl.clone();
    clean.searchParams.delete("key");
    const res = NextResponse.redirect(clean);
    if ((await sha256(key)) === expected) {
      res.cookies.set(COOKIE, expected, {
        httpOnly: true,
        secure: nextUrl.protocol === "https:",
        sameSite: "lax",
        maxAge: ONE_YEAR,
        path: "/",
      });
    }
    return res;
  }

  if (request.cookies.get(COOKIE)?.value === expected) return NextResponse.next();

  if (nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "This mirror needs its access code. Reload the page." } },
      { status: 401 },
    );
  }
  return new NextResponse(LOCKED_PAGE, {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const config = {
  // Everything except Next's own static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
