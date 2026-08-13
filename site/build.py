#!/usr/bin/env python3
"""Builds the marketing site into dist/.

One language per URL: English at the root, Portuguese under /pt/. The source
carries both in paired <span lang> elements; this strips one of them per page, so
a visitor and a crawler each receive a single language instead of two hidden
inside one document.

Assets get a content hash in the name, which is what lets _headers cache them
forever. The HTML itself is never hashed and never cached for long, so a deploy
is visible immediately.

Standard library only, on purpose: this has to run in CI without an install step.

    python3 build.py            # writes dist/
    python3 build.py --check    # builds, then fails if anything looks wrong
"""

import hashlib
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
DIST = os.path.join(HERE, "dist")

ORIGIN = "https://beyouweb.com"
APP = "https://app.beyouweb.com/"
DOCS = "https://docs.beyouweb.com/"

# The root is English; Portuguese lives one level down. Order matters only for
# the sitemap, where the root goes first.
LOCALES = {
    "en": {
        "path": "",
        "html_lang": "en",
        "og_locale": "en_US",
        "title": "Beyou - habits, routines and goals with progress you feel",
        "description": (
            "Beyou keeps habits, tasks, routines and goals in one place. Every "
            "check-in feeds an area of your life and levels it up. Free, on the "
            "web and on your phone."
        ),
        "og_alt": "The Beyou dashboard on a laptop and the app on a phone",
        "seg_label": "Language",
    },
    "pt": {
        "path": "pt/",
        "html_lang": "pt-BR",
        "og_locale": "pt_BR",
        "title": "Beyou - hábitos, rotinas e metas com progresso que você sente",
        "description": (
            "O Beyou junta hábitos, tarefas, rotinas e metas num só lugar. Cada "
            "check alimenta uma área da sua vida e sobe o nível dela. Grátis, na "
            "web e no celular."
        ),
        "og_alt": "O painel do Beyou num laptop e o aplicativo num celular",
        "seg_label": "Idioma",
    },
}


