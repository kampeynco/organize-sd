# Prints the real Organize SD logo onto the generated props in place of their look-alike lettering.
# Each prop is a plane: its frame-0 corners define the artwork's perspective, SIFT matches against
# frame 0 track the plane through the clip. Only the ink changes: the old lettering is painted out of
# the filmed surface, and the new print takes the surface's own light, folds and weave, with its
# white matched to the old ink so it reads as printed on the prop rather than pasted over it.
#
#   .venv/bin/python revision/brand.py [job ...]     (jobs: trainer materials phone practice campus)
#   .venv/bin/python revision/brand.py --still job   (frame-0 preview in build/brand/)
import os, subprocess, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.dirname(ROOT)
FONT = lambda w, px: ImageFont.truetype(f'{ROOT}/build/fonts/BigShoulders-{w}.ttf', px)
SANS = lambda w, px: ImageFont.truetype(f'{ROOT}/build/fonts/PublicSans-{w}.ttf', px)
# The orange state with purple lettering prints straight onto purple stock; the white-backed
# version reads as a sticker.
LOGO = Image.open(f'{ASSETS}/logo-orange-white-megaphone-4K.png').convert('RGBA')
LOGO = LOGO.crop(LOGO.split()[3].getbbox())  # the PNG has wide transparent margins
PURPLE, ORANGE, TEAL, WHITE = (50, 15, 140), (248, 128, 42), (38, 208, 190), (250, 248, 244)
SS = 2  # artwork is warped at twice the frame size, then each frame is sampled down from it


def logo(h):
    w = round(LOGO.width * h / LOGO.height)
    return LOGO.resize((w, h), Image.LANCZOS)


def logo_w(w):
    return logo(round(LOGO.height * w / LOGO.width))


def text(d, xy, s, font, fill, anchor='la', spacing=0):
    if not spacing:
        return d.text(xy, s, font=font, fill=fill, anchor=anchor)
    # Letter-spaced line, positioned as a whole by its anchor's horizontal part.
    widths = [d.textlength(c, font=font) for c in s]
    total = sum(widths) + spacing * (len(s) - 1)
    x = xy[0] - {'l': 0, 'm': total / 2, 'r': total}[anchor[0]]
    for c, cw in zip(s, widths):
        d.text((x, xy[1]), c, font=font, fill=fill, anchor='l' + anchor[1])
        x += cw + spacing


def fit_font(d, s, w, h, weight=900, family=FONT):
    px = h
    while px > 8 and d.textlength(s, font=family(weight, px)) > w:
        px -= 2
    return family(weight, px)


# --- artwork, drawn in each prop's own flat coordinates (u right, v down), transparent background.
#     WHITE is the prop's white ink: it prints in the colour of the lettering it replaces. ---

