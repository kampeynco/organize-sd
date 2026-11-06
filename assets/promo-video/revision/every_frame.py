# Every frame of the segments the viewer's notes point at, from the finished master, as contact sheets.
# The beat grid is unchanged between revisions, so each note's timestamp still names its scene; the
# segment around it (and every other use of the same footage) is sheeted, 60 frames (2.5 seconds) a sheet.
#
#   .venv/bin/python revision/every_frame.py         → revision/review3/every/<start>-<clip>-NN.jpg
#   .venv/bin/python revision/every_frame.py --all   → revision/review3/all/NNN.jpg: the whole master,
#                                                      96 numbered frames a sheet, headed by its checksum
import hashlib, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(os.path.dirname(ROOT), 'organize-sd-promo.mp4')
OUT = f'{ROOT}/revision/review3/every'
NOTES = ['0:37', '0:52', '1:11', '1:17', '1:24', '1:31', '1:51', '2:03', '2:08', '2:31', '2:45', '3:00', '3:04',
         '3:08', '3:10', '3:36', '3:50', '4:15', '4:21', '4:22', '4:23', '4:26', '4:30', '4:38', '4:41']
FONT = ImageFont.truetype(f'{ROOT}/build/fonts/PublicSans-700.ttf', 18)
TW, TH, COLS, ROWS = 320, 180, 6, 10

manifest = json.load(open(f'{ROOT}/revision/edit-manifest.json'))
if '--all' in sys.argv:
    OUT, TW, TH, COLS, ROWS = f'{ROOT}/revision/review3/all', 240, 135, 8, 12
    small = ImageFont.truetype(f'{ROOT}/build/fonts/PublicSans-700.ttf', 13)
    sha = hashlib.sha256(open(MASTER, 'rb').read()).hexdigest()[:16]
    every = manifest['segments']
    seg_of = lambda n: next(s for s in every if s['start'] <= n < s['end'])
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(f'{OUT}/{f}')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', MASTER, '-vf', f'scale={TW}:{TH}', '-f', 'rawvideo',
                          '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n, k = 0, COLS * ROWS
    while True:
        raw = p.stdout.read(TW * TH * 3 * k)
        if not raw:
            break
        frames = np.frombuffer(raw, np.uint8).reshape(-1, TH, TW, 3)
        sheet = Image.new('RGB', (COLS * TW, ROWS * TH + 30), (12, 8, 40)); d = ImageDraw.Draw(sheet)
        names = []
        for i in range(n, n + len(frames)):
            s = seg_of(i); tag = s.get('id') or s.get('scene')
            if tag not in names:
                names.append(tag)
        d.text((8, 5), f"master {sha}  frames {n}–{n + len(frames) - 1} ({n / 24:.2f}–{(n + len(frames)) / 24:.2f}s)  "
                       + ', '.join(names), font=FONT, fill=(230, 230, 240))
        for i, fr in enumerate(frames):
            x, y = (i % COLS) * TW, 30 + (i // COLS) * TH
            sheet.paste(Image.fromarray(fr), (x, y))
            d.text((x + 3, y + 2), str(n + i), font=small, fill=(255, 255, 0))
        sheet.save(f'{OUT}/{n // k:03d}.jpg', quality=82)
        n += len(frames)
    p.wait()
    print(f'{n} frames, {len(os.listdir(OUT))} sheets, master {sha} → {OUT}')
    sys.exit()
segs = [s for s in (manifest['segments'] if isinstance(manifest, dict) else manifest) if s.get('type') == 'clip']
sec = lambda t: int(t.split(':')[0]) * 60 + int(t.split(':')[1])
# The clip under each note (a note can sit on a boundary: take the segments within ±0.5s), then every
# segment that uses one of those clips.
ids = {s['id'] for t in NOTES for s in segs if s['startSeconds'] - 0.5 <= sec(t) < s['endSeconds'] + 0.5}
# Only the footage the notes are about (a boundary also catches its neighbour), plus the requested watch party.
ids &= {'r3-diner', 'r3-campus-print', 'r3-trainer', 'r3-materials', 'r3-phone', 'land-mainstreet', 'r3-resident',
        'land-storm'}
ids |= {'r4-watchparty'}
chosen = [s for s in segs if s['id'] in ids]
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(f'{OUT}/{f}')
total = 0
for s in chosen:
    a, b = s['start'], s['end']  # frame numbers in the master
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{a / 24:.4f}', '-i', MASTER, '-frames:v', str(b - a),
                          '-vf', f'scale={TW}:{TH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, TH, TW, 3)
    total += len(frames)
    for k in range(0, len(frames), COLS * ROWS):
        sheet = Image.new('RGB', (COLS * TW, ROWS * TH + 30), (12, 8, 40))
        d = ImageDraw.Draw(sheet)
        chunk = frames[k:k + COLS * ROWS]
        m, ss = divmod((a + k) / 24, 60)
        d.text((8, 5), f"{s['id']} @{s.get('from', 0)}s  master frames {a + k}–{a + k + len(chunk) - 1}  "
                       f"({int(m)}:{ss:05.2f})", font=FONT, fill=(230, 230, 240))
        for i, fr in enumerate(chunk):
            sheet.paste(Image.fromarray(fr), ((i % COLS) * TW, 30 + (i // COLS) * TH))
        sheet.save(f"{OUT}/{a:05d}-{s['id']}-{k // (COLS * ROWS):02d}.jpg", quality=85)
print(f'{len(chosen)} segments, {total} frames, {len(os.listdir(OUT))} sheets → {OUT}')
