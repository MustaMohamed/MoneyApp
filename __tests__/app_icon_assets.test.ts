import fs from 'node:fs';
import path from 'node:path';

import { decodePng, type DecodedPng } from '@/test_helpers/png';

// @expo/prebuild-config maps the source 1:1 onto Android's 108dp canvas (withAndroidIcons.js:364).
const ALPHA = 8; // ink threshold; below this is antialias tail, not artwork
const MASK_FRACTION = 1 / 3; // 72dp mask circle within the 108dp canvas
const SAFE_FRACTION = 33 / 108; // Google's 66dp "key elements" safe circle

const asset = (name: string) => path.join(__dirname, '..', 'assets', name);
const read = (name: string) => decodePng(fs.readFileSync(asset(name)));

function ink(img: DecodedPng) {
  const { width: W, height: H, data } = img;
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1,
    count = 0,
    rmax = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] <= ALPHA) continue;
      count++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const d = Math.hypot(x + 0.5 - W / 2, y + 0.5 - H / 2);
      if (d > rmax) rmax = d;
    }
  }
  return { count, x0, y0, x1, y1, rmax, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 };
}

function minAlpha({ data }: DecodedPng) {
  let m = 255;
  for (let i = 3; i < data.length; i += 4) if (data[i] < m) m = data[i];
  return m;
}

describe('assets/icon.png — launcher tile', () => {
  const img = read('icon.png');

  it('is a 1024 square', () => {
    expect([img.width, img.height]).toEqual([1024, 1024]);
  });

  it('is fully opaque', () => {
    // withIosIcons.js:198-203 composites onto '#ffffff', so transparent pixels go white on iOS.
    expect(minAlpha(img)).toBe(255);
  });

  it('is byte-identical to the verified master raster', () => {
    const master = path.join(
      __dirname,
      '..',
      'docs',
      'scopes',
      'MA-onboarding-redesign',
      'assets',
      'moneyapp-logo-cross-fan.png',
    );
    expect(fs.readFileSync(asset('icon.png')).equals(fs.readFileSync(master))).toBe(true);
  });
});

describe('assets/adaptive-icon.png — Android adaptive foreground', () => {
  const img = read('adaptive-icon.png');
  const i = ink(img);

  it('is a 1024 square', () => {
    expect([img.width, img.height]).toEqual([1024, 1024]);
  });

  it('is not blank', () => {
    expect(i.count).toBeGreaterThan(150_000);
  });

  it('keeps every inked pixel inside the 72dp circular mask', () => {
    expect(i.rmax).toBeLessThanOrEqual(img.width * MASK_FRACTION);
  });

  it('keeps every inked pixel inside the 66dp safe zone', () => {
    expect(i.rmax).toBeLessThanOrEqual(img.width * SAFE_FRACTION);
  });

  it('is centred on the canvas', () => {
    // Off-centre artwork clips asymmetrically under the mask even when rmax passes.
    expect(Math.abs(i.cx - img.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(i.cy - img.height / 2)).toBeLessThanOrEqual(1);
  });

  it('has a transparent background', () => {
    // An opaque foreground hides the `android.adaptiveIcon.backgroundColor` layer entirely.
    expect(minAlpha(img)).toBe(0);
  });
});

describe('assets/splash.png — splash logo', () => {
  const img = read('splash.png');
  const i = ink(img);

  it('is a 1024 square', () => {
    expect([img.width, img.height]).toEqual([1024, 1024]);
  });

  it('is not the 1x1 transparent placeholder', () => {
    expect(i.count).toBeGreaterThan(500_000);
  });

  it('fills 80-92% of its canvas', () => {
    // expo-splash-screen contain-fits this into an imageWidth-dp box, so baked-in padding shows.
    const fill = (i.x1 - i.x0 + 1) / img.width;
    expect(fill).toBeGreaterThan(0.8);
    expect(fill).toBeLessThan(0.92);
  });

  it('is centred on the canvas', () => {
    expect(Math.abs(i.cx - img.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(i.cy - img.height / 2)).toBeLessThanOrEqual(2);
  });
});
