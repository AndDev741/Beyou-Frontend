#!/usr/bin/env python3
"""Regenerates every raster brand asset from one geometry source.

    python3 apps/mobile/tools/make-icons.py            # write all assets
    python3 apps/mobile/tools/make-icons.py --check    # verify committed files, write nothing

Run from the repo root. Fonts default to apps/mobile/assets/fonts/ and can be
overridden with --fonts-dir (needs Geist-SemiBold.ttf and Geist-Regular.ttf).

The mark is lifted verbatim from site/tools/make-og.py brand(): a ring drawn as
an arc from -61 to 298 degrees plus a check polyline through (22,33), (29,40),
(43,26) on the 48-unit grid (u = 2r / 48), stroke width 5 at r=17 scaled
linearly (width = 5r/17, i.e. 5/34 of the ring diameter). Keeping every asset
on this one function is the point: the mark cannot drift between files.

Glyph scales (ring outer diameter, measured off the previous committed assets
so nothing moves visually):
  icon.png / favicon.png     636 of 1024 (favicon renders natively at 196: 122)
  android foreground          456 of 1024 (bbox 284..740, inside the 66% safe zone)
  android monochrome          480 of 1024 (deliberately its own render pass at a
                              slightly larger scale: Android themed icons read
                              only the alpha channel and display the layer small,
                              so the monochrome glyph may use a bit more of the
                              safe zone; it also guarantees the file is not a
                              byte-copy of the foreground)
  splash icons                616 of 1024
  apple-touch-icon            102 of 180 (mirrors site/src/img/icon-180.png)

Colors are exact brand tokens: gradient #1D6BF3 (top) to #1558D6 (bottom),
splash glyph #1D6BF3, dark splash glyph #5C9DFF, dark plate #0E1218.

Output is deterministic: Pillow's default PNG encoder embeds no timestamps and
every draw is pure math over these constants.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
ASSETS = os.path.join(ROOT, "apps", "mobile", "assets")
WEB = os.path.join(ROOT, "apps", "web", "public")

GRAD_TOP = (29, 107, 243)      # #1D6BF3
GRAD_BOTTOM = (21, 88, 214)    # #1558D6
SPLASH = (29, 107, 243)        # #1D6BF3
SPLASH_DARK = (92, 157, 255)   # #5C9DFF
PLATE = (14, 18, 24)           # #0E1218
INK = (240, 244, 249)          # #F0F4F9
MUTED = (163, 174, 189)        # #A3AEBD
WHITE = (255, 255, 255)

SS = 4  # supersampling factor for the anti-aliased glyph masks

TAGLINE = "Habits, routines and goals with progress you feel"


def brand(d, x, y, r, fill):
    """Verbatim geometry from site/tools/make-og.py: the ring with its opening
    to the north-east, and the check inside it. Stroke = 5 at r=17, scaled."""
    width = max(1, round(r * 5 / 17))
    d.arc([x, y, x + r * 2, y + r * 2], start=-61, end=298, fill=fill, width=width)
    u = r * 2 / 48.0
    p = lambda a, b: (x + (a - 8) * u, y + (b - 8) * u)
    d.line([p(22, 33), p(29, 40), p(43, 26)], fill=fill, width=width, joint="curve")


def glyph_mask(size, diameter, center=None):
    """Anti-aliased L-mode mask of the mark: drawn at SS scale, LANCZOS down."""
    w, h = size
    if center is None:
        center = (w / 2, h / 2)
    big = Image.new("L", (w * SS, h * SS), 0)
    d = ImageDraw.Draw(big)
    r = diameter * SS / 2
    brand(d, center[0] * SS - r, center[1] * SS - r, r, fill=255)
    return big.resize(size, Image.LANCZOS)


def glyph_rgba(size, diameter, rgb, center=None):
    """The mark as RGBA. The RGB planes are constant across the whole canvas
    (transparent pixels included) so anti-aliasing never shifts the hue and
    every non-transparent pixel keeps the exact token color."""
    a = glyph_mask(size, diameter, center)
    return Image.merge("RGBA", (
        Image.new("L", size, rgb[0]),
        Image.new("L", size, rgb[1]),
        Image.new("L", size, rgb[2]),
        a,
    ))


def vgrad(size, top, bottom):
    """Vertical linear gradient, exact at both endpoint rows."""
    w, h = size
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (w - 1, y)], fill=c)
    return im


_GRAD_1024 = None


def grad_1024():
    # The 1024 gradient backs both icon.png and the adaptive background layer;
    # vgrad draws it row by row, so build it once and share the image
    # (alpha_composite never mutates its base).
    global _GRAD_1024
    if _GRAD_1024 is None:
        _GRAD_1024 = vgrad((1024, 1024), GRAD_TOP, GRAD_BOTTOM).convert("RGBA")
    return _GRAD_1024


def make_icon():
    return Image.alpha_composite(grad_1024(), glyph_rgba((1024, 1024), 636, WHITE))


def make_favicon():
    base = vgrad((196, 196), GRAD_TOP, GRAD_BOTTOM).convert("RGBA")
    return Image.alpha_composite(base, glyph_rgba((196, 196), 122, WHITE))


def make_apple_touch():
    base = Image.new("RGBA", (180, 180), PLATE + (255,))
    return Image.alpha_composite(base, glyph_rgba((180, 180), 102, SPLASH))


def make_og(fonts_dir):
    semibold = ImageFont.truetype(os.path.join(fonts_dir, "Geist-SemiBold.ttf"), 84)
    regular = ImageFont.truetype(os.path.join(fonts_dir, "Geist-Regular.ttf"), 32)
    card = Image.new("RGBA", (1200, 630), PLATE + (255,))
    card = Image.alpha_composite(card, glyph_rgba((1200, 630), 120, SPLASH_DARK, center=(600, 210)))
    d = ImageDraw.Draw(card)
    d.text((600, 366), "Beyou", font=semibold, fill=INK, anchor="mm")
    d.text((600, 468), TAGLINE, font=regular, fill=MUTED, anchor="mm")
    return card.convert("RGB")


def targets(fonts_dir):
    return [
        (os.path.join(ASSETS, "icon.png"), make_icon),
        (os.path.join(ASSETS, "android-icon-foreground.png"),
         lambda: glyph_rgba((1024, 1024), 456, WHITE)),
        (os.path.join(ASSETS, "android-icon-background.png"), grad_1024),
        # dedicated monochrome pass at its own scale, see module docstring
        (os.path.join(ASSETS, "android-icon-monochrome.png"),
         lambda: glyph_rgba((1024, 1024), 480, WHITE)),
        (os.path.join(ASSETS, "favicon.png"), make_favicon),
        (os.path.join(ASSETS, "splash-icon.png"),
         lambda: glyph_rgba((1024, 1024), 616, SPLASH)),
        (os.path.join(ASSETS, "splash-icon-dark.png"),
         lambda: glyph_rgba((1024, 1024), 616, SPLASH_DARK)),
        (os.path.join(WEB, "apple-touch-icon.png"), make_apple_touch),
        (os.path.join(WEB, "og-image.png"), lambda: make_og(fonts_dir)),
    ]


def generate(fonts_dir):
    # Resolve the fonts before writing anything: og-image.png is the only
    # font-dependent target and is built last, so failing here keeps a bad
    # --fonts-dir from leaving a mixed old/new asset set on disk.
    ImageFont.truetype(os.path.join(fonts_dir, "Geist-SemiBold.ttf"), 84)
    ImageFont.truetype(os.path.join(fonts_dir, "Geist-Regular.ttf"), 32)
    for path, build in targets(fonts_dir):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        build().save(path)
        print("wrote", os.path.relpath(path, ROOT),
              round(os.path.getsize(path) / 1024), "KB")


# ---------------------------------------------------------------- check mode

def solid_pixel(im):
    """Coordinates of the first fully opaque pixel, or None if there is none."""
    try:
        idx = im.getchannel("A").tobytes().index(255)
    except ValueError:
        return None
    return (idx % im.width, idx // im.width)


def opaque_colors(im):
    """The set of RGB values used by non-transparent pixels."""
    counted = im.getcolors(im.width * im.height) or []
    return {color[:3] for _count, color in counted if color[3] > 0}


def check():
    fails = []

    def expect(cond, msg):
        if not cond:
            fails.append(msg)

    def load(path):
        try:
            return Image.open(path).convert("RGBA")
        except FileNotFoundError:
            fails.append("missing file: " + os.path.relpath(path, ROOT))
            return None
        except (OSError, ValueError) as exc:
            fails.append("unreadable file: %s (%s)" % (os.path.relpath(path, ROOT), exc))
            return None

    p = lambda *parts: os.path.join(*parts)
    # The file list derives from targets() so a new asset cannot ship
    # unchecked; only its expected size needs registering here.
    expected_sizes = {
        "icon.png": (1024, 1024),
        "android-icon-foreground.png": (1024, 1024),
        "android-icon-background.png": (1024, 1024),
        "android-icon-monochrome.png": (1024, 1024),
        "favicon.png": (196, 196),
        "splash-icon.png": (1024, 1024),
        "splash-icon-dark.png": (1024, 1024),
        "apple-touch-icon.png": (180, 180),
        "og-image.png": (1200, 630),
    }
    ims = {}
    dims = {}
    for path, _build in targets(p(ASSETS, "fonts")):
        base = os.path.basename(path)
        size = expected_sizes.get(base)
        if size is None:
            fails.append("no expected size registered for " + base)
            continue
        dims[path] = size
        im = load(path)
        if im is None:
            continue
        ims[base] = im
        expect(im.size == size, "%s size %s, expected %s"
               % (os.path.relpath(path, ROOT), im.size, size))

    icon = ims.get("icon.png")
    if icon is not None and icon.size == (1024, 1024):
        for xy in [(0, 0), (1023, 0), (0, 1023), (1023, 1023)]:
            expect(icon.getpixel(xy)[3] == 255,
                   "icon.png corner %s alpha %d != 255 (must be full-bleed)"
                   % (xy, icon.getpixel(xy)[3]))
        expect(icon.getpixel((20, 0)) == GRAD_TOP + (255,),
               "icon.png top gradient %s != #1D6BF3" % (icon.getpixel((20, 0)),))
        expect(icon.getpixel((20, 1023)) == GRAD_BOTTOM + (255,),
               "icon.png bottom gradient %s != #1558D6" % (icon.getpixel((20, 1023)),))

    bg = ims.get("android-icon-background.png")
    if bg is not None and bg.size == (1024, 1024):
        expect(bg.getpixel((20, 0)) == GRAD_TOP + (255,),
               "background top gradient %s != #1D6BF3" % (bg.getpixel((20, 0)),))
        expect(bg.getpixel((20, 1023)) == GRAD_BOTTOM + (255,),
               "background bottom gradient %s != #1558D6" % (bg.getpixel((20, 1023)),))

    if "android-icon-foreground.png" in ims and "android-icon-monochrome.png" in ims:
        try:
            with open(p(ASSETS, "android-icon-foreground.png"), "rb") as f1, \
                 open(p(ASSETS, "android-icon-monochrome.png"), "rb") as f2:
                expect(f1.read() != f2.read(),
                       "monochrome must not be a byte-copy of the foreground")
        except OSError:
            pass
    mono = ims.get("android-icon-monochrome.png")
    if mono is not None:
        colors = opaque_colors(mono)
        expect(colors == {WHITE},
               "monochrome non-transparent pixels must be a single white color, got %s"
               % (sorted(colors)[:5],))
    fg = ims.get("android-icon-foreground.png")
    if fg is not None:
        colors = opaque_colors(fg)
        expect(colors == {WHITE},
               "foreground non-transparent pixels must be a single white color, got %s"
               % (sorted(colors)[:5],))

    for name, want, tok in [("splash-icon.png", SPLASH, "#1D6BF3"),
                            ("splash-icon-dark.png", SPLASH_DARK, "#5C9DFF")]:
        im = ims.get(name)
        if im is None:
            continue
        at = solid_pixel(im)
        if at is None:
            expect(False, "%s has no fully opaque pixel to sample" % name)
            continue
        got = im.getpixel(at)
        expect(got[:3] == want, "%s glyph pixel %s != %s" % (name, got, tok))

    apple = ims.get("apple-touch-icon.png")
    if apple is not None:
        expect(apple.getchannel("A").getextrema() == (255, 255),
               "apple-touch-icon.png must be fully opaque")
        expect(apple.getpixel((0, 0))[:3] == PLATE,
               "apple-touch-icon.png plate %s != #0E1218" % (apple.getpixel((0, 0)),))

    og = ims.get("og-image.png")
    if og is not None:
        expect(og.getpixel((0, 0))[:3] == PLATE,
               "og-image.png background %s != #0E1218" % (og.getpixel((0, 0)),))

    if fails:
        print("FAIL: %d invariant(s) violated" % len(fails))
        for f in fails:
            print("  -", f)
        sys.exit(1)
    print("check ok: all %d files match the brand spec" % len(dims))


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true",
                    help="verify the committed files, write nothing")
    ap.add_argument("--fonts-dir", default=os.path.join(ASSETS, "fonts"),
                    help="directory with Geist-SemiBold.ttf / Geist-Regular.ttf")
    args = ap.parse_args()
    if args.check:
        check()
    else:
        generate(args.fonts_dir)


if __name__ == "__main__":
    main()
