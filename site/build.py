#!/usr/bin/env python3
"""Builds the marketing site into dist/.

One language per URL: English at the root, Portuguese under /pt/. Two documents
per language today, the landing page and the privacy policy.

Two ways to write a page, because the two kinds of text want different handling:

  spans   one source file carrying both languages in paired <span lang> elements,
          which the build strips down to one. Right for marketing copy, where the
          two versions are short and are edited as a pair.
  split   one source file per language. Right for the privacy policy, where the
          text is long, has legal weight, and is reviewed as a whole document in
          one language at a time rather than sentence by sentence.

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

# The privacy policy names a controller, and under the GDPR that has to be a
# person someone could actually write to.
#
# Two names, because they are two different things. OWNER is the person, and it
# is what carries the sentence. PLAY_DEVELOPER is the display name on the store
# listing, which reads as a brand rather than as a person, and the policy quotes
# it so a reader can see that the listing and this document are the same party.
#
# check() refuses to pass while OWNER is still the placeholder, because a policy
# published without it would name nobody.
OWNER = "André Luiz"
PLAY_DEVELOPER = "Beyou apps - André Luiz dev"
OWNER_COUNTRY_EN = "Portugal"
OWNER_COUNTRY_PT = "Portugal"
CONTACT = "beyouwebapp@gmail.com"

# Shown as the policy's effective date. Bump it whenever the text changes in a
# way a reader would care about.
POLICY_DATE_EN = "19 August 2026"
POLICY_DATE_PT = "19 de agosto de 2026"

# Site-wide, language-level facts. Page titles live in PAGES.
LOCALES = {
    "en": {
        "path": "",
        "html_lang": "en",
        "og_locale": "en_US",
        "og_alt": "The Beyou dashboard on a laptop and the app on a phone",
        "seg_label": "Language",
        "theme_label": "Light or dark theme",
    },
    "pt": {
        "path": "pt/",
        "html_lang": "pt-BR",
        "og_locale": "pt_BR",
        "og_alt": "O painel do Beyou num laptop e o aplicativo num celular",
        "seg_label": "Idioma",
        "theme_label": "Tema claro ou escuro",
    },
}

# Order matters for the sitemap, where the landing page goes first.
PAGES = {
    "home": {
        "source": "spans",
        "template": "body.html",
        "nav": "nav.html",
        "paths": {"en": "", "pt": "pt/"},
        "en": {
            "title": "Beyou - habits, routines and goals with progress you feel",
            "description": (
                "Beyou keeps habits, tasks, routines and goals in one place. Every "
                "check-in feeds an area of your life and levels it up. Free, on the "
                "web and on your phone."
            ),
        },
        "pt": {
            "title": "Beyou - hábitos, rotinas e metas com progresso que você sente",
            "description": (
                "O Beyou junta hábitos, tarefas, rotinas e metas num só lugar. Cada "
                "check alimenta uma área da sua vida e sobe o nível dela. Grátis, na "
                "web e no celular."
            ),
        },
    },
    "privacy": {
        "source": "split",
        "template": "privacy.%s.html",
        "nav": "nav-doc.html",
        "paths": {"en": "privacy/", "pt": "pt/privacidade/"},
        "en": {
            "title": "Privacy policy - Beyou",
            "description": (
                "What Beyou stores, who it is shared with, how long it is kept and "
                "how to delete your account and your data."
            ),
        },
        "pt": {
            "title": "Política de Privacidade - Beyou",
            "description": (
                "O que o Beyou guarda, com quem compartilha, por quanto tempo mantém "
                "e como apagar sua conta e seus dados."
            ),
        },
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


def assert_text_only_spans(markup, where):
    """A language span holds text. strip_language depends on it."""
    for m in re.finditer(r'<span lang="(?:pt|en)">(.*?)</span>', markup, re.S):
        if "<" in m.group(1):
            raise SystemExit("%s: a language span contains markup: %s"
                             % (where, m.group(0)[:80]))


def json_ld(page, code, loc, title, description):
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
    graph = [site, org]

    if page == "home":
        graph.append({
            "@type": "SoftwareApplication",
            "name": "Beyou",
            "applicationCategory": "ProductivityApplication",
            "operatingSystem": "Web, Android",
            "url": APP,
            "description": description,
            "inLanguage": ["en", "pt-BR"],
            "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "publisher": {"@id": ORIGIN + "/#org"},
        })
    else:
        # A policy is a document about the site, not a second product.
        graph.append({
            "@type": "WebPage",
            "@id": url_of(page, code) + "#webpage",
            "url": url_of(page, code),
            "name": title,
            "description": description,
            "inLanguage": loc["html_lang"],
            "isPartOf": {"@id": ORIGIN + "/#website"},
            "publisher": {"@id": ORIGIN + "/#org"},
        })

    return json.dumps(
        {"@context": "https://schema.org", "@graph": graph},
        ensure_ascii=False,
        separators=(",", ":"),
    )


def url_of(page, code):
    return ORIGIN + "/" + PAGES[page]["paths"][code]


def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    head_tpl = read(SRC, "head.html")
    foot_tpl = read(SRC, "foot.html")
    css = read(SRC, "site.css")
    js = read(SRC, "site.js")

    # One nav per kind of page. The landing page carries its section anchors; a
    # document page drops them, since it has no sections of its own.
    navs = {name: read(SRC, name)
            for name in sorted({spec["nav"] for spec in PAGES.values()})}

    for name, markup in list(navs.items()) + [("foot.html", foot_tpl)]:
        assert_text_only_spans(markup, name)

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

    # A share card per language: the headline on it is the page's own headline.
    og = {
        c: ORIGIN + hashed("og-%s.png" % c, open(os.path.join(SRC, "img/og-%s.png" % c), "rb").read())
        for c in LOCALES
    }

    for page, spec in PAGES.items():
        for code, loc in LOCALES.items():
            meta = spec[code]

            if spec["source"] == "spans":
                body = read(SRC, spec["template"])
                assert_text_only_spans(body, spec["template"])
                body = strip_language(body, code)
            else:
                body = read(SRC, spec["template"] % code)

            head = head_tpl
            nav = strip_language(navs[spec["nav"]], code)
            foot = strip_language(foot_tpl, code)

            # Fragment links have to resolve against the landing page, which is
            # this document only on the home page.
            home = "" if page == "home" else "/" + LOCALES[code]["path"]

            shared = {
                "__NAV__": nav,
                "__FOOT__": foot,
                "__LANG_LABEL__": loc["seg_label"],
                "__THEME_LABEL__": loc["theme_label"],
                "__HOME__": home,
                "__PRIVACY__": "/" + PAGES["privacy"]["paths"][code],
                # The parameter is how a click is recorded; the middleware strips
                # it and sends the visitor to the same page in the other
                # language, with the preference stored.
                "__HREF_EN__": "/" + spec["paths"]["en"] + "?lang=en",
                "__HREF_PT__": "/" + spec["paths"]["pt"] + "?lang=pt",
                "__PT_CURRENT__": 'aria-current="true"' if code == "pt" else "",
                "__EN_CURRENT__": 'aria-current="true"' if code == "en" else "",
                "__OWNER__": OWNER,
                "__PLAY_DEVELOPER__": PLAY_DEVELOPER,
                "__OWNER_COUNTRY__": OWNER_COUNTRY_EN if code == "en" else OWNER_COUNTRY_PT,
                "__CONTACT__": CONTACT,
                "__POLICY_DATE__": POLICY_DATE_EN if code == "en" else POLICY_DATE_PT,
                "__APP_URL__": APP,
                "__TITLE__": meta["title"],
                "__DESCRIPTION__": meta["description"],
                "__CANONICAL__": url_of(page, code),
                "__URL_EN__": url_of(page, "en"),
                "__URL_PT__": url_of(page, "pt"),
                "__OG_LOCALE__": loc["og_locale"],
                "__OG_LOCALE_ALT__": LOCALES["pt" if code == "en" else "en"]["og_locale"],
                "__OG_ALT__": loc["og_alt"],
                "__JSONLD__": json_ld(page, code, loc, meta["title"], meta["description"]),
                "__OG_IMAGE__": og[code],
            }

            # __NAV__ and __FOOT__ are substituted first and carry tokens of
            # their own, so the pass that follows has to see the result.
            for token in ("__NAV__", "__FOOT__"):
                body = body.replace(token, shared[token])

            for token, value in list(shared.items()) + list(assets.items()):
                head = head.replace(token, value)
                body = body.replace(token, value)

            document = (
                "<!doctype html>\n"
                '<html lang="%s">\n<head>\n%s</head>\n<body>\n%s\n<script src="%s" defer></script>\n</body>\n</html>\n'
                % (loc["html_lang"], head, body, assets["__JS__"])
            )

            out_dir = os.path.join(DIST, spec["paths"][code])
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
                fh.write(document)
            print("  %-8s %-6s %6.1f KB  %s"
                  % (page, code, len(document.encode()) / 1024,
                     "/" + spec["paths"][code]))

    write_meta()
    report()


def write_meta():
    with open(os.path.join(DIST, "robots.txt"), "w") as fh:
        fh.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % ORIGIN)

    # Every document carries the hreflang pair for its own page, which is what
    # tells a crawler the two are one page in two languages rather than two
    # competing ones. The pairs never cross pages: the policy is not an
    # alternate of the landing page.
    entries = []
    for page in PAGES:
        for code in LOCALES:
            alts = "".join(
                '\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>'
                % (LOCALES[c]["html_lang"], url_of(page, c))
                for c in LOCALES
            )
            entries.append("  <url>\n    <loc>%s</loc>%s\n  </url>"
                           % (url_of(page, code), alts))
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
        "/%s\n  Cache-Control: public, max-age=0, must-revalidate\n\n" % spec["paths"][code]
        for spec in PAGES.values()
        for code in LOCALES
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


def check_charset():
    """Every rendered character has to exist in the subset fonts.

    The fonts are subset to the characters the copy needs, so a character the
    copy gains later has no glyph and the browser silently falls back to a system
    face for that one letter. It is the kind of thing nobody notices until a
    single accent looks wrong in the middle of a word.

    This cannot be fixed by re-running pyftsubset: src/fonts/*.woff2 are already
    subset, and subsetting a subset cannot restore a glyph that is gone. Adding a
    character means going back to the full Geist and redoing the subset, so it is
    usually cheaper to reword. Hence a check rather than a build step.
    """
    charset = set(read(SRC, "fonts", "charset.txt"))
    problems = []
    seen = {}

    for page, spec in PAGES.items():
        for code in LOCALES:
            document = read(DIST, spec["paths"][code], "index.html")
            body = document.split("<body>", 1)[1]
            body = re.sub(r"<(script|style)\b.*?</\1>", " ", body, flags=re.S)
            for ch in set(re.sub(r"<[^>]*>", " ", body)):
                if ch not in charset and not ch.isspace():
                    seen.setdefault(ch, set()).add("%s/%s" % (page, code))

    for ch in sorted(seen):
        problems.append("%r (U+%04X) has no glyph in the subset fonts, used in %s"
                        % (ch, ord(ch), ", ".join(sorted(seen[ch]))))
    return problems


def check():
    """Fails the build on the mistakes that are easy to ship and hard to notice."""
    problems = []

    if OWNER.startswith("TODO"):
        problems.append(
            "OWNER is still the placeholder in build.py. The privacy policy has "
            "to name the controller, so set it before deploying."
        )

    for page, spec in PAGES.items():
        for code in LOCALES:
            where = "%s/%s" % (page, code)
            document = read(DIST, spec["paths"][code], "index.html")

            if "__" in re.sub(r'(?:href|src)="[^"]*"', "", document):
                leftover = re.findall(r"__[A-Z_]+__", document)
                if leftover:
                    problems.append("%s: unreplaced %s" % (where, sorted(set(leftover))))

            other = "pt" if code == "en" else "en"
            if 'lang="%s"' % other in document.replace('hreflang="%s"' % other, ""):
                problems.append("%s: the other language is still in the document" % where)
            if "<span lang=" in document:
                problems.append("%s: language spans were not unwrapped" % where)

            for needed in ("<title>", 'name="description"', 'rel="canonical"',
                           'hreflang="x-default"', "application/ld+json"):
                if needed not in document:
                    problems.append("%s: missing %s" % (where, needed))

            if document.count("<h1") != 1:
                problems.append("%s: %d h1 elements" % (where, document.count("<h1")))

            for tag in re.findall(r"<img[^>]*>", document):
                for attr in ("alt=", "width=", "height="):
                    if attr not in tag:
                        problems.append("%s: an img has no %s" % (where, attr))

            for host in re.findall(r'(?:src|href)="(https?://[^/"]+)', document):
                if host not in (ORIGIN, APP.rstrip("/"), DOCS.rstrip("/"),
                                "https://github.com"):
                    problems.append("%s: unexpected external host %s" % (where, host))

            try:
                json.loads(re.search(r'application/ld\+json">(.*?)</script>',
                                     document, re.S).group(1))
            except Exception as exc:
                problems.append("%s: JSON-LD does not parse (%s)" % (where, exc))

            for dash in ("—", "–"):
                if dash in document:
                    problems.append("%s: contains an em or en dash" % where)

            for asset in re.findall(r'"(/a/[^"]+)"', document):
                if not os.path.exists(os.path.join(DIST, asset.lstrip("/"))):
                    problems.append("%s: missing asset %s" % (where, asset))

            # The policy is the URL the Play Console points at for data
            # deletion, so the anchor it names has to exist.
            if page == "privacy" and 'id="data-deletion"' not in document:
                problems.append("%s: no id=\"data-deletion\" to link the store listing at" % where)

    # Every page has to be reachable from the landing page.
    home = read(DIST, "index.html")
    if 'href="/privacy/"' not in home:
        problems.append("home/en: no link to the privacy policy")

    problems.extend(check_charset())

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
