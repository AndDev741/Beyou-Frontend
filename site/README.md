# Beyou marketing site

Static, two languages, no framework. English at `/`, Portuguese at `/pt/`.

Deliberately outside the `apps/*` workspace glob, so `npm run build` and turbo at
the repo root never touch it. It ships on its own.

```
site/
  src/
    head.html          <head> template, one set of placeholders per page
    body.html          the page, with both languages in paired <span lang>
    site.css           the whole stylesheet
    site.js            the whole script
    fonts/             Geist and Geist Mono, subset and committed
    img/               screenshots, icons, share cards
  functions/
    _middleware.js     first-visit language routing on Cloudflare Pages
    _middleware.test.mjs
  tools/
    make-og.py         redraws the share cards (not part of the build)
  build.py             writes dist/
  dist/                generated, not committed
```

## Build

```bash
python3 build.py --check     # or: npm run build
node functions/_middleware.test.mjs
```

Standard library only. No install step, so CI needs nothing but python3.

`--check` fails the build on the mistakes that are easy to ship and hard to
notice: an unreplaced placeholder, both languages left in one document, a missing
canonical or hreflang, more than one `h1`, an `img` without `alt`/`width`/`height`,
JSON-LD that does not parse, an unexpected external host, an em dash.

## What the build does

One language per URL. The source keeps both in paired `<span lang="pt">` /
`<span lang="en">` elements; the build removes one side and unwraps the other, so
a visitor and a crawler each receive a single language. Two languages hidden
inside one document was the biggest SEO problem with the prototype: both texts
were indexed on one URL and there was no `hreflang` to explain them.

Assets are content-addressed (`/a/site.<hash>.css`). That is what makes the
year-long `immutable` cache in `_headers` safe. The documents themselves are
never hashed and never cached, so a deploy is live immediately.

Fonts are subset to the 106 characters the page can render and instanced to the
400-600 weight range it actually uses, which took the pair from 59 KB to 25 KB.
Regenerating them needs `fonttools`:

```bash
pyftsubset src/fonts/geist.woff2 --text-file=src/fonts/charset.txt \
  --flavor=woff2 --layout-features='kern,liga,calt,tnum' \
  --output-file=src/fonts/geist.woff2
```

Check `charset.txt` still covers the copy if you add text in another script. The
build does not verify this, because it does not read the fonts.

## Deploy on Cloudflare Pages

Create a Pages project from the repo, then:

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `python3 build.py --check` |
| Build output directory | `dist` |

`functions/` sits next to `dist/` and Pages picks it up automatically. It only
handles the bare root; every other path is served straight from the CDN.

Then in the dashboard:

- **Speed → Optimization → Rocket Loader: off.** It defers and reorders scripts,
  and this page's script reads the DOM on parse.
- **Speed → Optimization → Polish: off.** The screenshots are already WebP at the
  size they are displayed, and re-compressing them is the one thing that made the
  earlier versions look bad.
- **Speed → Optimization → Early Hints: on.** The two fonts are preloaded in the
  head and this gets them requested before the HTML arrives.
- **Analytics → Web Analytics: on.** No cookie, so no consent banner.
- Brotli, HTTP/3 and TLS 1.3 are already on by default.

DNS: `beyouweb.com` and `www` to the Pages project, `www` redirecting to the
apex, since the canonical tags name the apex.

After the first deploy: add the property in Google Search Console and submit
`https://beyouweb.com/sitemap.xml`. Do the same for `docs.beyouweb.com`, which is
where the long-tail traffic will actually come from.

## Language routing

A first-time visitor at `/` is sent to `/pt/` when their `Accept-Language` ranks
Portuguese above English. After that, what they clicked wins: the segment links
carry `?lang=`, the middleware records it in a cookie and redirects to the clean
URL, so the parameter never lingers in a shared link.

Only 302, never 301. The redirect is a convenience for people; which URL is the
real one is what the canonical tag says. Googlebot sends no `Accept-Language`, so
it lands on English and follows `hreflang` to the Portuguese page.

`Vary: Accept-Language` is set on the root so the edge cache cannot hand one
visitor's language to the next.

## Updating the screenshots

The app view is captured at a **1280 x 720 viewport**, which is not arbitrary. The
laptop's screen height on the page is between 490 and 695 CSS px depending on the
window, and legibility is `screen height / capture height`. At 962 px tall the app
text landed at 9 px; at 723 it lands at 13. A taller capture reads worse, however
sharp the file is.

Capture in the dark theme for the desktop and the light theme for the phone: the
panel's whole point is that both exist. Keep the streak and the level consistent
between the two, and with the numbers written into the copy in `body.html`.

Then redraw the share cards, which crop the same screenshot:

```bash
python3 tools/make-og.py <dir-with-geist.ttf> src/img/shot-web.webp
```

## Known follow-ups

- No AVIF. Adding `<picture>` with an AVIF source would take roughly another
  third off the two screenshots. It needs an encoder in the build, which is why it
  is not here.
- Captures are 1x. On a retina screen the browser upscales the desktop shot about
  1.85x, which is legible but slightly soft. A 2x capture of the same 1280 x 720
  viewport fixes it and roughly doubles the file.
- A landing page ranks for the brand and a couple of category terms. The pages
  that answer questions live on `docs.beyouweb.com`; link the two deliberately.
