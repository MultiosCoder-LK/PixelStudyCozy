// Placeholder pixel art, drawn in code so the project runs with no
// image files. Each texture is a tiny grid of colored rectangles.
//
// To use real art later: put PNGs in /public/art, load them in
// RoomScene.preload() with the same keys (e.g. this.load.image('desk',
// 'art/desk.png')), and delete the matching tex(...) call below.

import Phaser from 'phaser';

export const PALETTE = {
  wall: 0x3b3355,
  wallStripe: 0x443b63,
  wallShade: 0x332c4a,
  baseboard: 0x261f35,
  floor: 0x5a3d2b,
  floorLine: 0x4a3122,
  floorLight: 0x664633,
  wood: 0x8a5a3c,
  woodDark: 0x5e3a26,
  woodDarker: 0x40281a,
  woodLight: 0xa8714b,
  curtain: 0x9c4f5f,
  curtainDark: 0x7d3d4c,
  curtainLight: 0xb5677a,
  rug: 0x8e3b46,
  rugBorder: 0xd9a05b,
  rugInner: 0x7a313b,
  paper: 0xf3ead7,
};

const BOOK_COLORS = [0xc0504d, 0x4f81bd, 0x9bbb59, 0xf2c14e, 0x8064a2, 0x4bacc6, 0xe8875a];

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const p = (color, x, y, ww = 1, hh = 1, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, ww, hh);
  };
  draw(p, g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Same buildings for both skyline layers, so lit windows line up.
function skylineBuildings() {
  const rnd = new Phaser.Math.RandomDataGenerator(['skyline']);
  const buildings = [];
  let x = 0;
  while (x < 88) {
    const w = rnd.between(7, 14);
    const h = rnd.between(7, 22);
    const windows = [];
    for (let wy = 26 - h + 2; wy < 25; wy += 3) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        if (rnd.frac() < 0.4) windows.push([wx, wy]);
      }
    }
    buildings.push({ x, w, h, windows, shade: rnd.frac() < 0.5, antenna: rnd.frac() < 0.25 });
    x += w;
  }
  return buildings;
}

