#!/usr/bin/env python3
"""Draws the 1200x630 share card, one per language.

Not part of the build: the output is committed like the fonts are, because this
needs Pillow and the unsubset originals. Run it again only when the wording or
the screenshot changes.

    python3 tools/make-og.py <dir-with-geist.ttf> <path-to-shot-web.webp>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

FONTS, SHOT = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "img")

BG, INK, MUTED, ACCENT = (14, 18, 24), (240, 244, 249), (163, 174, 189), (92, 157, 255)
W, H = 1200, 630

COPY = {
    "en": ("Your life can level up.",
           "Habits, tasks, routines and goals, on the areas of your life."),
    "pt": ("Sua vida pode subir de nível.",
           "Hábitos, tarefas, rotinas e metas, nas áreas da sua vida."),
}


def face(size, weight=400):
    f = ImageFont.truetype(os.path.join(FONTS, "geist.ttf"), size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def brand(d, x, y, r=17):
    """The ring with its opening to the north-east, and the check inside it."""
    d.arc([x, y, x + r * 2, y + r * 2], start=-61, end=298, fill=ACCENT, width=5)
    u = r * 2 / 48.0
    p = lambda a, b: (x + (a - 8) * u, y + (b - 8) * u)
    d.line([p(22, 33), p(29, 40), p(43, 26)], fill=ACCENT, width=5, joint="curve")


def wrap(d, text, font, width):
    """Greedy wrap, because the two languages do not break at the same word."""
    words, lines, line = text.split(), [], ""
    for w in words:
        probe = (line + " " + w).strip()
        if d.textlength(probe, font=font) <= width:
            line = probe
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def card(code):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    # the product itself, bleeding off the right edge so the card is not all type
    shot = Image.open(SHOT).convert("RGB")
    sw = 700
    shot = shot.resize((sw, round(shot.height * sw / shot.width)), Image.LANCZOS)
    frame = Image.new("RGB", (shot.width + 2, shot.height + 2), (69, 78, 92))
    frame.paste(shot, (1, 1))
    left = 700
    im.paste(frame, (left, 168))

    # a real column-by-column mask: the earlier version filled only its first row,
    # so the fade was invisible and the shot had a hard vertical edge
    fade_w = 150
    mask = Image.new("L", (fade_w, frame.height), 0)
    md = ImageDraw.Draw(mask)
    for x in range(fade_w):
        md.line([(x, 0), (x, frame.height)], fill=int(255 * (1 - x / fade_w)))
    im.paste(Image.new("RGB", (fade_w, frame.height), BG), (left, 168), mask)

    brand(d, 72, 66)
    d.text((116, 62), "beyou", font=face(34, 600), fill=ACCENT)

    head, sub = COPY[code]
    # the type keeps to the left column, clear of the screenshot
    col = 560
    hf, sf = face(58, 600), face(24, 400)
    y = 236
    for line in wrap(d, head, hf, col):
        d.text((72, y), line, font=hf, fill=INK)
        y += 70
    y += 12
    for line in wrap(d, sub, sf, col):
        d.text((72, y), line, font=sf, fill=MUTED)
        y += 34

    d.rounded_rectangle([72, 486, 232, 524], radius=19, fill=ACCENT)
    d.text((96, 495), "Free" if code == "en" else "Grátis", font=face(19, 600), fill=(11, 21, 38))
    d.text((248, 496), "beyouweb.com", font=face(21, 500), fill=MUTED)

    path = os.path.join(OUT, "og-%s.png" % code)
    im.save(path, optimize=True)
    print("wrote", os.path.basename(path), round(os.path.getsize(path) / 1024), "KB")


for c in COPY:
    card(c)
