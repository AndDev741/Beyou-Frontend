/**
 * Language routing for the two-locale site.
 *
 * English lives at `/` and is the canonical root. Portuguese lives at `/pt/`.
 * A first-time visitor is sent to whichever their system asks for; after that,
 * what they clicked wins forever.
 *
 * Why it is shaped this way:
 *
 *  - Only 302, never 301. The redirect is a convenience for people, not a claim
 *    about which URL is the real one. That claim lives in the canonical tag.
 *  - Googlebot sends no Accept-Language, so it lands on English and indexes it.
 *    The hreflang pair in the head is what leads it to the Portuguese page.
 *  - `Vary: Accept-Language` keeps the edge cache from handing one visitor's
 *    language to the next.
 *  - The choice is recorded by an explicit `?lang=`, and the redirect that
 *    follows strips the parameter, so the address bar and the crawler both end
 *    up on the clean URL.
 */
const COOKIE = "beyou_lang";
const YEAR = 31536000;

/**
 * Every page, as the pair of paths it lives at. Switching language has to keep
 * the visitor on the page they were reading, so a click on PT from the English
 * policy lands on the Portuguese policy and not on the Portuguese home page.
 *
 * Adding a page to build.py means adding it here too.
 */
const PAGES = [
  { en: "/", pt: "/pt/" },
  { en: "/privacy/", pt: "/pt/privacidade/" },
];

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // An explicit choice: record it, then send them to the clean URL so the
  // parameter never lingers in a shared link.
  const chosen = url.searchParams.get("lang");
  if (chosen === "en" || chosen === "pt") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: counterpart(url.pathname, chosen),
        "Set-Cookie": `${COOKIE}=${chosen}; Path=/; Max-Age=${YEAR}; SameSite=Lax; Secure`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Everything below is about the bare root. Any other path is served as asked,
  // including /pt/ itself.
  if (url.pathname !== "/") return next();

  const preference = cookieValue(request.headers.get("Cookie"), COOKIE);
  if (preference === "pt") return redirect("/pt/");
  if (preference === "en") return vary(await next());

  if (prefersPortuguese(request.headers.get("Accept-Language"))) return redirect("/pt/");
  return vary(await next());
}

/**
 * The path of the same page in the requested language.
 *
 * The language links the build emits already point at the right path, so this
 * usually returns what it was given. It earns its keep on a hand-typed or
 * shared `/privacy/?lang=pt`, and it falls back to the home page rather than
 * 404ing on a path it does not recognise.
 */
export function counterpart(pathname, lang) {
  const path = pathname.endsWith("/") ? pathname : pathname + "/";
  for (const page of PAGES) {
    if (page.en === path || page.pt === path) return page[lang];
  }
  return lang === "pt" ? "/pt/" : "/";
}

function redirect(to) {
  return new Response(null, {
    status: 302,
    headers: { Location: to, Vary: "Accept-Language", "Cache-Control": "no-store" },
  });
}

function vary(res) {
  const out = new Response(res.body, res);
  out.headers.set("Vary", "Accept-Language");
  return out;
}

function cookieValue(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return null;
}

/**
 * True when Portuguese outranks English in the header's own order.
 *
 * Reading the first tag alone is not enough: `en;q=0.4, pt-BR;q=0.9` asks for
 * Portuguese while starting with English.
 */
export function prefersPortuguese(accept) {
  if (!accept) return false;
  const ranked = accept
    .toLowerCase()
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? parseFloat(q.slice(2)) : 1, i };
    })
    .filter((e) => e.tag && e.tag !== "*")
    .sort((a, b) => b.q - a.q || a.i - b.i);

  for (const { tag } of ranked) {
    if (tag.startsWith("pt")) return true;
    if (tag.startsWith("en")) return false;
  }
  return false;
}