def read(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as fh:
        return fh.read()


def hashed(name, data):
    """Copies one asset into dist/a/ under a content-addressed name."""
    stem, ext = os.path.splitext(name)
    digest = hashlib.sha256(data).hexdigest()[:10]
    out = "%s.%s%s" % (stem, digest, ext)
    os.makedirs(os.path.join(DIST, "a"), exist_ok=True)
    with open(os.path.join(DIST, "a", out), "wb") as fh:
        fh.write(data)
    return "/a/" + out


def strip_language(markup, keep):
    """Keeps one language's spans and unwraps them, removing the other's.

    The source guarantees these spans hold text and nothing else, so a single
    non-greedy pass cannot swallow a closing tag that belongs to something else.
    build asserts that invariant before it gets here.
    """
    drop = "pt" if keep == "en" else "en"
    markup = re.sub(r'<span lang="%s">.*?</span>' % drop, "", markup, flags=re.S)
    markup = re.sub(r'<span lang="%s">(.*?)</span>' % keep, r"\1", markup, flags=re.S)
    return markup


def json_ld(loc):
    """Describes the product and the publisher, and nothing it cannot back up.

    No aggregateRating: a rating with no reviews behind it is a guidelines
    violation, and the penalty is a manual action rather than a lost snippet.
    """
    site = {
        "@type": "WebSite",
        "@id": ORIGIN + "/#website",
        "url": ORIGIN + "/",
        "name": "Beyou",
        "inLanguage": loc["html_lang"],
        "publisher": {"@id": ORIGIN + "/#org"},
    }
    org = {
        "@type": "Organization",
        "@id": ORIGIN + "/#org",
        "name": "Beyou",
        "url": ORIGIN + "/",
        "logo": ORIGIN + "/a/icon.svg",
    }
    app = {
        "@type": "SoftwareApplication",
        "name": "Beyou",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web, Android",
        "url": APP,
        "description": loc["description"],
        "inLanguage": ["en", "pt-BR"],
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "publisher": {"@id": ORIGIN + "/#org"},
    }
    return json.dumps(
        {"@context": "https://schema.org", "@graph": [site, org, app]},
        ensure_ascii=False,
        separators=(",", ":"),
    )


def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    head_tpl = read(SRC, "head.html")
    body_tpl = read(SRC, "body.html")
    css = read(SRC, "site.css")
    js = read(SRC, "site.js")

    # Same invariant the splitter checked: a language span holds text only.
    for m in re.finditer(r'<span lang="(?:pt|en)">(.*?)</span>', body_tpl, re.S):
        if "<" in m.group(1):
            raise SystemExit("a language span contains markup: " + m.group(0)[:80])

    fonts = {
        "__FONT_SANS__": hashed("geist.woff2", open(os.path.join(SRC, "fonts/geist.woff2"), "rb").read()),
        "__FONT_MONO__": hashed("geist-mono.woff2", open(os.path.join(SRC, "fonts/geist-mono.woff2"), "rb").read()),
    }
    for token, url in fonts.items():
        css = css.replace(token, url)

    assets = {
        "__CSS__": hashed("site.css", css.encode()),
        "__JS__": hashed("site.js", js.encode()),
        "__IMG_WEB__": hashed("shot-web.webp", open(os.path.join(SRC, "img/shot-web.webp"), "rb").read()),
        "__IMG_MOBILE__": hashed("shot-mobile.webp", open(os.path.join(SRC, "img/shot-mobile.webp"), "rb").read()),
        "__ICON_PNG__": hashed("icon-192.png", open(os.path.join(SRC, "img/icon-192.png"), "rb").read()),
        "__ICON_APPLE__": hashed("icon-180.png", open(os.path.join(SRC, "img/icon-180.png"), "rb").read()),
    }
    assets.update(fonts)

    # The svg icon keeps its plain name: the JSON-LD logo field wants a stable URL.
    shutil.copyfile(os.path.join(SRC, "img/icon.svg"), os.path.join(DIST, "a", "icon.svg"))
    assets["__ICON_SVG__"] = "/a/icon.svg"

    url_en = ORIGIN + "/"
    url_pt = ORIGIN + "/" + LOCALES["pt"]["path"]

    # A share card per language: the headline on it is the page's own headline.
    og = {
        c: ORIGIN + hashed("og-%s.png" % c, open(os.path.join(SRC, "img/og-%s.png" % c), "rb").read())
        for c in LOCALES
    }

    for code, loc in LOCALES.items():
        head = head_tpl
        body = strip_language(body_tpl, code)

        body = body.replace("__LANG_LABEL__", loc["seg_label"])
        # The parameter is how a click is recorded; the middleware strips it and
        # sends the visitor to the clean URL with the preference stored.
        body = body.replace("__HREF_EN__", "/?lang=en")
        body = body.replace("__HREF_PT__", "/" + LOCALES["pt"]["path"] + "?lang=pt")
        body = body.replace("__PT_CURRENT__", 'aria-current="true"' if code == "pt" else "")
        body = body.replace("__EN_CURRENT__", 'aria-current="true"' if code == "en" else "")

        fields = {
            "__TITLE__": loc["title"],
            "__DESCRIPTION__": loc["description"],
            "__CANONICAL__": url_en if code == "en" else url_pt,
            "__URL_EN__": url_en,
            "__URL_PT__": url_pt,
            "__OG_LOCALE__": loc["og_locale"],
            "__OG_LOCALE_ALT__": LOCALES["pt" if code == "en" else "en"]["og_locale"],
            "__OG_ALT__": loc["og_alt"],
            "__JSONLD__": json_ld(loc),
            "__OG_IMAGE__": og[code],
        }
        for token, value in list(fields.items()) + list(assets.items()):
            head = head.replace(token, value)
            body = body.replace(token, value)

        page = (
            "<!doctype html>\n"
            '<html lang="%s">\n<head>\n%s</head>\n<body>\n%s\n<script src="%s" defer></script>\n</body>\n</html>\n'
            % (loc["html_lang"], head, body, assets["__JS__"])
        )

        out_dir = os.path.join(DIST, loc["path"])
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(page)
        print("  %-8s %6.1f KB  %s" % (code, len(page.encode()) / 1024, "/" + loc["path"]))

    write_meta()
    report()


def write_meta():
    with open(os.path.join(DIST, "robots.txt"), "w") as fh:
        fh.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % ORIGIN)

    # Both pages carry both hreflang pairs, which is what tells a crawler they are
    # one page in two languages rather than two competing ones.
    entries = []
    for code, loc in LOCALES.items():
        url = ORIGIN + "/" + loc["path"]
        alts = "".join(
            '\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>'
            % (LOCALES[c]["html_lang"], ORIGIN + "/" + LOCALES[c]["path"])
            for c in LOCALES
        )
        entries.append("  <url>\n    <loc>%s</loc>%s\n  </url>" % (url, alts))
    with open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
            ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + "\n".join(entries)
            + "\n</urlset>\n"
        )

    # Every matching block applies and same-name headers are appended, so a
    # Cache-Control under /* would be concatenated onto the one under /a/* and
    # the year would lose to the max-age=0 sitting next to it. So the catch-all
    # carries no Cache-Control at all, and each document names its own.
    documents = "".join(
        "/%s\n  Cache-Control: public, max-age=0, must-revalidate\n\n" % loc["path"]
        for loc in LOCALES.values()
    )
    with open(os.path.join(DIST, "_headers"), "w") as fh:
        fh.write(
            "# Hashed names, so a year is safe and a deploy can never serve a stale one.\n"
            "/a/*\n"
            "  Cache-Control: public, max-age=31536000, immutable\n"
            "\n"
            "# The documents are the only thing that changes under a fixed URL.\n"
            + documents +
            "# Everything below is about safety, not caching, so it applies to all.\n"
            "/*\n"
            "  X-Content-Type-Options: nosniff\n"
            "  Referrer-Policy: strict-origin-when-cross-origin\n"
            "  X-Frame-Options: SAMEORIGIN\n"
            "  Permissions-Policy: geolocation=(), microphone=(), camera=()\n"
            # 'unsafe-inline' is for style ATTRIBUTES, which the markup uses for
            # animation delays, stagger indexes and bar widths. There is no inline
            # <style> element left, and with script-src locked to 'self' on a site
            # that takes no input, the exposure this leaves is CSS only.
            "  Content-Security-Policy: default-src 'none'; img-src 'self';"
            " style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self';"
            " base-uri 'none'; form-action 'none'; frame-ancestors 'self'\n"
        )


