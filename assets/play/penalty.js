import {
  W,
  H,
  assets,
  loadPhaser,
  disposePhaser,
  clamp,
  lerp,
  penaltyWinner,
  store,
  TEAMS,
  text,
  makeBall,
} from "./core.js";
import {
  GOAL,
  SHOTS,
  BALL,
  makeShot,
  makePlayerShot,
  readSwipe,
  shotKind,
  flightPoint,
  projectBall,
  goalContact,
} from "./penalty-shots.js?v=19";

// Keyboard power bar: the band where a held-and-released shot is clean.
const KEY_BAND = { min: 0.35, max: 0.86 };
const KIND_LABEL = {
  place: "Plase",
  power: "Sert şut",
  chip: "Aşırtma",
};

export async function create(host) {
  const Phaser = await loadPhaser();
  if (host.dead) return null;
  return new Promise((resolve, reject) => {
    const engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.q("#pgRender"),
      width: W,
      height: H,
      backgroundColor: "#061824",
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false },
      render: { antialias: true },
      scene: {
        preload() {
          this.load.image("stadium", assets + "stadium.webp");
          this.load.image("football", assets + "football.webp");
          this.load.on("loaderror", () =>
            reject(Error("Futbol görselleri yüklenemedi. Yeniden dene.")),
          );
        },
        create() {
          resolve(new Penalty(host, this, engine));
        },
        update(time, delta) {
          this.controller?.update(Math.min(delta / 1000, 0.05));
        },
      },
    });
  });
}

