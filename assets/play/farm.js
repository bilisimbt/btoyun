import { W, H, loadPhaser, disposePhaser, clamp, store, text, seeded } from "./core.js";

// Mini Çiftlik: a small top-down farm. Walk around, plant, water, harvest,
// sell at the market, collect eggs and finish a short list of missions.
const T = 48,
  COLS = 28,
  ROWS = 17,
  WW = T * COLS,
  WH = T * ROWS,
  STEP = 1 / 60,
  REACH = 30,
  DAY = 150,
  MAX_EGGS = 6,
  MAX_CHICKENS = 5,
  EGG_TIME = 20,
  EGG_PRICE = 8,
  SAVE_KEY = "farm-save";
const DIFFICULTY = {
  easy: { label: "Kolay", grow: 0.7, price: 1.25, egg: 0.7 },
  normal: { label: "Normal", grow: 1, price: 1, egg: 1 },
  hard: { label: "Zor", grow: 1.35, price: 0.85, egg: 1.3 },
};
const CROPS = {
  carrot: { name: "Havuç", grow: 16, seed: 0, price: 6, unlock: 0, icon: "🥕" },
  tomato: { name: "Domates", grow: 24, seed: 3, price: 12, unlock: 30, icon: "🍅" },
  corn: { name: "Mısır", grow: 32, seed: 5, price: 18, unlock: 70, icon: "🌽" },
  pumpkin: { name: "Balkabağı", grow: 44, seed: 8, price: 30, unlock: 120, icon: "🎃" },
};
const CROP_IDS = Object.keys(CROPS);
const ITEMS = [...CROP_IDS, "egg"];
const ITEM_NAMES = { ...Object.fromEntries(CROP_IDS.map((k) => [k, CROPS[k].name])), egg: "Yumurta" };
const MISSIONS = [
  { text: "3 havuç hasat et", type: "harvest", crop: "carrot", goal: 3, reward: 10, hint: "Tarlaya havuç ek, sula ve büyümesini bekle." },
  { text: "Pazarda 40 altın kazan", type: "earn", goal: 40, reward: 10, hint: "Ürünlerini sağ alttaki pazarda sat." },
  { text: "Yeni bir tarla aç", type: "plot", goal: 1, reward: 10, hint: "Kilitli bir tarlaya git ve altınla aç." },
  { text: "2 domates hasat et", type: "harvest", crop: "tomato", goal: 2, reward: 15, hint: "Domates tohumunu dükkândan al." },
  { text: "5 yumurta topla", type: "egg", goal: 5, reward: 15, hint: "Kümesin kapısından gir, yumurtaların üstünden geç." },
  { text: "Dükkândan kova ya da çizme al", type: "tool", goal: 1, reward: 15, hint: "Büyük kova çok su taşır, çizme seni hızlandırır." },
  { text: "3 mısır hasat et", type: "harvest", crop: "corn", goal: 3, reward: 25, hint: "Mısır tohumu dükkânda satılıyor." },
  { text: "Pazarda 200 altın kazan", type: "earn", goal: 200, reward: 50, hint: "Balkabağı en değerli ürün!" },
];
// Field plots in unlock order (column, row).
const PLOTS = [[7, 7], [8, 7], [7, 8], [8, 8], [9, 7], [9, 8], [10, 7], [10, 8], [7, 9], [8, 9], [9, 9], [10, 9]];
const PEN = { x0: 18 * T + 14, x1: 24 * T - 14, y0: 9 * T + 22, y1: 12 * T - 6 };
const POND = { cx: 4 * T, cy: 13 * T, rx: 62, ry: 46 };
const R = (c, r, w = 1, h = 1) => ({ x: c * T, y: r * T, w: w * T, h: h * T });
const distRect = (x, y, r) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));

export async function create(host) {
  const Phaser = await loadPhaser();
  if (host.dead) return null;
  return await new Promise((resolve, reject) => {
    let engine;
    engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.q("#pgRender"),
      width: W,
      height: H,
      backgroundColor: "#3f8a3a",
      audio: { noAudio: true },
      banner: false,
      input: { keyboard: false, mouse: false, touch: false },
      render: { antialias: true },
      scene: {
        create() {
          try {
            resolve(new Farm(host, this, engine));
          } catch (error) {
            disposePhaser(engine);
            reject(error);
          }
        },
        update(time, delta) {
          this.controller?.update(Math.min(delta / 1000, 0.075));
        },
      },
    });
  });
}

function buildMap() {
  const solid = new Uint8Array(COLS * ROWS),
    ground = new Uint8Array(COLS * ROWS),
    statics = [];
  const block = (c0, r0, c1 = c0, r1 = r0) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) solid[r * COLS + c] = 1;
  };
  const paint = (c0, r0, c1, r1, v) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ground[r * COLS + c] = v;
  };
  paint(1, 5, 26, 5, 1);
  paint(3, 4, 4, 4, 1);
  paint(8, 4, 10, 4, 1);
  paint(15, 4, 15, 4, 1);
  paint(13, 6, 13, 12, 1);
  paint(13, 13, 21, 13, 1);
  paint(14, 10, 17, 10, 1);
  paint(2, 11, 5, 14, 2);
  paint(18, 9, 23, 11, 3);
  block(2, 11, 5, 14);
  const trees = [];
  for (let c = 0; c < COLS; c++) trees.push([c, 0]);
  for (let r = 1; r < ROWS - 1; r++) trees.push([0, r], [COLS - 1, r]);
  trees.push([7, 1], [12, 1], [18, 2], [20, 1], [24, 2], [26, 4], [8, 14], [10, 13], [16, 15], [25, 15], [26, 11], [1, 9]);
  trees.forEach(([c, r], i) => {
    block(c, r);
    statics.push({ tex: (c * 7 + r * 3 + i) % 4 === 0 ? "tree2" : "tree", x: (c + 0.5) * T, y: (r + 1) * T - 2 });
  });
  const bushes = [[12, 11], [6, 15], [23, 4]];
  for (let c = 0; c < COLS; c++) bushes.push([c, ROWS - 1]);
  for (const [c, r] of bushes) {
    block(c, r);
    statics.push({ tex: "bush", x: (c + 0.5) * T, y: (r + 1) * T - 4 });
  }
  for (let c = 17; c <= 24; c++)
    for (let r = 8; r <= 12; r++) {
      const edge = c === 17 || c === 24 || r === 8 || r === 12;
      if (!edge || (c === 17 && r === 10)) continue;
      block(c, r);
      const side = (c === 17 || c === 24) && r !== 8 && r !== 12;
      statics.push({ tex: side ? "fence-v" : "fence-h", x: (c + 0.5) * T, y: (r + 1) * T - (side ? 0 : 8) });
    }
  block(2, 1, 5, 3);
  block(8, 2, 10, 3);
  block(15, 3);
  block(20, 14, 22, 15);
  block(11, 8);
  block(21, 6, 22, 7);
  block(6, 7);
  statics.push(
    { tex: "house", x: 4 * T, y: 4 * T, kind: "house", rect: R(2, 1, 4, 3) },
    { tex: "shop", x: 9.5 * T, y: 4 * T, kind: "shop", rect: R(8, 2, 3, 2) },
    { tex: "well", x: 15.5 * T, y: 4 * T, kind: "well", rect: R(15, 3) },
    { tex: "market", x: 21.5 * T, y: 16 * T, kind: "market", rect: R(20, 14, 3, 2) },
    { tex: "crate", x: 11.5 * T, y: 9 * T - 2, kind: "crate", rect: R(11, 8) },
    { tex: "coop", x: 22 * T, y: 8 * T, kind: "coop", rect: R(21, 6, 2, 2) },
    { tex: "scare", x: 6.5 * T, y: 8 * T - 2, kind: "scarecrow", rect: R(6, 7) },
  );
  return { solid, ground, statics };
}