export function buildTextures(scene) {
  // ── Tiny bits ──
  tex(scene, 'px', 1, 1, (p) => p(0xffffff, 0, 0));
  tex(scene, 'raindrop', 1, 4, (p) => p(0xb4cdf5, 0, 0, 1, 4, 0.85));
  tex(scene, 'glassdrop', 2, 3, (p) => {
    p(0xd6e6ff, 0, 1, 2, 2, 0.7);
    p(0xffffff, 0, 0, 1, 1, 0.9);
  });
  tex(scene, 'snowflake', 2, 2, (p) => p(0xffffff, 0, 0, 2, 2));

  // ── Sky things ──
  tex(scene, 'cloud', 28, 10, (p) => {
    p(0xf2f4fa, 8, 1, 10, 4);
    p(0xf2f4fa, 16, 2, 8, 4);
    p(0xf2f4fa, 4, 4, 20, 4);
    p(0xf2f4fa, 2, 6, 24, 3);
    p(0xd5d9e4, 2, 9, 24, 1);
  });
  tex(scene, 'sun', 10, 10, (p) => {
    p(0xffe08a, 3, 0, 4, 10);
    p(0xffe08a, 0, 3, 10, 4);
    p(0xffe08a, 1, 1, 8, 8);
    p(0xfff3c4, 3, 2, 3, 3);
  });
  tex(scene, 'moon', 8, 8, (p) => {
    p(0xf3efd6, 2, 0, 4, 8);
    p(0xf3efd6, 0, 2, 8, 4);
    p(0xf3efd6, 1, 1, 6, 6);
    p(0xd8d2b4, 2, 2, 2, 2);
    p(0xd8d2b4, 5, 5, 1, 1);
  });

  const buildings = skylineBuildings();
  tex(scene, 'skyline', 88, 26, (p) => {
    for (const b of buildings) {
      p(b.shade ? 0x6c7a99 : 0x7a88a6, b.x, 26 - b.h, b.w, b.h);
      p(0x5d6a88, b.x, 26 - b.h, 1, b.h);
      if (b.antenna) p(0x5d6a88, b.x + Math.floor(b.w / 2), 26 - b.h - 3, 1, 3);
      for (const [wx, wy] of b.windows) p(0x5d6a88, wx, wy);
    }
  });
  tex(scene, 'skylineLit', 88, 26, (p) => {
    for (const b of buildings) for (const [wx, wy] of b.windows) p(0xffd98a, wx, wy);
  });

  // ── Glows (drawn with ADD blend for light) ──
  const glow = (key, radius, color, step, alpha) =>
    tex(scene, key, radius * 2, radius * 2, (p, g) => {
      for (let r = radius; r > 2; r -= step) {
        g.fillStyle(color, alpha);
        g.fillCircle(radius, radius, r);
      }
    });
  glow('glowWarm', 56, 0xffb860, 2, 0.022);
  glow('glowCool', 28, 0x5cc8f2, 2, 0.03);
  glow('glowSmall', 5, 0xffd28a, 1, 0.08);

  // ── Furniture ──
  tex(scene, 'shelf', 28, 84, (p) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['books']);
    // a little plant and a globe on top
    p(0xb5613c, 4, 4, 6, 4);
    p(0x4f9a5a, 3, 0, 3, 4);
    p(0x3e7d48, 7, 1, 3, 3);
    p(0x4bacc6, 18, 1, 6, 6);
    p(0x9bbb59, 19, 2, 2, 3);
    p(PALETTE.woodDark, 20, 7, 2, 1);
    // frame
    p(PALETTE.woodDark, 0, 8, 28, 76);
    p(PALETTE.woodDarker, 2, 11, 24, 70);
    p(PALETTE.wood, 0, 8, 28, 3);
    for (const sy of [28, 46, 64, 81]) {
      p(PALETTE.wood, 2, sy, 24, 2);
      // books standing on this shelf
      let bx = 3;
      while (bx < 24) {
        const bw = rnd.between(2, 3);
        if (bx + bw > 25) break;
        const bh = rnd.between(10, 15);
        const color = rnd.pick(BOOK_COLORS);
        p(color, bx, sy - bh, bw, bh);
        p(0x000000, bx + bw - 1, sy - bh, 1, bh, 0.2);
        p(0xffffff, bx, sy - bh + 2, bw, 1, 0.25);
        bx += bw + (rnd.frac() < 0.2 ? 1 : 0);
      }
    }
  });

  tex(scene, 'desk', 124, 56, (p) => {
    p(PALETTE.woodLight, 0, 0, 124, 2);
    p(PALETTE.wood, 0, 2, 124, 3);
    p(PALETTE.woodDark, 0, 5, 124, 3);
    p(PALETTE.woodDark, 3, 8, 6, 48);
    p(PALETTE.woodDarker, 7, 8, 2, 48);
    // drawers on the right
    p(PALETTE.wood, 84, 8, 38, 48);
    p(PALETTE.woodDark, 84, 8, 38, 1);
    p(PALETTE.woodDark, 84, 24, 38, 1);
    p(PALETTE.woodDark, 84, 40, 38, 1);
    p(PALETTE.woodDarker, 84, 8, 1, 48);
    for (const hy of [15, 31, 47]) p(0xe8c07a, 100, hy, 6, 2);
  });

  tex(scene, 'monitor', 40, 30, (p) => {
    p(0x2b2b3a, 0, 0, 40, 26);
    p(0x14202c, 2, 2, 36, 22);
    p(0x3a3a4e, 0, 24, 40, 2);
    p(0x5cf2a4, 36, 25, 1, 1); // power light
    p(0x22222e, 16, 26, 8, 2);
    p(0x2b2b3a, 12, 28, 16, 2);
  });

  const lamp = (key, on) =>
    tex(scene, key, 24, 30, (p) => {
      p(0x3a3a48, 6, 27, 12, 3);
      p(0x55556a, 11, 9, 2, 18);
      p(0xc48a2c, 3, 3, 10, 1);
      p(0xe8b04a, 2, 4, 13, 5);
      p(0xf5c86a, 3, 5, 3, 2);
      p(on ? 0xfff1c4 : 0x8a7a5a, 4, 9, 9, 1);
    });
  lamp('lampOn', true);
  lamp('lampOff', false);

  tex(scene, 'notebook', 18, 6, (p) => {
    p(0x4f81bd, 0, 0, 18, 4);
    p(0x3d6aa0, 0, 0, 2, 4);
    p(0xf2c14e, 12, 0, 2, 4); // bookmark
    p(PALETTE.paper, 1, 4, 17, 2);
    p(0xd8cfba, 1, 5, 17, 1);
    p(0xc0504d, 4, 1, 8, 1); // pencil
  });

  tex(scene, 'mug', 8, 8, (p) => {
    p(0xe9e1cf, 1, 1, 5, 7);
    p(0x5a3a26, 1, 1, 5, 1);
    p(0xd0c6b0, 5, 2, 1, 6);
    p(0xe9e1cf, 6, 3, 2, 1);
    p(0xe9e1cf, 7, 3, 1, 3);
    p(0xe9e1cf, 6, 5, 2, 1);
    p(0xc0504d, 2, 4, 2, 2); // little heart-ish print
  });

  tex(scene, 'cork', 40, 28, (p) => {
    p(PALETTE.woodDark, 0, 0, 40, 28);
    p(0xb7864f, 2, 2, 36, 24);
    const rnd = new Phaser.Math.RandomDataGenerator(['cork']);
    for (let i = 0; i < 30; i++) p(0xa0743f, rnd.between(2, 37), rnd.between(2, 25));
    p(PALETTE.paper, 5, 5, 10, 12); // note
    for (const ly of [8, 10, 12, 14]) p(0xb8ae98, 6, ly, 8, 1);
    p(0xc0504d, 9, 4, 2, 2); // pin
    p(0xf2e27a, 18, 4, 8, 8); // sticky note
    p(0xd9c95e, 18, 11, 8, 1);
    p(PALETTE.paper, 25, 13, 12, 9); // envelope
    p(0xc9bfa8, 25, 13, 1, 1);
    for (let i = 0; i < 6; i++) {
      p(0xc9bfa8, 25 + i, 13 + Math.floor(i * 0.7), 1, 1);
      p(0xc9bfa8, 36 - i, 13 + Math.floor(i * 0.7), 1, 1);
    }
    p(0xc0504d, 30, 17, 2, 2); // wax seal
    p(0x4f81bd, 8, 19, 6, 5); // photo
    p(0xf3ead7, 9, 20, 4, 2);
  });

  tex(scene, 'plant', 12, 16, (p) => {
    p(0x4f9a5a, 5, 0, 2, 4);
    p(0x3e7d48, 1, 3, 4, 3);
    p(0x4f9a5a, 7, 2, 4, 4);
    p(0x5fb06a, 3, 6, 6, 3);
    p(0x3e7d48, 0, 7, 3, 2);
    p(0x3e7d48, 9, 6, 3, 2);
    p(0xb5613c, 2, 9, 8, 7);
    p(0xc97a52, 2, 9, 8, 2);
    p(0x8e4a2e, 9, 11, 1, 5);
  });

  tex(scene, 'chair', 26, 46, (p) => {
    p(0x6b4229, 3, 0, 20, 22);
    p(0x7f5233, 6, 3, 14, 16);
    p(0x8f5f3d, 6, 3, 14, 2);
    p(0x5e3a26, 5, 22, 3, 8);
    p(0x5e3a26, 18, 22, 3, 8);
    p(PALETTE.wood, 0, 30, 26, 5);
    p(PALETTE.woodLight, 0, 30, 26, 1);
    p(PALETTE.woodDark, 0, 35, 26, 2);
    p(PALETTE.woodDark, 2, 37, 3, 9);
    p(PALETTE.woodDark, 21, 37, 3, 9);
  });

  tex(scene, 'cat', 22, 11, (p) => {
    p(0xc47d3a, 1, 8, 16, 2); // curled tail
    p(0xe8a25a, 3, 4, 14, 6);
    p(0xe8a25a, 4, 3, 10, 1);
    p(0xf3c08a, 5, 9, 9, 1);
    for (const sx of [6, 9, 12]) p(0xc47d3a, sx, 4, 1, 4);
    p(0xe8a25a, 14, 2, 8, 8); // head
    p(0xe8a25a, 14, 0, 2, 2); // ears
    p(0xe8a25a, 20, 0, 2, 2);
    p(0xd98a8a, 15, 1, 1, 1);
    p(0xd98a8a, 20, 1, 1, 1);
    p(0x3a2418, 15, 5, 2, 1); // sleepy eyes
    p(0x3a2418, 19, 5, 2, 1);
    p(0xd98a8a, 18, 6, 1, 1); // nose
    p(0xf3c08a, 16, 7, 4, 2); // muzzle
  });

  tex(scene, 'clock', 13, 13, (p) => {
    p(PALETTE.woodDark, 3, 0, 7, 13);
    p(PALETTE.woodDark, 0, 3, 13, 7);
    p(PALETTE.woodDark, 1, 1, 11, 11);
    p(PALETTE.paper, 4, 1, 5, 11);
    p(PALETTE.paper, 1, 4, 11, 5);
    p(PALETTE.paper, 2, 2, 9, 9);
    p(0x8a7a6a, 6, 2, 1, 1);
    p(0x8a7a6a, 6, 10, 1, 1);
    p(0x8a7a6a, 2, 6, 1, 1);
    p(0x8a7a6a, 10, 6, 1, 1);
  });
}
