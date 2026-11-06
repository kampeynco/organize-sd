# First frame for the sign-up table reshoot: the clipboard turned to face the student who signs it
# (clip and header toward the camera, so its print reads upside down to us), and the real logo on the
# tablecloth. Starts from the inspected r2-campus frame so the people and setting stay the same.
#
#   .venv/bin/python revision/campus_frame.py   → references/r3/campus.png
#
# r3-campus was generated from this frame when it still printed the white-backed logo; brand.py's
# campus job reprints the clip's tablecloth with the current one (r3-campus-print).
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw
import brand

ROOT = brand.ROOT
f0 = brand.read_frames(f'{ROOT}/clips/r2-campus.mp4')[0].copy()

# Tablecloth front: the generic "ORGANIZE SD" print becomes the logo and a sign-up call.
drape = dict(quad=[(0, 826), (1918, 818), (1918, 1080), (0, 1080)], size=(1918, 258),
             keep=(0.12, 0.04, 0.92, 1.0), art=brand.tablecloth, blur=0.9, surface='drape')
rgb, alpha = brand.build_patch(f0, drape)
A = cv2.resize(alpha, (1918, 1080), interpolation=cv2.INTER_AREA)[..., None]
C = cv2.resize(rgb, (1918, 1080), interpolation=cv2.INTER_AREA)
f0 = np.uint8(np.clip(f0 * (1 - A) + C * A, 0, 255))

# The writing hand, pen and sleeve, which stay on top of the new clipboard.
hand = np.zeros(f0.shape[:2], np.uint8)
cv2.fillPoly(hand, [np.int32([(300, 560), (780, 560), (760, 640), (746, 688), (741, 706), (738, 716),
                              (731, 714), (722, 702), (700, 704), (650, 709), (600, 713), (560, 716),
                              (520, 718), (300, 718)])], 255)

# Paint out the old clip on the far edge, then lay the turned board over the old one's footprint.
far_l, far_r, near_r, near_l = (570, 715), (962, 687), (1068, 790), (607, 808)
# What lies behind the old clip (sweater, then grass) continues straight down to the new board's edge.
src = f0.copy()
fill = np.zeros(hand.shape, np.float32)
for x in range(736, 866):
    edge = round(far_l[1] + (far_r[1] - far_l[1]) * (x - far_l[0]) / (far_r[0] - far_l[0])) + 3
    fill[676:edge, x] = 1
fill[hand > 0] = 0
fill = cv2.GaussianBlur(fill, (0, 0), 2)[..., None]
f0 = np.uint8(f0 * (1 - fill) + np.roll(src, 24, axis=0) * fill)  # the strip 24px above, moved down
W, H = 900, 1250  # a letter clipboard, top (clip) edge first
art = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(art)
board = tuple(int(v) for v in np.median(f0[795:803, 700:1000].reshape(-1, 3), 0))
paper = (236, 236, 240)
d.rounded_rectangle([0, 0, W - 1, H - 1], 36, fill=board + (255,))
d.rectangle([40, 70, W - 40, H - 40], fill=paper + (255,))
d.rounded_rectangle([W * 0.30, 8, W * 0.70, 120], 18, fill=(178, 180, 186, 255))  # clip
d.rectangle([W * 0.34, 30, W * 0.66, 60], fill=(140, 142, 150, 255))
lg = brand.logo(120); art.alpha_composite(lg, (80, 150))
brand.text(d, (80 + lg.width + 30, 210), 'VOLUNTEER SIGN-UP', brand.FONT(900, 74), brand.PURPLE + (255,), 'lm')
f = brand.SANS(700, 26)
for x, s in [(80, 'NAME'), (430, 'PHONE'), (650, 'SHIFT')]:
    d.text((x, 315), s, font=f, fill=(90, 90, 110, 255))
rng = np.random.default_rng(3)
for i in range(13):
    y = 380 + i * 62
    d.line([(70, y), (W - 70, y)], fill=(165, 170, 190, 255), width=3)
    if i < 7:  # earlier volunteers' entries: handwriting-like strokes, not letters
        for x0, x1 in [(85, 85 + rng.integers(170, 300)), (435, 435 + rng.integers(120, 180)), (655, 655 + rng.integers(60, 120))]:
            xs = np.linspace(x0, x1, 22); ys = y - 16 + 7 * np.sin(xs / rng.uniform(6, 11)) + rng.normal(0, 1.5, xs.size)
            d.line(list(zip(xs, ys)), fill=(30, 40, 90, 255), width=4, joint='curve')
# The board is seen nearly edge-on (1250 rows become ~100): shrink it anisotropically first so its
# ruled lines average out instead of aliasing into dots.
art = np.asarray(art.resize((940, 210), Image.LANCZOS)).astype(np.float32)
W, H = 940, 210
# Turned 180° on the table: the clip (art top) lands on the near edge, and the student's left
# (art left) on our right.
Hq = cv2.getPerspectiveTransform(np.float32([(0, 0), (W, 0), (W, H), (0, H)]),
                                 np.float32([near_r, near_l, far_l, far_r]))
S = 2
big = cv2.warpPerspective(art, np.diag([S, S, 1.0]) @ Hq, (1918 * S, 1080 * S), flags=cv2.INTER_LINEAR)
big = cv2.resize(big, (1918, 1080), interpolation=cv2.INTER_AREA)
a = big[..., 3:4] / 255 * (1 - cv2.GaussianBlur(hand.astype(np.float32) / 255, (0, 0), 1.2)[..., None])
col = cv2.GaussianBlur(big[..., :3], (0, 0), 0.7)
# Same sun as the original board: scale by the old sheet's brightness against clean paper.
gain = np.median(f0[740:780, 700:1000].reshape(-1, 3).astype(np.float32), 0) / np.float32(paper)
col = col * np.clip(gain, 0.8, 1.1)
out = np.uint8(np.clip(f0 * (1 - a) + col * a + np.random.default_rng(1).normal(0, 2, f0.shape) * a, 0, 255))
os.makedirs(f'{ROOT}/references/r3', exist_ok=True)
Image.fromarray(out).save(f'{ROOT}/references/r3/campus.png')
print('references/r3/campus.png')