class Penalty {
  constructor(host, scene, engine) {
    this.host = host;
    this.s = scene;
    this.engine = engine;
    scene.controller = this;
    this.time = 0;
    this.round = 0;
    this.opponent = 1;
    this.mode = "practice";
    this.difficulty = store.read("penalty-difficulty", "normal");
    if (!["easy", "normal", "hard"].includes(this.difficulty)) this.difficulty = "normal";
    this.team = clamp(Number(store.read("penalty-team", 0)) || 0, 0, TEAMS.length - 1);
    this.phase = "menu";
    this.particles = [];
    this.trail = [];
    this.score = 0;
    this.aim = { x: 480, y: 178 };
    this.drag = null;
    this.keyBend = 0;
    this.keyboardAim = false;
    const atlas = scene.textures.get("football"),
      width = atlas.source[0].width,
      height = atlas.source[0].height;
    for (let i = 0; i < 8; i++) {
      const x = Math.round(((i % 4) * width) / 4),
        y = Math.round((Math.floor(i / 4) * height) / 2),
        x2 = Math.round((((i % 4) + 1) * width) / 4),
        y2 = Math.round(((Math.floor(i / 4) + 1) * height) / 2);
      const crop =
        i === 0
          ? [0, 0, 400, 443]
          : i === 1
            ? [403, 0, 484, 443]
            : i === 2
              ? [887, 0, 543, 443]
              : i === 3
                ? [1430, 0, 346, 443]
                : [x, y, x2 - x, y2 - y];
      atlas.add(i, 0, ...crop);
    }
    scene.add.image(480, 160, "stadium").setDisplaySize(1440, 960);
    this.net = scene.add.graphics().setDepth(1);
    this.shadow = scene.add
      .ellipse(480, 442, 45, 12, 0x041824, 0.45)
      .setDepth(2);
    this.keeper = scene.add
      .sprite(480, 222, "football", 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(110, 110)
      .setDepth(3);
    this.striker = scene.add
      .sprite(378, 496, "football", 4)
      .setOrigin(0.5, 1)
      .setDisplaySize(210, 210)
      .setDepth(4);
    this.trailGraphics = scene.add.graphics().setDepth(5);
    this.guide = scene.add.graphics().setDepth(5.5);
    makeBall(scene);
    this.ball = scene.add
      .image(480, 438, "arena-ball")
      .setDisplaySize(36, 36)
      .setDepth(6);
    this.marker = scene.add.graphics().setDepth(7);
    this.fx = scene.add.graphics().setDepth(8);
    this.power = scene.add.graphics().setDepth(10);
    this.label = text(scene, 480, 45, "", 25).setDepth(11);
    this.phaseLabel = text(scene, 480, 79, "", 16, "#b6e5e7").setDepth(11);
    this.powerLabel = text(scene, 790, 259, "", 15)
      .setDepth(11)
      .setVisible(false);
    this.saved = text(scene, 480, 275, "", 26).setDepth(11).setVisible(false);
    this.lastCue = -1;
    this.attachShotControls();
    this.updateHud();
  }

  attachShotControls() {
    const panel = document.createElement("section");
    panel.className = "pg-shot-lab";
    panel.setAttribute("aria-label", "Şut hareketleri");
    const kinds = [
      ["place", "Plase", "Sakin, düz sürükle", "M14 26 L14 5 M8 11 L14 5 L20 11"],
      ["curve", "Falso", "Eğri çiz", "M11 26 Q27 15 13 5 M8 8 L13 5 L15 11"],
      ["power", "Sert şut", "Hızlı fiske", "M14 26 L14 5 M8 11 L14 5 L20 11 M4 21 L8 17 M24 21 L20 17"],
      ["chip", "Aşırtma", "Yavaşça ortaya, yükseğe", "M3 25 Q14 -7 25 22 M20 17 L25 22 L28 16"],
    ];
    panel.innerHTML = `<ul class="pg-swipe-guide" aria-label="Sürükleme hareketleri">${kinds
      .map(
        ([id, name, how, path]) =>
          `<li data-kind="${id}"><svg viewBox="0 0 30 28" aria-hidden="true"><path d="${path}"/></svg><span><b>${name}</b><small>${how}</small></span></li>`,
      )
      .join(
        "",
      )}</ul><p id="pgShotHint"></p><div class="pg-shot-meter" id="pgShotMeter" hidden><span id="pgShotPower">Güç</span><div class="pg-power-track"><i class="pg-power-sweet"></i><i class="pg-power-fill"></i></div></div>`;
    hostInsert(this.host, panel);
    this.shotPanel = panel;
    for (const [key, label] of [
      ["left", "Sola nişan al; şut tuşu basılıyken sola falso"],
      ["right", "Sağa nişan al; şut tuşu basılıyken sağa falso"],
      ["up", "Yukarı nişan al"],
      ["down", "Aşağı nişan al"],
    ])
      this.host.q(`[data-pg-key="${key}"]`)?.setAttribute("aria-label", label);
    this.syncShotUI(true);
  }
  // Highlights the gesture cards that match the live or last shot.
  showKinds(list) {
    const key = list.join(",");
    if (key === this.kindsShown) return;
    this.kindsShown = key;
    this.shotPanel
      .querySelectorAll("[data-kind]")
      .forEach((li) =>
        li.classList.toggle("on", list.includes(li.dataset.kind)),
      );
  }
  syncShotUI(force = false) {
    const state = [
      this.turn,
      this.phase,
      !!this.hold,
      !!this.drag,
      this.host.paused,
    ].join(":");
    if (!force && state === this.uiState) return;
    this.uiState = state;
    this.shotPanel.hidden = this.phase === "menu";
    this.shotPanel.classList.toggle("keeper", this.turn === "save");
    this.host.q("#pgShotMeter").hidden = !(this.hold || this.drag);
    if (this.turn === "shoot" && this.phase === "aim" && !this.hold && !this.drag)
      this.showKinds([]);
    this.host.q("#pgShotHint").textContent =
      this.phase === "result"
        ? this.feedback
        : this.turn === "save"
          ? "Kalecisin: turuncu hedefi izle. Yönünü seçip Kurtar’a bas veya kaleye dokun. Erken atlayınca aşırtmaya açık kalırsın."
          : "Topu fareyle ya da parmağınla tut, kaleye doğru sürükle ve bırak. Çizginin ucu yönü ve yüksekliği belirler. Eğri çizersen top falso alır; hızlı fiske sert şut olur. Klavye: yön tuşlarıyla nişan al, Boşluk’u basılı tut ve bırak.";
    const b = this.host.q('[data-pg-key="action"]');
    b.querySelector("b").textContent = this.turn === "save" ? "Kurtar" : "Şut";
    b.querySelector("small").textContent =
      this.turn === "save" ? "Yön seç, bas" : "Basılı tut, bırak";
  }

  menu() {
    this.phase = "menu";
    this.host.message("");
    this.host.overlay(
      "Penaltı Arenası",
      "Kaleciyi oku. Topu tut, kaleye doğru sürükle ve bırak.",
      [
        ["Antrenman", () => this.begin("practice")],
        ["Kupaya başla", () => this.begin("cup")],
      ],
      `<div class="pg-options"><label>Takımın<select id="pgTeam">${TEAMS.map((t, i) => `<option value="${i}" ${i === this.team ? "selected" : ""}>${t}</option>`).join("")}</select></label><label>Zorluk<select id="pgDifficulty">${[["easy", "Kolay"], ["normal", "Normal"], ["hard", "Usta"]].map(([k, l]) => `<option value="${k}" ${k === this.difficulty ? "selected" : ""}>${l}</option>`).join("")}</select></label></div><p class="pg-diff-help">Kolay: kaleci geç tepki verir, kurtarışta daha çok zamanın olur · Usta: kaleci köşeleri iyi okur, rakip şutları hızlıdır.</p><p><b>Sürükle · Çiz · Vur</b><br>Topu fareyle tut ve kaleye doğru sürükle. Eğri çizersen top falso alır.<br>Hızlı fiske sert şut olur. Klavye: yön tuşları + Boşluk.</p>`,
    );
    this.syncShotUI(true);
  }
  begin(mode) {
    this.team = Number(this.host.q("#pgTeam")?.value ?? this.team);
    this.difficulty = this.host.q("#pgDifficulty")?.value ?? this.difficulty;
    store.write("penalty-team", this.team);
    store.write("penalty-difficulty", this.difficulty);
    this.mode = mode;
    this.round = 0;
    this.score = 0;
    this.resetMatch();
    this.host.play();
    this.syncShotUI(true);
  }
  resetMatch() {
    this.opponent = (this.team + this.round + 1) % 8;
    this.lastCue = -1;
    this.a = 0;
    this.b = 0;
    this.na = 0;
    this.nb = 0;
    this.shotsA = [];
    this.shotsB = [];
    this.turn = "shoot";
    this.nextTurn();
    this.updateHud();
  }
  restart() {
    this.menu();
  }
  updateHud() {
    this.host.hud([
      ["Sen / Rakip", `${this.a || 0} : ${this.b || 0}`],
      [
        "Tur",
        this.mode === "cup"
          ? ["Çeyrek final", "Yarı final", "Final"][this.round]
          : "Antrenman",
      ],
      [
        "Zorluk",
        { easy: "Kolay", normal: "Normal", hard: "Usta" }[this.difficulty],
      ],
      ["Puan", this.score],
      ["Cihaz rekoru", store.read("penalty-best", 0)],
    ]);
  }
  nextTurn() {
    this.phase = "aim";
    this.t = 0;
    this.skipResumeFrame = false;
    this.hold = false;
    this.powerValue = 0;
    this.shot = null;
    this.runup = null;
    this.trail = [];
    this.trailGraphics.clear();
    this.drag = null;
    this.keyBend = 0;
    this.keyboardAim = false;
    this.guide.clear();
    this.setCursor("");
    this.ball
      .setPosition(480, 438)
      .setDisplaySize(36, 36)
      .setAngle(0)
      .setVisible(true);
    this.shadow.setPosition(480, 442).setScale(1).setAlpha(0.45);
    this.keeperHome = 480;
    this.standKeeper();
    this.striker
      .setFrame(4)
      .setPosition(378, 496)
      .setVisible(true)
      .setTint(this.turn === "shoot" ? 0xffffff : 0xa9c6ff);
    this.saved.setVisible(false);
    this.net.clear();
    this.marker.clear();
    this.power.clear();
    this.powerLabel.setVisible(false);
    this.lockedAim = null;
    this.dive = null;
    this.aiDive = null;
    this.aim = { x: 575, y: 171 };
    this.keeperAim = { x: 480, y: 178 };
    this.label.setText(TEAMS[this.team] + "  /  " + TEAMS[this.opponent]);
    this.phaseLabel.setText(
      this.na >= 5 && this.nb >= 5
        ? "Ani ölüm · Eşit sayıda atış"
        : "Beş penaltı · Şut ve kurtarış",
    );
    this.host.message(
      this.turn === "shoot"
        ? "ŞUT SENDE · Topu tut ve kaleye doğru sürükle"
        : "KALE SENDE · Kaleciyi doğru zamanda hareket ettir",
    );
    this.host.status(
      this.turn === "shoot"
        ? "Topu tut, kaleye doğru sürükle ve bırak. Klavye: yön tuşlarıyla nişan al, Boşluk’u basılı tut ve bırak (basılıyken ← / → falso verir)."
        : "Turuncu hedef belirince yönünü seç, Boşluk’a bas veya kaleye dokun.",
    );
    if (this.turn === "save") {
      const type = ["place", "power", "chip"][(this.na + this.round) % 3],
        power = lerp(
          SHOTS[type].min,
          SHOTS[type].max,
          0.25 + Math.random() * 0.5,
        );
      const aim =
        type === "chip"
          ? { x: 480 + (Math.random() - 0.5) * 90, y: 136 + Math.random() * 15 }
          : {
              x: GOAL.left + 23 + Math.random() * (GOAL.right - GOAL.left - 46),
              y: GOAL.top + 20 + Math.random() * (GOAL.bottom - GOAL.top - 34),
            };
      this.opponentShot = makeShot(
        type,
        aim,
        power,
        Math.random() < 0.5 ? -1 : 1,
        this.time,
      );
      this.target = this.opponentShot.target;
      this.cueDelay =
        this.difficulty === "hard" ? 0.7 : this.difficulty === "easy" ? 1.3 : 1;
      this.launchDelay =
        this.cueDelay +
        (this.difficulty === "hard"
          ? 0.24
          : this.difficulty === "easy"
            ? 0.62
            : 0.42);
    }
    this.syncShotUI(true);
  }

  input(key, down) {
    if (this.host.paused) return;
    if (this.turn === "shoot" && this.phase === "aim") {
      if (key === "action") {
        if (down) this.startHold();
        else if (this.hold) this.release();
      } else if (down && !this.drag) {
        // While the power bar runs, left/right choose the falso side.
        if (this.hold)
          this.keyBend = key === "left" ? -1 : key === "right" ? 1 : 0;
        else this.keyboardAim = true;
      }
    } else if (key === "action" && this.turn === "save" && down)
      this.doDive(this.keeperAim);
  }
  inGoal(pos) {
    return (
      pos &&
      pos.x >= GOAL.left - 28 &&
      pos.x <= GOAL.right + 28 &&
      pos.y >= GOAL.top - 22 &&
      pos.y <= GOAL.bottom + 22
    );
  }
  startHold() {
    if (this.turn !== "shoot" || this.phase !== "aim" || this.hold || this.drag)
      return;
    this.keyboardAim = true;
    this.lockedAim = { ...this.aim };
    this.keyBend = 0;
    this.hold = true;
    this.holdTime = 0;
    this.powerValue = 0;
    this.syncShotUI(true);
  }
  release() {
    if (!this.hold || this.phase !== "aim") return;
    this.hold = false;
    const p = this.powerValue;
    this.fire(
      makePlayerShot({
        aim: this.lockedAim,
        power: p,
        bend: this.keyBend * 1.1,
        shortRange: p < 0.16 ? 7.5 + p * 20 : 0,
        difficulty: this.difficulty,
        phase: this.time,
      }),
    );
  }
  fire(shot) {
    this.shot = shot;
    this.target = shot.target;
    this.showKinds(shot.spin ? [shot.type, "curve"] : [shot.type]);
    this.startRunup();
  }
  // Drags may start on the ball or anywhere below the goal, which keeps the
  // gesture comfortable on small touch screens.
  canGrab(pos) {
    return (
      !!pos &&
      (pos.y >= GOAL.bottom + 62 ||
        Math.hypot(pos.x - BALL.x, pos.y - BALL.y) < 90)
    );
  }
  setCursor(value) {
    const el = this.host.q("#pgRender");
    if (el && el.style.cursor !== value) el.style.cursor = value;
  }
  cssScale() {
    const r = this.host.q("#pgRender")?.getBoundingClientRect();
    return r && r.width ? Math.min(r.width / W, r.height / H) : 1;
  }
  addPoint(pos) {
    const pts = this.drag.points,
      last = pts[pts.length - 1],
      now = performance.now() / 1000;
    if (Math.hypot(pos.x - last.x, pos.y - last.y) < 1 && now - last.t < 0.03)
      return;
    pts.push({ x: pos.x, y: pos.y, t: now });
    if (pts.length > 240) pts.splice(1, 1);
  }
  pointer(type, pos, id = 0) {
    if (this.host.paused) return;
    if (this.turn === "save") {
      if (type === "down" && this.inGoal(pos))
        this.doDive({
          x: clamp(pos.x, GOAL.left + 14, GOAL.right - 14),
          y: clamp(pos.y, GOAL.top + 14, GOAL.bottom - 10),
        });
      return;
    }
    if (this.phase !== "aim") {
      this.setCursor("");
      return;
    }
    if (type === "down") {
      if (this.drag || this.hold || !pos) return;
      if (!this.canGrab(pos)) {
        this.host.message("Topu tut ve yukarı, kaleye doğru sürükle");
        return;
      }
      this.keyboardAim = false;
      this.drag = {
        id,
        points: [{ x: pos.x, y: pos.y, t: performance.now() / 1000 }],
        offset: { x: BALL.x - pos.x, y: BALL.y - pos.y },
      };
      this.setCursor("grabbing");
      this.host.message("");
      this.syncShotUI(true);
    } else if (type === "move") {
      if (this.drag?.id === id) {
        if (pos) this.addPoint(pos);
      } else if (!this.drag && !this.hold)
        this.setCursor(this.canGrab(pos) ? "grab" : "");
    } else if (this.drag?.id === id) {
      if (pos && type === "up") this.addPoint(pos);
      const drag = this.drag;
      this.drag = null;
      this.setCursor("");
      this.guide.clear();
      this.marker.clear();
      if (type === "up") this.releaseSwipe(drag);
      this.syncShotUI(true);
    }
  }
  releaseSwipe(drag) {
    const g = readSwipe(drag.points, this.cssScale(), this.difficulty);
    this.lastGesture = g;
    if (!g.valid) {
      this.host.message(
        g.reason === "down"
          ? "Yukarı, kaleye doğru sürükle"
          : "Topu tut ve kaleye doğru biraz daha uzun sürükle",
      );
      return;
    }
    this.fire(
      makePlayerShot({ ...g, difficulty: this.difficulty, phase: this.time }),
    );
  }
  cancelInput(key) {
    if (!key) {
      this.drag = null;
      this.guide.clear();
      this.setCursor("");
    }
    if (key && key !== "action") return;
    this.hold = false;
    this.powerValue = 0;
    this.power.clear();
    this.powerLabel.setVisible(false);
    if (this.shotPanel) this.host.q("#pgShotMeter").hidden = !this.drag;
  }
  resume() {
    this.skipResumeFrame = true;
  }
  startRunup() {
    this.phase = "runup";
    this.runup = { age: 0, duration: this.shot.type === "power" ? 0.34 : 0.28 };
    this.power.clear();
    this.powerLabel.setVisible(false);
    const name = this.shot.player
      ? this.shot.short
        ? "Zayıf şut"
        : KIND_LABEL[this.shot.type]
      : SHOTS[this.shot.type].name;
    this.host.message(
      `${this.shot.player && this.shot.spin ? "FALSOLU " : ""}${name.toLocaleUpperCase("tr-TR")} · ${Math.round(this.shot.power * 100)}% güç`,
    );
    this.syncShotUI(true);
  }
  doDive(pos) {
    if (
      this.turn !== "save" ||
      this.dive ||
      !["aim", "runup", "flight"].includes(this.phase)
    )
      return;
    this.dive = { x: pos.x, y: pos.y, start: this.t, from: this.keeperHome };
    this.host.audio.play("save", 0.25);
  }
  launch() {
    this.phase = "flight";
    this.flightTime = 0;
    this.flightDuration = this.shot.duration;
    this.flightStart = this.t;
    this.hold = false;
    this.power.clear();
    this.marker.clear();
    this.guide.clear();
    this.powerLabel.setVisible(false);
    this.striker.setFrame(6).setPosition(400, 496);
    this.host.audio.play("kick", this.shot.type === "power" ? 1 : 0.65);
    this.host.message("");
    this.syncShotUI(true);
  }

  update(dt) {
    if (this.host.paused) return;
    if (this.skipResumeFrame) {
      this.skipResumeFrame = false;
      dt = 0;
    }
    this.time += dt;
    this.t += dt;
    this.fx.clear();
    this.animateParticles(dt);
    if (this.phase === "aim") {
      if (this.turn === "shoot") {
        this.keeperHome =
          480 + Math.sin(this.time * 1.8 + this.opponent * 0.6) * 28;
        this.standKeeper();
        if (this.drag) this.drawSwipe();
        else if (this.hold) {
          this.holdTime += dt;
          this.powerValue =
            0.5 - 0.5 * Math.cos((this.holdTime * Math.PI) / 1.1);
          this.drawAim();
          this.drawPower();
        } else {
          this.steer(this.aim, dt, 145, 100);
          if (this.keyboardAim) this.drawAim();
          else this.drawIdle();
        }
      } else {
        this.steer(this.keeperAim, dt, 190, 130);
        if (this.t >= this.cueDelay) {
          this.drawMarker(this.target, 0xffbd66);
          this.fx.lineStyle(2, 0x64f9de, 0.9);
          this.fx.strokeCircle(this.keeperAim.x, this.keeperAim.y, 11);
          if (this.lastCue !== this.na + this.nb) {
            this.host.audio.play("whistle", 0.4);
            this.lastCue = this.na + this.nb;
          }
          this.host.message(
            `RAKİP: ${SHOTS[this.opponentShot.type].name.toLocaleUpperCase("tr-TR")} · Kurtarış zamanını seç!`,
          );
        }
        if (this.dive) this.drawKeeper(this.dive, this.t - this.dive.start);
        else this.standKeeper();
        if (this.t >= this.launchDelay) {
          this.shot = this.opponentShot;
          this.startRunup();
        }
      }
    } else if (this.phase === "runup") {
      this.runup.age += dt;
      const p = clamp(this.runup.age / this.runup.duration, 0, 1);
      this.striker
        .setFrame(5)
        .setPosition(lerp(378, 400, p), 496 - Math.sin(p * Math.PI) * 6);
      if (this.turn === "save" && this.dive)
        this.drawKeeper(this.dive, this.t - this.dive.start);
      if (p >= 1) this.launch();
    } else if (this.phase === "flight") {
      this.flightTime += dt;
      const p = clamp(this.flightTime / this.flightDuration, 0, 1),
        point = flightPoint(this.shot, p);
      this.placeBall(point, p);
      if (this.turn === "shoot") {
        this.reactKeeper(p);
        if (this.aiDive)
          this.drawKeeper(this.aiDive, this.flightTime - this.aiDive.delay);
        else this.standKeeper();
      } else if (this.dive)
        this.drawKeeper(this.dive, this.t - this.dive.start);
      else this.standKeeper();
      if (p >= 1) this.resolveShot();
    } else if (this.phase === "result") {
      this.animateResult(this.t - this.resultAt);
      if (this.t > this.resultAt + 1.65) {
        const winner = penaltyWinner(this.a, this.b, this.na, this.nb);
        if (winner) this.endMatch(winner);
        else {
          this.turn = this.turn === "shoot" ? "save" : "shoot";
          this.nextTurn();
        }
      }
    }
    this.syncShotUI();
  }
  steer(pos, dt, horizontal, vertical) {
    const keys = this.host.keys;
    pos.x = clamp(
      pos.x +
        (Number(keys.has("right")) - Number(keys.has("left"))) *
          horizontal *
          dt,
      GOAL.left - 18,
      GOAL.right + 18,
    );
    pos.y = clamp(
      pos.y +
        (Number(keys.has("down")) - Number(keys.has("up"))) * vertical * dt,
      GOAL.top - 15,
      GOAL.bottom - 9,
    );
  }
  placeBall(point, p) {
    this.ball
      .setPosition(point.x, point.y)
      .setDisplaySize(point.size, point.size)
      .setAngle(
        this.shot.spin
          ? p * this.shot.spin * 1500
          : p * (this.shot.type === "chip" ? 400 : 950),
      );
    this.shadow
      .setPosition(point.x, point.groundY + 3)
      .setScale(point.size / 36)
      .setAlpha(clamp(0.44 - point.height * 0.1, 0.1, 0.44));
    if (this.host.quality !== "low") {
      this.trail.push({ x: point.x, y: point.y });
      if (this.trail.length > 16) this.trail.shift();
      this.trailGraphics.clear();
      for (let i = 1; i < this.trail.length; i++) {
        this.trailGraphics.lineStyle(
          2,
          SHOTS[this.shot.type].color,
          (i / this.trail.length) * 0.45,
        );
        this.trailGraphics.lineBetween(
          this.trail[i - 1].x,
          this.trail[i - 1].y,
          this.trail[i].x,
          this.trail[i].y,
        );
      }
    }
  }
  reactKeeper(p) {
    if (this.aiDive) return;
    const reaction = { easy: 0.32, normal: 0.23, hard: 0.16 }[this.difficulty];
    if (this.flightTime < reaction) return;
    const anticipation = clamp(
        { easy: 0.42, normal: 0.72, hard: 0.91 }[this.difficulty] +
          Math.cos(this.time * 1.7 + this.opponent) * 0.09,
        0.3,
        0.97,
      ),
      shot = this.shot;
    const estimateX =
      shot.worldX - shot.spin * shot.curve * 4 * (1 - p) * (1 - anticipation);
    let x = projectBall(estimateX, 0, 11).x,
      y = shot.target.y;
    // A less alert keeper only partly reads where a swiped shot is going.
    if (shot.player)
      x = lerp(this.keeperHome, x, clamp(anticipation + 0.25, 0, 1));
    // A central chip can punish an early commitment to a side. A disciplined
    // keeper in the highest difficulty stays upright more often.
    if (
      shot.type === "chip" &&
      Math.abs(x - 480) < 58 &&
      Math.abs(this.keeperHome - 480) > (this.difficulty === "hard" ? 24 : 8)
    ) {
      x = 480 + Math.sign(this.keeperHome - 480) * 110;
      y = 185;
    }
    this.aiDive = {
      x: clamp(x, GOAL.left + 15, GOAL.right - 15),
      y: clamp(y, GOAL.top + 12, GOAL.bottom - 12),
      delay: this.flightTime,
      from: this.keeperHome,
    };
  }
  standKeeper() {
    this.keeper
      .setFrame(0)
      .setPosition(this.keeperHome || 480, 222)
      .setDisplaySize(110, 110);
    this.keeperState = { x: this.keeperHome || 480, y: 180, rx: 27, ry: 43 };
  }
  saveWindow() {
    return this.difficulty === "easy"
      ? 1.55
      : this.difficulty === "hard"
        ? 1.08
        : 1.3;
  }
  drawKeeper(dive, age) {
    if (age < 0.07) {
      this.standKeeper();
      return;
    }
    const home = dive.from ?? 480,
      travel = 0.23 + Math.abs(dive.x - home) / 530,
      raw = clamp((age - 0.07) / travel, 0, 1),
      p = raw * raw * (3 - 2 * raw);
    const late = clamp((age - this.saveWindow() * 0.75) / 0.34, 0, 1),
      x = lerp(home, dive.x, p),
      y = lerp(180, dive.y, p) + late * 37;
    if (age > this.saveWindow() + 0.25) {
      this.standKeeper();
      return;
    }
    const left = dive.x < home - 25,
      right = dive.x > home + 25,
      frame = left ? 1 : right ? 2 : 3;
    this.keeper
      .setFrame(frame)
      .setDisplaySize(left || right ? 152 : 90, 110)
      .setPosition(
        x + (left ? 68 : right ? -52 : 0),
        y + (left ? 65 : right ? 65 : 101),
      );
    this.keeperState = { x, y, rx: 31 - late * 8, ry: 28 - late * 5 };
  }

  resolveShot() {
    if (this.phase === "result") return;
    const contact = this.shot.short ? "short" : goalContact(this.target),
      k = this.keeperState;
    const speedPenalty = this.shot.type === "power" ? 4 : 0,
      rx = k.rx + 8 - speedPenalty,
      ry = k.ry + 8 - speedPenalty;
    const saved =
      contact === "goal" &&
      ((this.target.x - k.x) / rx) ** 2 + ((this.target.y - k.y) / ry) ** 2 <=
        1;
    const goal = contact === "goal" && !saved,
      result = goal ? "goal" : saved ? "save" : contact;
    this.resultKind = result;
    this.phase = "result";
    this.resultAt = this.t;
    this.trailGraphics.clear();
    this.trail = [];
    this.marker.clear();
    this.saved
      .setVisible(true)
      .setText(
        goal
          ? "GOL!"
          : saved
            ? "KURTARIŞ!"
            : contact === "post"
              ? "DİREK!"
              : contact === "short"
                ? "ZAYIF ŞUT"
                : "DIŞARI!",
      )
      .setColor(goal ? "#65ffd6" : "#ffc782");
    this.host.audio.play(
      goal ? "net" : contact === "post" ? "post" : saved ? "save" : "whoosh",
    );
    if (this.turn === "shoot") {
      this.na++;
      this.shotsA.push(goal);
      if (goal) {
        this.a++;
        this.score +=
          100 +
          (this.shot.quality > 0.95 ? 15 : 0) +
          (this.shot.type === "chip" ? 20 : this.shot.spin ? 10 : 0);
        this.striker.setFrame(7).setPosition(378, 496);
      }
    } else {
      this.nb++;
      this.shotsB.push(goal);
      if (goal) this.b++;
      else this.score += 80;
    }
    if (goal) this.burst(this.target.x, this.target.y, 0x55eebd, 22);
    else if (contact === "post")
      this.burst(this.target.x, this.target.y, 0xffd172, 14);
    else if (saved) {
      this.fx.lineStyle(3, 0x6df4dc);
      this.fx.strokeCircle(k.x, k.y, 22);
      this.burst(k.x, k.y, 0xc3f6ff, 8);
    }
    const s = this.shot.player
      ? { name: KIND_LABEL[this.shot.type] }
      : SHOTS[this.shot.type];
    this.feedback = this.shot.player
      ? this.playerFeedback(contact, goal, saved)
      : contact === "short"
        ? "Şut kaleye ulaşmadı. Gücü yeşil banda kadar artır."
        : this.shot.quality < 0.7
          ? `${s.name}: güç bandını kaçırdın. Bir sonraki vuruşta yeşil aralıkta bırak.`
          : saved
            ? "Kaleci bu köşeye yetişti. Diğer köşeyi, falso yönünü veya aşırtmayı dene."
            : goal
              ? "İyi vuruş! Kalecinin konumuyla şut tekniğini birlikte değerlendir."
              : contact === "post"
                ? "Direğe çok yakındı. Hedefi biraz kalenin içine taşı."
                : "Hedefini kalenin içine taşı ve güç bandını takip et.";
    const resultText = `${s.name} · ${goal ? "Gol" : saved ? "Kurtarıldı" : contact === "post" ? "Direk" : contact === "short" ? "Zayıf vuruş" : "Dışarı"} · Sen ${this.a} : ${this.b} Rakip`;
    this.host.message(resultText);
    this.host.status(this.feedback);
    this.updateHud();
    this.phaseLabel.setText(
      `Sen: ${this.shotsA.map((v) => (v ? "●" : "○")).join(" ")}    Rakip: ${this.shotsB.map((v) => (v ? "●" : "○")).join(" ")}`,
    );
    this.syncShotUI(true);
    if (!this.host.reduced) this.s.cameras.main.shake(80, 0.002);
  }
  animateResult(age) {
    const shot = this.shot,
      q = clamp(age, 0, 1.2),
      bounce = this.resultKind === "post" || this.resultKind === "save",
      z = bounce ? shot.range - q * 2.6 : shot.range + q * 2.1;
    const x =
        shot.worldX + (bounce ? (this.target.x < 480 ? 0.8 : -0.8) * q : 0),
      height =
        Math.max(0, shot.height - q * q * 2.6) +
        (bounce ? Math.abs(Math.sin(q * 7)) * 0.22 : 0),
      point = projectBall(x, height, z);
    this.ball
      .setPosition(point.x, point.y)
      .setDisplaySize(point.size, point.size)
      .setAngle(this.ball.angle + 7);
    this.shadow
      .setPosition(point.x, point.groundY)
      .setScale(point.size / 36)
      .setAlpha(0.28);
    if (this.resultKind === "goal") {
      this.net.clear();
      const amplitude = Math.exp(-age * 3) * 5;
      this.net.lineStyle(1.5, 0xd6fff1, 0.55);
      for (let i = 0; i < 9; i++) {
        const xx = GOAL.left + (i * (GOAL.right - GOAL.left)) / 8;
        this.net.beginPath();
        this.net.moveTo(xx, GOAL.top);
        this.net.lineTo(
          xx + Math.sin(age * 18 + i) * amplitude,
          lerp(GOAL.top, GOAL.bottom, 0.55),
        );
        this.net.lineTo(xx, GOAL.bottom);
        this.net.strokePath();
      }
    }
  }

  playerFeedback(contact, goal, saved) {
    const shot = this.shot;
    if (contact === "short")
      return "Şut kaleye ulaşmadı. Daha uzun ya da daha hızlı sürükle.";
    if (goal)
      return shot.spin
        ? "Harika falso! Eğri çizdiğin yol kaleciyi şaşırttı."
        : shot.type === "power"
          ? "Sert ve isabetli! Hızlı fiske kaleciye zaman bırakmadı."
          : shot.type === "chip"
            ? "Güzel aşırtma! Kaleci topun altında kaldı."
            : "İyi vuruş! Kalecinin konumuna göre köşeni seçmeye devam et.";
    if (saved)
      return "Kaleci yetişti. Diğer köşeyi dene, eğri çizerek falso ver ya da daha hızlı fiskele.";
    if (contact === "post")
      return "Direğe çok yakındı. Çizgiyi biraz kalenin içine çek.";
    return this.target.y < GOAL.top
      ? "Top üstten dışarı gitti. Daha kısa ya da biraz daha yavaş sürükle."
      : "Top yandan dışarı gitti. Çizgiyi kalenin içine doğru çek.";
  }
  // Ready state: a pulsing ring and chevrons invite the player to grab the ball.
  drawIdle() {
    const g = this.marker,
      pulse = (Math.sin(this.time * 4) + 1) / 2;
    g.clear();
    g.lineStyle(3, 0x64f9de, 0.45 + pulse * 0.4);
    g.strokeCircle(BALL.x, BALL.y, 25 + pulse * 5);
    for (let i = 0; i < 3; i++) {
      const k = (this.time * 0.9 + i / 3) % 1,
        y = BALL.y - 42 - k * 70;
      for (const [w, c, a] of [
        [8, 0x061824, 0.35],
        [4, 0xe9fff8, 0.95],
      ]) {
        g.lineStyle(w, c, Math.sin(k * Math.PI) * a);
        g.beginPath();
        g.moveTo(BALL.x - 13, y + 9);
        g.lineTo(BALL.x, y);
        g.lineTo(BALL.x + 13, y + 9);
        g.strokePath();
      }
    }
    this.phaseLabel.setText(
      "Topu tut ve kaleye doğru sürükle · Eğri çizersen falso",
    );
  }
  // Dotted predicted flight from the ball into the goal plus a crosshair.
  drawFlight(shot, color, reach = 1, marker = true) {
    const g = this.marker,
      steps = this.host.quality === "low" ? 14 : 28;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      if (u > reach) break;
      const pt = flightPoint(shot, u);
      g.fillStyle(0x061824, 0.45);
      g.fillCircle(pt.x, pt.y + 1, lerp(5.6, 3.4, u));
      g.fillStyle(color, 0.95 - u * 0.3);
      g.fillCircle(pt.x, pt.y, lerp(4.6, 2.6, u));
    }
    if (shot.short) {
      const end = flightPoint(shot, 1);
      g.lineStyle(3, 0xffa18c, 0.95);
      g.lineBetween(end.x - 9, end.y - 9, end.x + 9, end.y + 9);
      g.lineBetween(end.x + 9, end.y - 9, end.x - 9, end.y + 9);
    } else if (marker)
      this.drawMarker(
        shot.target,
        goalContact(shot.target) === "goal" ? color : 0xffa18c,
        false,
      );
  }
  drawSwipe() {
    const d = this.drag,
      pts = d.points,
      g = this.guide,
      info = readSwipe(pts, this.cssScale(), this.difficulty),
      shot =
        info.valid &&
        makePlayerShot({ ...info, difficulty: this.difficulty, preview: true }),
      color = shot ? SHOTS[shot.type].color : 0x9fb3c8;
    g.clear();
    this.marker.clear();
    // The drawn path, moved so it starts at the ball: this is the shot line.
    if (pts.length > 1) {
      for (const [width, alpha, c] of [
        [20, 0.16, color],
        [9, 0.5, color],
        [3, 0.95, 0xffffff],
      ]) {
        g.lineStyle(width, c, alpha);
        g.beginPath();
        g.moveTo(pts[0].x + d.offset.x, pts[0].y + d.offset.y);
        for (const p of pts) g.lineTo(p.x + d.offset.x, p.y + d.offset.y);
        g.strokePath();
      }
    }
    const last = pts[pts.length - 1];
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(last.x, last.y, 9);
    if (!shot) {
      this.phaseLabel.setText("Yukarı, kaleye doğru sürükle");
      this.showKinds([]);
      this.meter(0, "Yukarı sürükle");
      return;
    }
    const hard = this.difficulty === "hard";
    this.drawFlight(shot, color, hard ? 0.6 : 1, !hard);
    const bendText = shot.spin
      ? shot.spin < 0
        ? " · Sağa falso"
        : " · Sola falso"
      : " · Düz";
    const name = shot.short ? "Zayıf şut" : KIND_LABEL[shot.type];
    this.phaseLabel.setText(
      `${name} · %${Math.round(Math.min(info.power, 1) * 100)} güç${bendText}`,
    );
    this.showKinds(
      shot.short ? [] : shot.spin ? [shot.type, "curve"] : [shot.type],
    );
    this.meter(
      info.power / 1.12,
      `%${Math.round(Math.min(info.power, 1) * 100)} · ${shot.short ? "Zayıf, daha uzun sürükle" : info.power > KEY_BAND.max ? "Çok sert, üstten kaçabilir" : name}`,
    );
  }
  meter(value, label) {
    const fill = this.host.q(".pg-power-fill"),
      band = this.host.q(".pg-power-sweet"),
      top = this.drag ? 1.12 : 1;
    fill.style.width = clamp(value, 0, 1) * 100 + "%";
    fill.style.background =
      value * top > KEY_BAND.max
        ? "#ffad99"
        : value * top >= KEY_BAND.min
          ? "#57efc8"
          : "#80b8df";
    band.style.left = (KEY_BAND.min / top) * 100 + "%";
    band.style.width = ((KEY_BAND.max - KEY_BAND.min) / top) * 100 + "%";
    this.host.q("#pgShotPower").textContent = label;
  }
  // Keyboard fallback aim: crosshair in the goal and the predicted flight.
  drawAim() {
    const aim = this.hold ? this.lockedAim : this.aim,
      p = this.hold ? this.powerValue : 0.55,
      shot = makePlayerShot({
        aim,
        power: p,
        bend: this.hold ? this.keyBend * 1.1 : 0,
        shortRange: this.hold && p < 0.16 ? 7.5 + p * 20 : 0,
        difficulty: this.difficulty,
        preview: true,
      }),
      color = SHOTS[shotKind(aim, p)].color;
    this.marker.clear();
    this.guide.clear();
    if (this.host.quality !== "low") this.drawFlight(shot, color, 1, false);
    this.drawMarker(
      aim,
      goalContact(aim) === "goal" ? color : 0xffa18c,
      false,
    );
    this.phaseLabel.setText(
      this.hold
        ? `Boşluk’u bırak · ← / → falso: ${this.keyBend < 0 ? "Sol" : this.keyBend > 0 ? "Sağ" : "Düz"}`
        : "Klavye nişanı · Boşluk’u basılı tut ve bırak",
    );
  }
  drawMarker(pos, color, clear = true) {
    if (clear) this.marker.clear();
    this.marker.lineStyle(2.5, color, 0.95);
    this.marker.strokeCircle(pos.x, pos.y, 13);
    this.marker.lineBetween(pos.x - 19, pos.y, pos.x + 19, pos.y);
    this.marker.lineBetween(pos.x, pos.y - 19, pos.x, pos.y + 19);
  }
  drawPower() {
    const g = this.power,
      x = 754,
      y = 289,
      p = this.powerValue,
      s = KEY_BAND,
      color = SHOTS[shotKind(this.lockedAim, p)].color,
      good = p >= s.min && p <= s.max;
    g.clear();
    g.fillStyle(0x071b30, 0.86);
    g.fillRoundedRect(x - 25, y - 22, 132, 168, 12);
    g.fillStyle(0x334b60);
    g.fillRoundedRect(x, y, 26, 120, 5);
    g.fillStyle(color, 0.25);
    g.fillRect(x - 3, y + 120 * (1 - s.max), 32, 120 * (s.max - s.min));
    g.fillStyle(good ? 0x49eabc : p > s.max ? 0xff9b87 : 0x8cbada);
    g.fillRoundedRect(x, y + 120 * (1 - p), 26, 120 * p, 4);
    g.lineStyle(2, color);
    g.strokeRect(x - 3, y + 120 * (1 - s.max), 32, 120 * (s.max - s.min));
    this.powerLabel.setVisible(true).setText(`${Math.round(p * 100)}% GÜÇ`);
    this.meter(
      p,
      `${Math.round(p * 100)}% · ${good ? "Şimdi bırak!" : p > s.max ? "Fazla güç" : "Gücü artır"}`,
    );
  }
  endMatch(winner) {
    store.record("penalty", this.score);
    this.updateHud();
    if (winner === "player") {
      this.host.audio.play("win");
      if (this.mode === "cup" && this.round < 2) {
        this.host.overlay(
          this.round === 0 ? "Yarı finale çıktın!" : "Finaldesin!",
          `${this.a} : ${this.b} · Bir sonraki rakip seni bekliyor.`,
          [
            [
              "Sonraki maç",
              () => {
                this.round++;
                this.resetMatch();
                this.host.play();
                this.syncShotUI(true);
              },
            ],
            ["Takım seçimi", () => this.menu()],
          ],
        );
        this.host.reward(
          this.round === 0 ? "penalty-semi" : "penalty-final",
          `${this.a} : ${this.b} · ${this.score} puan`,
        );
        return;
      }
      if (this.mode === "cup")
        store.write("penalty-cups", store.read("penalty-cups", 0) + 1);
    }
    this.host.overlay(
      winner === "player"
        ? this.mode === "cup"
          ? "Kupa senin!"
          : "Maçı kazandın!"
        : "Yeni bir deneme",
      `${this.a} : ${this.b} · ${this.score} puan. ${winner === "player" ? "Şut çeşitlerini ve zamanlamayı iyi kullandın." : "Kalecinin konumuna göre şutunu değiştir."}`,
      [
        [
          "Tekrar oyna",
          () => {
            this.round = 0;
            this.score = 0;
            this.resetMatch();
            this.host.play();
            this.syncShotUI(true);
          },
        ],
        ["Takım seçimi", () => this.menu()],
      ],
    );
    if (winner === "player")
      this.host.reward(
        this.mode === "cup" ? "penalty-cup" : "penalty-match",
        `${this.a} : ${this.b} · ${this.score} puan`,
      );
  }
  burst(x, y, color, n) {
    for (let i = 0; i < (this.host.quality === "low" ? 6 : n); i++)
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -50 - Math.random() * 110,
        life: 0.7,
        color,
      });
  }
  animateParticles(dt) {
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 190 * dt;
      this.fx.fillStyle(p.color, clamp(p.life, 0, 1));
      this.fx.fillRect(p.x, p.y, 3, 3);
    }
  }
  destroy() {
    this.shotPanel.remove();
    disposePhaser(this.engine);
    this.particles = [];
  }
}
function hostInsert(host, panel) {
  host.q(".pg-controls").before(panel);
}
