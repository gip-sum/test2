"""
Generates the development property imagery.

WHY THIS EXISTS. The property page cannot be built or judged against a grid
of grey placeholders: a gallery needs real pixels to test aspect-ratio
reservation, lazy loading, counter behaviour and cumulative layout shift.
This environment has no outbound network access, so stock photography — even
correctly licensed — cannot be fetched.

WHAT IT PRODUCES. Flat, geometric illustrations of rooms. They are
deliberately NOT photorealistic. Nothing here should ever be mistaken for a
photograph of a real home, which is the point: the marketplace must never
imply it holds imagery it does not have. Each image also carries a baked-in
SAMPLE tag, so it identifies itself even when served directly or hotlinked,
not only when the interface labels it.

Run once; the output is committed. Deleted alongside the fixture when real
inventory arrives.

    python3 scripts/generate-dev-media.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1200, 900  # 4:3, matching the card and gallery box
OUT = Path(__file__).resolve().parent.parent / "public" / "dev-media"

# Muted interior palettes. Cool / warm / green, each a wall, floor, accent,
# soft and dark. Kept away from the product's brand blue so a photo never
# reads as chrome.
PALETTES = {
    "cool":  dict(wall="#e8ecf2", floor="#c9b9a6", accent="#7d8ca3", soft="#f4f6f9", dark="#3f4a5c", sky="#cfe0ef"),
    "warm":  dict(wall="#f0e9e1", floor="#bfa384", accent="#b08968", soft="#f8f4ef", dark="#4a3f36", sky="#f0dfc8"),
    "green": dict(wall="#e7eee8", floor="#c2b49c", accent="#7a9480", soft="#f3f7f3", dark="#3c4a41", sky="#d6e6dc"),
}

def font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def base(p):
    """Wall above, floor below, with a horizon two-thirds down."""
    img = Image.new("RGB", (W, H), p["wall"])
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.68), W, H], fill=p["floor"])
    return img, d

def window(d, p, x, y, w, h):
    d.rectangle([x, y, x + w, y + h], fill=p["sky"], outline=p["dark"], width=6)
    d.line([x + w // 2, y, x + w // 2, y + h], fill=p["dark"], width=5)
    d.line([x, y + h // 2, x + w, y + h // 2], fill=p["dark"], width=5)

def plant(d, p, x, y, s=1.0):
    d.polygon([(x, y), (x - 26 * s, y + 80 * s), (x + 26 * s, y + 80 * s)], fill=p["dark"])
    for a in (-1, 0, 1):
        d.ellipse([x - 42 * s + a * 26 * s, y - 86 * s, x + 2 * s + a * 26 * s, y + 6 * s], fill=p["accent"])

def living(d, p):
    window(d, p, 760, 150, 330, 250)
    d.rounded_rectangle([140, 470, 640, 640], 24, fill=p["accent"])       # sofa
    d.rounded_rectangle([160, 420, 620, 500], 22, fill=p["soft"])          # back
    d.rounded_rectangle([690, 560, 900, 640], 14, fill=p["dark"])          # table
    d.ellipse([120, 650, 960, 760], fill=p["soft"])                        # rug
    d.rectangle([250, 140, 470, 300], fill=p["soft"], outline=p["dark"], width=5)  # art
    plant(d, p, 1050, 560)

def bedroom(d, p):
    window(d, p, 820, 160, 280, 220)
    d.rounded_rectangle([180, 300, 640, 470], 18, fill=p["soft"])          # headboard
    d.rounded_rectangle([160, 460, 680, 690], 20, fill=p["accent"])        # bed
    d.rounded_rectangle([200, 470, 400, 540], 16, fill=p["soft"])          # pillow
    d.rounded_rectangle([420, 470, 620, 540], 16, fill=p["soft"])
    d.rounded_rectangle([720, 540, 850, 660], 12, fill=p["dark"])          # side table
    d.ellipse([750, 470, 820, 540], fill=p["soft"])                        # lamp
    plant(d, p, 1060, 600)

def kitchen(d, p):
    d.rectangle([120, 140, 560, 330], fill=p["soft"], outline=p["dark"], width=5)   # uppers
    d.line([340, 140, 340, 330], fill=p["dark"], width=5)
    window(d, p, 700, 160, 300, 200)
    d.rectangle([100, 520, 1040, 580], fill=p["dark"])                              # counter
    d.rectangle([120, 580, 1020, 720], fill=p["accent"])                            # base units
    for x in range(200, 1000, 180):
        d.line([x, 580, x, 720], fill=p["soft"], width=5)
    d.rounded_rectangle([600, 440, 760, 520], 10, fill=p["soft"])                    # sink
    plant(d, p, 160, 470, 0.7)

def balcony(d, p):
    d.rectangle([0, 0, W, int(H * 0.62)], fill=p["sky"])
    for i, (x, hh) in enumerate([(120, 250), (300, 380), (470, 300), (640, 430), (820, 330), (980, 400)]):
        d.rectangle([x, int(H * 0.62) - hh, x + 130, int(H * 0.62)], fill=p["accent"] if i % 2 else p["dark"])
    d.rectangle([0, int(H * 0.62), W, H], fill=p["floor"])
    for x in range(60, W, 90):                                            # railing
        d.rectangle([x, int(H * 0.52), x + 12, int(H * 0.72)], fill=p["dark"])
    d.rectangle([0, int(H * 0.50), W, int(H * 0.53)], fill=p["dark"])
    plant(d, p, 1040, 640)

def bathroom(d, p):
    for y in range(120, 560, 70):                                          # tiles
        d.line([0, y, W, y], fill=p["soft"], width=4)
    for x in range(0, W, 70):
        d.line([x, 120, x, 560], fill=p["soft"], width=4)
    d.rounded_rectangle([320, 180, 700, 420], 14, fill=p["soft"], outline=p["dark"], width=6)  # mirror
    d.rectangle([260, 560, 760, 640], fill=p["dark"])                       # vanity top
    d.rectangle([280, 640, 740, 780], fill=p["accent"])
    d.ellipse([450, 575, 570, 625], fill=p["soft"])                         # basin
    window(d, p, 840, 200, 240, 220)

def exterior(d, p):
    d.rectangle([0, 0, W, H], fill=p["sky"])
    d.rectangle([0, int(H * 0.80), W, H], fill=p["floor"])
    d.rectangle([160, 150, 1040, int(H * 0.80)], fill=p["wall"], outline=p["dark"], width=6)
    for y in range(210, 700, 120):
        for x in range(220, 1000, 140):
            d.rectangle([x, y, x + 90, y + 75], fill=p["sky"], outline=p["dark"], width=4)
    d.rectangle([540, 640, 660, int(H * 0.80)], fill=p["dark"])            # door
    plant(d, p, 120, 700, 1.3)
    plant(d, p, 1090, 700, 1.3)

def study(d, p):
    window(d, p, 740, 150, 330, 240)
    for y in (180, 280, 380):                                              # shelves
        d.rectangle([140, y, 560, y + 18], fill=p["dark"])
        for x in range(160, 520, 40):
            d.rectangle([x, y - 55, x + 26, y], fill=p["accent"] if x % 80 else p["soft"])
    d.rectangle([180, 540, 760, 580], fill=p["dark"])                      # desk
    d.rectangle([220, 580, 250, 740], fill=p["dark"])
    d.rectangle([690, 580, 720, 740], fill=p["dark"])
    d.rounded_rectangle([420, 420, 620, 540], 10, fill=p["soft"], outline=p["dark"], width=5)
    plant(d, p, 1040, 620)

def hall(d, p):
    d.rectangle([120, 160, 360, 700], fill=p["accent"], outline=p["dark"], width=6)   # door
    d.ellipse([320, 430, 344, 454], fill=p["soft"])
    window(d, p, 820, 180, 260, 230)
    d.rectangle([460, 540, 760, 580], fill=p["dark"])                      # console
    d.rectangle([480, 580, 505, 700], fill=p["dark"])
    d.rectangle([715, 580, 740, 700], fill=p["dark"])
    d.rectangle([540, 380, 700, 520], fill=p["soft"], outline=p["dark"], width=5)
    plant(d, p, 900, 640)

SCENES = {
    "living": living, "bedroom": bedroom, "kitchen": kitchen, "balcony": balcony,
    "bathroom": bathroom, "exterior": exterior, "study": study, "hall": hall,
}

def stamp(img, d):
    """Baked-in provenance: the image says what it is without the UI's help."""
    label = "SAMPLE — NOT A REAL PROPERTY"
    f = font(22)
    tw = d.textlength(label, font=f)
    x, y = W - tw - 34, H - 52
    d.rounded_rectangle([x - 14, y - 10, x + tw + 14, y + 34], 8, fill=(0, 0, 0))
    d.text((x, y), label, font=f, fill=(255, 255, 255))

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    made = []
    for tone, p in PALETTES.items():
        for name, draw_scene in SCENES.items():
            img, d = base(p)
            draw_scene(d, p)
            stamp(img, d)
            path = OUT / f"{name}-{tone}.png"
            img.save(path, optimize=True)
            made.append(path.name)
    print(f"{len(made)} images -> {OUT}")
    total = sum((OUT / n).stat().st_size for n in made)
    print(f"total {total // 1024} KB, largest {max((OUT / n).stat().st_size for n in made) // 1024} KB")

if __name__ == "__main__":
    main()
