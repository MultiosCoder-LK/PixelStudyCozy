import Phaser from 'phaser';
import { buildTextures, PALETTE } from '../art.js';
import { state, on, emit } from '../state.js';
import { CAT_NAME } from '../config.js';

// The game is drawn at 320×180 and scaled up, so every unit is one pixel.
const W = 320;
const H = 180;
const GLASS = { x: 44, y: 26, w: 88, h: 56 }; // the see-through part of the window
const WALL_BOTTOM = 124;
const FLOOR_TOP = 128;

const SKY = {
  night: [0x0b1030, 0x1b2350, 0x2d3570],
  dawn: [0x3b4a8a, 0xc0708a, 0xf4b183],
  day: [0x4a90d9, 0x7fb7ea, 0xbfe0f5],
  dusk: [0x2d2b5c, 0x8a4a7a, 0xf08a5d],
};
const SKY_GREY = {
  night: [0x15171f, 0x1f2230, 0x2a2e3e],
  dawn: [0x4a4f63, 0x6e7285, 0x8f92a3],
  day: [0x7d8796, 0x9aa3b0, 0xb7bec8],
  dusk: [0x3a3b4f, 0x5b5a6d, 0x7a7686],
};
const SKYLINE_TINT = { night: 0x3a4058, dawn: 0xb0a0b8, day: 0xffffff, dusk: 0x8a7a9a };
const DARKNESS = { day: 0, dawn: 0.22, dusk: 0.3, night: 0.58 };
const OVERCAST = { clear: 0, cloudy: 0.5, fog: 0.8, rain: 1, storm: 1, snow: 0.7 };

const lerpColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export class RoomScene extends Phaser.Scene {
  constructor() {
    super('room');
  }

  create() {
    buildTextures(this);
    this.phase = state.phase;
    this.kind = state.weather;

    this.createSky();
    this.createWeatherFX();
    this.createRoom();
    this.createFurniture();
    this.createLighting();
    this.createLabel();

    this.applyAll();
    on('weather', (kind) => {
      this.kind = kind;
      this.applyAll();
    });
    on('phase', (phase) => {
      this.phase = phase;
      this.applyAll();
    });
  }

  // ─── Outside the window ────────────────────────────────────────────

  createSky() {
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff).fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    this.glassMask = maskShape.createGeometryMask();

    this.skyG = this.add.graphics().setDepth(0);

    this.stars = this.add.graphics().setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['stars']);
    for (let i = 0; i < 40; i++) {
      this.stars.fillStyle(0xffffff, rnd.realInRange(0.35, 1));
      this.stars.fillRect(GLASS.x + rnd.between(0, GLASS.w - 1), GLASS.y + rnd.between(0, 32), 1, 1);
    }
    this.tweens.add({ targets: this.stars, alpha: 0.55, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.sunMoon = this.add.image(0, 0, 'moon').setDepth(2);

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = this.add.image(GLASS.x + i * 18 - 8, GLASS.y + 5 + (i % 3) * 7, 'cloud').setDepth(3);
      cloud.speed = 1.5 + Math.random() * 2.5;
      this.clouds.push(cloud);
    }

    this.skyline = this.add.image(GLASS.x, GLASS.y + GLASS.h, 'skyline').setOrigin(0, 1).setDepth(4);
    this.skylineLit = this.add.image(GLASS.x, GLASS.y + GLASS.h, 'skylineLit').setOrigin(0, 1).setDepth(5);

    this.fog = this.add.rectangle(GLASS.x, GLASS.y, GLASS.w, GLASS.h, 0xc9cbd6).setOrigin(0).setDepth(7).setAlpha(0);
    this.tweens.add({ targets: this.fog, x: GLASS.x - 3, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.flash = this.add.rectangle(GLASS.x, GLASS.y, GLASS.w, GLASS.h, 0xffffff).setOrigin(0).setDepth(8).setAlpha(0);

    [this.skyG, this.stars, this.sunMoon, ...this.clouds, this.skyline, this.skylineLit, this.fog, this.flash].forEach((o) =>
      o.setMask(this.glassMask),
    );
  }

  createWeatherFX() {
    const top = { min: GLASS.x - 12, max: GLASS.x + GLASS.w };
    this.rainLight = this.add.particles(0, 0, 'raindrop', {
      x: top, y: GLASS.y - 4,
      speedX: { min: -30, max: -20 }, speedY: { min: 200, max: 250 },
      lifespan: 400, frequency: 35, quantity: 1, alpha: { min: 0.35, max: 0.75 },
      emitting: false,
    });
    this.rainHeavy = this.add.particles(0, 0, 'raindrop', {
      x: { min: GLASS.x - 20, max: GLASS.x + GLASS.w }, y: GLASS.y - 4,
      speedX: { min: -70, max: -50 }, speedY: { min: 260, max: 320 },
      lifespan: 350, frequency: 12, quantity: 2, alpha: { min: 0.4, max: 0.9 },
      emitting: false,
    });
    this.snow = this.add.particles(0, 0, 'snowflake', {
      x: { min: GLASS.x - 10, max: GLASS.x + GLASS.w + 10 }, y: GLASS.y - 3,
      speedX: { min: -6, max: 6 }, speedY: { min: 8, max: 18 },
      lifespan: 8000, frequency: 60, alpha: { min: 0.7, max: 1 },
      emitting: false,
    });
    // Drops sliding down the glass itself.
    this.glassDrops = this.add.particles(0, 0, 'glassdrop', {
      x: { min: GLASS.x, max: GLASS.x + GLASS.w }, y: { min: GLASS.y, max: GLASS.y + GLASS.h - 12 },
      speedY: { min: 5, max: 16 }, lifespan: { min: 1500, max: 3500 },
      alpha: { start: 0.8, end: 0 }, frequency: 220,
      emitting: false,
    });
    for (const fx of [this.rainLight, this.rainHeavy, this.snow]) fx.setDepth(6).setMask(this.glassMask);
    this.glassDrops.setDepth(9).setMask(this.glassMask);
  }

  drawSky() {
    const clear = SKY[this.phase];
    const grey = SKY_GREY[this.phase];
    const amount = OVERCAST[this.kind];
    const colors = clear.map((c, i) => lerpColor(c, grey[i], amount));
    const bands = 9;
    const bandH = Math.ceil(GLASS.h / bands);
    this.skyG.clear();
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const color = t < 0.5 ? lerpColor(colors[0], colors[1], t * 2) : lerpColor(colors[1], colors[2], (t - 0.5) * 2);
      this.skyG.fillStyle(color).fillRect(GLASS.x, GLASS.y + i * bandH, GLASS.w, bandH);
    }
  }

  // ─── The room ──────────────────────────────────────────────────────

  createRoom() {
    const g = this.add.graphics().setDepth(10);
    const p = (c, x, y, w = 1, h = 1, a = 1) => g.fillStyle(c, a).fillRect(x, y, w, h);

    // Wall, drawn around the window opening.
    const wallRects = [
      [0, 0, W, 22],
      [0, 22, 40, 64],
      [136, 22, W - 136, 64],
      [0, 86, W, WALL_BOTTOM - 86],
    ];
    for (const [x, y, w, h] of wallRects) {
      p(PALETTE.wall, x, y, w, h);
      for (let sx = 0; sx < W; sx += 8) if (sx >= x && sx < x + w) p(PALETTE.wallStripe, sx, y, 2, h);
    }
    p(PALETTE.wallShade, 0, 0, W, 4);
    p(PALETTE.wallShade, 0, WALL_BOTTOM - 3, W, 3, 0.6);

    p(PALETTE.baseboard, 0, WALL_BOTTOM, W, FLOOR_TOP - WALL_BOTTOM);

    // Wooden floor with staggered planks.
    p(PALETTE.floor, 0, FLOOR_TOP, W, H - FLOOR_TOP);
    for (let row = 0, y = FLOOR_TOP; y < H; row++, y += 7) {
      p(PALETTE.floorLine, 0, y, W, 1);
      p(PALETTE.floorLight, 0, y + 1, W, 1, 0.35);
      for (let x = (row % 2) * 24; x < W; x += 48) p(PALETTE.floorLine, x, y, 1, 7);
    }

    // Rug.
    p(PALETTE.rugBorder, 108, 148, 104, 24);
    p(PALETTE.rug, 110, 150, 100, 20);
    p(PALETTE.rugInner, 116, 154, 88, 12);
    for (let x = 120; x < 202; x += 8) p(PALETTE.rugBorder, x, 159, 4, 2);
    for (let x = 108; x < 212; x += 3) {
      p(PALETTE.rugBorder, x, 172, 1, 2);
    }

    // Window frame.
    const fw = PALETTE.paper;
    const fwShade = 0xd8cdb4;
    p(fw, 40, 22, 96, 4);
    p(fw, 40, 82, 96, 4);
    p(fw, 40, 22, 4, 64);
    p(fw, 132, 22, 4, 64);
    p(fw, 86, 26, 4, 56);
    p(fw, 44, 52, 88, 3);
    p(fwShade, 44, 26, 88, 1);
    p(fwShade, 44, 55, 88, 1);
    // Sill.
    p(PALETTE.woodLight, 34, 86, 108, 3);
    p(PALETTE.woodDark, 34, 89, 108, 2);
    p(0x000000, 36, 91, 104, 2, 0.15);

    // Glass reflections.
    const shine = this.add.graphics().setDepth(9.5).setMask(this.glassMask);
    shine.fillStyle(0xffffff, 0.08);
    for (let i = 0; i < 14; i++) {
      shine.fillRect(50 + i, 46 - i, 1, 1);
      shine.fillRect(54 + i, 46 - i, 1, 1);
      shine.fillRect(96 + i, 78 - i, 1, 1);
    }

    // Curtain rod and curtains.
    p(PALETTE.woodDark, 24, 15, 128, 2);
    p(PALETTE.woodLight, 22, 14, 3, 4);
    p(PALETTE.woodLight, 151, 14, 3, 4);
    this.drawCurtain(p, 26, 17, 16);
    this.drawCurtain(p, 134, 17, 16);

    // Fairy lights hanging from the rod.
    this.fairyBulbs = [];
    const colors = [0xffd28a, 0xff9a8a, 0x9ad8ff, 0xc8f59a];
    for (let i = 0; i <= 10; i++) {
      const x = 30 + i * 11.6;
      const sag = Math.sin((i / 10) * Math.PI) * 5;
      p(0x2a2238, x, 18 + sag, 4, 1);
      const bulb = this.add.rectangle(Math.round(x) + 1, Math.round(19 + sag), 2, 2, colors[i % colors.length]).setOrigin(0).setDepth(11);
      this.tweens.add({ targets: bulb, alpha: 0.45, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 1000 });
      this.fairyBulbs.push(bulb);
    }
  }

  drawCurtain(p, x, y, w) {
    const h = 82;
    p(PALETTE.curtain, x, y, w, h);
    for (let fx = x + 2; fx < x + w; fx += 4) {
      p(PALETTE.curtainDark, fx, y, 1, h);
      p(PALETTE.curtainLight, fx + 1, y, 1, h);
    }
    p(PALETTE.curtainDark, x, y + h - 2, w, 2);
    p(PALETTE.rugBorder, x, y + 44, w, 2); // tie-back
  }

  createFurniture() {
    this.add.image(2, FLOOR_TOP, 'shelf').setOrigin(0, 1).setDepth(20);
    this.add.image(118, 86, 'plant').setOrigin(0, 1).setDepth(20);

    this.cork = this.add.image(240, 34, 'cork').setOrigin(0).setDepth(20);
    this.clock = this.add.image(156, 34, 'clock').setOrigin(0).setDepth(20);
    this.clockHands = this.add.graphics().setDepth(21);
    this.drawClock();
    this.time.addEvent({ delay: 20000, loop: true, callback: () => this.drawClock() });

    this.add.image(176, 168, 'desk').setOrigin(0, 1).setDepth(20);
    this.monitor = this.add.image(198, 112, 'monitor').setOrigin(0, 1).setDepth(21);
    this.lamp = this.add.image(270, 112, 'lampOn').setOrigin(0, 1).setDepth(21);
    this.notebook = this.add.image(246, 112, 'notebook').setOrigin(0, 1).setDepth(21);
    this.add.image(184, 112, 'mug').setOrigin(0, 1).setDepth(21);
    this.add.particles(188, 103, 'px', {
      speedY: { min: -8, max: -5 }, speedX: { min: -2, max: 2 },
      lifespan: 1600, frequency: 350, alpha: { start: 0.35, end: 0 },
    }).setDepth(22);

    this.add.image(222, 170, 'chair').setOrigin(0, 1).setDepth(23);

    this.cat = this.add.image(150, 162, 'cat').setOrigin(0.5, 1).setDepth(23);
    this.tweens.add({ targets: this.cat, scaleY: 1.07, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // A tiny live "stock chart" on the monitor, a nod to a future trends page.
    this.chartG = this.add.graphics().setDepth(22);
    this.chart = Array.from({ length: 36 }, () => 0);
    for (let i = 1; i < this.chart.length; i++) this.chart[i] = this.chart[i - 1] + (Math.random() - 0.48) * 2;
    this.drawChart();
    this.time.addEvent({
      delay: 600, loop: true,
      callback: () => {
        this.chart.shift();
        this.chart.push(this.chart[this.chart.length - 1] + (Math.random() - 0.48) * 2);
        this.drawChart();
      },
    });

    this.makeClickable(this.monitor, 'Projects', () => emit('open-panel', 'projects'));
    this.makeClickable(this.notebook, 'About me', () => emit('open-panel', 'about'));
    this.makeClickable(this.cork, 'Contact', () => emit('open-panel', 'contact'));
    this.makeClickable(this.lamp, 'Lamp', () => this.toggleLamp());
    this.makeClickable(this.cat, CAT_NAME, () => this.catZzz());
  }

  drawChart() {
    const g = this.chartG;
    const x0 = 200;
    const top = 86;
    const height = 18;
    const min = Math.min(...this.chart);
    const max = Math.max(...this.chart);
    const range = max - min || 1;
    const up = this.chart[this.chart.length - 1] >= this.chart[0];
    const ys = this.chart.map((v) => Math.round(top + height - ((v - min) / range) * height));
    g.clear();
    g.fillStyle(0x1e3040).fillRect(x0, top + Math.floor(height / 2), 36, 1);
    g.fillStyle(up ? 0x5cf2a4 : 0xff6b7a);
    for (let i = 0; i < ys.length; i++) {
      const prev = i ? ys[i - 1] : ys[i];
      const y1 = Math.min(prev, ys[i]);
      g.fillRect(x0 + i, y1, 1, Math.abs(prev - ys[i]) + 1);
    }
  }

  drawClock() {
    const now = new Date();
    const cx = 162;
    const cy = 40;
    const g = this.clockHands;
    g.clear();
    const hand = (angle, length, color) => {
      g.fillStyle(color);
      for (let i = 0; i <= length; i++) {
        g.fillRect(Math.round(cx + Math.sin(angle) * i), Math.round(cy - Math.cos(angle) * i), 1, 1);
      }
    };
    const minutes = now.getMinutes();
    hand((minutes / 60) * Math.PI * 2, 4, 0x3a2a20);
    hand((((now.getHours() % 12) + minutes / 60) / 12) * Math.PI * 2, 2, 0xc0504d);
  }

  makeClickable(obj, label, onClick) {
    obj.setInteractive({ useHandCursor: true });
    const baseY = obj.y;
    obj.on('pointerover', () => {
      this.tweens.add({ targets: obj, y: baseY - 1, duration: 80 });
      this.showLabel(label, obj.getBounds());
    });
    obj.on('pointerout', () => {
      this.tweens.add({ targets: obj, y: baseY, duration: 80 });
      this.hideLabel();
    });
    obj.on('pointerdown', () => {
      this.hideLabel();
      onClick();
    });
  }

  // The hover label is an HTML element over the canvas, so it stays sharp
  // instead of being drawn at 8px and stretched with the pixel art.
  createLabel() {
    this.label = document.createElement('div');
    this.label.className = 'room-label';
    document.body.appendChild(this.label);
    this.events.once('shutdown', () => this.label.remove());
  }

  showLabel(text, bounds) {
    const rect = this.game.canvas.getBoundingClientRect();
    const scale = rect.width / W;
    this.label.textContent = text;
    const half = this.label.offsetWidth / 2 + 6;
    const x = Phaser.Math.Clamp(rect.left + bounds.centerX * scale, half, window.innerWidth - half);
    this.label.style.left = `${x}px`;
    this.label.style.top = `${rect.top + bounds.top * scale - 6}px`;
    this.label.classList.add('show');
  }

  hideLabel() {
    this.label.classList.remove('show');
  }

  catZzz() {
    const z = this.add
      .text(this.cat.x + 8, this.cat.y - 12, 'z', { fontFamily: '"Pixelify Sans", monospace', fontSize: '8px', color: '#d6e6ff' })
      .setDepth(101);
    this.tweens.add({ targets: z, y: z.y - 14, x: z.x + 6, alpha: 0, duration: 1600, onComplete: () => z.destroy() });
  }

  // ─── Light ─────────────────────────────────────────────────────────

  createLighting() {
    this.dark = this.add.rectangle(0, 0, W, H, 0x0a0c22).setOrigin(0).setDepth(50).setAlpha(0);
    const add = Phaser.BlendModes.ADD;
    this.lampGlow = this.add.image(279, 104, 'glowWarm').setBlendMode(add).setDepth(60).setAlpha(0);
    this.monitorGlow = this.add.image(218, 96, 'glowCool').setBlendMode(add).setDepth(60).setAlpha(0);
    this.bulbGlows = this.fairyBulbs.map((b) =>
      this.add.image(b.x + 1, b.y + 1, 'glowSmall').setBlendMode(add).setDepth(60).setAlpha(0),
    );
    this.roomFlash = this.add.rectangle(0, 0, W, H, 0xdde6ff).setOrigin(0).setDepth(70).setAlpha(0);
  }

  toggleLamp() {
    state.lamp = !state.lamp;
    emit('lamp', state.lamp);
    this.applyLighting();
  }

  applyLighting() {
    const night = this.phase !== 'day';
    let darkness = DARKNESS[this.phase] + (OVERCAST[this.kind] >= 0.7 ? 0.1 : 0);
    if (state.lamp && night) darkness -= 0.08;
    this.lamp.setTexture(state.lamp ? 'lampOn' : 'lampOff');
    this.tweens.add({ targets: this.dark, alpha: Math.max(0, darkness), duration: 800 });
    this.tweens.add({ targets: this.lampGlow, alpha: state.lamp ? (night ? 0.95 : 0.25) : 0, duration: 250 });
    this.tweens.add({ targets: this.monitorGlow, alpha: night ? 0.5 : 0.15, duration: 800 });
    this.bulbGlows.forEach((g) => this.tweens.add({ targets: g, alpha: night ? 0.7 : 0, duration: 800 }));
  }

  // ─── Applying time + weather ───────────────────────────────────────

  applyAll() {
    this.drawSky();

    const { phase, kind } = this;
    const night = phase === 'night';
    const showsSky = kind === 'clear' || kind === 'cloudy';

    // Sun or moon, positioned by time of day.
    this.sunMoon.setTexture(night ? 'moon' : 'sun').setVisible(showsSky);
    const sunPos = { dawn: [56, 50], day: [102, 34], dusk: [122, 50], night: [112, 34] }[phase];
    this.sunMoon.setPosition(sunPos[0], sunPos[1]);
    this.stars.setVisible(night && showsSky);

    const skyTint = lerpColor(SKYLINE_TINT[phase], 0x55586a, OVERCAST[kind] * 0.4);
    this.skyline.setTint(skyTint);
    this.skylineLit.setVisible(phase === 'night' || phase === 'dusk').setAlpha(night ? 1 : 0.6);

    // Clouds: how many, and how dark.
    const cloudCount = { clear: 1, cloudy: 6, fog: 3, rain: 6, storm: 6, snow: 5 }[kind];
    const cloudTint = { clear: 0xffffff, cloudy: 0xe6e8ef, fog: 0xd0d2da, rain: 0x9a9fac, storm: 0x5f6472, snow: 0xd8dbe4 }[kind];
    const phaseTint = { day: 0xffffff, dawn: 0xe8c0c8, dusk: 0xc0a0b8, night: 0x50566e }[phase];
    this.clouds.forEach((c, i) => {
      c.setVisible(i < cloudCount);
      c.setTint(phase === 'day' ? cloudTint : lerpColor(cloudTint, phaseTint, 0.6));
    });

    // Precipitation.
    const set = (fx, onOff) => (onOff ? fx.start() : fx.stop());
    set(this.rainLight, kind === 'rain');
    set(this.rainHeavy, kind === 'storm');
    set(this.glassDrops, kind === 'rain' || kind === 'storm');
    set(this.snow, kind === 'snow');
    this.fog.fillColor = { day: 0xc9cbd6, dawn: 0xb8a8b8, dusk: 0x8a7f96, night: 0x3a3e52 }[phase];
    this.fog.setAlpha({ fog: 0.55, rain: 0.12, storm: 0.15, snow: 0.15 }[kind] ?? 0);

    // Lightning.
    this.lightningTimer?.remove();
    if (kind === 'storm') this.scheduleLightning();

    this.applyLighting();
  }

  scheduleLightning() {
    this.lightningTimer = this.time.delayedCall(Phaser.Math.Between(5000, 14000), () => {
      this.flash.setAlpha(0.9);
      this.roomFlash.setAlpha(0.22);
      this.tweens.add({ targets: [this.flash, this.roomFlash], alpha: 0, duration: 140, yoyo: false, repeat: 0 });
      this.time.delayedCall(220, () => {
        this.flash.setAlpha(0.6);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 260 });
      });
      this.time.delayedCall(Phaser.Math.Between(300, 1400), () => emit('thunder'));
      this.scheduleLightning();
    });
  }

  update(_time, delta) {
    for (const c of this.clouds) {
      c.x += (c.speed * delta) / 1000;
      if (c.x > GLASS.x + GLASS.w + 16) c.x = GLASS.x - 16;
    }
  }
}