/* ---------- procedural textures ---------- */
function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}
function leaf(g, x, y, ang, len, wid, color) {
  const cx = Math.cos(ang),
    sy = Math.sin(ang),
    px = -sy,
    py = cx;
  g.fillStyle(color);
  g.fillPoints(
    [
      { x, y },
      { x: x + cx * len * 0.5 + px * wid, y: y + sy * len * 0.5 + py * wid },
      { x: x + cx * len, y: y + sy * len },
      { x: x + cx * len * 0.5 - px * wid, y: y + sy * len * 0.5 - py * wid },
    ],
    true,
  );
}
const UP = -Math.PI / 2;
function drawFarmer(g, view, step) {
  const skin = 0xffd2a6,
    hat = 0xf2c75c,
    shirt = 0xe8584f,
    overall = 0x3f78c8,
    dark = 0x2f5fa3,
    boot = 0x7a4a2a,
    hair = 0x7a4b2a;
  if (view === "s") {
    const a = step ? -4 : 0,
      b = step ? 4 : 0;
    g.fillStyle(dark);
    g.fillRect(16 + a, 38, 6, 9);
    g.fillStyle(boot);
    g.fillRoundedRect(15 + a, 45, 9, 6, 2);
    g.fillStyle(overall);
    g.fillRect(18 + b, 38, 6, 9);
    g.fillStyle(boot);
    g.fillRoundedRect(18 + b, 45, 10, 6, 2);
    g.fillStyle(shirt);
    g.fillRoundedRect(12, 24, 17, 16, 6);
    g.fillStyle(overall);
    g.fillRoundedRect(13, 29, 15, 13, 3);
    g.fillStyle(shirt);
    g.fillRoundedRect(18 - a / 2, 26, 7, 11, 3);
    g.fillStyle(skin);
    g.fillCircle(21.5 - a / 2, 38, 3);
    g.fillStyle(hair);
    g.fillCircle(19, 17, 10);
    g.fillStyle(skin);
    g.fillCircle(22, 18.5, 8.5);
    g.fillCircle(29.5, 19.5, 2.2);
    g.fillStyle(0x2b1d14);
    g.fillCircle(25.5, 17.5, 1.6);
    g.fillStyle(0xff9a8a, 0.7);
    g.fillCircle(25, 22, 2);
    g.fillStyle(hat);
    g.fillEllipse(21, 10, 32, 9);
    g.fillRoundedRect(13, 1, 16, 10, 4);
    g.fillStyle(0xe2574c);
    g.fillRect(13, 7, 16, 3);
    return;
  }
  const lo = step ? -3 : 0,
    ro = step ? 0 : -3;
  g.fillStyle(dark);
  g.fillRect(13, 38, 6, 9 + lo);
  g.fillRect(21, 38, 6, 9 + ro);
  g.fillStyle(boot);
  g.fillRoundedRect(12, 45 + lo, 8, 6, 2);
  g.fillRoundedRect(20, 45 + ro, 8, 6, 2);
  g.fillStyle(shirt);
  g.fillRoundedRect(9, 24, 22, 16, 6);
  g.fillRoundedRect(5, 26 + (step ? 1 : 0), 7, 11, 3);
  g.fillRoundedRect(28, 26 + (step ? 0 : 1), 7, 11, 3);
  g.fillStyle(skin);
  g.fillCircle(8.5, 37 + (step ? 1 : 0), 3);
  g.fillCircle(31.5, 37 + (step ? 0 : 1), 3);
  g.fillStyle(overall);
  g.fillRoundedRect(12, 29, 16, 13, 3);
  if (view === "d") {
    g.fillRect(13, 24, 3, 7);
    g.fillRect(24, 24, 3, 7);
    g.fillStyle(0xffd34d);
    g.fillCircle(14.5, 30, 1.4);
    g.fillCircle(25.5, 30, 1.4);
    g.fillStyle(hair);
    g.fillCircle(20, 17, 10.5);
    g.fillStyle(skin);
    g.fillCircle(20, 18.5, 9.3);
    g.fillStyle(0x2b1d14);
    g.fillCircle(16.5, 18, 1.7);
    g.fillCircle(23.5, 18, 1.7);
    g.fillStyle(0xffffff);
    g.fillCircle(17, 17.3, 0.6);
    g.fillCircle(24, 17.3, 0.6);
    g.fillStyle(0xff9a8a, 0.7);
    g.fillCircle(14, 21.5, 2);
    g.fillCircle(26, 21.5, 2);
    g.lineStyle(1.4, 0x8a3b2b);
    g.beginPath();
    g.arc(20, 21, 2.6, 0.25, Math.PI - 0.25);
    g.strokePath();
  } else {
    g.fillStyle(dark);
    g.fillRect(14, 24, 3, 7);
    g.fillRect(23, 24, 3, 7);
    g.fillStyle(hair);
    g.fillCircle(20, 17.5, 10.2);
  }
  g.fillStyle(hat);
  g.fillEllipse(20, 10, 32, 9);
  g.fillRoundedRect(12, 1, 16, 10, 4);
  g.fillStyle(0xe2574c);
  g.fillRect(12, 7, 16, 3);
  g.lineStyle(1, 0xc99a35);
  g.strokeEllipse(20, 10, 32, 9);
}
function drawIcon(g, id, ox = 0, oy = 0, k = 1) {
  const P = (x, y) => ({ x: ox + x * k, y: oy + y * k });
  if (id === "carrot") {
    leaf(g, ox + 18 * k, oy + 10 * k, UP - 0.5, 10 * k, 2.5 * k, 0x4fae3a);
    leaf(g, ox + 18 * k, oy + 10 * k, UP + 0.4, 11 * k, 2.5 * k, 0x6cc04a);
    g.fillStyle(0xf28a1e);
    g.fillPoints([P(10, 10), P(26, 10), P(19, 34), P(17, 34)], true);
    g.fillStyle(0xffb050);
    g.fillRect(ox + 13 * k, oy + 12 * k, 3 * k, 6 * k);
    g.lineStyle(1.5 * k, 0xc96a10);
    g.lineBetween(ox + 14 * k, oy + 20 * k, ox + 19 * k, oy + 20 * k);
    g.lineBetween(ox + 18 * k, oy + 26 * k, ox + 22 * k, oy + 26 * k);
  } else if (id === "tomato") {
    g.fillStyle(0xe53b30);
    g.fillCircle(ox + 18 * k, oy + 21 * k, 12 * k);
    g.fillStyle(0xff7a6a);
    g.fillEllipse(ox + 13 * k, oy + 17 * k, 6 * k, 5 * k);
    for (const a of [-1.2, -0.4, 0.4, 1.2]) leaf(g, ox + 18 * k, oy + 10 * k, UP + Math.PI / 2 + a * 1.1, 8 * k, 2 * k, 0x3f9a34);
  } else if (id === "corn") {
    leaf(g, ox + 18 * k, oy + 34 * k, UP - 0.45, 26 * k, 4 * k, 0x5fae3c);
    leaf(g, ox + 18 * k, oy + 34 * k, UP + 0.45, 26 * k, 4 * k, 0x4f9a32);
    g.fillStyle(0xf7d34a);
    g.fillEllipse(ox + 18 * k, oy + 17 * k, 11 * k, 26 * k);
    g.fillStyle(0xe0ad2a);
    for (let y = 8; y < 28; y += 4) for (let x = 15; x <= 21; x += 3) g.fillCircle(ox + x * k, oy + y * k, 0.9 * k);
  } else if (id === "pumpkin") {
    g.fillStyle(0xd9741c);
    g.fillEllipse(ox + 11 * k, oy + 22 * k, 13 * k, 20 * k);
    g.fillEllipse(ox + 25 * k, oy + 22 * k, 13 * k, 20 * k);
    g.fillStyle(0xf08a24);
    g.fillEllipse(ox + 18 * k, oy + 22 * k, 16 * k, 22 * k);
    g.fillStyle(0xffb35a);
    g.fillEllipse(ox + 16 * k, oy + 18 * k, 4 * k, 8 * k);
    g.fillStyle(0x5b7a2a);
    g.fillRect(ox + 16.5 * k, oy + 6 * k, 3 * k, 7 * k);
  } else if (id === "egg") {
    g.fillStyle(0xfff4dc);
    g.fillEllipse(ox + 18 * k, oy + 19 * k, 20 * k, 26 * k);
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(ox + 14 * k, oy + 13 * k, 5 * k, 7 * k);
    g.lineStyle(1.2 * k, 0xd8c39c);
    g.strokeEllipse(ox + 18 * k, oy + 19 * k, 20 * k, 26 * k);
  } else if (id === "coin") {
    g.fillStyle(0xd9a22a);
    g.fillCircle(ox + 18 * k, oy + 19 * k, 13 * k);
    g.fillStyle(0xf8cd45);
    g.fillCircle(ox + 18 * k, oy + 18 * k, 12 * k);
    g.lineStyle(2 * k, 0xd9a22a);
    g.strokeCircle(ox + 18 * k, oy + 18 * k, 7.5 * k);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(ox + 13 * k, oy + 12 * k, 5 * k, 3 * k);
  } else if (id === "drop") {
    g.fillStyle(0x3f9be8);
    g.fillCircle(ox + 18 * k, oy + 22 * k, 10 * k);
    g.fillTriangle(ox + 8.6 * k, oy + 19 * k, ox + 27.4 * k, oy + 19 * k, ox + 18 * k, oy + 3 * k);
    g.fillStyle(0xbfe3ff);
    g.fillEllipse(ox + 14 * k, oy + 22 * k, 4 * k, 7 * k);
  }
}
function drawCrop(g, id, stage) {
  const G1 = 0x4fa83a,
    G2 = 0x6cc04a,
    G3 = 0x3d8f2e;
  if (stage === 0) {
    g.fillStyle(0x6b4423);
    for (const x of [14, 24, 34]) g.fillEllipse(x, 46, 6, 4);
    return;
  }
  if (stage === 1) {
    g.lineStyle(3, G1);
    g.lineBetween(24, 52, 24, 41);
    leaf(g, 24, 44, UP - 0.9, 12, 4, G2);
    leaf(g, 24, 44, UP + 0.9, 12, 4, G2);
    return;
  }
  if (id === "carrot") {
    const angles = stage === 2 ? [-0.5, 0, 0.5] : [-0.9, -0.45, 0, 0.45, 0.9],
      len = stage === 2 ? 22 : 30;
    if (stage === 4) {
      g.fillStyle(0xf28a1e);
      g.fillEllipse(24, 51, 20, 11);
      g.fillStyle(0xffb050);
      g.fillEllipse(21, 49, 7, 4);
    }
    angles.forEach((a, i) => leaf(g, 24, 50, UP + a, len - Math.abs(a) * 6, 5, i % 2 ? G1 : G2));
  } else if (id === "tomato") {
    if (stage >= 3) {
      g.fillStyle(0xa77b4f);
      g.fillRect(31, 8, 4, 44);
    }
    const top = stage === 2 ? 30 : 12;
    g.lineStyle(3, G3);
    g.lineBetween(24, 52, 26, top);
    for (let y = 46, i = 0; y > top + 2; y -= 8, i++) leaf(g, 25, y, UP + (i % 2 ? 1.1 : -1.1), stage === 2 ? 12 : 15, 5, i % 2 ? G1 : G2);
    if (stage === 3) {
      g.fillStyle(0x8fd65a);
      g.fillCircle(19, 30, 3.5);
      g.fillCircle(29, 22, 3.5);
    }
    if (stage === 4)
      for (const [x, y] of [[18, 30], [30, 21], [21, 41], [31, 36]]) {
        g.fillStyle(0xe53b30);
        g.fillCircle(x, y, 5.5);
        g.fillStyle(0xff8a7a);
        g.fillCircle(x - 2, y - 2, 1.8);
      }
  } else if (id === "corn") {
    if (stage === 2) {
      leaf(g, 24, 52, UP - 0.35, 30, 5, G1);
      leaf(g, 24, 52, UP + 0.35, 28, 5, G2);
      return;
    }
    g.lineStyle(4, 0x5fa83a);
    g.lineBetween(24, 52, 24, 8);
    [[44, -1], [34, 1], [24, -1], [16, 1]].forEach(([y, s], i) => leaf(g, 24, y, UP + s * 1.05, 20, 4, i % 2 ? G1 : G2));
    if (stage === 4) {
      g.fillStyle(0x7fbf4a);
      g.fillEllipse(31, 30, 12, 22);
      g.fillStyle(0xf7d34a);
      g.fillEllipse(32, 27, 8, 17);
      g.fillStyle(0xe0ad2a);
      for (let y = 21; y < 34; y += 4) g.fillCircle(32, y, 1);
      g.lineStyle(2, 0xe8cf7a);
      g.lineBetween(24, 8, 19, 2);
      g.lineBetween(24, 8, 29, 2);
      g.lineBetween(24, 8, 24, 1);
    }
  } else if (id === "pumpkin") {
    g.lineStyle(2.5, G3);
    g.lineBetween(8, 50, 40, 48);
    const leaves = stage === 2 ? [[16, 46, 7], [31, 45, 8], [23, 40, 7]] : [[10, 44, 8], [38, 44, 8], [18, 37, 8], [30, 36, 9], [24, 46, 7]];
    leaves.forEach(([x, y, r], i) => {
      g.fillStyle(i % 2 ? G1 : G2);
      g.fillCircle(x, y, r);
    });
    if (stage === 3) {
      g.fillStyle(0x9ccf5a);
      g.fillEllipse(27, 48, 14, 10);
    }
    if (stage === 4) {
      g.fillStyle(0xd9741c);
      g.fillEllipse(17, 43, 16, 18);
      g.fillEllipse(31, 43, 16, 18);
      g.fillStyle(0xf08a24);
      g.fillEllipse(24, 43, 18, 20);
      g.fillStyle(0xffb35a);
      g.fillEllipse(21, 39, 4, 8);
      g.fillStyle(0x5b7a2a);
      g.fillRect(22.5, 30, 3, 6);
    }
  }
}
function makeTextures(scene, map) {
  const t = (k, w, h, f) => tex(scene, k, w, h, f);
  for (const v of ["d", "u", "s"]) for (const s of [0, 1]) t(`f-${v}${s}`, 40, 54, (g) => drawFarmer(g, v, s));
  for (const id of [...ITEMS, "coin", "drop"]) t("i-" + id, 36, 36, (g) => drawIcon(g, id));
  for (const id of CROP_IDS) for (let s = 2; s <= 4; s++) t(`${id}-${s}`, 48, 56, (g) => drawCrop(g, id, s));
  t("crop-0", 48, 56, (g) => drawCrop(g, "carrot", 0));
  t("crop-1", 48, 56, (g) => drawCrop(g, "carrot", 1));
  t("soil", 48, 48, (g) => {
    g.fillStyle(0x7d522b);
    g.fillRoundedRect(2, 3, 44, 44, 8);
    g.fillStyle(0x9a6a3a);
    g.fillRoundedRect(3, 3, 42, 41, 7);
    g.lineStyle(3, 0x845528);
    for (const y of [13, 23, 33]) g.lineBetween(9, y, 39, y);
    g.fillStyle(0xb98a55);
    for (const [x, y] of [[12, 18], [30, 9], [35, 28], [18, 38], [26, 27]]) g.fillCircle(x, y, 1.3);
  });
  t("soil-wet", 48, 48, (g) => {
    g.fillStyle(0x4c2f17);
    g.fillRoundedRect(2, 3, 44, 44, 8);
    g.fillStyle(0x65401f);
    g.fillRoundedRect(3, 3, 42, 41, 7);
    g.lineStyle(3, 0x52331a);
    for (const y of [13, 23, 33]) g.lineBetween(9, y, 39, y);
    g.fillStyle(0x9cc6ec, 0.55);
    for (const [x, y] of [[13, 17], [31, 9], [34, 29], [20, 37]]) g.fillEllipse(x, y, 5, 2.5);
  });
  t("plot-locked", 48, 48, (g) => {
    g.fillStyle(0x000000, 0.08);
    g.fillRoundedRect(3, 3, 42, 42, 8);
    g.lineStyle(2, 0xd6b47a, 0.9);
    g.strokeRoundedRect(6, 6, 36, 36, 6);
    g.fillStyle(0xa77b4f);
    for (const [x, y] of [[4, 4], [40, 4], [4, 40], [40, 40]]) g.fillRect(x, y, 4, 6);
  });
  t("lock", 22, 24, (g) => {
    g.lineStyle(3, 0x8d99a6);
    g.beginPath();
    g.arc(11, 10, 6, Math.PI, 0);
    g.strokePath();
    g.lineBetween(5, 10, 5, 13);
    g.lineBetween(17, 10, 17, 13);
    g.fillStyle(0xf2c14e);
    g.fillRoundedRect(2, 11, 18, 12, 3);
    g.fillStyle(0x8a5a1a);
    g.fillCircle(11, 16, 2);
  });
  t("spark", 20, 20, (g) => {
    g.fillStyle(0xfff3a0);
    g.fillPoints([{ x: 10, y: 0 }, { x: 12.5, y: 7.5 }, { x: 20, y: 10 }, { x: 12.5, y: 12.5 }, { x: 10, y: 20 }, { x: 7.5, y: 12.5 }, { x: 0, y: 10 }, { x: 7.5, y: 7.5 }], true);
    g.fillStyle(0xffffff);
    g.fillCircle(10, 10, 2.5);
  });
  t("tree", 72, 92, (g) => tree(g, false));
  t("tree2", 72, 92, (g) => tree(g, true));
  t("bush", 56, 44, (g) => {
    g.fillStyle(0x2f8a3e);
    g.fillCircle(16, 28, 14);
    g.fillCircle(40, 28, 14);
    g.fillCircle(28, 20, 16);
    g.fillStyle(0x45a650);
    g.fillCircle(24, 17, 9);
    g.fillCircle(38, 24, 7);
    g.fillStyle(0xff8fb1);
    for (const [x, y] of [[14, 24], [33, 14], [44, 31], [24, 33]]) g.fillCircle(x, y, 2.2);
  });
  t("fence-h", 48, 32, (g) => {
    g.fillStyle(0xb48452);
    g.fillRect(0, 9, 48, 5);
    g.fillRect(0, 19, 48, 5);
    g.fillStyle(0xd6a66c);
    g.fillRect(0, 9, 48, 2);
    g.fillRect(0, 19, 48, 2);
    g.fillStyle(0xa0703f);
    g.fillRoundedRect(19, 2, 10, 30, 3);
    g.fillStyle(0xd6a66c);
    g.fillRect(21, 3, 3, 27);
  });
  t("fence-v", 20, 48, (g) => {
    g.fillStyle(0xb48452);
    g.fillRect(8, 0, 4, 48);
    g.fillStyle(0xa0703f);
    g.fillRoundedRect(5, 14, 10, 32, 3);
    g.fillStyle(0xd6a66c);
    g.fillRect(7, 15, 3, 29);
  });
  t("house", 200, 176, (g) => {
    g.fillStyle(0xf3e3c3);
    g.fillRect(12, 78, 176, 96);
    g.fillStyle(0xe2cfa8);
    for (let y = 88; y < 172; y += 14) g.fillRect(12, y, 176, 2);
    g.fillStyle(0x8f8f99);
    g.fillRect(146, 8, 20, 40);
    g.fillStyle(0xc2453b);
    g.fillPoints([{ x: 0, y: 86 }, { x: 22, y: 22 }, { x: 178, y: 22 }, { x: 200, y: 86 }], true);
    g.fillStyle(0xa83a32);
    for (let y = 34; y < 86; y += 12) g.fillRect(16 - (y - 34) / 3, y, 168 + ((y - 34) * 2) / 3, 3);
    g.fillStyle(0x7d2a24);
    g.fillRect(0, 84, 200, 6);
    g.fillStyle(0x8a5a33);
    g.fillRoundedRect(84, 112, 32, 62, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffd34d);
    g.fillCircle(109, 146, 2.5);
    for (const x of [28, 136]) {
      g.fillStyle(0xffffff);
      g.fillRect(x - 3, 101, 42, 36);
      g.fillStyle(0x8fd3ff);
      g.fillRect(x, 104, 36, 30);
      g.fillStyle(0xffffff);
      g.fillRect(x + 16.5, 104, 3, 30);
      g.fillRect(x, 117.5, 36, 3);
      g.fillStyle(0x9b6a3c);
      g.fillRect(x - 4, 137, 44, 7);
      for (let i = 0; i < 5; i++) {
        g.fillStyle([0xff6b8b, 0xffd34d, 0xff8f3f][i % 3]);
        g.fillCircle(x + 2 + i * 8, 135, 3);
      }
    }
  });
  t("shop", 150, 128, (g) => stall(g, 0x4caf50, 0x2e7d32, true));
  t("market", 150, 128, (g) => stall(g, 0xe2574c, 0xa83a32, false));
  t("well", 64, 92, (g) => {
    g.fillStyle(0x8a5a33);
    g.fillRect(8, 18, 6, 50);
    g.fillRect(50, 18, 6, 50);
    g.fillStyle(0x9aa3ad);
    g.fillRoundedRect(4, 56, 56, 34, 8);
    g.fillStyle(0x7f8994);
    for (const [x, y] of [[8, 66], [26, 70], [44, 66], [16, 78], [36, 80]]) g.fillRoundedRect(x, y, 14, 7, 3);
    g.fillStyle(0xb8c0c8);
    g.fillEllipse(32, 57, 58, 18);
    g.fillStyle(0x2f6f9f);
    g.fillEllipse(32, 58, 44, 11);
    g.lineStyle(2, 0x5b3b20);
    g.lineBetween(32, 24, 32, 44);
    g.fillStyle(0x8a5a33);
    g.fillRect(25, 42, 14, 10);
    g.fillStyle(0xc2453b);
    g.fillTriangle(0, 24, 32, 2, 64, 24);
    g.fillStyle(0xa83a32);
    g.fillRect(0, 22, 64, 5);
  });
  t("coop", 104, 112, (g) => {
    g.fillStyle(0xc8483c);
    g.fillRect(10, 42, 84, 68);
    g.fillStyle(0xb13d33);
    for (let x = 16; x < 94; x += 12) g.fillRect(x, 42, 2, 68);
    g.fillStyle(0x7a3b2e);
    g.fillTriangle(0, 48, 52, 4, 104, 48);
    g.fillStyle(0xffffff);
    g.fillRect(4, 44, 96, 5);
    g.fillStyle(0x3a2318);
    g.fillRoundedRect(38, 70, 28, 40, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffffff);
    g.fillCircle(52, 28, 9);
    g.fillStyle(0xffe08a);
    g.fillCircle(52, 28, 6);
    g.lineStyle(3, 0xffffff);
    g.strokeRect(10, 42, 84, 68);
  });
  t("crate", 48, 48, (g) => {
    for (const [x, c] of [[10, 0xf2c14e], [20, 0xe2574c], [30, 0x8fd65a]]) {
      g.fillStyle(c);
      g.fillRoundedRect(x, 6, 10, 16, 2);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(x + 2, 10, 6, 4);
    }
    g.fillStyle(0xb07a43);
    g.fillRect(4, 18, 40, 28);
    g.fillStyle(0x8a5a2a);
    g.fillRect(4, 26, 40, 2);
    g.fillRect(4, 36, 40, 2);
    g.lineStyle(2, 0x6e4522);
    g.strokeRect(4, 18, 40, 28);
  });
  t("scare", 48, 78, (g) => {
    g.fillStyle(0x8a5a33);
    g.fillRect(22, 24, 4, 54);
    g.fillRect(4, 36, 40, 4);
    g.fillStyle(0x4a78c0);
    g.fillRoundedRect(12, 30, 24, 24, 4);
    g.fillStyle(0xe2574c);
    g.fillRect(12, 38, 24, 3);
    g.fillRect(22, 30, 3, 24);
    g.fillStyle(0xf2d38a);
    g.fillCircle(4, 38, 4);
    g.fillCircle(44, 38, 4);
    g.fillStyle(0xe8cf9a);
    g.fillCircle(24, 20, 10);
    g.fillStyle(0x3a2318);
    g.fillCircle(20, 19, 1.6);
    g.fillCircle(28, 19, 1.6);
    g.lineStyle(1.5, 0x3a2318);
    g.lineBetween(19, 24, 29, 24);
    g.fillStyle(0xc99a35);
    g.fillEllipse(24, 12, 30, 7);
    g.fillRoundedRect(17, 2, 14, 10, 4);
  });
  t("chick0", 32, 30, (g) => chicken(g, false));
  t("chick1", 32, 30, (g) => chicken(g, true));
  t("duck", 30, 22, (g) => {
    g.fillStyle(0xffe36e);
    g.fillEllipse(13, 14, 22, 12);
    g.fillCircle(22, 7, 5.5);
    g.fillStyle(0xf5c542);
    g.fillEllipse(11, 13, 10, 6);
    g.fillStyle(0xf28c28);
    g.fillTriangle(26, 6, 30, 8, 26, 10);
    g.fillStyle(0x222222);
    g.fillCircle(23.5, 6, 1.1);
  });
  t("egg", 16, 20, (g) => {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(8, 18, 14, 4);
    g.fillStyle(0xfff4dc);
    g.fillEllipse(8, 10, 13, 16);
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(6, 7, 4, 5);
    g.lineStyle(1, 0xd8c39c);
    g.strokeEllipse(8, 10, 13, 16);
  });
  t("farm-ground", WW, WH, (g) => drawGround(g, map));
}
function tree(g, apples) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(36, 86, 50, 12);
  g.fillStyle(0x8a5a33);
  g.fillRoundedRect(30, 54, 12, 34, 4);
  g.fillStyle(0x6e4527);
  g.fillRect(30, 56, 4, 32);
  g.fillStyle(apples ? 0x2a7d3a : 0x2f8a3e);
  g.fillCircle(36, 38, 28);
  g.fillCircle(17, 50, 15);
  g.fillCircle(55, 50, 15);
  g.fillStyle(apples ? 0x379646 : 0x3fa34d);
  g.fillCircle(32, 32, 21);
  g.fillCircle(49, 42, 13);
  g.fillCircle(20, 43, 11);
  g.fillStyle(apples ? 0x4fb05a : 0x5fc163);
  g.fillCircle(28, 24, 10);
  g.fillCircle(43, 31, 6);
  if (apples) {
    g.fillStyle(0xe8443a);
    for (const [x, y] of [[20, 44], [45, 26], [52, 48], [32, 50], [28, 30]]) g.fillCircle(x, y, 3.4);
  }
}
function chicken(g, peck) {
  g.fillStyle(0xf28c28);
  g.fillRect(12, 23, 2, 6);
  g.fillRect(18, 23, 2, 6);
  g.fillStyle(0xf3efe6);
  g.fillTriangle(1, 9, 6, 19, 11, 13);
  g.fillStyle(0xffffff);
  g.fillEllipse(15, 18, 24, 15);
  g.fillStyle(0xe7e1d6);
  g.fillEllipse(13, 18, 12, 8);
  const hx = peck ? 25 : 23,
    hy = peck ? 15 : 9;
  g.fillStyle(0xffffff);
  g.fillCircle(hx, hy, 6.3);
  g.fillStyle(0xe8443a);
  g.fillCircle(hx - 2, hy - 6, 2.2);
  g.fillCircle(hx + 1, hy - 6.5, 2.4);
  g.fillCircle(hx + 3.5, hy - 5, 2);
  g.fillEllipse(hx + 4, hy + 5, 3, 5);
  g.fillStyle(0xf5a623);
  g.fillTriangle(hx + 5, hy - 1, hx + 9, hy + 1, hx + 5, hy + 3);
  g.fillStyle(0x222222);
  g.fillCircle(hx + 2, hy - 1, 1.3);
}
function stall(g, stripe, dark, shop) {
  g.fillStyle(0x8a5a33);
  g.fillRect(10, 30, 8, 92);
  g.fillRect(132, 30, 8, 92);
  g.fillStyle(0xc69560);
  g.fillRect(16, 44, 118, 52);
  g.fillStyle(0xa67745);
  g.fillRect(16, 66, 118, 4);
  if (shop) {
    const c = [0xf2c14e, 0xe2574c, 0x8fd65a, 0xffa94d, 0x6cc4f0];
    for (let i = 0; i < 9; i++) {
      g.fillStyle(c[i % 5]);
      g.fillRoundedRect(22 + i * 12, 50, 9, 15, 2);
      g.fillStyle(c[(i + 2) % 5]);
      g.fillRoundedRect(22 + i * 12, 72, 9, 15, 2);
    }
  }
  g.fillStyle(0x9b6a3c);
  g.fillRect(4, 92, 142, 34);
  g.fillStyle(0x8a5a2a);
  for (let y = 100; y < 126; y += 9) g.fillRect(4, y, 142, 2);
  g.lineStyle(2, 0x6e4522);
  g.strokeRect(4, 92, 142, 34);
  if (!shop) {
    const goods = [[0xf28a1e, 30], [0xe53b30, 75], [0xf7d34a, 120]];
    for (const [c, x] of goods) {
      g.fillStyle(0xb07a43);
      g.fillRect(x - 20, 80, 40, 16);
      g.fillStyle(c);
      for (let i = 0; i < 5; i++) g.fillCircle(x - 14 + i * 7, 80 - (i % 2) * 3, 6);
    }
  } else {
    g.fillStyle(0xf6e7c1);
    g.fillRoundedRect(46, 100, 58, 18, 4);
    g.fillStyle(0x4caf50);
    g.fillCircle(60, 109, 4);
    g.fillCircle(75, 109, 4);
    g.fillCircle(90, 109, 4);
  }
  g.fillStyle(dark);
  g.fillRect(0, 8, 150, 10);
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i % 2 ? 0xffffff : stripe);
    g.fillRect(i * 15, 16, 15, 26);
    g.fillCircle(i * 15 + 7.5, 42, 7.5);
  }
}
function drawGround(g, map) {
  const rnd = seeded(7),
    type = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? 0 : map.ground[r * COLS + c]);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      g.fillStyle((r + c) % 2 ? 0x7ccb57 : 0x77c552);
      g.fillRect(c * T, r * T, T, T);
    }
  for (let i = 0; i < 1100; i++) {
    const x = rnd() * WW,
      y = rnd() * WH;
    if (type(Math.floor(x / T), Math.floor(y / T))) continue;
    g.fillStyle(rnd() < 0.55 ? 0x63b044 : 0x95dc70, 0.9);
    g.fillTriangle(x, y, x + 1.5, y - 6, x + 3, y);
    g.fillTriangle(x + 3, y, x + 5.5, y - 5, x + 6, y);
  }
  g.fillStyle(0x5a3a1e, 0.35);
  g.fillRoundedRect(7 * T - 8, 7 * T - 8, 4 * T + 16, 3 * T + 16, 14);
  for (const pass of [0, 1])
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const v = type(c, r);
        if (v !== 1 && v !== 3) continue;
        if (pass === 0) {
          g.fillStyle(v === 1 ? 0xc29e64 : 0xb3ab55);
          g.fillRoundedRect(c * T - 3, r * T - 3, T + 6, T + 6, 10);
        } else {
          g.fillStyle(v === 1 ? 0xe2c48c : 0xd8cf7a);
          g.fillRect(c * T, r * T, T, T);
        }
      }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = type(c, r);
      for (let i = 0; i < 4 && (v === 1 || v === 3); i++) {
        const x = c * T + 4 + rnd() * 40,
          y = r * T + 4 + rnd() * 40;
        if (v === 1) {
          g.fillStyle(rnd() < 0.5 ? 0xc9a873 : 0xf0dcae);
          g.fillEllipse(x, y, 5, 3.5);
        } else {
          g.lineStyle(1.5, 0xe9df98);
          g.lineBetween(x, y, x + 7, y - 2);
        }
      }
    }
  g.fillStyle(0xe6d08f);
  g.fillRoundedRect(2 * T - 10, 11 * T - 10, 4 * T + 20, 4 * T + 20, 34);
  g.fillStyle(0x3d9ad6);
  g.fillRoundedRect(2 * T, 11 * T, 4 * T, 4 * T, 26);
  g.fillStyle(0x5bb3e8);
  g.fillRoundedRect(2 * T + 10, 11 * T + 10, 4 * T - 20, 4 * T - 30, 20);
  for (const [x, y] of [[2.6, 11.7], [5.2, 14.3], [5.3, 11.8]]) {
    g.fillStyle(0x4fae3a);
    g.fillCircle(x * T, y * T, 9);
    g.fillStyle(0x5bb3e8);
    g.fillTriangle(x * T, y * T, x * T + 10, y * T - 4, x * T + 10, y * T + 3);
  }
  g.fillStyle(0xff8fb1);
  g.fillCircle(2.6 * T + 2, 11.7 * T - 2, 3);
  g.lineStyle(2.5, 0x3d7a2a);
  for (const [x, y] of [[1.85, 14.9], [2.05, 15], [6.1, 10.95], [6.25, 11.05]]) g.lineBetween(x * T, y * T, x * T + 2, y * T - 18);
  const colors = [0xffffff, 0xffe066, 0xff8fb1, 0xb197fc];
  for (let i = 0; i < 140; i++) {
    const x = rnd() * WW,
      y = rnd() * WH,
      c = Math.floor(x / T),
      r = Math.floor(y / T);
    if (type(c, r) || map.solid[r * COLS + c] || (c >= 6 && c <= 11 && r >= 6 && r <= 10)) continue;
    g.fillStyle(colors[i % 4]);
    for (let k = 0; k < 4; k++) g.fillCircle(x + Math.cos(k * 1.57) * 2.6, y + Math.sin(k * 1.57) * 2.6, 2.1);
    g.fillStyle(0xffc23d);
    g.fillCircle(x, y, 1.5);
  }
  g.fillStyle(0x000000, 0.13);
  g.fillEllipse(4 * T, 4 * T + 2, 200, 22);
  g.fillEllipse(9.5 * T, 4 * T + 2, 150, 16);
  g.fillEllipse(22 * T, 8 * T + 2, 100, 14);
  g.fillEllipse(21.5 * T, 16 * T + 2, 150, 14);
}