def poster_header(W, H):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo(round(H * 0.20)); im.alpha_composite(lg, ((W - lg.width) // 2, round(H * 0.055)))
    d.rectangle([W * 0.065, H * 0.283, W * 0.94, H * 0.283 + max(3, H * 0.004)], fill=WHITE)  # the old rule's run
    return im


def map_band(W, H):
    # The camera pushes in past the band's left end, so the logo sits at the right end.
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo(round(H * 0.78)); x = round(W * 0.955) - lg.width; im.alpha_composite(lg, (x, round(H * 0.11)))
    x0 = W * 0.20
    f = fit_font(d, 'CANVASS ROUTE', x - W * 0.06 - x0, round(H * 0.44))
    text(d, (x0, H * 0.47), 'CANVASS ROUTE', f, WHITE, 'lm')
    d.rectangle([x0, H * 0.76, x0 + W * 0.16, H * 0.785], fill=ORANGE)
    return im


def guide_cover(W, H):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo_w(round(W * 0.62)); im.alpha_composite(lg, ((W - lg.width) // 2, round(H * 0.14)))
    y = H * 0.14 + lg.height + H * 0.06
    d.rectangle([W * 0.24, y, W * 0.76, y + H * 0.011], fill=ORANGE)
    text(d, (W / 2, y + H * 0.10), 'FIELD GUIDE', FONT(800, round(H * 0.08)), WHITE, 'mm', spacing=round(W * 0.012))
    return im


def card_face(W, H):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo_w(round(W * 0.58)); im.alpha_composite(lg, ((W - lg.width) // 2, round(H * 0.07)))
    y = H * 0.07 + lg.height + H * 0.045
    d.rectangle([W * 0.20, y, W * 0.80, y + H * 0.011], fill=ORANGE)
    f = FONT(900, round(H * 0.10))
    for i, s in enumerate(['LISTEN.', 'CONNECT.', 'FOLLOW UP.']):
        text(d, (W / 2, y + H * (0.10 + 0.115 * i)), s, f, WHITE, 'mm')
    return im


def folder_cover(W, H):
    # The original's arrangement: the mark, then one line of title beneath it.
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo(round(H * 0.54)); im.alpha_composite(lg, ((W - lg.width) // 2, round(H * 0.17)))
    text(d, (W / 2, H * 0.83), 'VOLUNTEER TRAINING', FONT(900, round(H * 0.12)), WHITE, 'mm', spacing=round(H * 0.012))
    return im


def banner(W, H):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo(round(H * 0.47)); im.alpha_composite(lg, ((W - lg.width) // 2, round(H * 0.09)))
    d.rectangle([W * 0.30, H * 0.615, W * 0.70, H * 0.625], fill=ORANGE)
    f = fit_font(d, 'LISTENING PRACTICE', W * 0.72, round(H * 0.17))
    text(d, (W / 2, H * 0.765), 'LISTENING PRACTICE', f, WHITE, 'mm')
    return im


def tablecloth(W, H):
    # On the right of the drape: the left is where the edit's captions sit (they end by x 1200).
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    lg = logo(round(H * 0.62)); x = round(W * 0.645); im.alpha_composite(lg, (x, round(H * 0.45 - lg.height / 2)))
    x0 = x + lg.width + W * 0.02
    f = fit_font(d, "SIGN UP HERE.", W * 0.982 - x0, round(H * 0.32))
    text(d, (x0, H * 0.30), 'VOLUNTEER.', f, WHITE, 'lm')
    text(d, (x0, H * 0.62), 'SIGN UP HERE.', f, ORANGE, 'lm')
    return im


def sheet_logo(W, H):
    # A patch of the sign-up sheet around its header logo, in the sheet's own units (SHEET_LOGO); the
    # clipboard is seen nearly edge-on, so draw at true proportions and squash, which also averages out
    # detail the camera can't resolve.
    u0, v0, u1, v1 = SHEET_LOGO; k = 4
    im = Image.new('RGBA', ((u1 - u0) * k, (v1 - v0) * k))
    lg = logo(126 * k); im.alpha_composite(lg, ((80 - u0) * k, (147 - v0) * k))  # over the old logo's (80, 150)–(282, 270)
    return im.resize((W, H), Image.LANCZOS)


# The sign-up clipboard as campus_frame.py drew it: a 900×1250 board whose top (clip) edge faces the
# camera, so it reads upright for the student. r3-campus keeps its corners.
BOARD = cv2.getPerspectiveTransform(np.float32([(0, 0), (900, 0), (900, 1250), (0, 1250)]),
                                    np.float32([(1068, 790), (607, 808), (570, 715), (962, 687)]))
SHEET_LOGO = (45, 100, 318, 310)  # clean paper around the logo, short of the header title and the NAME label
SHEET_QUAD = cv2.perspectiveTransform(np.float32([[(45, 100), (318, 100), (318, 310), (45, 310)]]), BOARD)[0].tolist()


# --- jobs: frame-0 corners (TL, TR, BR, BL) of each prop, the flat size of its artwork, the part of
#     the prop to replace (u0, v0, u1, v1 as fractions), and where to look for tracking features ---
JOBS = {
    'trainer': dict(src='r2-trainer', out='r3-trainer', props=[
        dict(quad=[(1086, 89), (1649, 59), (1641, 880), (1058, 872)], size=(560, 800),
             keep=(0.012, 0.012, 0.988, 0.335), art=poster_header)],
        track=[[(1040, 40), (1700, 20), (1700, 380), (1040, 400)]]),
    'materials': dict(src='r2-materials', out='r3-materials', props=[
        dict(quad=[(0, 356), (958, 139), (1043, 281), (0, 546)], size=(1150, 200),
             keep=(0.0, 0.03, 0.985, 0.97), art=map_band),
        dict(quad=[(1006, 109), (1383, 29), (1697, 386), (1258, 524)], size=(560, 760),
             keep=(0.03, 0.025, 0.97, 0.975), art=guide_cover),
        dict(quad=[(1510, 505), (1790, 452), (1945, 768), (1655, 842)], size=(420, 560),
             keep=(0.04, 0.03, 1.0, 0.93), art=card_face)],
        track=[[(0, 300), (1000, 60), (1720, 20), (1918, 450), (1918, 780), (1300, 640), (850, 520), (0, 640)]]),
    'phone': dict(src='r2-phone', out='r3-phone', props=[
        dict(quad=[(358, 950), (740, 902), (980, 1018), (505, 1100)], size=(820, 300),
             keep=(0.12, 0.15, 0.95, 0.93), art=folder_cover)],
        track=[[(330, 890), (1000, 880), (1000, 1080), (330, 1080)]]),
    'practice': dict(src='r2-practice', out='r3-practice', props=[
        dict(quad=[(535, 0), (1412, 0), (1412, 440), (535, 440)], size=(877, 440),
             keep=(0.064, 0.03, 0.96, 0.955), art=banner, blur=1.5, surface='fabric')],
        track=[[(560, 0), (1390, 0), (1390, 430), (600, 430)]]),
    # The sign-up table was generated from campus_frame.py's first frame, which printed the white-backed
    # logo; this reprints its tablecloth.
    'campus': dict(src='r3-campus', out='r3-campus-print', props=[
        dict(quad=[(0, 826), (1918, 818), (1918, 1080), (0, 1080)], size=(1918, 258),
             keep=(0.12, 0.04, 0.985, 1.0), art=tablecloth, blur=0.9, surface='drape',
             white=(226, 207, 180)),  # the cream of r2-campus's tablecloth print; r3's white sticker clipped
        # The small logo in the sheet's header, upside down to the camera like the rest of the header.
        dict(quad=SHEET_QUAD, size=(276, 60), keep=(0.02, 0.02, 0.98, 0.98), art=sheet_logo, blur=0.6,
             surface='paper')],
        track=[[(0, 830), (1918, 822), (1918, 1080), (0, 1080)]]),
}


def rect_to_quad(W, H, quad):
    return cv2.getPerspectiveTransform(np.float32([(0, 0), (W, 0), (W, H), (0, H)]), np.float32(quad))


def is_purple(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    return (hsv[..., 0] >= 115) & (hsv[..., 0] <= 158) & (hsv[..., 1] >= 60) & (hsv[..., 2] >= 25)


def to_linear(c):
    c = np.asarray(c, np.float32) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return 255 * np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)


def luma(lin):
    return lin @ np.float32([0.2126, 0.7152, 0.0722])


def fit_background(flat, mask, deg=2):
    """Smooth per-channel polynomial through the prop's unprinted purple: how the stock is lit, without detail."""
    H, W = mask.shape
    v, u = np.mgrid[0:H, 0:W]
    u, v = u / W, v / H
    terms = [u ** i * v ** j for i in range(deg + 1) for j in range(deg + 1 - i)]
    A = np.stack([t[mask] for t in terms], 1)
    full = np.stack([t.ravel() for t in terms], 1)
    out = np.empty_like(flat, dtype=np.float32)
    for c in range(3):
        y = flat[..., c][mask].astype(np.float32); keep = np.ones(len(y), bool)
        for _ in range(3):  # drop the stray pixels (shadows, smudges) that the first fit misses
            coef, *_ = np.linalg.lstsq(A[keep], y[keep], rcond=None)
            r = y - A @ coef; keep = np.abs(r) < 2.5 * r[keep].std() + 1
        out[..., c] = (full @ coef).reshape(H, W)
    return out


def paint_out(flat, ink, stock, surface):
    """The prop's bare stock: the old lettering filled from the purple around it, real texture kept elsewhere."""
    f = flat.astype(np.float32)
    near = stock & (ink == 0) & (cv2.dilate(ink, np.ones((41, 41), np.uint8)) > 0)
    if surface == 'drape':
        # A draped cloth's light changes down it (table edge, then the fall) far more than across it:
        # carry each row across the lettering from the clean cloth either side, then give each column
        # back its own fold brightness from its rows outside the lettering.
        smooth = cv2.medianBlur(flat, 5).astype(np.float32)
        h, w = ink.shape
        clean = (ink.max(0) == 0).astype(np.float32)[None, :, None]
        band = cv2.blur(smooth * clean, (31, 1)) / np.maximum(cv2.blur(np.broadcast_to(clean, smooth.shape).copy(), (31, 1)), 1e-6)
        cols, xs = np.where(clean[0, :, 0] > 0)[0], np.arange(w)
        fill = np.stack([np.stack([np.interp(xs, cols, band[y, cols, c]) for c in range(3)], -1) for y in range(h)])
        ratio = np.ones((w, 3), np.float32)
        for x in np.where(ink.max(0) > 0)[0]:
            k = ink[:, x] == 0
            if k.sum() > 8:
                ratio[x] = np.median(smooth[k, x] / np.maximum(fill[k, x], 1), 0)
        fill *= cv2.GaussianBlur(ratio[None], (0, 0), sigmaX=6, sigmaY=0.1)[0][None]
    elif surface in ('board', 'paper'):
        # Rigid stock is smooth: its light, fitted from the clean board around the lettering. (Diffusing
        # in from the edge would drag the old lettering's drop shadow along.)
        # Paper is evenly lit: a plane, which a thin patch can't bend toward the old logo's fringe.
        fill = fit_background(flat, stock & (ink == 0) & (cv2.dilate(ink, np.ones((81, 81), np.uint8)) > 0),
                              deg=1 if surface == 'paper' else 3)
    else:
        # A hanging banner's creases run every way: carry the surrounding shading in from every side.
        h, w = ink.shape
        small = cv2.resize(cv2.medianBlur(flat, 5), (w // 2, h // 2), interpolation=cv2.INTER_AREA)
        hole = (cv2.resize(ink.astype(np.float32), (w // 2, h // 2), interpolation=cv2.INTER_AREA) > 0).astype(np.uint8)
        fill = cv2.resize(cv2.inpaint(small, hole, 8, cv2.INPAINT_NS), (w, h), interpolation=cv2.INTER_CUBIC)
        fill = cv2.GaussianBlur(fill.astype(np.float32), (0, 0), 2)
    # Grain to match the bare stock right around the lettering, measured the same way on both.
    detail = lambda x: x - cv2.GaussianBlur(x, (0, 0), 2)
    noise = cv2.GaussianBlur(np.random.default_rng(5).normal(0, 1, f.shape).astype(np.float32), (0, 0), 0.7)
    noise *= detail(f)[near].std(0) / detail(noise).std((0, 1))
    # Feather outward only: the old lettering's bright edge must not leak back in through the blend.
    t = np.clip(cv2.GaussianBlur(cv2.dilate(ink, np.ones((13, 13), np.uint8)).astype(np.float32), (0, 0), 3), 0, 1)
    return f * (1 - t[..., None]) + (fill + noise) * t[..., None]


def build_patch(frame0, prop):
    """The prop's reprint at SS× frame size: RGB plus an alpha covering only the old and new ink."""
    W, H = prop['size']
    Hq = rect_to_quad(W, H, prop['quad'])
    flat = cv2.warpPerspective(frame0, np.linalg.inv(Hq), (W, H), flags=cv2.INTER_LINEAR)
    # Where the prop runs past the frame edge, continue it so the off-frame black isn't taken for print.
    outside = cv2.warpPerspective(np.full(frame0.shape[:2], 255, np.uint8), np.linalg.inv(Hq), (W, H)) < 128
    if outside.any():
        flat = cv2.inpaint(flat, cv2.dilate(outside.astype(np.uint8), np.ones((3, 3), np.uint8)), 5, cv2.INPAINT_TELEA)
    u0, v0, u1, v1 = prop['keep']
    box = np.zeros((H, W), np.uint8)
    box[round(v0 * H):round(v1 * H), round(u0 * W):round(u1 * W)] = 1
    surface = prop.get('surface', 'board')
    hsv = cv2.cvtColor(flat, cv2.COLOR_RGB2HSV)
    # The unprinted stock: purple, or white paper.
    bare = ((hsv[..., 1] < 60) & (hsv[..., 2] > 140)) if surface == 'paper' else is_purple(flat)
    # The old print: everything on the stock that isn't bare, holes filled so a white-backed logo's
    # purple lettering goes with it, grown over its soft edges.
    old = ((~bare) & (box > 0)).astype(np.uint8)
    contours, _ = cv2.findContours(old, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    old = cv2.drawContours(np.zeros_like(old), contours, -1, 1, cv2.FILLED)
    ink = cv2.dilate(old, np.ones((9, 9), np.uint8)) * box
    stock = paint_out(flat, ink, bare & (box > 0), surface)
    # How the stock is lit: a smooth fit for the light across the prop, and the remainder (folds,
    # creases, weave) as a shading factor the new ink shares.
    lit = to_linear(fit_background(stock, (bare & (ink == 0)) | (ink > 0)))
    shade = np.clip(luma(to_linear(cv2.GaussianBlur(stock, (0, 0), 0.8))) / np.maximum(luma(lit), 1e-4), 0.6, 1.4)
    # The old light lettering is this light's white ink (on paper, the paper itself): per-channel gains
    # that turn the artwork's colours into what the same ink looks like here.
    if surface == 'paper':
        white = bare & (ink == 0) & (box > 0)
    else:
        white = (cv2.erode(old, np.ones((3, 3), np.uint8)) > 0) & (hsv[..., 2] > 150) & (hsv[..., 1] < 90)
    assert white.sum() > 200, 'no light lettering to calibrate the ink against'
    gain = to_linear(prop.get('white', np.median(flat[white], 0))) / to_linear(WHITE)
    light = luma(lit) / np.median(luma(lit)[white])
    art = np.asarray(prop['art'](W * SS, H * SS)).astype(np.float32) / 255
    art = cv2.resize(art, (W, H), interpolation=cv2.INTER_AREA)
    a = art[..., 3]
    printed = to_srgb(to_linear(art[..., :3] * 255) * gain * (light * shade)[..., None])
    # The footage is soft: the print takes the same focus (premultiplied, so its edge blurs, not the stock).
    s = prop.get('blur', 0.8)
    ab = cv2.GaussianBlur(a, (0, 0), s)
    pb = cv2.GaussianBlur(printed * a[..., None], (0, 0), s) / np.maximum(ab, 1e-4)[..., None]
    rgb = stock * (1 - ab[..., None]) + pb * ab[..., None]
    changed = np.maximum(cv2.dilate(ink, np.ones((21, 21), np.uint8)),
                         cv2.dilate((a > 0.02).astype(np.uint8), np.ones((7, 7), np.uint8))) * box
    alpha = cv2.GaussianBlur(changed.astype(np.float32), (0, 0), 2.5)
    S = np.diag([SS, SS, 1.0]) @ Hq
    size = (frame0.shape[1] * SS, frame0.shape[0] * SS)
    return (cv2.warpPerspective(rgb, S, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE),
            cv2.warpPerspective(alpha, S, size, flags=cv2.INTER_LINEAR))


class Tracker:
    """Frame-0 → frame-t homography of a plane, from SIFT matches inside the given polygons."""

    def __init__(self, frame0, polys):
        self.sift = cv2.SIFT_create(6000)
        mask = np.zeros(frame0.shape[:2], np.uint8)
        for p in polys:
            cv2.fillPoly(mask, [np.int32(p)], 255)
        self.mask = mask
        self.k0, self.d0 = self.sift.detectAndCompute(cv2.cvtColor(frame0, cv2.COLOR_RGB2GRAY), mask)
        self.matcher = cv2.BFMatcher(cv2.NORM_L2)
        self.prev = np.eye(3)

    def __call__(self, frame):
        k, d = self.sift.detectAndCompute(cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY), None)
        good = [m for m, n in self.matcher.knnMatch(self.d0, d, k=2) if m.distance < 0.75 * n.distance]
        if len(good) < 12:
            return self.prev, 0
        p0 = np.float32([self.k0[m.queryIdx].pt for m in good]); p1 = np.float32([k[m.trainIdx].pt for m in good])
        H, inl = cv2.findHomography(p0, p1, cv2.RANSAC, 2.0, maxIters=5000, confidence=0.999)
        if H is None:
            return self.prev, 0
        self.prev = H
        return H, int(inl.sum())


def smooth(Hs, quad, sigma=1.5):
    """Smooth the tracked corners over time and rebuild each homography from them (removes jitter)."""
    q = np.float32(quad).reshape(-1, 1, 2)
    corners = np.stack([cv2.perspectiveTransform(q, H).reshape(-1, 2) for H in Hs])  # T×4×2
    T = len(Hs); r = int(3 * sigma); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    out = []
    for t in range(T):
        idx = np.clip(np.arange(t - r, t + r + 1), 0, T - 1)
        c = (corners[idx] * k[:, None, None]).sum(0) / k.sum()
        out.append(cv2.getPerspectiveTransform(q.reshape(-1, 2), np.float32(c)))
    return out


def read_frames(path):
    w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries',
                                             'stream=width,height', '-of', 'csv=p=0', path], text=True).split(','))
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         stdout=subprocess.PIPE)
    frames = []
    while True:
        b = p.stdout.read(w * h * 3)
        if len(b) < w * h * 3:
            break
        frames.append(np.frombuffer(b, np.uint8).reshape(h, w, 3))
    p.wait()
    return frames


def run(name, still=False):
    job = JOBS[name]
    src = f"{ROOT}/clips/{job['src']}.mp4"
    frames = read_frames(src)
    f0 = frames[0]
    patches = [build_patch(f0, p) for p in job['props']]
    weight = sum(p[1] for p in patches)
    alpha = np.clip(weight, 0, 1)
    # Colour premultiplied by alpha, so resampling never blends in the empty black around a patch.
    rgb = sum(p[0] * p[1][..., None] for p in patches) * (alpha / np.maximum(weight, 1e-6))[..., None]
    S = np.diag([1 / SS, 1 / SS, 1.0])
    size = (f0.shape[1], f0.shape[0])
    if still:
        os.makedirs(f'{ROOT}/build/brand', exist_ok=True)
        A = cv2.resize(alpha, size, interpolation=cv2.INTER_AREA)[..., None]
        C = cv2.resize(rgb, size, interpolation=cv2.INTER_AREA)
        Image.fromarray(np.uint8(np.clip(f0 * (1 - A) + C, 0, 255))).save(f'{ROOT}/build/brand/{name}.png')
        return
    track = Tracker(f0, job['track'])
    Hs, weak = [], []
    for i, f in enumerate(frames):
        H, n = (np.eye(3), 999) if i == 0 else track(f)
        Hs.append(H)
        if n < 40:
            weak.append((i, n))
    ref = job['props'][0]['quad']
    Hs = smooth(Hs, ref)
    out = f"{ROOT}/clips/{job['out']}.mp4"
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % size,
                            '-r', '24', '-i', '-', '-i', src, '-map', '0:v', '-map', '1:a?', '-c:a', 'copy',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p',
                            '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-movflags', '+faststart', f'{out}.part.mp4'], stdin=subprocess.PIPE)
    rng = np.random.default_rng(7)
    for f, H in zip(frames, Hs):
        M = H @ S
        a = cv2.warpPerspective(alpha, M, size, flags=cv2.INTER_LINEAR)[..., None]
        c = cv2.warpPerspective(rgb, M, size, flags=cv2.INTER_LINEAR)
        # The footage carries sensor-like grain; give the new print the same.
        c = c + rng.normal(0, 2.2, c.shape).astype(np.float32) * a
        enc.stdin.write(np.uint8(np.clip(f * (1 - a) + c, 0, 255)).tobytes())
    enc.stdin.close(); enc.wait()
    os.replace(f'{out}.part.mp4', out)
    print(f"{job['out']}: {len(frames)} frames; weak tracks {weak[:8]}{'…' if len(weak) > 8 else ''}")


if __name__ == '__main__':
    args = sys.argv[1:]
    still = '--still' in args
    names = [a for a in args if a != '--still'] or list(JOBS)
    for n in names:
        run(n, still)