def report():
    total = 0
    for root, _dirs, files in os.walk(DIST):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    print("  dist total %.1f KB" % (total / 1024))


def check():
    """Fails the build on the mistakes that are easy to ship and hard to notice."""
    problems = []
    for code, loc in LOCALES.items():
        page = read(DIST, loc["path"], "index.html")

        if "__" in re.sub(r'(?:href|src)="[^"]*"', "", page):
            leftover = re.findall(r"__[A-Z_]+__", page)
            if leftover:
                problems.append("%s: unreplaced %s" % (code, sorted(set(leftover))))

        other = "pt" if code == "en" else "en"
        if 'lang="%s"' % other in page.replace('hreflang="%s"' % other, ""):
            problems.append("%s: the other language is still in the document" % code)
        if "<span lang=" in page:
            problems.append("%s: language spans were not unwrapped" % code)

        for needed in ("<title>", 'name="description"', 'rel="canonical"',
                       'hreflang="x-default"', "application/ld+json"):
            if needed not in page:
                problems.append("%s: missing %s" % (code, needed))

        if page.count("<h1") != 1:
            problems.append("%s: %d h1 elements" % (code, page.count("<h1")))

        imgs = re.findall(r"<img[^>]*>", page)
        for tag in imgs:
            for attr in ("alt=", "width=", "height="):
                if attr not in tag:
                    problems.append("%s: an img has no %s" % (code, attr))

        for host in re.findall(r'(?:src|href)="(https?://[^/"]+)', page):
            if host not in (ORIGIN, APP.rstrip("/"), DOCS.rstrip("/"),
                            "https://github.com"):
                problems.append("%s: unexpected external host %s" % (code, host))

        try:
            json.loads(re.search(r'application/ld\+json">(.*?)</script>', page, re.S).group(1))
        except Exception as exc:
            problems.append("%s: JSON-LD does not parse (%s)" % (code, exc))

        for dash in ("—", "–"):
            if dash in page:
                problems.append("%s: contains an em or en dash" % code)

    for asset in re.findall(r'"(/a/[^"]+)"', read(DIST, "index.html")):
        if not os.path.exists(os.path.join(DIST, asset.lstrip("/"))):
            problems.append("missing asset " + asset)

    if problems:
        print("\ncheck failed:")
        for p in problems:
            print("  -", p)
        return 1
    print("  check passed")
    return 0


if __name__ == "__main__":
    print("building")
    build()
    if "--check" in sys.argv:
        sys.exit(check())
