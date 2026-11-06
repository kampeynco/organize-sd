// Motion-graphics scenes for the promo, drawn on a 1920×1080 canvas.
// Each scene is a pure function of (t seconds, dur seconds, params), so any frame can be rendered on its own.
// render.mjs loads this into headless Chromium and calls window.renderFrame() once per frame.
(() => {
  const W = 1920, H = 1080;
  const C = {
    brand: '#311b92', deep: '#1c0f5c', ink: '#120a3d',
    signal: '#ff8a3d', signalLight: '#ffa765', mint: '#2dd4bf', paper: '#f7f4ec', white: '#ffffff',
  };
  const DISPLAY = '"Big Shoulders Display"';
  const SANS = '"Public Sans"';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, len) => clamp((t - start) / len);
  const outExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
  const outCubic = (x) => 1 - (1 - x) ** 3;
  const inCubic = (x) => x ** 3;
  const outBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
  const lerp = (a, b, x) => a + (b - a) * x;

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Film grain: a few pre-baked noise tiles, picked per frame
  const grainTiles = Array.from({ length: 6 }, (_, k) => {
    const g = document.createElement('canvas');
    g.width = g.height = 256;
    const gx = g.getContext('2d');
    const img = gx.createImageData(256, 256);
    const r = rng(k + 11);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    return g;
  });
  function grain(t, alpha = 0.07) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTiles[Math.floor(t * 24) % grainTiles.length], 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** The site hero's backdrop: brand purple, mint glow top-left, orange glow bottom-right */
  function backdrop(t, base = C.brand) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const drift = Math.sin(t * 0.6) * 40;
    const glow = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };
    glow(-80 + drift, -120, 1100, 'rgba(45,212,191,0.22)');
    glow(W + 60 - drift, H + 140, 1150, 'rgba(255,138,61,0.28)');
  }

  function font(weight, size, family = DISPLAY) {
    ctx.font = `${weight} ${size}px ${family}`;
  }

  /** Text revealed by sliding up out of a mask */
  function maskedLine(text, x, y, size, p, { color = C.white, align = 'left', weight = 900, family = DISPLAY, spacing = 0 } = {}) {
    font(weight, size, family);
    ctx.letterSpacing = `${spacing}px`;
    const w = ctx.measureText(text).width;
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - 40, y - size * 0.98, w + 80, size * 1.12);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, left, y + (1 - outExpo(p)) * size * 1.05);
    ctx.restore();
    ctx.letterSpacing = '0px';
    return w;
  }

  /** Draws text where segments in `accent` color; returns total width */
  function richText(parts, x, y, { align = 'left' } = {}) {
    const total = parts.reduce((s, [txt]) => s + ctx.measureText(txt).width, 0);
    let cx = align === 'center' ? x - total / 2 : x;
    for (const [txt, color] of parts) {
      ctx.fillStyle = color;
      ctx.fillText(txt, cx, y);
      cx += ctx.measureText(txt).width;
    }
    return total;
  }

  // Exit: everything slides up & fades over the last `len` seconds
  const exitOf = (t, dur, len = 0.3) => outCubic(prog(t, dur - len, len));

  // ── scenes ──────────────────────────────────────────────────────────────────────────────────
  const SCENES = {};

  /** Big words over footage. params: { lines: [{ text, size, color }], align, y, shade, stagger } */
  SCENES.bigover = (t, dur, p) => {
    const lines = p.lines;
    const align = p.align ?? 'center';
    const x = align === 'center' ? W / 2 : 140;
    const shade = p.shade ?? 0.5;
    const out = p.exit === false ? 0 : exitOf(t, dur, 0.25);
    // Legibility shade behind the type
    ctx.save();
    ctx.globalAlpha = shade * outCubic(prog(t, 0, 0.3)) * (1 - out);
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 100, W / 2, H * 0.55, W * 0.7);
    g.addColorStop(0, 'rgba(18,10,61,0.75)');
    g.addColorStop(1, 'rgba(18,10,61,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const gap = p.gap ?? 1.0;
    const heights = lines.map((l) => l.size * gap);
    let y = (p.y ?? H / 2) - heights.reduce((s, h) => s + h, 0) / 2;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, -out * 40);
    lines.forEach((l, i) => {
      y += heights[i];
      const pi = prog(t, (l.at ?? i * (p.stagger ?? 0.12)), 0.55);
      if (pi <= 0) return;
      const family = l.sans ? SANS : DISPLAY;
      maskedLine(l.text, x, y - l.size * 0.12, l.size, pi, {
        color: l.color ?? C.white, align, weight: l.weight ?? (l.sans ? 700 : 900), family, spacing: l.spacing ?? 0,
      });
    });
    ctx.restore();
  };

  /** Lower third. params: { kicker, text, accent } */
  SCENES.lower = (t, dur, p) => {
    const x = 120, base = 930;
    const inP = outExpo(prog(t, 0, 0.6));
    const out = exitOf(t, dur, 0.35);
    // dark band for legibility
    ctx.save();
    ctx.globalAlpha = 0.85 * inP * (1 - out);
    const g = ctx.createLinearGradient(0, H, 0, H - 420);
    g.addColorStop(0, 'rgba(18,10,61,0.85)');
    g.addColorStop(1, 'rgba(18,10,61,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 420, W, 420);
    ctx.restore();

    ctx.save();
    ctx.translate(-out * 60, 0);
    ctx.globalAlpha = 1 - out;
    // accent bar grows downward
    const barH = 170 * outExpo(prog(t, 0, 0.35));
    ctx.fillStyle = p.accent ?? C.signal;
    ctx.fillRect(x, base - 160, 12, barH);
    if (p.kicker) {
      maskedLine(p.kicker.toUpperCase(), x + 44, base - 112, 34, prog(t, 0.12, 0.5), {
        color: C.mint, weight: 700, family: SANS, spacing: 7,
      });
    }
    maskedLine(p.text.toUpperCase(), x + 40, base, p.size ?? 104, prog(t, 0.2, 0.6), { color: C.white });
    ctx.restore();
  };

  /** Chapter slam: TRAIN. / ORGANIZE. / WIN.  params: { word, num, kicker } */
  SCENES.slam = (t, dur, p) => {
    const hit = outExpo(prog(t, 0, 0.32));
    const shake = t < 0.35 ? (1 - t / 0.35) * 14 : 0;
    const r = rng(Math.floor(t * 24) + 3);
    ctx.save();
    ctx.translate((r() - 0.5) * shake, (r() - 0.5) * shake);
    backdrop(t);
    // Ghost word texture, drifting
    font(900, 760);
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(p.word, W / 2 + 260 - t * 60, H / 2 + 270);
    ctx.restore();

    const word = p.word.replace(/\.$/, '');
    const size = p.size ?? 470;
    const scale = lerp(1.9, 1, hit);
    font(900, size);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const y = H / 2 + size * 0.34 - 40;
    // motion smear: trailing copies while the word lands
    for (let k = 3; k >= 0; k--) {
      const s = k === 0 ? scale : lerp(scale, 1.9, 0.12 * k * (1 - hit));
      ctx.save();
      ctx.globalAlpha = k === 0 ? 1 : 0.18 * (1 - hit);
      ctx.translate(W / 2, H / 2 - 40);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -(H / 2 - 40));
      richText([[word, C.white], ['.', C.signal]], W / 2, y, { align: 'center' });
      ctx.restore();
    }
    if (p.kicker) {
      maskedLine(p.kicker.toUpperCase(), W / 2, y + 120, 40, prog(t, 0.35, 0.6), {
        color: C.mint, align: 'center', weight: 700, family: SANS, spacing: 9,
      });
    }
    if (p.num) {
      maskedLine(p.num, 120, 150, 44, prog(t, 0.2, 0.5), { color: C.signal, weight: 800, spacing: 6 });
    }
    ctx.restore();
    // impact flash
    if (t < 0.12) {
      ctx.fillStyle = `rgba(255,138,61,${1 - t / 0.12})`;
      ctx.fillRect(0, 0, W, H);
    }
    grain(t);
  };

  /** Word-by-word statement on ink. params: { lines: [[word, ...]], accent: [words], wordAt: seconds per word } */
  SCENES.statement = (t, dur, p) => {
    backdrop(t, C.ink);
    const size = p.size ?? 170;
    font(900, size);
    const gapY = size * 0.98;
    const startY = H / 2 - ((p.lines.length - 1) * gapY) / 2 + size * 0.34;
    let n = 0;
    p.lines.forEach((words, li) => {
      const line = words.join(' ');
      font(900, size);
      const total = ctx.measureText(line).width;
      let x = W / 2 - total / 2;
      for (const w of words) {
        const ww = ctx.measureText(w).width;
        const at = (p.delay ?? 0.1) + n * (p.wordAt ?? 0.22);
        const accent = p.accent?.includes(w);
        maskedLine(w, x, startY + li * gapY, size, prog(t, at, 0.45), { color: accent ? C.signal : C.white });
        font(900, size);
        x += ww + ctx.measureText(' ').width;
        n++;
      }
    });
    const out = exitOf(t, dur, 0.2);
    if (out > 0) {
      ctx.fillStyle = `rgba(18,10,61,${out})`;
      ctx.fillRect(0, 0, W, H);
    }
    grain(t);
  };

  /** South Dakota's 66 counties lighting up east → west. params: { kicker, text } */
  SCENES.map = (t, dur, p) => {
    backdrop(t, C.ink);
    const { viewBox, counties } = window.ASSETS.counties;
    const [, , vw, vh] = viewBox.split(' ').map(Number);
    const s = 1180 / vw;
    const ox = 560, oy = 105;
    const mid = ox + (vw * s) / 2; // captions centre under the map
    const order = [...counties].sort((a, b) => b.label[0] - a.label[0]);
    const span = Math.min(dur - 2.2, 4.2);
    const step = span / order.length;
    let lit = 0;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    for (const [i, c] of order.entries()) {
      const path = (c._path ??= new Path2D(c.d));
      const q = prog(t, 0.5 + i * step, 0.45);
      if (q > 0) lit++;
      ctx.fillStyle = q <= 0 ? 'rgba(255,255,255,0.05)' : q < 0.4 ? C.mint : C.signal;
      ctx.globalAlpha = q <= 0 ? 1 : lerp(0.6, 1, outCubic(q));
      ctx.fill(path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = q > 0 ? C.ink : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.6 / s * 1.4;
      ctx.stroke(path);
    }
    ctx.restore();
    // City pulses, once their counties have lit
    const city = (name, label) => {
      const c = counties.find((k) => k.name === name);
      const i = order.indexOf(c);
      const q = prog(t, 0.5 + i * step + 0.3, 0.5);
      if (q <= 0) return;
      const x = ox + c.label[0] * s, y = oy + c.label[1] * s;
      const ring = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - ring)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 14 + ring * 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(x, y, 12 * outBack(q), 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = 'rgba(18,10,61,0.9)';
      ctx.shadowBlur = 14;
      maskedLine(label, x + 26, y - 18, 38, q, { color: C.white, weight: 800, spacing: 3 });
      ctx.restore();
    };
    city('Minnehaha', 'SIOUX FALLS');
    city('Pennington', 'RAPID CITY');
    // Counter
    const shown = String(lit).padStart(2, '0');
    maskedLine(shown, 120, 330, 230, prog(t, 0.2, 0.4), { color: C.signal });
    maskedLine('COUNTIES', 126, 395, 40, prog(t, 0.35, 0.4), { color: C.mint, weight: 700, family: SANS, spacing: 9 });
    if (p.kicker) maskedLine(p.kicker.toUpperCase(), mid, 922, 36, prog(t, 1.2, 0.5), { color: C.mint, align: 'center', weight: 700, family: SANS, spacing: 8 });
    if (p.text) maskedLine(p.text.toUpperCase(), mid, 1025, 100, prog(t, 1.4, 0.6), { color: C.white, align: 'center' });
    const out = exitOf(t, dur, 0.2);
    if (out > 0) { ctx.fillStyle = `rgba(18,10,61,${out})`; ctx.fillRect(0, 0, W, H); }
    grain(t);
  };

  /** The Snowflake model: one organizer → leaders → teams → every door. params: { captions: [..4] } */
  SCENES.snowflake = (t, dur, p) => {
    backdrop(t, C.ink);
    const cx = W / 2, cy = H / 2 - 70;
    const r = rng(7);
    // Build the tree once: 1 → 5 → 20 → 60
    const tree = (SCENES._tree ??= (() => {
      const nodes = [{ x: 0, y: 0, level: 0, parent: -1, a: 0 }];
      const radii = [0, 140, 275, 385];
      const fan = [0, 5, 4, 3];
      for (let level = 1; level <= 3; level++) {
        const parents = nodes.filter((n) => n.level === level - 1);
        parents.forEach((par) => {
          const pi = nodes.indexOf(par);
          const spread = level === 1 ? Math.PI * 2 : (Math.PI * 2) / (5 * (level === 2 ? 1 : 4)) * 0.85;
          for (let k = 0; k < fan[level]; k++) {
            const a = level === 1
              ? -Math.PI / 2 + (k / 5) * Math.PI * 2
              : par.a + (k - (fan[level] - 1) / 2) * (spread / fan[level]) + (r() - 0.5) * 0.05;
            const rr = radii[level] * (1 + (r() - 0.5) * 0.08);
            nodes.push({ x: Math.cos(a) * rr * 1.15, y: Math.sin(a) * rr, level, parent: pi, a });
          }
        });
      }
      return nodes;
    })());
    const stage = [0.15, 0.25 * dur, 0.48 * dur, 0.7 * dur]; // when each level starts
    const rot = t * 0.04;
    const pos = (n) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return [cx + n.x * c - n.y * s, cy + n.x * s * 0.7 + n.y * c];
    };
    const levelColor = [C.signal, C.mint, C.white, 'rgba(255,255,255,0.75)'];
    const levelSize = [30, 20, 13, 8];
    // edges first
    for (const n of tree) {
      if (n.parent < 0) continue;
      const idx = tree.filter((m) => m.level === n.level).indexOf(n);
      const q = outCubic(prog(t, stage[n.level] + idx * 0.012, 0.5));
      if (q <= 0) continue;
      const [x1, y1] = pos(tree[n.parent]);
      const [x2, y2] = pos(n);
      ctx.strokeStyle = n.level === 1 ? 'rgba(45,212,191,0.7)' : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = n.level === 1 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(lerp(x1, x2, q), lerp(y1, y2, q));
      ctx.stroke();
    }
    for (const n of tree) {
      const idx = tree.filter((m) => m.level === n.level).indexOf(n);
      const q = prog(t, stage[n.level] + idx * 0.012 + (n.level ? 0.3 : 0), 0.4);
      if (q <= 0) continue;
      const [x, y] = pos(n);
      ctx.fillStyle = levelColor[n.level];
      ctx.beginPath();
      ctx.arc(x, y, levelSize[n.level] * outBack(q), 0, Math.PI * 2);
      ctx.fill();
    }
    // pulse on the center organizer
    const ring = (t * 0.9) % 1;
    const [ox, oy] = pos(tree[0]);
    ctx.strokeStyle = `rgba(255,138,61,${0.7 * (1 - ring)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ox, oy, 30 + ring * 90, 0, Math.PI * 2);
    ctx.stroke();

    maskedLine('THE SNOWFLAKE MODEL', 120, 120, 36, prog(t, 0.2, 0.5), { color: C.mint, weight: 700, family: SANS, spacing: 9 });
    // Caption for the current stage
    const caps = p.captions;
    const si = stage.reduce((acc, s, i) => (t >= s ? i : acc), 0);
    const local = t - stage[si];
    const nextAt = stage[si + 1] ?? dur;
    const out = si < 3 ? outCubic(prog(t, nextAt - 0.18, 0.18)) : exitOf(t, dur, 0.2);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    maskedLine(caps[si].toUpperCase(), W / 2, 1010, 92, prog(local, 0, 0.45), { color: si === 3 ? C.signal : C.white, align: 'center' });
    ctx.restore();
    const fade = exitOf(t, dur, 0.2);
    if (fade > 0) { ctx.fillStyle = `rgba(18,10,61,${fade})`; ctx.fillRect(0, 0, W, H); }
    grain(t);
  };

  /** End card: logo, call to action, 2028 badge. params: { cta, url } */
  SCENES.endcard = (t, dur, p) => {
    backdrop(t);
    const logo = window.ASSETS.logo;
    const q = outBack(prog(t, 0.05, 0.7));
    const lw = 980 * lerp(0.7, 1, q);
    const lh = lw * (logo.height / logo.width);
    ctx.save();
    ctx.globalAlpha = clamp(q * 1.4);
    ctx.drawImage(logo, W / 2 - lw / 2 - 40, 60 + (620 - lh) / 2, lw, lh);
    ctx.restore();
    maskedLine(p.cta.toUpperCase(), W / 2, 790, 42, prog(t, 0.55, 0.5), { color: C.mint, align: 'center', weight: 700, family: SANS, spacing: 9 });
    maskedLine(p.url.toUpperCase(), W / 2, 935, 150, prog(t, 0.75, 0.6), { color: C.white, align: 'center' });
    // Spinning campaign badge, like the site hero
    const bq = outBack(prog(t, 1.0, 0.6));
    if (bq > 0) {
      const bx = W - 270, by = 300, br = 130 * bq;
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = C.mint;
      ctx.beginPath();
      ctx.arc(0, 0, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(t * 0.45);
      font(800, 26 * bq);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ring = 'TRAIN · ORGANIZE · WIN · SOUTH DAKOTA · ';
      const chars = [...ring];
      chars.forEach((ch, i) => {
        ctx.save();
        ctx.rotate((i / chars.length) * Math.PI * 2);
        ctx.translate(0, -br * 0.8);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
      ctx.restore();
      font(900, 78 * bq);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2028', bx, by + 4);
      ctx.textBaseline = 'alphabetic';
    }
    const out = exitOf(t, dur, 0.4);
    if (out > 0) { ctx.fillStyle = `rgba(18,10,61,${out})`; ctx.fillRect(0, 0, W, H); }
    grain(t);
  };

  /** Legal disclaimer card. params: { lines: [...] } */
  SCENES.disclaimer = (t, dur, p) => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    const a = outCubic(prog(t, 0, 0.5)) * (1 - exitOf(t, dur, 0.5));
    ctx.save();
    ctx.globalAlpha = a;
    // "Paid for by" in a box
    font(800, 64);
    ctx.letterSpacing = '6px';
    const head = 'PAID FOR BY ORGANIZE SD';
    const hw = ctx.measureText(head).width;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 4;
    ctx.strokeRect(W / 2 - hw / 2 - 44, 380, hw + 88, 120);
    ctx.fillStyle = C.white;
    ctx.textAlign = 'center';
    ctx.fillText(head, W / 2, 462);
    ctx.letterSpacing = '0px';
    font(400, 34, SANS);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    p.lines.forEach((l, i) => ctx.fillText(l, W / 2, 590 + i * 54));
    ctx.restore();
    ctx.textAlign = 'left';
  };

  /** Soft edge darkening laid over all footage, so clips from three models share one frame */
  SCENES.vignette = () => {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(1, H / W);
    const g = ctx.createRadialGradient(0, 0, W * 0.32, 0, 0, W * 0.78);
    g.addColorStop(0, 'rgba(10,6,30,0)');
    g.addColorStop(0.55, 'rgba(10,6,30,0.12)');
    g.addColorStop(1, 'rgba(10,6,30,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-W, -W, W * 2, W * 2);
    ctx.restore();
  };

  window.SCENES = SCENES;
  // Opaque cards come back as JPEG (four times faster to encode than PNG); overlays need PNG for alpha
  window.renderFrame = (name, t, dur, params, format = 'png') => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // An overlay rendered for a segment it only partly covers stays transparent outside its own life
    if (t >= 0 && t < dur) SCENES[name](t, dur, params ?? {});
    return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.93);
  };
})();
