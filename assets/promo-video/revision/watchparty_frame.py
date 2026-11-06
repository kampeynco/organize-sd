# First frame for the election-night reshoot: the plain purple backdrop of r3-watchparty with the real logo
# printed on it. The generated take pushes in too fast to track a logo onto, so the logo goes into the
# first frame and the reshoot keeps the camera still.
#
#   PYTHONPATH=revision .venv/bin/python revision/watchparty_frame.py   → references/r3/watchparty.png
import os
import cv2
import numpy as np
from PIL import Image
import brand

ROOT = brand.ROOT
f0 = brand.read_frames(f'{ROOT}/clips/r3-watchparty.mp4')[0].copy()
H, W = f0.shape[:2]

# Centred on the backdrop (x 264–1589) in the clear band above the back row's heads.
lh = 190
lg = np.asarray(brand.logo(lh * 2)).astype(np.float32) / 255
lg = cv2.resize(lg, (lg.shape[1] // 2, lg.shape[0] // 2), interpolation=cv2.INTER_AREA)
x0, y0 = 926 - lg.shape[1] // 2, 18
art = np.zeros((H, W, 4), np.float32)
art[y0:y0 + lg.shape[0], x0:x0 + lg.shape[1]] = lg

# The backdrop itself, by colour (people in front of it stay in front of the print).
lab = cv2.cvtColor(f0, cv2.COLOR_RGB2LAB).astype(np.float32)
ref = np.median(lab[10:120, 700:1200].reshape(-1, 3), 0)
cloth = (np.linalg.norm(lab - ref, axis=2) < 18).astype(np.uint8)
cloth = cv2.morphologyEx(cloth, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
a = art[..., 3] * cv2.GaussianBlur(cloth.astype(np.float32), (0, 0), 1)

# Ink in this room's light: white is the paper cups' warm white, a little dimmer at the back wall.
f = f0.astype(np.float32)
gain = brand.to_linear((168, 148, 114)) / brand.to_linear(brand.WHITE)
# The fabric's folds and weave, as a shading factor the ink shares.
lum = brand.luma(brand.to_linear(cv2.GaussianBlur(f, (0, 0), 1.0)))
shade = np.clip(lum / np.maximum(brand.luma(brand.to_linear(cv2.GaussianBlur(f, (0, 0), 30))), 1e-4), 0.7, 1.3)
printed = brand.to_srgb(brand.to_linear(art[..., :3] * 255) * gain * shade[..., None])
# The backdrop sits a little behind focus: soften the print to match.
ab = cv2.GaussianBlur(a, (0, 0), 1.1)
pb = cv2.GaussianBlur(printed * a[..., None], (0, 0), 1.1) / np.maximum(ab, 1e-4)[..., None]
grain = np.random.default_rng(3).normal(0, 2.0, f.shape).astype(np.float32)
out = f * (1 - ab[..., None]) + (pb + grain) * ab[..., None]
os.makedirs(f'{ROOT}/references/r3', exist_ok=True)
Image.fromarray(np.uint8(np.clip(out, 0, 255))).save(f'{ROOT}/references/r3/watchparty.png')
print('references/r3/watchparty.png')