/* ---------- game ---------- */
class Farm {
  constructor(host, scene, game) {
    this.host = host;
    this.s = scene;
    this.game = game;
    scene.controller = this;
    this.difficulty = store.read("farm-difficulty", "normal");
    if (!DIFFICULTY[this.difficulty]) this.difficulty = "normal";
    this.d = DIFFICULTY[this.difficulty];
    this.map = buildMap();
    makeTextures(scene, this.map);
    this.state = this.load() || this.fresh();
    this.mode = "menu";
    this.acc = 0;
    this.time = 0;
    this.skip = false;
    this.particles = [];
    this.floats = [];
    this.flyers = [];
    this.marker = null;
    this.path = null;
    this.pending = null;
    this.facing = { x: 0, y: 1 };
    this.view = "d";
    this.walkT = 0;
    this.moving = false;
    this.saveT = 0;
    this.hudT = 0;
    this.toastLife = 0;
    this.lowQ = host.quality === "low";
    this.touchMode = window.matchMedia?.("(pointer: coarse)").matches || false;
    this.world = scene.add.layer();
    this.ui = scene.add.layer();
    this.uw = W;
    this.uh = H;
    this.us = 1;
    this.buildWorld();
    this.buildUI();
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, WW, WH);
    this.cam.startFollow(this.player, true, 0.15, 0.15);
    this.uiCam = scene.cameras.add(0, 0, W, H).setOrigin(0, 0);
    this.cam.ignore(this.ui);
    this.uiCam.ignore(this.world);
    this.applyState();
    this.resize();
    this.cam.centerOn(this.player.x, this.player.y);
    this.render(0);
    this.refreshUI();
  }
  fresh() {
    return {
      v: 1,
      coins: 5,
      water: 6,
      cap: 6,
      boots: false,
      crops: ["carrot"],
      seed: "carrot",
      plots: PLOTS.map((_, i) => ({ open: i < 4, crop: null, p: 0, w: 0, w2: 0 })),
      bought: 0,
      chickens: 2,
      eggT: [6, 13],
      eggs: [],
      inv: Object.fromEntries(ITEMS.map((k) => [k, 0])),
      mission: 0,
      prog: 0,
      day: 1,
      clock: 15,
      px: 4.5 * T,
      py: 5.5 * T,
      earned: 0,
      started: false,
    };
  }
  load() {
    const s = store.read(SAVE_KEY, null);
    if (!s || s.v !== 1 || !Array.isArray(s.plots) || s.plots.length !== PLOTS.length) return null;
    const f = this.fresh(),
      st = { ...f, ...s, inv: { ...f.inv, ...(s.inv || {}) } };
    st.crops = (Array.isArray(s.crops) ? s.crops : f.crops).filter((c) => CROPS[c]);
    if (!st.crops.includes("carrot")) st.crops.unshift("carrot");
    if (!st.crops.includes(st.seed)) st.seed = "carrot";
    st.plots = s.plots.map((p) => ({ open: !!p.open, crop: CROPS[p.crop] ? p.crop : null, p: clamp(Number(p.p) || 0, 0, 1), w: p.w ? 1 : 0, w2: p.w2 ? 1 : 0 }));
    st.chickens = clamp(Math.round(st.chickens) || 2, 2, MAX_CHICKENS);
    st.eggT = Array.from({ length: st.chickens }, (_, i) => Number(s.eggT?.[i]) || 8 + i * 4);
    st.eggs = (Array.isArray(s.eggs) ? s.eggs : []).filter((e) => Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1])).slice(0, MAX_EGGS);
    for (const k of ["coins", "water", "cap", "mission", "prog", "day", "clock", "earned", "bought"]) st[k] = Math.max(0, Number(st[k]) || 0);
    st.cap = st.cap > 6 ? 12 : 6;
    st.water = Math.min(st.water, st.cap);
    st.mission = Math.min(st.mission, MISSIONS.length);
    if (!Number.isFinite(st.px) || !Number.isFinite(st.py) || this.blocked(st.px, st.py)) {
      st.px = f.px;
      st.py = f.py;
    }
    return st;
  }
  save() {
    if (!this.state || !this.player) return;
    this.state.px = Math.round(this.player.x);
    this.state.py = Math.round(this.player.y);
    store.write(SAVE_KEY, this.state);
  }
  /* ----- scene objects ----- */
  addW(o) {
    this.world.add(o);
    return o;
  }
  addU(o) {
    this.ui.add(o);
    return o;
  }
  buildWorld() {
    const s = this.s;
    this.addW(s.add.image(0, 0, "farm-ground").setOrigin(0).setDepth(-10));
    this.objects = [];
    for (const o of this.map.statics) {
      const img = this.addW(s.add.image(o.x, o.y, o.tex).setOrigin(0.5, 1).setDepth(o.y));
      if (o.kind) this.objects.push({ kind: o.kind, rect: o.rect, hit: img.getBounds() });
    }
    const label = (x, y, v) => this.addW(text(s, x, y, v, 17, "#fff7d1").setDepth(7000));
    label(9.5 * T, 58, "Dükkân");
    label(15.5 * T, 96, "Kuyu");
    label(21.5 * T, 640, "Pazar");
    label(22 * T, 270, "Kümes");
    label(11.5 * T, 378, "Tohum");
    this.groundFx = this.addW(s.add.graphics().setDepth(2));
    this.topFx = this.addW(s.add.graphics().setDepth(6000));
    this.plots = PLOTS.map(([c, r], i) => {
      const x = (c + 0.5) * T,
        y = (r + 0.5) * T;
      return {
        kind: "plot",
        i,
        rect: R(c, r),
        hit: { x: c * T, y: r * T - 18, width: T, height: T + 18 },
        soil: this.addW(s.add.image(x, y, "soil").setDepth(1)),
        crop: this.addW(s.add.image(x, (r + 1) * T - 5, "crop-0").setOrigin(0.5, 1).setDepth((r + 1) * T - 5).setVisible(false)),
        icon: this.addW(s.add.image(x, r * T - 4, "i-drop").setScale(0.6).setDepth(6500).setVisible(false)),
        lock: this.addW(s.add.image(x, y - 6, "lock").setDepth(6400)),
        price: this.addW(text(s, x, y + 13, "", 15, "#ffe58a").setDepth(6400)),
        stage: -1,
      };
    });
    this.shadow = this.addW(s.add.ellipse(0, 0, 26, 9, 0x000000, 0.22).setDepth(3));
    this.player = this.addW(s.add.image(0, 0, "f-d0").setOrigin(0.5, 0.94));
    this.prompt = this.addW(
      s.add
        .text(0, 0, "", { fontFamily: "system-ui, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#17391f", backgroundColor: "#f4ffe0", padding: { x: 8, y: 4 } })
        .setOrigin(0.5, 1)
        .setDepth(8000)
        .setVisible(false),
    );
    this.ducks = [0, 1].map((k) => ({ k, spr: this.addW(s.add.image(0, 0, "duck").setDepth(POND.cy)) }));
    this.butterflies = Array.from({ length: 4 }, (_, i) => ({ x: 300 + i * 260, y: 200 + (i % 2) * 300, ph: i * 1.7, c: [0xffe066, 0xff8fb1, 0xffffff, 0xb197fc][i] }));
    this.chickens = [];
    this.eggs = [];
  }
  buildUI() {
    const s = this.s;
    this.night = this.addU(s.add.rectangle(0, 0, W, H, 0x0d1d4d, 0).setOrigin(0).setDepth(0));
    this.uiFx = this.addU(s.add.graphics().setDepth(5));
    this.card = this.addU(s.add.graphics().setDepth(10));
    this.cardKicker = this.addU(text(s, 28, 28, "", 14, "#c6f59a", "left").setDepth(11));
    this.cardText = this.addU(text(s, 28, 52, "", 19, "#ffffff", "left").setDepth(11));
    this.cardProg = this.addU(text(s, 0, 28, "", 14, "#ffe58a").setOrigin(1, 0.5).setDepth(11));
    this.panel = this.addU(s.add.graphics().setDepth(10));
    this.panelItems = ["coin", "drop", ...ITEMS].map((id) => ({
      id,
      icon: this.addU(s.add.image(0, 34, "i-" + id).setScale(0.75).setDepth(11)),
      label: this.addU(text(s, 0, 35, "", 18, "#ffffff", "left").setDepth(11)),
    }));
    this.seedBg = this.addU(s.add.graphics().setDepth(10));
    this.seedKicker = this.addU(text(s, 26, H - 92, "TOHUM", 13, "#c6f59a", "left").setDepth(11));
    this.seedIcons = CROP_IDS.map((id) => this.addU(s.add.image(0, 0, "i-" + id).setDepth(11).setVisible(false)));
    this.seedName = this.addU(text(s, 0, H - 50, "", 17, "#ffffff", "left").setDepth(11));
    this.toastBg = this.addU(s.add.graphics().setDepth(20));
    this.toastText = this.addU(text(s, W / 2, 112, "", 20, "#ffffff").setDepth(21).setVisible(false));
  }
  applyState() {
    const st = this.state;
    this.player.setPosition(st.px, st.py);
    for (const c of this.chickens) c.spr.destroy();
    for (const e of this.eggs) e.destroy();
    this.chickens = [];
    this.eggs = [];
    for (let i = 0; i < st.chickens; i++) this.addChicken();
    for (const [x, y] of st.eggs) this.eggs.push(this.addW(this.s.add.image(x, y, "egg").setOrigin(0.5, 1).setDepth(y)));
    this.plots.forEach((_, i) => this.updatePlot(i));
    this.path = null;
    this.pending = null;
  }
  addChicken() {
    const x = PEN.x0 + Math.random() * (PEN.x1 - PEN.x0),
      y = PEN.y0 + Math.random() * (PEN.y1 - PEN.y0),
      spr = this.addW(this.s.add.image(x, y, "chick0").setOrigin(0.5, 1).setDepth(y));
    this.chickens.push({ kind: "chicken", spr, x, y, tx: x, ty: y, wait: Math.random() * 2, peck: 0, hop: 0 });
  }
  /* ----- host contract ----- */
  menu() {
    this.mode = "menu";
    this.path = null;
    this.save();
    const st = this.state,
      has = st.started;
    this.host.message("");
    this.host.overlay(
      "Mini Çiftlik",
      "Tohum ek, sula, hasat et ve pazarda sat. Görevleri bitir, çiftliğini büyüt!",
      has ? [["Çiftliğe devam et", () => this.start()], ["Yeni çiftlik", () => this.confirmReset()]] : [["Çiftliğe başla", () => this.start()]],
      `<div class="pg-options"><label>Zorluk<select id="pgFarmDifficulty">${Object.entries(DIFFICULTY)
        .map(([k, d]) => `<option value="${k}" ${k === this.difficulty ? "selected" : ""}>${d.label}</option>`)
        .join("")}</select></label></div><p class="pg-diff-help">Kolay: ürünler hızlı büyür, pazar çok öder · Zor: yavaş büyüme, düşük fiyat.</p>${
        has ? `<p class="farm-save">Kayıtlı çiftlik: ${st.day}. gün · ${st.coins} altın · ${Math.min(st.mission, MISSIONS.length)}/${MISSIONS.length} görev</p>` : ""
      }<p>Yürü: ok tuşları / WASD · Etkileşim: Boşluk / E<br>Dokunmatik: gitmek istediğin yere dokun.</p>`,
    );
  }
  confirmReset() {
    this.host.overlay("Yeni çiftlik?", "Kayıtlı çiftliğin silinecek ve en baştan başlayacaksın.", [
      ["Evet, yeniden başla", () => {
        this.state = this.fresh();
        this.applyState();
        this.cam.centerOn(this.player.x, this.player.y);
        store.write(SAVE_KEY, this.state);
        this.start();
      }],
      ["Vazgeç", () => this.menu()],
    ]);
  }
  start() {
    const choice = this.host.q("#pgFarmDifficulty")?.value;
    if (DIFFICULTY[choice]) {
      this.difficulty = choice;
      store.write("farm-difficulty", choice);
    }
    this.d = DIFFICULTY[this.difficulty];
    const first = !this.state.started;
    this.state.started = true;
    this.mode = "playing";
    this.host.play();
    this.resume();
    this.refreshUI();
    this.save();
    const m = MISSIONS[this.state.mission];
    this.host.message(first ? "Tarlaya yürü ve Boşluk / E ile havuç ek. Dokunmatikte tarlaya dokun." : m ? m.hint : "Çiftliğini büyütmeye devam et!");
    this.messageT = 6;
    if (first) this.toast("Hoş geldin çiftçi! Önce havuç ek.");
  }
  restart() {
    this.menu();
  }
  pause() {
    this.save();
  }
  resume() {
    this.acc = 0;
    this.skip = true;
  }
  quality() {
    this.lowQ = this.host.quality === "low";
  }
  resize() {
    const w = this.host.q("#pgRender")?.clientWidth || W,
      small = w < 560,
      mid = w < 820;
    this.cam?.setZoom(small ? 1.45 : mid ? 1.2 : 1);
    // Bigger on-canvas UI on small screens so buttons stay easy to tap.
    this.us = small ? 1.6 : mid ? 1.25 : 1;
    this.uw = W / this.us;
    this.uh = H / this.us;
    this.uiCam?.setZoom(this.us);
    this.prompt?.setFontSize(small ? 24 : mid ? 19 : 16);
    this.floatSize = small ? 26 : mid ? 21 : 18;
    if (!this.night) return;
    this.night.setSize(this.uw, this.uh);
    this.seedKicker.setY(this.uh - 92);
    this.seedName.setY(this.uh - 50);
    this.toastText.setX(this.uw / 2);
    this.refreshUI();
  }
  input(key, down) {
    if (!down || this.mode !== "playing") return;
    if (key === "action") this.actionQueued = true;
    else {
      this.touchMode = false;
      this.path = null;
      this.pending = null;
    }
  }
  cancelInput() {}
  pointer(type, pos) {
    if (type !== "down" || this.mode !== "playing" || !pos) return;
    this.touchMode = true;
    if (this.uiTap(pos)) return;
    const wp = this.cam.getWorldPoint(pos.x, pos.y),
      x = wp.x,
      y = wp.y;
    const hit = this.hitTest(x, y);
    if (hit) {
      if (this.reach(hit) <= REACH + 4) {
        this.path = null;
        this.pending = null;
        this.faceTo(hit);
        this.interact(hit);
        return;
      }
      const path = this.findPath((c, r) => distRect((c + 0.5) * T, (r + 0.5) * T, this.rectOf(hit)) <= REACH);
      if (path) {
        this.path = path;
        this.pending = hit;
        this.marker = { x, y, life: 0.6 };
      } else this.toast("Oraya yol bulamadım.");
      return;
    }
    const egg = this.eggs.find((e) => Math.hypot(e.x - x, e.y - 8 - y) < 24);
    const gx = egg ? egg.x : x,
      gy = egg ? egg.y - 4 : y,
      gc = clamp(Math.floor(gx / T), 0, COLS - 1),
      gr = clamp(Math.floor(gy / T), 0, ROWS - 1),
      open = !this.map.solid[gr * COLS + gc];
    const path = this.findPath(open ? (c, r) => c === gc && r === gr : (c, r) => Math.abs(c - gc) <= 1 && Math.abs(r - gr) <= 1);
    if (!path) {
      this.toast("Oraya yol bulamadım.");
      return;
    }
    if (open && !this.blocked(gx, gy)) path.push({ x: gx, y: gy });
    this.path = path;
    this.pending = null;
    this.marker = { x: gx, y: gy, life: 0.6 };
  }
  destroy() {
    this.save();
    this.state = null;
    disposePhaser(this.game);
  }
  /* ----- helpers ----- */
  blocked(x, y) {
    const c0 = Math.floor((x - 10) / T),
      c1 = Math.floor((x + 10) / T),
      r0 = Math.floor((y - 7) / T),
      r1 = Math.floor((y + 7) / T);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) if (c < 0 || r < 0 || c >= COLS || r >= ROWS || this.map.solid[r * COLS + c]) return true;
    return false;
  }
  rectOf(o) {
    return o.kind === "chicken" ? { x: o.x - 13, y: o.y - 24, w: 26, h: 26 } : o.rect;
  }
  reach(o) {
    return distRect(this.player.x, this.player.y, this.rectOf(o));
  }
  faceTo(o) {
    const r = this.rectOf(o),
      dx = r.x + r.w / 2 - this.player.x,
      dy = r.y + r.h / 2 - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = { x: Math.sign(dx), y: 0 };
    else this.facing = { x: 0, y: Math.sign(dy) || 1 };
  }
  hitTest(x, y) {
    let best = null,
      area = Infinity;
    const test = (o, b) => {
      if (x >= b.x - 4 && x <= b.x + b.width + 4 && y >= b.y - 4 && y <= b.y + b.height + 4 && b.width * b.height < area) {
        best = o;
        area = b.width * b.height;
      }
    };
    for (const c of this.chickens) test(c, { x: c.x - 16, y: c.y - 30, width: 32, height: 32 });
    for (const p of this.plots) test(p, p.hit);
    for (const o of this.objects) test(o, o.hit);
    return best;
  }
  findPath(goal) {
    const sc = Math.floor(this.player.x / T),
      sr = Math.floor(this.player.y / T),
      N = COLS * ROWS,
      prev = new Int32Array(N).fill(-2),
      start = sr * COLS + sc,
      q = [start];
    prev[start] = -1;
    for (let head = 0; head < q.length; head++) {
      const cur = q[head],
        c = cur % COLS,
        r = (cur / COLS) | 0;
      if (goal(c, r)) {
        const out = [];
        for (let n = cur; n !== start; n = prev[n]) out.push({ x: ((n % COLS) + 0.5) * T, y: (((n / COLS) | 0) + 0.5) * T });
        return out.reverse();
      }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc,
          nr = r + dr,
          n = nr * COLS + nc;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || this.map.solid[n] || prev[n] !== -2) continue;
        prev[n] = cur;
        q.push(n);
      }
    }
    return null;
  }
  lineClear(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
    for (let i = 1; i <= n; i++) if (this.blocked(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }
  basket() {
    return ITEMS.reduce((n, k) => n + this.state.inv[k], 0);
  }
  plotPrice() {
    return 15 + 10 * this.state.bought;
  }
  sellPrice(id) {
    return Math.max(1, Math.round((id === "egg" ? EGG_PRICE : CROPS[id].price) * this.d.price));
  }
  needsWater(p) {
    return !!p.crop && p.p < 1 && (!p.w || (p.p >= 0.5 && !p.w2));
  }
  /* ----- update ----- */
  update(dt) {
    if (this.host.paused || !this.state) return;
    if (this.skip) {
      this.skip = false;
      dt = 0;
    }
    this.acc = Math.min(this.acc + dt, 0.1);
    let n = 0;
    while (this.acc + 1e-9 >= STEP && n++ < 6 && !this.host.paused) {
      this.step(STEP);
      this.acc -= STEP;
    }
    this.render(dt);
  }
  step(dt) {
    const st = this.state,
      keys = this.host.keys;
    this.time += dt;
    st.clock += dt;
    if (st.clock >= DAY) {
      st.clock -= DAY;
      st.day++;
      this.toast(`${st.day}. gün başladı! Günaydın!`);
    }
    if (this.messageT > 0 && (this.messageT -= dt) <= 0) this.host.message("");
    // movement
    let vx = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0),
      vy = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    const speed = st.boots ? 225 : 160;
    const p = this.player;
    if (vx || vy) {
      this.path = null;
      this.pending = null;
    } else if (this.path) {
      while (this.path.length > 1 && this.lineClear(p.x, p.y, this.path[1].x, this.path[1].y)) this.path.shift();
      const wp = this.path[0],
        dx = wp.x - p.x,
        dy = wp.y - p.y,
        d = Math.hypot(dx, dy);
      if (d < 3) {
        this.path.shift();
        if (!this.path.length) this.arrive();
      } else {
        vx = dx / d;
        vy = dy / d;
        if (d < speed * dt) {
          vx *= d / (speed * dt);
          vy *= d / (speed * dt);
        }
      }
    }
    const len = Math.hypot(vx, vy);
    this.moving = len > 0.01;
    if (this.moving) {
      if (len > 1) {
        vx /= len;
        vy /= len;
      }
      const ox = p.x,
        oy = p.y;
      this.move(vx * speed * dt, vy * speed * dt);
      if (Math.abs(vx) > Math.abs(vy) + 0.01) this.facing = { x: Math.sign(vx), y: 0 };
      else if (Math.abs(vy) > 0.01) this.facing = { x: 0, y: Math.sign(vy) };
      this.walkT += dt;
      if (this.path) {
        if (Math.hypot(p.x - ox, p.y - oy) < 0.2) this.stuck = (this.stuck || 0) + dt;
        else this.stuck = 0;
        if (this.stuck > 0.5) {
          this.path = null;
          this.pending = null;
          this.stuck = 0;
        }
      }
    }
    // focus + action
    this.focus = this.pickTarget();
    if (this.actionQueued) {
      this.actionQueued = false;
      this.path = null;
      this.pending = null;
      if (this.focus) this.interact(this.focus);
    }
    // crops
    st.plots.forEach((pl, i) => {
      if (!pl.crop || pl.p >= 1 || this.needsWater(pl)) return;
      pl.p = Math.min(1, pl.p + dt / (CROPS[pl.crop].grow * this.d.grow));
      if (!pl.w2 && pl.p >= 0.5) pl.p = 0.5;
      if (pl.p >= 1) {
        const o = this.plots[i];
        this.burst(o.soil.x, o.soil.y - 16, 8, [0xfff3a0, 0xffffff]);
      }
      this.updatePlot(i);
    });
    // chickens & eggs
    this.chickens.forEach((c, i) => {
      if (c.wait > 0) {
        c.wait -= dt;
        c.peck += dt;
      } else {
        const dx = c.tx - c.x,
          dy = c.ty - c.y,
          d = Math.hypot(dx, dy);
        if (d < 2) {
          c.wait = 1 + Math.random() * 2.5;
          c.tx = PEN.x0 + Math.random() * (PEN.x1 - PEN.x0);
          c.ty = PEN.y0 + Math.random() * (PEN.y1 - PEN.y0);
        } else {
          c.x += (dx / d) * 34 * dt;
          c.y += (dy / d) * 34 * dt;
          c.flip = dx < 0;
        }
      }
      c.hop = Math.max(0, c.hop - dt);
      st.eggT[i] = (st.eggT[i] ?? EGG_TIME) - dt;
      if (st.eggT[i] <= 0) {
        st.eggT[i] = EGG_TIME * this.d.egg * (0.8 + Math.random() * 0.4);
        if (st.eggs.length < MAX_EGGS) {
          const ex = Math.round(c.x),
            ey = Math.round(c.y - 2);
          st.eggs.push([ex, ey]);
          this.eggs.push(this.addW(this.s.add.image(ex, ey, "egg").setOrigin(0.5, 1).setDepth(ey)));
        }
      }
    });
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const e = this.eggs[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) < 20) {
        e.destroy();
        this.eggs.splice(i, 1);
        st.eggs.splice(i, 1);
        st.inv.egg++;
        this.host.audio.play("click");
        this.float(e.x, e.y - 20, "+1 yumurta", "#fff4dc");
        this.fly("egg", e.x, e.y - 10);
        this.event("egg");
        this.refreshUI();
      }
    }
    // effects
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += (q.g ?? 260) * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const f of this.floats) {
      f.life -= dt;
      f.obj.y -= 38 * dt;
      f.obj.setAlpha(clamp(f.life / 0.4, 0, 1));
      if (f.life <= 0) f.obj.destroy();
    }
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const f of this.flyers) {
      f.t += dt / 0.7;
      const k = Math.min(1, f.t),
        e = k * k * (3 - 2 * k);
      f.obj.setPosition(f.x + (f.tx - f.x) * e, f.y + (f.ty - f.y) * e - Math.sin(k * Math.PI) * 60).setScale(1 - 0.4 * k);
      if (k >= 1) f.obj.destroy();
    }
    this.flyers = this.flyers.filter((f) => f.t < 1);
    if (this.marker && (this.marker.life -= dt) <= 0) this.marker = null;
    if (this.toastLife > 0) this.toastLife -= dt;
    this.saveT += dt;
    if (this.saveT > 4) {
      this.saveT = 0;
      this.save();
    }
  }
  move(dx, dy) {
    const p = this.player;
    if (dx) {
      if (!this.blocked(p.x + dx, p.y)) p.x += dx;
      else if (!dy) this.nudge("y", Math.abs(dx));
    }
    if (dy) {
      if (!this.blocked(p.x, p.y + dy)) p.y += dy;
      else if (!dx) this.nudge("x", Math.abs(dy));
    }
  }
  // Corner assist: slide gently toward the tile centre so gates and gaps are easy.
  nudge(axis, amount) {
    const p = this.player,
      center = (Math.floor(p[axis] / T) + 0.5) * T,
      diff = center - p[axis];
    if (Math.abs(diff) < 1 || Math.abs(diff) > 20) return;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), amount);
    if (axis === "x" ? !this.blocked(p.x + step, p.y) : !this.blocked(p.x, p.y + step)) p[axis] += step;
  }
  arrive() {
    this.path = null;
    const o = this.pending;
    this.pending = null;
    if (o && this.reach(o) <= REACH + 8) {
      this.faceTo(o);
      this.interact(o);
    }
  }
  pickTarget() {
    const p = this.player,
      px = p.x + this.facing.x * 22,
      py = p.y + this.facing.y * 22;
    let best = null,
      bd = 26;
    const test = (o) => {
      const d = distRect(px, py, this.rectOf(o));
      if (d < bd) {
        bd = d;
        best = o;
      }
    };
    this.plots.forEach(test);
    this.objects.forEach(test);
    this.chickens.forEach(test);
    return best;
  }
  /* ----- interactions ----- */
  verb(o) {
    const st = this.state;
    switch (o.kind) {
      case "plot": {
        const p = st.plots[o.i];
        if (!p.open) return `Tarla aç: ${this.plotPrice()} altın`;
        if (!p.crop) {
          const c = CROPS[st.seed];
          return `Ek: ${c.name}${c.seed ? ` (${c.seed} altın)` : ""}`;
        }
        if (p.p >= 1) return "Hasat et";
        if (this.needsWater(p)) return "Sula";
        return `Büyüyor %${Math.floor(p.p * 100)}`;
      }
      case "well":
        return st.water < st.cap ? "Su doldur" : "Kova dolu";
      case "shop":
        return "Dükkânı aç";
      case "market":
        return this.basket() ? `Sat (${this.basket()})` : "Pazar";
      case "crate":
        return "Tohum değiştir";
      case "coop":
        return "Kümes";
      case "house":
        return "Ev";
      case "chicken":
        return "Tavuğu sev";
      case "scarecrow":
        return "Korkuluk";
    }
    return "";
  }
  interact(o) {
    const st = this.state,
      a = this.host.audio;
    switch (o.kind) {
      case "plot":
        this.plotAction(o.i);
        break;
      case "well":
        if (st.water >= st.cap) this.toast("Kovan zaten dolu.");
        else {
          st.water = st.cap;
          a.play("whoosh");
          this.burst(15.5 * T, 3.6 * T, 14, [0x6cc4f0, 0xbfe3ff, 0xffffff], -160);
          this.float(15.5 * T, 2.6 * T, "Kova doldu!", "#bfe3ff");
        }
        break;
      case "shop":
        this.openShop();
        break;
      case "market":
        this.sell();
        break;
      case "crate": {
        if (st.crops.length < 2) {
          this.toast("Şimdilik sadece havuç var. Dükkândan yeni tohum al!");
          break;
        }
        this.selectSeed(st.crops[(st.crops.indexOf(st.seed) + 1) % st.crops.length]);
        break;
      }
      case "coop":
        this.toast(`${this.chickens.length} tavuğun var. Kümese girip yumurtaları topla!`);
        break;
      case "house":
        this.save();
        a.play("click");
        this.toast("Çiftliğin kaydedildi. Ev, tatlı ev!");
        break;
      case "chicken":
        o.hop = 0.35;
        a.play("pass");
        this.float(o.x, o.y - 34, "Gıt gıdak!", "#ffffff");
        break;
      case "scarecrow":
        this.toast("Korkuluk kargaları tarladan uzak tutuyor!");
        break;
    }
    this.refreshUI();
  }
  selectSeed(id) {
    this.state.seed = id;
    this.host.audio.play("click");
    this.toast(`Seçili tohum: ${CROPS[id].name}`);
    this.refreshUI();
  }
  plotAction(i) {
    const st = this.state,
      p = st.plots[i],
      o = this.plots[i],
      a = this.host.audio,
      x = o.soil.x,
      y = o.soil.y;
    if (!p.open) {
      const price = this.plotPrice();
      if (st.coins < price) {
        a.play("hit", 0.4);
        this.toast(`Bu tarla için ${price} altın gerekli.`);
        return;
      }
      st.coins -= price;
      st.bought++;
      p.open = true;
      a.play("post");
      this.burst(x, y, 16, [0xfff3a0, 0x8fd65a, 0xffffff], -140);
      this.float(x, y - 24, "Yeni tarla!", "#c6f59a");
      this.event("plot");
    } else if (!p.crop) {
      const c = CROPS[st.seed];
      if (st.coins < c.seed) {
        a.play("hit", 0.4);
        this.toast(`${c.name} tohumu ${c.seed} altın. Havuç tohumu bedava!`);
        return;
      }
      st.coins -= c.seed;
      Object.assign(p, { crop: st.seed, p: 0, w: 0, w2: 0 });
      a.play("land", 0.6);
      this.burst(x, y + 6, 10, [0x8a5a2a, 0xb98a55]);
      this.float(x, y - 24, `${c.name} ekildi`, "#fff7d1");
      if (st.mission === 0 && !st.prog) this.toast("Şimdi Sula! Su damlası olan tarlayı sula.");
    } else if (p.p >= 1) {
      st.inv[p.crop]++;
      const id = p.crop;
      Object.assign(p, { crop: null, p: 0, w: 0, w2: 0 });
      a.play("pass");
      this.burst(x, y - 10, 14, [0x8fd65a, 0x6cc04a, 0xfff3a0], -170);
      this.float(x, y - 30, `+1 ${CROPS[id].name}`, "#c6f59a");
      this.fly(id, x, y - 10);
      this.event("harvest", id);
      if (st.mission === 1 && this.basket() === 1) this.toast("Ürünlerini pazarda satabilirsin!");
    } else if (this.needsWater(p)) {
      if (st.water <= 0) {
        a.play("hit", 0.4);
        this.toast("Kovan boş! Kuyudan su doldur.");
        return;
      }
      st.water--;
      if (!p.w) p.w = 1;
      else p.w2 = 1;
      a.play("whoosh", 0.7);
      this.burst(x, y - 6, 12, [0x6cc4f0, 0xbfe3ff], -60);
    } else {
      this.toast(`${CROPS[p.crop].name} büyüyor: %${Math.floor(p.p * 100)}`);
      return;
    }
    this.plots.forEach((_, k) => this.updatePlot(k));
    this.save();
  }
  setTex(img, key) {
    if (img.texture.key !== key) img.setTexture(key);
  }
  updatePlot(i) {
    const p = this.state.plots[i],
      o = this.plots[i];
    o.lock.setVisible(!p.open);
    o.price.setVisible(!p.open);
    if (!p.open) {
      this.setTex(o.soil, "plot-locked");
      o.crop.setVisible(false);
      o.icon.setVisible(false);
      o.price.setText(String(this.plotPrice()));
      return;
    }
    const thirsty = this.needsWater(p);
    this.setTex(o.soil, p.crop && p.w && !thirsty ? "soil-wet" : "soil");
    const stage = !p.crop ? -1 : p.p >= 1 ? 4 : !p.w && p.p === 0 ? 0 : p.p < 0.3 ? 1 : p.p < 0.7 ? 2 : 3;
    if (stage !== o.stage) {
      o.stage = stage;
      o.crop.setVisible(stage >= 0);
      if (stage >= 0) o.crop.setTexture(stage < 2 ? "crop-" + stage : `${p.crop}-${stage}`);
    }
    o.icon.setVisible(thirsty || p.p >= 1);
    if (o.icon.visible) {
      this.setTex(o.icon, thirsty ? "i-drop" : "spark");
      o.icon.setScale(thirsty ? 0.6 : 1);
    }
  }
  sell() {
    const st = this.state,
      n = this.basket();
    if (!n) {
      this.toast("Sepetin boş. Önce hasat et ya da yumurta topla.");
      return;
    }
    let sum = 0;
    for (const k of ITEMS) {
      sum += st.inv[k] * this.sellPrice(k);
      st.inv[k] = 0;
    }
    st.coins += sum;
    st.earned += sum;
    this.host.audio.play("post");
    this.burst(21.5 * T, 13.6 * T, this.lowQ ? 8 : 22, [0xf8cd45, 0xffe58a, 0xffffff], -220);
    this.float(21.5 * T, 13 * T, `+${sum} altın`, "#ffe58a");
    this.toast(`${n} ürün sattın: +${sum} altın`);
    this.event("earn", sum);
    this.save();
  }
  event(type, data) {
    const st = this.state,
      m = MISSIONS[st.mission];
    if (!m || m.type !== type || (type === "harvest" && m.crop !== data)) return;
    st.prog += type === "earn" ? data : 1;
    if (st.prog >= m.goal) this.completeMission();
    this.refreshUI();
  }
  completeMission() {
    const st = this.state,
      idx = st.mission,
      m = MISSIONS[idx],
      last = idx === MISSIONS.length - 1;
    st.coins += m.reward;
    st.mission++;
    st.prog = 0;
    this.host.audio.play("win");
    const p = this.player;
    this.burst(p.x, p.y - 30, this.lowQ ? 10 : 30, [0xffe066, 0xff8fb1, 0x8fd65a, 0x6cc4f0, 0xffffff], -260);
    this.checkInstant();
    this.save();
    this.refreshUI();
    const next = MISSIONS[st.mission];
    if (idx === 0 || last) {
      this.mode = "celebrate";
      this.host.overlay(
        last ? "Bütün görevler tamam!" : "İlk görev tamam!",
        last
          ? `Harika bir çiftlik kurdun! Ödül: ${m.reward} altın. Şimdi serbestçe oynamaya devam edebilirsin.`
          : `“${m.text}” görevini bitirdin. Ödül: ${m.reward} altın.${next ? ` Sıradaki görev: ${next.text}.` : ""}`,
        [["Çiftliğe dön", () => this.backToFarm()]],
      );
      this.host.reward(last ? "farm-master" : "farm-win", `${st.day}. gün · ${st.coins} altın`);
    } else {
      this.toast(`Görev tamam! +${m.reward} altın ödül`, "#ffe066");
      this.float(p.x, p.y - 60, `+${m.reward} altın`, "#ffe58a");
    }
    this.host.message(next ? next.hint : "");
    this.messageT = next ? 5 : 0;
  }
  // Missions that are already satisfied when they become active finish at once.
  checkInstant() {
    const st = this.state,
      m = MISSIONS[st.mission];
    if (!m) return;
    const done =
      (m.type === "tool" && st.cap > 6 && st.boots) ||
      (m.type === "plot" && st.plots.every((p) => p.open));
    if (done) {
      st.prog = m.goal;
      this.completeMission();
    }
  }
  backToFarm() {
    this.mode = "playing";
    this.host.play();
    this.resume();
    this.refreshUI();
  }
  /* ----- shop ----- */
  shopItems() {
    const st = this.state,
      open = st.plots.filter((p) => p.open).length;
    const items = CROP_IDS.slice(1).map((id) => ({
      id,
      icon: CROPS[id].icon,
      name: `${CROPS[id].name} tohumu`,
      desc: `Ekim ${CROPS[id].seed} · Satış ${this.sellPrice(id)} altın`,
      price: CROPS[id].unlock,
      owned: st.crops.includes(id),
    }));
    items.push(
      { id: "can", icon: "💧", name: "Büyük kova", desc: "12 su taşır", price: 40, owned: st.cap > 6 },
      { id: "boots", icon: "👢", name: "Hızlı çizme", desc: "Daha hızlı yürü", price: 45, owned: st.boots },
      { id: "chicken", icon: "🐔", name: "Yeni tavuk", desc: `Daha çok yumurta (${st.chickens}/${MAX_CHICKENS})`, price: 30 + 10 * (st.chickens - 2), owned: st.chickens >= MAX_CHICKENS, done: "Kümes dolu" },
      { id: "plot", icon: "🌱", name: "Yeni tarla", desc: `${open}/${PLOTS.length} tarla açık`, price: this.plotPrice(), owned: open >= PLOTS.length, done: "Hepsi açık" },
    );
    return items;
  }
  openShop() {
    this.mode = "shop";
    this.path = null;
    this.pending = null;
    const st = this.state,
      items = this.shopItems();
    this.host.overlay(
      "Dükkân",
      `Altının: <b>${st.coins}</b>. Ne almak istersin?`,
      [["Çiftliğe dön", () => this.backToFarm()]],
      `<div class="farm-shop">${items
        .map(
          (it) =>
            `<div class="farm-item${it.owned ? " owned" : ""}"><span class="farm-ico" aria-hidden="true">${it.icon}</span><div><b>${it.name}</b><small>${it.desc}</small></div><button data-farm-buy="${it.id}" ${it.owned || it.price > st.coins ? "disabled" : ""}>${it.owned ? it.done || "Alındı" : it.price + " altın"}</button></div>`,
        )
        .join("")}</div>`,
    );
    this.host.q("#pgOverlay").querySelectorAll("[data-farm-buy]").forEach((b) => {
      b.onclick = () => {
        this.host.audio.unlock();
        this.buy(b.dataset.farmBuy);
        this.openShop();
        this.host.q(`[data-farm-buy="${b.dataset.farmBuy}"]`)?.focus();
      };
    });
  }
  buy(id) {
    const st = this.state,
      it = this.shopItems().find((x) => x.id === id);
    if (!it || it.owned || st.coins < it.price) return;
    st.coins -= it.price;
    this.host.audio.play("post");
    if (CROPS[id]) {
      st.crops.push(id);
      st.seed = id;
    } else if (id === "can") {
      st.cap = 12;
      st.water = 12;
      this.event("tool");
    } else if (id === "boots") {
      st.boots = true;
      this.event("tool");
    } else if (id === "chicken") {
      st.chickens++;
      st.eggT.push(EGG_TIME * 0.5);
      this.addChicken();
    } else if (id === "plot") {
      const i = st.plots.findIndex((p) => !p.open);
      st.plots[i].open = true;
      st.bought++;
      this.event("plot");
    }
    this.plots.forEach((_, i) => this.updatePlot(i));
    this.save();
    this.refreshUI();
  }
  /* ----- feedback ----- */
  toast(msg, color = "#ffffff") {
    this.toastText.setText(msg).setColor(color).setVisible(true);
    this.toastLife = 2.8;
    this.host.status(msg);
  }
  float(x, y, msg, color) {
    const obj = this.addW(text(this.s, x, y, msg, this.floatSize || 18, color).setDepth(7500));
    this.floats.push({ obj, life: 1.3 });
  }
  fly(id, wx, wy) {
    const v = this.cam.worldView,
      z = this.cam.zoom / this.us,
      x = (wx - v.x) * z,
      y = (wy - v.y) * z;
    const target = this.panelItems.find((p) => p.id === id),
      obj = this.addU(this.s.add.image(x, y, "i-" + id).setDepth(30));
    this.flyers.push({ obj, x, y, tx: target?.icon.visible ? target.icon.x : this.uw - 60, ty: target?.icon.visible ? target.icon.y : 34, t: 0 });
  }
  burst(x, y, n, colors, up = -120) {
    if (this.lowQ) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 40 + Math.random() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 + up * Math.random(), life: 0.5 + Math.random() * 0.5, c: colors[i % colors.length], r: 2 + Math.random() * 2.5 });
    }
  }
  uiTap(screen) {
    const st = this.state,
      pos = { x: screen.x / this.us, y: screen.y / this.us };
    for (let i = 0; i < st.crops.length; i++) {
      const icon = this.seedIcons[CROP_IDS.indexOf(st.crops[i])];
      if (icon.visible && Math.abs(pos.x - icon.x) < 32 && Math.abs(pos.y - icon.y) < 32) {
        this.selectSeed(st.crops[i]);
        return true;
      }
    }
    if (pos.x < this.cardW + 14 && pos.y < 86) {
      const m = MISSIONS[st.mission];
      this.toast(m ? m.hint : "Tüm görevler tamam!");
      return true;
    }
    return false;
  }
  /* ----- drawing ----- */
  refreshUI() {
    const st = this.state;
    if (!st) return;
    // mission card
    const m = MISSIONS[st.mission];
    this.cardKicker.setText(m ? `GÖREV ${st.mission + 1}/${MISSIONS.length}` : "SERBEST OYUN");
    this.cardText.setText(m ? m.text : "Tüm görevler tamam!");
    const prog = m ? `${Math.min(st.prog, m.goal)}/${m.goal}` : "★";
    this.cardProg.setText(prog);
    const cw = Math.max(280, this.cardText.width + 40, this.cardKicker.width + this.cardProg.width + 60);
    this.cardW = cw;
    this.cardProg.setX(14 + cw - 14);
    this.card.clear();
    this.card.fillStyle(0x0f2a1c, 0.84);
    this.card.fillRoundedRect(14, 12, cw, 72, 14);
    this.card.lineStyle(2, 0x8fd65a, 0.8);
    this.card.strokeRoundedRect(14, 12, cw, 72, 14);
    this.card.fillStyle(0x2c4a35);
    this.card.fillRoundedRect(28, 68, cw - 28, 6, 3);
    this.card.fillStyle(0x8fd65a);
    this.card.fillRoundedRect(28, 68, Math.max(6, (cw - 28) * (m ? Math.min(1, st.prog / m.goal) : 1)), 6, 3);
    // top-right panel
    const vals = { coin: st.coins, drop: `${st.water}/${st.cap}` };
    for (const k of ITEMS) vals[k] = st.inv[k] || 0;
    const uw = this.uw,
      uh = this.uh,
      maxW = uw - 26 - (14 + cw + 12),
      rows = [[]];
    let rowW = 0;
    this.panel.clear();
    this.panel.fillStyle(0x0f2a1c, 0.84);
    for (const it of this.panelItems) {
      const show = it.id === "coin" || it.id === "drop" || vals[it.id] > 0;
      it.icon.setVisible(show);
      it.label.setVisible(show);
      if (!show) continue;
      it.label.setText(String(vals[it.id])).setColor(it.id === "drop" && !st.water ? "#ffb0a1" : "#ffffff");
      const w = it.label.width + 42;
      if (rowW + w > maxW && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push(it);
      rowW += w;
    }
    rows.forEach((row, r) => {
      const y = 34 + r * 50,
        width = row.reduce((n, it) => n + it.label.width + 42, 0);
      let x = uw - 26 - width + 42;
      this.panel.fillRoundedRect(x - 42 + 4, 12 + r * 50, width + 4, 46, 14);
      for (const it of row) {
        it.icon.setPosition(x - 16, y);
        it.label.setPosition(x, y + 1);
        x += it.label.width + 42;
      }
    });
    // seed toolbar
    this.seedIcons.forEach((ic) => ic.setVisible(false));
    this.seedBg.clear();
    this.seedBg.fillStyle(0x0f2a1c, 0.84);
    const n = st.crops.length,
      bw = Math.max(80 + (n - 1) * 64, this.seedKicker.setText("TOHUM · " + CROPS[st.seed].name.toLocaleUpperCase("tr-TR")).width + 28);
    this.seedBg.fillRoundedRect(14, uh - 106, bw, 92, 14);
    st.crops.forEach((id, i) => {
      const ic = this.seedIcons[CROP_IDS.indexOf(id)],
        cx = 54 + i * 64,
        cy = uh - 50;
      ic.setPosition(cx, cy).setVisible(true).setScale(1.1);
      this.seedBg.fillStyle(id === st.seed ? 0x8fd65a : 0x2c4a35, id === st.seed ? 0.95 : 1);
      this.seedBg.fillRoundedRect(cx - 28, cy - 28, 56, 56, 10);
      if (id === st.seed) {
        this.seedBg.lineStyle(3, 0xffffff);
        this.seedBg.strokeRoundedRect(cx - 28, cy - 28, 56, 56, 10);
      }
    });
    this.seedName.setVisible(false);
    this.hud();
    const status = m ? `Görev: ${m.text} (${Math.min(st.prog, m.goal)}/${m.goal})` : "Tüm görevler tamam! Serbest oyun.";
    if (this.lastStatus !== status && this.toastLife <= 0) {
      this.lastStatus = status;
      this.host.status(status);
    }
  }
  hud() {
    const st = this.state;
    this.host.hud([
      ["Altın", st.coins],
      ["Su", `${st.water}/${st.cap}`],
      ["Sepet", this.basket()],
      ["Görev", st.mission >= MISSIONS.length ? "Bitti" : `${st.mission + 1}/${MISSIONS.length}`],
      ["Gün", st.day],
    ]);
  }
  render(dt) {
    const st = this.state,
      p = this.player,
      t = this.time;
    // player
    const view = this.facing.y < 0 ? "u" : this.facing.x ? "s" : "d",
      frame = this.moving ? Math.floor(this.walkT / 0.14) % 2 : 0;
    p.setTexture(`f-${view}${frame}`).setFlipX(this.facing.x < 0).setDepth(p.y);
    p.setScale(1, this.moving ? 1 : 1 + Math.sin(t * 3) * 0.015);
    this.shadow.setPosition(p.x, p.y);
    // chickens, ducks, plot icons
    for (const c of this.chickens) c.spr.setPosition(c.x, c.y - Math.sin((c.hop / 0.35) * Math.PI) * 10).setDepth(c.y).setFlipX(!!c.flip).setTexture(c.wait > 0 && Math.floor(c.peck / 0.3) % 3 === 0 ? "chick1" : "chick0");
    for (const d of this.ducks) {
      const a = t * 0.35 + d.k * Math.PI,
        x = POND.cx + Math.cos(a) * POND.rx * (d.k ? 0.6 : 1),
        y = POND.cy + Math.sin(a) * POND.ry * (d.k ? 0.7 : 1);
      d.spr.setPosition(x, y + Math.sin(t * 4 + d.k) * 1.2).setFlipX(Math.sin(a) > 0);
    }
    this.plots.forEach((o, i) => {
      if (o.icon.visible) o.icon.setPosition(o.rect.x + T - 9, o.rect.y + 9 + Math.sin(t * 4 + i) * 3);
    });
    // ground fx: pond shimmer, focus outline, tap marker
    const g = this.groundFx;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.35);
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.25 + i * 0.25) % 1;
      g.strokeEllipse(2.6 * T + i * 40, 12 * T + (i % 2) * 50, 18 + k * 30, 6 + k * 8);
    }
    const f = this.mode === "playing" ? this.focus : null;
    if (f?.kind === "plot") {
      g.lineStyle(3, 0xffffff, 0.55 + Math.sin(t * 6) * 0.3);
      g.strokeRoundedRect(f.rect.x + 3, f.rect.y + 3, T - 6, T - 6, 8);
    }
    if (this.marker) {
      g.lineStyle(3, 0xffffff, this.marker.life / 0.6);
      g.strokeEllipse(this.marker.x, this.marker.y, 30 - this.marker.life * 20, 12 - this.marker.life * 6);
    }
    // top fx: progress bars, particles, butterflies, fireflies
    const top = this.topFx;
    top.clear();
    st.plots.forEach((pl, i) => {
      if (!pl.crop || pl.p >= 1 || this.needsWater(pl) || pl.p <= 0) return;
      const r = this.plots[i].rect;
      top.fillStyle(0x0f2a1c, 0.8);
      top.fillRoundedRect(r.x + 6, r.y + T - 8, T - 12, 6, 3);
      top.fillStyle(0x8fd65a);
      top.fillRoundedRect(r.x + 7, r.y + T - 7, (T - 14) * pl.p, 4, 2);
    });
    for (const q of this.particles) {
      top.fillStyle(q.c, clamp(q.life * 2, 0, 1));
      top.fillCircle(q.x, q.y, q.r);
    }
    const light = this.nightAmount();
    if (!this.lowQ) {
      if (light < 0.5)
        for (const b of this.butterflies) {
          const bx = b.x + Math.sin(t * 0.4 + b.ph) * 120,
            by = b.y + Math.sin(t * 0.9 + b.ph * 2) * 40,
            wing = 3 + Math.abs(Math.sin(t * 12 + b.ph)) * 4;
          top.fillStyle(b.c, 0.95);
          top.fillEllipse(bx - 3, by, wing, 6);
          top.fillEllipse(bx + 3, by, wing, 6);
        }
      else
        for (let i = 0; i < 14; i++) {
          const fx = ((i * 211 + Math.sin(t * 0.3 + i) * 60) % WW + WW) % WW,
            fy = 120 + ((i * 137) % (WH - 200)) + Math.sin(t * 0.7 + i * 2) * 20;
          top.fillStyle(0xfff59a, light * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))));
          top.fillCircle(fx, fy, 2.4);
        }
    }
    // prompt
    if (f) {
      const r = this.rectOf(f);
      this.prompt.setText((this.touchMode ? "" : "Boşluk: ") + this.verb(f)).setPosition(r.x + r.w / 2, r.y - (f.kind === "plot" ? 16 : 6)).setVisible(true);
    } else this.prompt.setVisible(false);
    // ui: night tint, toast, guide arrow
    this.night.setFillStyle(0x0d1d4d, light * 0.34);
    if (this.toastLife > 0) {
      const a = clamp(this.toastLife / 0.4, 0, 1),
        w = this.toastText.width + 36;
      this.toastText.setAlpha(a);
      this.toastBg.clear();
      this.toastBg.fillStyle(0x0f2a1c, 0.88 * a);
      this.toastBg.fillRoundedRect(this.uw / 2 - w / 2, 92, w, 40, 12);
    } else if (this.toastText.visible) {
      this.toastText.setVisible(false);
      this.toastBg.clear();
      this.lastStatus = "";
      this.refreshUI();
    }
    this.drawGuide(t);
    this.hudT += dt;
    if (this.hudT > 0.25) {
      this.hudT = 0;
      this.hud();
    }
  }
  nightAmount() {
    const k = this.state.clock / DAY;
    if (k < 0.62) return 0;
    if (k < 0.75) return (k - 0.62) / 0.13;
    if (k < 0.9) return 1;
    return 1 - (k - 0.9) / 0.1;
  }
  // Points to the well when the bucket is empty, or to the market with a full basket.
  drawGuide(t) {
    const st = this.state,
      g = this.uiFx;
    g.clear();
    if (this.mode !== "playing") return;
    let target = null;
    if (!st.water && st.plots.some((p) => this.needsWater(p))) target = { x: 15.5 * T, y: 3.5 * T };
    else if (this.basket() >= 4 || (this.basket() && MISSIONS[st.mission]?.type === "earn")) target = { x: 21.5 * T, y: 14.5 * T };
    if (!target) return;
    const v = this.cam.worldView,
      z = this.cam.zoom / this.us,
      uw = this.uw,
      uh = this.uh,
      sx = (target.x - v.x) * z,
      sy = (target.y - v.y) * z;
    if (sx > 30 && sx < uw - 30 && sy > 100 && sy < uh - 30) return;
    const ax = clamp(sx, 40, uw - 40),
      ay = clamp(sy, 110, uh - 130),
      ang = Math.atan2(sy - ay, sx - ax),
      bob = Math.sin(t * 6) * 4,
      cx = ax + Math.cos(ang) * bob,
      cy = ay + Math.sin(ang) * bob;
    const pt = (d, a) => ({ x: cx + Math.cos(ang + a) * d, y: cy + Math.sin(ang + a) * d });
    g.fillStyle(0x0f2a1c, 0.75);
    g.fillCircle(cx, cy, 24);
    g.fillStyle(0xffe066);
    g.fillPoints([pt(18, 0), pt(14, 2.4), pt(4, Math.PI), pt(14, -2.4)], true);
  }
}
