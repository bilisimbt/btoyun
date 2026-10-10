import {
  W,
  H,
  assets,
  loadPhaser,
  disposePhaser,
  clamp,
  lerp,
  store,
  text,
} from "./core.js";
import { DRIVE_LEVELS, ZONES } from "./levels.js";
// Difficulty changes engine power, air control, how long the truck may lie on
// its roof, the star times and (for Usta) a time limit per course.
const DIFFICULTY = {
  easy: { label: "Kolay", torque: 1.2, air: 2.2, flip: 2.4, star: 1.3, limit: 0 },
  normal: { label: "Normal", torque: 1, air: 1, flip: 1.4, star: 1, limit: 0 },
  hard: { label: "Usta", torque: 0.92, air: 0.7, flip: 0.85, star: 0.85, limit: 2.6 },
};
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
      backgroundColor: "#173c64",
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false },
      render: { antialias: true },
      scene: {
        preload() {
          this.load.image("truck", assets + "truck.webp");
          this.load.image("landscape", assets + "drive-landscape.webp");
          this.load.on("loaderror", () =>
            reject(Error("Araç görseli yüklenemedi.")),
          );
        },
        create() {
          resolve(new Drive(host, this, engine, Phaser.Physics.Matter.Matter));
        },
        update(time, delta) {
          this.controller?.update(Math.min(delta / 1000, 0.075));
        },
      },
    });
  });
}
class Drive {
  constructor(host, scene, game, M) {
    this.host = host;
    this.s = scene;
    this.game = game;
    this.M = M;
    scene.controller = this;
    this.level = 0;
    this.difficulty = store.read("drive-difficulty", "normal");
    if (!DIFFICULTY[this.difficulty]) this.difficulty = "normal";
    this.coins = [];
    this.elapsed = 0;
    this.time = 0;
    this.accumulator = 0;
    this.mode = "menu";
    this.particles = [];
    this.camera = 0;
    this.soundTick = 0;
    this.grounded = false;
    this.engine = M.Engine.create({
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 8,
      constraintIterations: 5,
    });
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = 0.001;
    const texture = scene.textures.get("truck"),
      source = texture.source[0];
    texture.add("body", 0, 0, 0, source.width, Math.round(source.height * 0.5));
    texture.add(
      "wheel",
      0,
      Math.round(source.width * 0.05),
      Math.round(source.height * 0.45),
      Math.round(source.width * 0.31),
      Math.round(source.width * 0.31),
    );
    this.landscape = scene.add
      .image(480, 250, "landscape")
      .setDisplaySize(1152, 680)
      .setScrollFactor(0);
    this.bg = scene.add.graphics().setScrollFactor(0);
    this.terrain = scene.add.graphics();
    this.worldFx = scene.add.graphics();
    this.fx = scene.add.graphics().setScrollFactor(0);
    this.shadow = scene.add.ellipse(0, 0, 170, 15, 0x000000, 0.25);
    this.bodySprite = scene.add
      .image(0, 0, "truck", "body")
      .setDisplaySize(220, 73)
      .setOrigin(0.5, 0.7)
      .setDepth(4);
    this.wheelSprites = [
      scene.add
        .image(0, 0, "truck", "wheel")
        .setDisplaySize(65, 65)
        .setDepth(3),
      scene.add
        .image(0, 0, "truck", "wheel")
        .setDisplaySize(65, 65)
        .setDepth(3),
    ];
    this.wheelMasks = this.wheelSprites.map((sprite) => {
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0xffffff);
      g.fillCircle(0, 0, 32);
      sprite.setMask(g.createGeometryMask());
      return g;
    });
    this.title = text(scene, 30, 35, "", 22, "#e7f4ff", "left").setScrollFactor(
      0,
    );
    this.counter = text(scene, 930, 35, "", 20, "#d9eaff")
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    this.createWorld(0);
    this.draw();
    this.hud();
    M.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const carWheel =
          [this.rear, this.front].includes(pair.bodyA) ||
          [this.rear, this.front].includes(pair.bodyB);
        const road = pair.bodyA.label === "road" || pair.bodyB.label === "road";
        if (carWheel && road && Math.abs(this.body.velocity.y) > 2.5) {
          this.host.audio.play(
            "land",
            clamp(Math.abs(this.body.velocity.y) / 9, 0.2, 1),
          );
          this.burst(this.body.position.x, this.body.position.y + 55, 12);
          if (!this.host.reduced) this.s.cameras.main.shake(80, 0.002);
        }
      }
    });
  }
  menu() {
    this.mode = "menu";
    this.host.message("");
    const unlocked = store.read("drive-unlocked", 1);
    this.host.overlay(
      "Denge Sürüşü",
      "Gaz ve frenle dengeyi koru. Rampaları ve hareketli köprüleri aş.",
      [["Seçili parkuru oyna", () => this.start(this.level)]],
      `<div class="pg-levels">${DRIVE_LEVELS.map((l, i) => `<button data-drive-level="${i}" ${i >= unlocked ? "disabled" : ""} class="${i === this.level ? "selected" : ""}" aria-label="${i + 1}. parkur ${l.name}">${i + 1}${store.read("drive-stars-" + i, 0) ? " ★" : ""}</button>`).join("")}</div><p id="pgLevelName">${this.level + 1}. ${DRIVE_LEVELS[this.level].name}</p><div class="pg-options"><label>Zorluk<select id="pgDriveDifficulty">${Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}" ${k === this.difficulty ? "selected" : ""}>${d.label}</option>`).join("")}</select></label></div><p>Sağ: gaz · Sol: fren / geri · Her parkurda 8 altın topla. Yoldaki bayraklar kontrol noktasıdır.<br>Kolay: güçlü motor ve havada kolay denge · Usta: süre sınırı ve hassas denge.</p>`,
    );
    document.querySelectorAll("[data-drive-level]").forEach(
      (b) =>
        (b.onclick = () => {
          this.level = Number(b.dataset.driveLevel);
          document
            .querySelectorAll("[data-drive-level]")
            .forEach((x) => x.classList.toggle("selected", x === b));
          document.querySelector("#pgLevelName").textContent =
            this.level + 1 + ". " + DRIVE_LEVELS[this.level].name;
        }),
    );
  }
  restart() {
    if (this.mode === "menu") this.menu();
    else this.start(this.level);
  }
  start(level, saved = null) {
    const choice = document.querySelector("#pgDriveDifficulty")?.value;
    if (DIFFICULTY[choice]) {
      this.difficulty = choice;
      store.write("drive-difficulty", choice);
    }
    this.d = DIFFICULTY[this.difficulty];
    this.createWorld(level);
    this.mode = "playing";
    this.elapsed = 0;
    if (saved) this.respawn(saved);
    this.accumulator = 0;
    this.flipTime = 0;
    this.host.play();
    this.host.message(DRIVE_LEVELS[level].hint);
    this.host.status(DRIVE_LEVELS[level].hint);
    this.hud();
  }
  createWorld(level) {
    const M = this.M;
    M.Composite.clear(this.engine.world, false);
    M.Engine.clear(this.engine);
    this.level = level;
    this.config = DRIVE_LEVELS[level];
    this.zone = ZONES[this.config.zone];
    this.roads = [];
    this.moves = [];
    this.particles = [];
    this.camera = 0;
    this.accumulator = 0;
    this.flipTime = 0;
    this.time = 0;
    this.skipResumeFrame = false;
    this.config.road.forEach((seg, i) => {
      const [x1, y1, x2, y2] = seg,
        angle = Math.atan2(y2 - y1, x2 - x1),
        len = Math.hypot(x2 - x1, y2 - y1),
        ice = this.config.ice?.includes(i);
      const b = M.Bodies.rectangle(
        (x1 + x2) / 2 - Math.sin(angle) * 18,
        (y1 + y2) / 2 + Math.cos(angle) * 18,
        len + 3,
        36,
        { isStatic: true, angle, friction: ice ? 0.015 : 1.2, label: "road" },
      );
      M.Composite.add(this.engine.world, b);
      this.roads.push({ body: b, seg, ice });
    });
    for (const { x, y, w } of this.config.seesaw) {
      const
        b = M.Bodies.rectangle(x, y + 14, w, 28, {
          density: 0.004,
          friction: 1,
          label: "road",
          frictionAir: 0.02,
        }),
        anchor = M.Constraint.create({
          pointA: { x, y: y + 14 },
          bodyB: b,
          pointB: { x: 0, y: 0 },
          length: 0,
          stiffness: 1,
          damping: 0.15,
        });
      M.Composite.add(this.engine.world, [b, anchor]);
      this.moves.push({ type: "seesaw", body: b, x, y, w });
    }
    for (const { x, y, w, amplitude, period } of this.config.lift) {
      const b = M.Bodies.rectangle(x, y + 14, w, 28, {
          isStatic: true,
          friction: 1,
          label: "road",
        });
      M.Composite.add(this.engine.world, b);
      this.moves.push({ type: "lift", body: b, x, y, w, amplitude, period });
    }
    const group = M.Body.nextGroup(true);
    this.body = M.Bodies.rectangle(150, 350, 144, 44, {
      collisionFilter: { group },
      density: 0.006,
      friction: 0.7,
      frictionAir: 0.012,
      label: "chassis",
      chamfer: { radius: 8 },
    });
    this.rear = M.Bodies.circle(88, 390, 30, {
      collisionFilter: { group },
      density: 0.006,
      friction: 1.1,
      frictionStatic: 1.6,
      frictionAir: 0.012,
      restitution: 0.03,
      label: "wheel",
    });
    this.front = M.Bodies.circle(212, 390, 30, {
      collisionFilter: { group },
      density: 0.006,
      friction: 1.1,
      frictionStatic: 1.6,
      frictionAir: 0.012,
      restitution: 0.03,
      label: "wheel",
    });
    // Two struts locate each axle. A single strut lets the wheel orbit its mount
    // like a pendulum, which collapses the chassis even without player input.
    this.axles = [
      { x: -62, wheel: this.rear },
      { x: 62, wheel: this.front },
    ];
    const springs = this.axles.flatMap(({ x, wheel }) =>
      [-12, 12].map((offset) =>
        M.Constraint.create({
          bodyA: this.body,
          pointA: { x: x + offset, y: 24 },
          bodyB: wheel,
          pointB: { x: 0, y: 0 },
          length: 20,
          stiffness: 0.75,
          damping: 0.22,
        }),
      ),
    );
    M.Composite.add(this.engine.world, [
      this.body,
      this.rear,
      this.front,
      ...springs,
    ]);
    this.grounded = false;
    this.reverseReady = false;
    this.d = DIFFICULTY[this.difficulty];
    this.limit = this.d.limit ? Math.round((this.config.end / 220) * this.d.limit) : 0;
    this.coins = Array.from({ length: 8 }, (_, k) => (k + 0.5) / 8)
      .map((f) => this.roadPoint(this.config.end * f))
      .filter(Boolean)
      .map(({ x, y }) => ({ x, y: y - 95, taken: false }));
    this.coinCount = 0;
    this.checkpoint = null;
    this.title.setText(level + 1 + ". " + this.config.name);
    this.title.setColor("#f3eddf");
    this.s.cameras.main.setBackgroundColor(this.zone.sky);
    this.drawBackground();
    this.hud();
  }
  // Restarts from the checkpoint flag with the time and coins of that moment.
  respawn(saved) {
    const p = this.roadPoint(this.config.checks[saved.index]);
    if (!p) return;
    const dx = p.x - 150, dy = p.y - 420 - 30;
    for (const b of [this.body, this.rear, this.front]) {
      this.M.Body.translate(b, { x: dx, y: dy });
      this.M.Body.setVelocity(b, { x: 0, y: 0 });
    }
    this.time = saved.time;
    this.elapsed = saved.time;
    saved.taken.forEach((t, i) => (this.coins[i].taken = t));
    this.coinCount = saved.count;
    this.checkpoint = saved;
    this.camera = clamp(p.x - 300, 0, this.config.end - 500);
  }
  // Finds a solid, fixed road point near x so collectible coins never float over gaps.
  roadPoint(x) {
    for (let shift = 0; shift < 600; shift += 40)
      for (const dx of [shift, -shift]) {
        const seg = this.config.road.find(([x1, , x2]) => x + dx >= x1 + 30 && x + dx <= x2 - 30);
        if (seg) {
          const [x1, y1, x2, y2] = seg;
          return { x: x + dx, y: lerp(y1, y2, (x + dx - x1) / (x2 - x1)) };
        }
      }
    return null;
  }
  input(key, down) {
    if (key === "left" && down)
      this.reverseReady = Math.abs(this.body.velocity.x) < 0.45;
  }
  cancelInput() {}
  pause() {}
  resume() {
    this.accumulator = 0;
    this.skipResumeFrame = true;
  }
  update(dt) {
    if (this.host.paused) return;
    if (this.skipResumeFrame) {
      this.skipResumeFrame = false;
      dt = 0;
    }
    this.accumulator = Math.min(this.accumulator + dt, 0.1);
    let steps = 0;
    while (this.accumulator + 1e-9 >= 1 / 60 && steps++ < 6) {
      this.fixedStep();
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
    }
    this.elapsed = this.time;
    if (this.elapsed > 4 && this.mode === "playing") this.host.message("");
    this.draw(dt);
    if (this.mode !== "playing") return;
    this.hudTick = (this.hudTick || 0) + dt;
    if (this.hudTick > 0.12) {
      this.hudTick = 0;
      this.hud();
    }
    const { x, y } = this.body.position;
    if (x >= this.config.end && y < 520) {
      this.finish();
      return;
    }
    const next = this.checkpoint ? this.checkpoint.index + 1 : 0;
    if (next < this.config.checks.length && x >= this.config.checks[next] && y < 520) {
      this.checkpoint = { index: next, time: this.time, taken: this.coins.map((c) => c.taken), count: this.coinCount };
      this.host.audio.play("pass", 0.9);
      this.burst(this.config.checks[next], 300, 14);
      this.host.message(`KONTROL NOKTASI ${next + 1} / ${this.config.checks.length}`);
      this.messageUntil = this.elapsed + 2;
    }
    if (y > 780 || x < -180) {
      this.fail("Araç parkurdan düştü. Hızını ve iniş açını yeniden ayarla.");
      return;
    }
    const angle = Math.abs(
      Math.atan2(Math.sin(this.body.angle), Math.cos(this.body.angle)),
    );
    const touching = this.engine.pairs.list.some(
      (p) =>
        p.isActive &&
        ((p.bodyA === this.body && p.bodyB.label === "road") ||
          (p.bodyB === this.body && p.bodyA.label === "road")),
    );
    if (angle > Math.PI * 0.58 && touching) this.flipTime += dt;
    else this.flipTime = Math.max(0, this.flipTime - dt * 2);
    if (this.flipTime > this.d.flip)
      this.fail("Araç devrildi. Rampada gazı daha erken bırakmayı dene.");
    for (const c of this.coins) {
      if (c.taken || Math.hypot(c.x - x, c.y - y) > 80) continue;
      c.taken = true;
      this.coinCount++;
      this.host.audio.play("pass", 0.7);
      this.burst(c.x, c.y, 10);
      this.host.message(this.coinCount === this.coins.length ? "TÜM ALTINLAR TOPLANDI!" : `ALTIN ${this.coinCount} / ${this.coins.length}`);
      this.messageUntil = this.elapsed + 1.4;
    }
    if (this.messageUntil && this.elapsed > this.messageUntil) {
      this.messageUntil = 0;
      this.host.message("");
    }
    if (this.limit && this.elapsed > this.limit)
      this.fail(`Süre doldu (${this.limit} sn). Usta seviyede daha akıcı sürmeyi dene.`);
  }
  fixedStep() {
    const M = this.M;
    if (this.mode !== "playing") return;
    this.time += 1 / 60;
    for (const m of this.moves) {
      if (m.type === "lift") {
        const y =
          m.y +
          14 +
          Math.sin((this.time * Math.PI * 2) / m.period) * m.amplitude;
        M.Body.setPosition(m.body, { x: m.x, y }, true);
      } else {
        if (Math.abs(m.body.angle) > 0.16) {
          M.Body.setAngle(m.body, clamp(m.body.angle, -0.16, 0.16));
          M.Body.setAngularVelocity(m.body, 0);
        }
      }
    }
    this.grounded = this.engine.pairs.list.some(
      (p) =>
        p.isActive &&
        (([this.rear, this.front].includes(p.bodyA) &&
          p.bodyB.label === "road") ||
          ([this.rear, this.front].includes(p.bodyB) &&
            p.bodyA.label === "road")),
    );
    const gas = this.host.keys.has("right"),
      brake = this.host.keys.has("left"),
      forward = this.body.velocity.x;
    if (brake && Math.abs(forward) < 0.3) this.reverseReady = true;
    const braking = brake && (!this.reverseReady || gas),
      target = braking ? 0 : gas ? 0.3 * this.d.torque : brake ? -0.17 : null;
    // Wheel torque creates traction. Do not also push the chassis horizontally:
    // that bypasses tire friction and makes braking/ice behave inconsistently.
    if (target !== null) {
      for (const wheel of [this.rear, this.front])
        wheel.torque +=
          (target - wheel.angularVelocity) *
          wheel.inertia *
          (braking ? 0.0011 : 0.00045);
    }
    if (this.grounded) {
      if ((gas && !brake) || (brake && !braking)) {
        this.soundTick++;
        if (this.soundTick % 7 === 0) {
          this.host.audio.play(
            "engine",
            clamp(Math.abs(forward) / 8, 0.2, 0.8),
          );
          if (this.host.quality !== "low")
            this.burst(this.rear.position.x, this.rear.position.y + 26, 1);
        }
      }
    } else if (gas !== brake)
      this.body.torque += (gas ? 1 : -1) * 0.000002 * this.d.air * this.body.inertia;
    const previousX = this.body.position.x,
      previousY = this.body.position.y;
    M.Body.setAngularVelocity(
      this.body,
      clamp(this.body.angularVelocity, -0.07, 0.07),
    );
    M.Engine.update(this.engine, 1000 / 60);
    this.limitSuspension();
    // Tire circles and the iterative suspension solver can introduce tiny creep.
    // Settle only on stationary, flat ground; slopes and moving bridges stay free.
    if (
      !gas &&
      !brake &&
      Math.abs(forward) < 0.05 &&
      Math.abs(this.body.velocity.x) < 0.05 &&
      Math.abs(this.body.position.y - previousY) < 0.03 &&
      Math.abs(this.body.angle) < 0.02
    ) {
      const resting = [this.rear, this.front].every((w) =>
        this.engine.pairs.list.some((p) => {
          if (!p.isActive) return false;
          const road = p.bodyA === w ? p.bodyB : p.bodyB === w ? p.bodyA : null;
          return (
            road?.label === "road" &&
            road.isStatic &&
            Math.abs(road.angle) < 0.01 &&
            Math.hypot(road.velocity.x, road.velocity.y) < 0.001
          );
        }),
      );
      if (resting) {
        const dx = previousX - this.body.position.x;
        for (const b of [this.body, this.rear, this.front]) {
          M.Body.translate(b, { x: dx, y: 0 });
          M.Body.setVelocity(b, { x: 0, y: b.velocity.y });
          M.Body.setAngularVelocity(b, 0);
        }
      }
    }
  }
  limitSuspension() {
    const M = this.M,
      angle = this.body.angle,
      c = Math.cos(angle),
      s = Math.sin(angle);
    for (const axle of this.axles) {
      const wheel = axle.wheel,
        dx = wheel.position.x - this.body.position.x,
        dy = wheel.position.y - this.body.position.y,
        localX = dx * c + dy * s,
        localY = -dx * s + dy * c,
        x = clamp(localX, axle.x - 5, axle.x + 5),
        y = clamp(localY, 29, 51);
      if (x !== localX || y !== localY) {
        M.Body.setPosition(wheel, {
          x: this.body.position.x + x * c - y * s,
          y: this.body.position.y + x * s + y * c,
        });
        const rvx = wheel.velocity.x - this.body.velocity.x,
          rvy = wheel.velocity.y - this.body.velocity.y;
        const along = clamp(-rvx * s + rvy * c, -3, 3);
        M.Body.setVelocity(wheel, {
          x:
            this.body.velocity.x -
            along * s -
            this.body.angularVelocity * (x * s + y * c),
          y:
            this.body.velocity.y +
            along * c +
            this.body.angularVelocity * (x * c - y * s),
        });
      }
    }
  }
  drawBackground() {
    const g = this.bg;
    g.clear();
    g.fillStyle(this.zone.sky, this.config.zone === 0 ? 0.08 : 0.2);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x071b2c, 0.12);
    g.fillRect(0, 370, W, 170);
    this.landscape.setTint(
      this.config.zone === 2
        ? 0xffcdb7
        : this.config.zone === 1
          ? 0xbcd9ff
          : 0xffffff,
    );
  }
  draw(dt = 1 / 60) {
    const g = this.terrain;
    g.clear();
    const cam = clamp(this.body.position.x - 300, 0, this.config.end - 500);
    this.camera = lerp(
      this.camera,
      cam,
      1 - Math.exp(-dt * (this.host.reduced ? 10 : 5)),
    );
    this.s.cameras.main.setScroll(this.camera, 0);
    this.landscape.x = 480 - Math.sin(this.camera / 1600) * 70;
    for (const r of this.roads) {
      const [x1, y1, x2, y2] = r.seg;
      g.fillStyle(this.zone.ground);
      g.fillPoints(
        [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
          { x: x2, y: 720 },
          { x: x1, y: 720 },
        ],
        true,
      );
      g.fillStyle(0x182a36, 0.45);
      g.fillPoints(
        [
          { x: x1, y: y1 + 35 },
          { x: x2, y: y2 + 35 },
          { x: x2, y: 720 },
          { x: x1, y: 720 },
        ],
        true,
      );
      g.lineStyle(8, r.ice ? 0x9be4f7 : this.zone.edge, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(2, 0xffffff, 0.2);
      g.lineBetween(x1, y1 - 3, x2, y2 - 3);
      for (let x = Math.ceil(x1 / 60) * 60; x < x2; x += 60) {
        const y = lerp(y1, y2, (x - x1) / (x2 - x1));
        g.lineStyle(2, 0xfde3b2, 0.2);
        g.lineBetween(x, y + 18, x + 20, y + 25);
      }
    }
    for (const m of this.moves) {
      g.fillStyle(m.type === "lift" ? 0x5796aa : 0xb58b57);
      g.fillPoints(m.body.vertices, true);
      g.lineStyle(4, 0xe8c48b);
      g.strokePoints(m.body.vertices, true);
      if (m.type === "seesaw") {
        g.fillStyle(0x263747);
        g.fillTriangle(m.x - 25, m.y + 100, m.x + 25, m.y + 100, m.x, m.y + 20);
      } else {
        g.lineStyle(5, 0x425972);
        g.lineBetween(m.x - 120, m.y + 200, m.x - 120, m.body.position.y + 14);
        g.lineBetween(m.x + 120, m.y + 200, m.x + 120, m.body.position.y + 14);
      }
    }
    this.config.checks.forEach((cx, i) => {
      const check = this.roadPoint(cx);
      if (!check) return;
      g.lineStyle(4, 0xe8edf1);
      g.lineBetween(check.x, check.y - 150, check.x, check.y);
      g.fillStyle(this.checkpoint && this.checkpoint.index >= i ? 0x57efc8 : 0xffc76d);
      g.fillTriangle(check.x, check.y - 150, check.x + 54, check.y - 132, check.x, check.y - 114);
    });
    const end = this.config.end;
    g.lineStyle(5, 0xa8d8e4);
    g.lineBetween(end, 240, end, 418);
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 3; j++) {
        g.fillStyle((i + j) % 2 ? 0x102a3f : 0xe8edf1);
        g.fillRect(end + 5 + i * 15, 243 + j * 15, 15, 15);
      }
    g.fillStyle(0xffc76d, 0.12);
    g.fillRect(end - 30, 290, 80, 128);
    for (const c of this.coins) {
      if (c.taken) continue;
      const bob = Math.sin(this.time * 4 + c.x) * 5;
      g.fillStyle(0xffd34d, 0.25);
      g.fillCircle(c.x, c.y + bob, 26);
      g.fillStyle(0xffd34d);
      g.fillCircle(c.x, c.y + bob, 17);
      g.lineStyle(3, 0xfff3b0);
      g.strokeCircle(c.x, c.y + bob, 17);
      g.fillStyle(0xb7791f);
      g.fillRect(c.x - 3, c.y + bob - 9, 6, 18);
    }
    this.bodySprite
      .setPosition(this.body.position.x, this.body.position.y - 5)
      .setRotation(this.body.angle);
    [this.rear, this.front].forEach((wheel, i) => {
      this.wheelSprites[i]
        .setPosition(wheel.position.x, wheel.position.y)
        .setRotation(wheel.angle);
      this.wheelMasks[i].setPosition(wheel.position.x, wheel.position.y);
    });
    this.shadow
      .setPosition(
        this.body.position.x,
        Math.min(438, this.body.position.y + 69),
      )
      .setAlpha(this.grounded ? 0.27 : 0.1);
    this.worldFx.clear();
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      this.worldFx.fillStyle(this.zone.edge, clamp(p.life, 0, 0.5));
      this.worldFx.fillCircle(p.x, p.y, p.size);
    }
    this.counter.setText(
      Math.round(clamp(this.body.position.x / this.config.end, 0, 1) * 100) +
        "%",
    );
  }
  burst(x, y, count) {
    if (this.host.quality === "low") count = Math.min(count, 3);
    for (let i = 0; i < count; i++)
      this.particles.push({
        x,
        y,
        vx: -30 - Math.random() * 50,
        vy: -30 - Math.random() * 50,
        life: 0.5,
        size: 2 + Math.random() * 3,
      });
  }
  hud() {
    this.host.hud([
      ["Parkur", `${this.level + 1} / 12`],
      ["Süre", this.elapsed.toFixed(1) + (this.limit ? " / " + this.limit : "") + " sn"],
      ["Altın", `${this.coinCount || 0} / ${this.coins.length}`],
      ["Zorluk", DIFFICULTY[this.difficulty].label],
      ["Cihaz rekoru", store.read("drive-best", 0)],
    ]);
  }
  finish() {
    this.mode = "finished";
    const ideal = (this.config.end / 220) * this.d.star,
      stars = this.elapsed < ideal ? 3 : this.elapsed < ideal * 1.5 ? 2 : 1,
      bonus = { easy: 0.8, normal: 1, hard: 1.4 }[this.difficulty],
      allCoins = this.coinCount === this.coins.length,
      score = Math.round((Math.max(100, Math.round(1200 - (this.elapsed / ideal) * 450)) + stars * 100 + this.coinCount * 60 + (allCoins ? 120 : 0)) * bonus);
    store.record("drive", score);
    store.write(
      "drive-unlocked",
      Math.max(store.read("drive-unlocked", 1), Math.min(12, this.level + 2)),
    );
    store.write(
      "drive-stars-" + this.level,
      Math.max(store.read("drive-stars-" + this.level, 0), stars),
    );
    this.host.audio.play("win");
    this.hud();
    this.host.overlay(
      "Parkur tamamlandı!",
      `${this.elapsed.toFixed(1)} saniye · ${this.coinCount} / ${this.coins.length} altın${allCoins ? " (tamamı!)" : ""} · ${score} puan · ${this.d.label}`,
      [
        ...(this.level < 11
          ? [["Sonraki parkur", () => this.start(this.level + 1)]]
          : []),
        ["Yeniden dene", () => this.start(this.level)],
        ["Parkur seç", () => this.menu()],
      ],
      `<div class="pg-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>`,
    );
    this.host.reward(
      this.level === 11 ? "drive-master" : "drive-win",
      `${stars} yıldız · ${score} puan`,
    );
  }
  fail(message) {
    this.mode = "failed";
    this.host.audio.play("hit");
    const saved = this.checkpoint;
    this.host.overlay("Bir kez daha dene", message, [
      ...(saved ? [["Kontrol noktasından devam", () => this.start(this.level, saved)]] : []),
      ["Hemen yeniden", () => this.start(this.level)],
      ["Parkur seç", () => this.menu()],
    ]);
  }
  destroy() {
    this.M.Events.off(this.engine);
    this.M.Composite.clear(this.engine.world, false);
    this.M.Engine.clear(this.engine);
    for (const m of this.wheelMasks) m.destroy();
    disposePhaser(this.game);
  }
}
