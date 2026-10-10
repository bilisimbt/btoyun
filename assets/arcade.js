(() => {
  "use strict";
  // Each canvas game has three difficulty levels with real gameplay differences:
  // lives, speed curves, hazard types, goals and power-up frequency all change.
  const DIFFS = {
    easy: { label: "Kolay", icon: "🌱" },
    normal: { label: "Orta", icon: "⚡" },
    hard: { label: "Zor", icon: "🔥" },
  };
  const TUNE = {
    "robo-run": {
      easy: { lives: 5, goal: 1500, speed: 260, maxSpeed: 430, gap: [1.25, 1.75], walls: 250, drones: 500, combos: false, power: 0.45, note: "5 can · yavaş başlangıç · 1 500 m" },
      normal: { lives: 3, goal: 2500, speed: 300, maxSpeed: 540, gap: [1.0, 1.45], walls: 120, drones: 250, combos: 1000, power: 0.32, note: "3 can · drone ve yüksek duvarlar · 2 500 m" },
      hard: { lives: 2, goal: 3500, speed: 350, maxSpeed: 660, gap: [0.85, 1.2], walls: 0, drones: 0, combos: 300, power: 0.2, note: "2 can · ikili engeller · hızlı tempo · 3 500 m" },
    },
    "neon-rally": {
      easy: { lives: 1, goal: 1500, speed: 330, maxSpeed: 520, gap: [1.05, 1.4], double: 0, swerve: 0, power: 0.35, note: "Tek çarpma biter · tek engelli sıralar · 1 500 m" },
      normal: { lives: 1, goal: 2500, speed: 380, maxSpeed: 640, gap: [0.85, 1.15], double: 0.35, swerve: 0.12, power: 0.25, note: "Tek çarpma biter · çift engel · şerit değiştiren araçlar · 2 500 m" },
      hard: { lives: 1, goal: 3500, speed: 440, maxSpeed: 760, gap: [0.7, 0.95], double: 0.55, swerve: 0.25, power: 0.16, note: "Tek çarpma biter · yoğun trafik · çok hızlı · 3 500 m" },
    },
    "sky-bounce": {
      easy: { lives: 3, goal: 400, gap: [70, 120], width: [190, 120], moving: 0.15, fragile: 0.08, spring: 0.12, rocket: 0.05, note: "3 can · geniş platformlar · 400 m" },
      normal: { lives: 2, goal: 600, gap: [80, 140], width: [160, 95], moving: 0.3, fragile: 0.2, spring: 0.09, rocket: 0.035, note: "2 can · kırılan ve hareketli platformlar · 600 m" },
      hard: { lives: 1, goal: 800, gap: [95, 160], width: [130, 75], moving: 0.45, fragile: 0.32, spring: 0.07, rocket: 0.02, note: "1 can · dar platformlar · büyük boşluklar · 800 m" },
    },
    "meteor-breaker": {
      easy: { lives: 5, waves: 3, paddle: 175, ball: 330, maxBall: 480, drop: 0.24, descend: 0, note: "5 can · geniş raket · 3 dalga" },
      normal: { lives: 3, waves: 4, paddle: 140, ball: 380, maxBall: 560, drop: 0.16, descend: 0, note: "3 can · çelik bloklar · 4 dalga" },
      hard: { lives: 2, waves: 5, paddle: 110, ball: 430, maxBall: 640, drop: 0.11, descend: 20, note: "2 can · bloklar aşağı iner · 5 dalga" },
    },
    "robot-code": {
      easy: { lives: 5, levels: 5, size: 5, walls: 0.12, stars: 0, extra: 6, maxSteps: 9, speed: 380, note: "5x5 tahta · 5 deneme hakkı · fazladan 6 komut" },
      normal: { lives: 4, levels: 6, size: 6, walls: 0.18, stars: 1, extra: 3, maxSteps: 13, speed: 320, note: "6x6 tahta · 1 yıldız topla · fazladan 3 komut" },
      hard: { lives: 3, levels: 7, size: 7, walls: 0.22, stars: 2, extra: 1, maxSteps: 17, speed: 260, note: "7x7 tahta · 2 yıldız topla · neredeyse en kısa algoritma" },
    },
    "tech-match": {
      easy: { pairs: 6, cols: 4, time: 0, peek: 3, mode: "name", note: "6 çift · cihaz ↔ adı · kartlar başta 3 sn açık" },
      normal: { pairs: 8, cols: 4, time: 100, peek: 1.5, mode: "name", note: "8 çift · cihaz ↔ adı · 100 sn süre" },
      hard: { pairs: 8, cols: 4, time: 120, peek: 0, mode: "job", note: "8 çift · cihazın adı ↔ görevi · 120 sn süre" },
    },
    "safety-detective": {
      easy: { lives: 4, goal: 10, time: 10, minTime: 7, speedUp: 0.2, read: 2.6, note: "4 can · her kart için 10 sn · 10 doğru" },
      normal: { lives: 3, goal: 15, time: 8, minTime: 5, speedUp: 0.2, read: 2.2, note: "3 can · kartlar hızlanır · 15 doğru" },
      hard: { lives: 2, goal: 20, time: 6, minTime: 3.5, speedUp: 0.15, read: 1.8, note: "2 can · çok az süre · 20 doğru" },
    },
    "block-master": {
      easy: { target: 8, hints: 3, rotate: true, timer: 0, set: "easy", note: "Basit parçalar · döndürme · 3 ipucu · 8 çizgi" },
      normal: { target: 15, hints: 1, rotate: true, timer: 0, set: "normal", note: "Tüm parçalar · döndürme · 1 ipucu · 15 çizgi" },
      hard: { target: 20, hints: 0, rotate: false, timer: 15, set: "hard", note: "Büyük parçalar · döndürme yok · 15 sn hamle süresi · 20 çizgi" },
    },
  };
  const games = [
    {
      id: "robo-run",
      name: "Robo Koşu",
      icon: "🤖",
      genre: "Koşu · Refleks",
      color: "#51e6c2",
      cover: "ATLA · KAY",
      summary: "Zıpla, çift zıpla, kayarak drone’ların altından geç. Kalkan ve mıknatıs topla.",
      help: "Robot kendiliğinden koşar. ↑ / Boşluk: zıpla (havada bir kez daha basarak çift zıpla, uzun basınca daha yükseğe çıkar). ↓: kay ya da havadayken hızlı in.",
      controls: [
        ["jump", "Zıpla", "↑ / Boşluk"],
        ["down", "Kay", "↓"],
      ],
    },
    {
      id: "neon-rally",
      name: "Neon Ralli",
      icon: "🚙",
      genre: "Yarış · Beceri",
      color: "#7da5ff",
      cover: "ŞERİT DEĞİŞTİR",
      summary: "Trafikte şerit değiştir, kıl payı geçişlerle puan topla, nitroyla engelleri parçala.",
      help: "← → ile şerit değiştir. Halkalar nitro deposunu doldurur. ↑ / Boşluk basılı tutunca nitro: hızlanırsın ve engelleri kırarsın.",
      controls: [
        ["left", "Sol", "←"],
        ["jump", "Nitro", "↑ / Boşluk"],
        ["right", "Sağ", "→"],
      ],
    },
    {
      id: "block-master",
      name: "Blok Ustası",
      icon: "🧩",
      genre: "Bulmaca · Strateji",
      color: "#c59aff",
      cover: "YERLEŞTİR",
      summary: "Parçaları sürükle veya seç, döndür, satır ve sütunları temizleyerek seri yap.",
      help: "Parçayı tahtaya sürükle ya da önce parçayı, sonra hücreyi seç (parçanın ortası seçtiğin hücreye gelir). R: döndür · H: ipucu · 1-2-3: parça seç.",
      controls: [
        ["rotate", "Döndür", "R"],
        ["hint", "İpucu", "H"],
      ],
    },
    {
      id: "sky-bounce",
      name: "Zıplayan Küre",
      icon: "🔵",
      genre: "Platform · Denge",
      color: "#ffcb68",
      cover: "ZİRVEYE ÇIK",
      summary: "Yaylardan fırla, kırılan platformlara dikkat et, roketle göğe yüksel.",
      help: "Küre kendiliğinden seker. ← → ile yön ver; ekranın bir kenarından çıkınca diğer kenardan girersin. Sarı yaylar yüksek zıplatır, kahverengi platformlar bir kez kullanılır.",
      controls: [
        ["left", "Sol", "←"],
        ["right", "Sağ", "→"],
      ],
    },
    {
      id: "meteor-breaker",
      name: "Meteor Kırıcı",
      icon: "☄️",
      genre: "Arcade · Nişan",
      color: "#ff969b",
      cover: "BLOKLARI KIR",
      summary: "Topu sektir, meteor bloklarını kır. Çoklu top, geniş raket ve yavaşlatma kapsüllerini yakala.",
      help: "Fareyi / parmağını oyun alanında kaydır veya ← → kullan. Boşluk ile topu fırlat. Düşen kapsülleri raketle yakala. Gri çelik bloklar kırılmaz.",
      controls: [
        ["left", "Sol", "←"],
        ["action", "Topu fırlat", "Boşluk"],
        ["right", "Sağ", "→"],
      ],
    },
    {
      id: "robot-code",
      name: "Algoritma Robotu",
      icon: "🤖",
      genre: "Kodlama · Algoritma",
      color: "#6fd3ff",
      cover: "KODLA · ÇALIŞTIR",
      edu: "Kodlama",
      summary: "Ok komutlarıyla bir algoritma yaz, robotu bayrağa götür. Hata yaparsan programını düzelt.",
      help: "Ok tuşları veya aşağıdaki düğmelerle komut dizisini oluştur, sonra ▶ Çalıştır (Boşluk). Robot komutları sırayla uygular. Duvara çarparsa hatalı komutu bul ve düzelt. ⌫ ile son komutu silebilirsin.",
      controls: [
        ["left", "⬅️ Sola", "←"],
        ["jump", "⬆️ Yukarı", "↑"],
        ["down", "⬇️ Aşağı", "↓"],
        ["right", "➡️ Sağa", "→"],
      ],
    },
    {
      id: "tech-match",
      name: "Donanım Eşleştirme",
      icon: "🖱️",
      genre: "Hafıza · Donanım",
      color: "#ffb36b",
      cover: "EŞLEŞTİR · ÖĞREN",
      edu: "Donanım",
      summary: "Kartları çevir: cihazı adıyla, zor seviyede adı göreviyle eşleştir. Giriş ve çıkış birimlerini öğren.",
      help: "İki kart çevir. Cihaz ile adı (zor seviyede adı ile görevi) eşleşirse kartlar açık kalır ve cihaz hakkında kısa bir bilgi görürsün. Art arda doğru eşleştirme seri puanı kazandırır.",
      controls: [],
    },
    {
      id: "safety-detective",
      name: "Güvenlik Dedektifi",
      icon: "🕵️",
      genre: "Dijital vatandaşlık",
      color: "#51e6c2",
      cover: "GÜVENLİ Mİ?",
      edu: "Siber güvenlik",
      summary: "İnternetteki durumları oku: güvenli mi, riskli mi? Her cevaptan sonra nedenini öğren.",
      help: "Ekrana inen kartı oku. Riskliyse ← (sol), güvenliyse → (sağ) tuşuna bas veya ekranın o tarafına dokun. Kart alta ulaşmadan karar ver. Her cevaptan sonra kısa açıklamayı oku.",
      controls: [
        ["left", "⛔ Riskli", "←"],
        ["right", "✅ Güvenli", "→"],
      ],
    },
  ];
  games.unshift(
    {
      id: "penalty",
      name: "Penaltı Arenası",
      genre: "Futbol · Sürükle-vur",
      color: "#43edbd",
      summary: "Topu fareyle ya da parmağınla kaleye sürükle. Eğri çizersen falso alır, hızlı fiskeyle sert vurursun.",
      goal: "Sürükle-vur + kupa",
      premium: true,
      cover: "penalty-cover.webp",
    },
    {
      id: "drive",
      name: "Denge Sürüşü",
      genre: "Arazi · Fizik",
      color: "#ffbf57",
      summary: "Gaz ve frenle dengeyi koru. Uzun parkurlarda rampaları ve köprüleri aş, kontrol noktalarından devam et.",
      goal: "12 uzun parkur",
      premium: true,
      cover: "drive-cover.webp",
    },
    {
      id: "farm",
      name: "Mini Çiftlik",
      genre: "Simülasyon · Keşif",
      color: "#8fd65a",
      summary: "Karakterinle çiftlikte gez. Tohum ek, sula, hasat et, pazarda sat ve çiftliğini büyüt.",
      goal: "Görevler + çiftlik büyütme",
      premium: true,
      cover: "farm-cover.webp",
    },
  );
  // Educational games sit right after the featured games in the library.
  games.splice(3, 0, ...games.splice(-3));
  let active = null,
    audio = null,
    muted = false;
  const voices = new Set();
  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  };
  muted = read("btoyun-arcade-muted", "false") === "true";
  function diffOf(id) {
    const value = read("btoyun-arcade-diff-" + id, "normal");
    return DIFFS[value] ? value : "normal";
  }
  function best(id, diff) {
    const g = games.find((x) => x.id === id);
    const key = g?.premium
      ? "btoyun-play-" + id + "-best"
      : "btoyun-arcade-best-" + id + (diff ? "-" + diff : "");
    return Math.max(0, Number(read(key, 0)) || 0);
  }
  function saveBest(id, diff, score) {
    const value = Math.max(best(id, diff), Math.floor(score));
    write("btoyun-arcade-best-" + id + "-" + diff, value);
    // The library card keeps showing the overall record across difficulties.
    write("btoyun-arcade-best-" + id, Math.max(best(id), value));
    return value;
  }
  function unlockSound() {
    if (muted) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume().catch(() => {});
    } catch {}
  }
  function stopSound() {
    for (const v of voices) {
      try {
        v.stop();
      } catch {}
    }
    voices.clear();
  }
  // Every sound is a short event effect. There is no music, audio loop or background soundtrack.
  function sfx(event) {
    if (muted || !audio || audio.state !== "running") return;
    try {
      const settings = {
          jump: [280, 530, 0.09],
          coin: [900, 1300, 0.08],
          hit: [130, 65, 0.14],
          place: [330, 410, 0.06],
          clear: [720, 980, 0.12],
          win: [560, 1100, 0.2],
          bounce: [400, 600, 0.05],
          power: [500, 1500, 0.18],
          level: [440, 880, 0.16],
          tick: [880, 860, 0.03],
        },
        [from, to, duration] = settings[event] || settings.place,
        osc = audio.createOscillator(),
        gain = audio.createGain(),
        now = audio.currentTime;
      osc.type = event === "hit" ? "triangle" : event === "power" ? "square" : "sine";
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(event === "power" ? 0.05 : 0.09, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      voices.add(osc);
      osc.onended = () => {
        voices.delete(osc);
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {}
  }
  const W = 900,
    H = 520,
    rand = (min, max) => min + Math.random() * (max - min),
    pick = (list) => list[Math.floor(Math.random() * list.length)],
    lerp = (a, b, t) => a + (b - a) * t,
    clamp = (v, min, max) => Math.max(min, Math.min(max, v)),
    overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    fmt = (n) => Math.floor(n).toLocaleString("tr-TR");
  function stopArcade() {
    window.stopPremiumGame?.();
    if (active) {
      active.destroy();
      active = null;
    }
    stopSound();
    document.querySelector(".dialog")?.classList.remove("arc-dialog");
  }
  function goalText(g, diff) {
    const t = TUNE[g.id][diff];
    if (g.id === "robo-run" || g.id === "neon-rally") return fmt(t.goal) + " m";
    if (g.id === "sky-bounce") return t.goal + " m yükseklik";
    if (g.id === "meteor-breaker") return t.waves + " dalga";
    if (g.id === "robot-code") return t.levels + " bölüm";
    if (g.id === "tech-match") return t.pairs + " çift";
    if (g.id === "safety-detective") return t.goal + " doğru cevap";
    return t.target + " çizgi";
  }
  function statLabel(g) {
    return { "robo-run": "Mesafe", "neon-rally": "Mesafe", "sky-bounce": "Yükseklik", "meteor-breaker": "Dalga", "block-master": "Çizgi", "robot-code": "Bölüm", "tech-match": "Eşleşme", "safety-detective": "Doğru" }[g.id];
  }
  function thirdLabel(g, diff) {
    if (g.id === "robot-code") return "Deneme hakkı";
    if (g.id === "tech-match") return TUNE[g.id][diff].time ? "Süre" : "Hamle";
    if (g.id !== "block-master") return "Can";
    return TUNE[g.id][diff].timer ? "Hamle süresi" : "İpucu";
  }
  function diffPicker(g, diff) {
    return `<div class="arc-diff" id="arcDiff"><div role="radiogroup" aria-label="Zorluk seviyesi">${Object.entries(DIFFS)
      .map(([key, d]) => `<button type="button" role="radio" data-arc-diff="${key}" aria-checked="${key === diff}">${d.icon} ${d.label}</button>`)
      .join("")}</div><p class="arc-diff-note" id="arcDiffNote">${esc(TUNE[g.id][diff].note)}</p></div>`;
  }
  function openArcade(g) {
    stopArcade();
    algoStop();
    const diff = diffOf(g.id),
      puzzle = g.id === "block-master",
      dom = { "robot-code": '<div id="arcRobot" class="arc-robot"></div>', "tech-match": '<div id="arcMatch" class="arc-match" role="group" aria-label="Eşleştirme kartları"></div>' }[g.id];
    openModal(
      g.name,
      g.genre,
      `<div class="arc-game" style="--arc-accent:${g.color}"><div class="arc-hud"><div><span>Puan</span><b id="arcScore">0</b></div><div><span>${statLabel(g)}</span><b id="arcMetric">0</b></div><div><span id="arcThirdLabel">${thirdLabel(g, diff)}</span><b id="arcLives">-</b></div><div><span>Rekor · ${DIFFS[diff].label}</span><b id="arcBest">${fmt(best(g.id, diff))}</b></div></div><div class="arc-player-tools"><button id="arcPause" disabled>Ⅱ Duraklat</button><button id="arcRestart">↻ Yeniden</button><button id="arcSound" aria-pressed="${!muted}">${muted ? "🔇 Efektler kapalı" : "🔊 Efektler açık"}</button></div><div id="arcSurface" class="arc-surface ${puzzle ? "arc-puzzle-surface" : ""} ${dom ? "arc-dom-surface" : ""}">${dom ? dom : puzzle ? '<div id="arcBoard" class="arc-board" role="group" aria-label="8 satır ve 8 sütunlu blok tahtası"></div><div id="arcPieces" class="arc-pieces" role="group" aria-label="Yerleştirilecek parçalar"></div>' : '<canvas id="arcCanvas" width="900" height="520" tabindex="0" aria-label="' + esc(g.name) + " oyun alanı. " + esc(g.help) + '">' + esc(g.help) + "</canvas>"}<div id="arcOverlay" class="arc-overlay"><div><span class="arc-start-icon">${g.icon}</span><h3 id="arcOverlayTitle">${esc(g.name)}</h3><p id="arcOverlayText">${esc(g.help)}</p>${diffPicker(g, diff)}<button class="btn" id="arcStart">Oyuna başla</button></div></div></div><div class="arc-touch-controls">${g.controls.map(([key, label, hint]) => `<button data-arc-control="${key}" aria-label="${esc(label)}"><b>${esc(label)}</b><small>${esc(hint)}</small></button>`).join("")}</div><p class="arc-status" id="arcStatus" role="status" aria-live="polite">Hedef: ${goalText(g, diff)} · P tuşu ile duraklatabilirsin.</p><p class="arc-sound-note">Müzik yok · Yalnızca kısa oyun efektleri</p></div>`,
    );
    $(".dialog").classList.add("arc-dialog");
    $(".dialog").scrollTop = 0;
    const Game = { "robo-run": RoboRun, "neon-rally": Rally, "sky-bounce": Bounce, "meteor-breaker": Breaker, "block-master": BlockGame, "robot-code": RobotCode, "tech-match": TechMatch, "safety-detective": SafetyGame }[g.id];
    active = new Game(g, diff);
    $("#arcStart").onclick = () => {
      unlockSound();
      active?.start();
    };
    document.querySelectorAll("[data-arc-diff]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.arcDiff === diff && active?.mode === "ready") return;
          write("btoyun-arcade-diff-" + g.id, b.dataset.arcDiff);
          openArcade(g);
          $("#arcStart")?.focus({ preventScroll: true });
        }),
    );
    $("#arcPause").onclick = () => active?.togglePause();
    $("#arcRestart").onclick = () => openArcade(g);
    $("#arcSound").onclick = () => {
      muted = !muted;
      write("btoyun-arcade-muted", muted);
      if (muted) stopSound();
      else unlockSound();
      $("#arcSound").textContent = muted ? "🔇 Efektler kapalı" : "🔊 Efektler açık";
      $("#arcSound").setAttribute("aria-pressed", String(!muted));
    };
    active.draw();
    active.hud();
  }
  class BaseGame {
    constructor(g, diff) {
      this.g = g;
      this.diff = diff;
      this.t = TUNE[g.id][diff];
      this.view = window.BTOyunExperience?.mount({
        root: $(".arc-game"),
        stage: $("#arcSurface"),
        tools: $(".arc-player-tools"),
        beforeDialog: () => {
          if (this.mode === "playing") this.pause();
        },
        status: (value) => this.notice(value),
      });
      this.mode = "ready";
      this.score = 0;
      this.abort = new AbortController();
      this.keys = new Set();
      this.sources = new Map();
      this.pointers = new Map();
      this.root = $(".arc-game");
      this.hudValues = {};
      this.messageUntil = 0;
      this.elapsed = 0;
      this.lives = this.t.lives || 0;
      this.maxLives = this.lives;
      const opts = { signal: this.abort.signal };
      window.addEventListener("keydown", (e) => this.key(e, true), opts);
      window.addEventListener("keyup", (e) => this.key(e, false), opts);
      window.addEventListener(
        "blur",
        () => {
          if (this.mode === "playing") this.pause();
        },
        opts,
      );
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden && this.mode === "playing") this.pause();
        },
        opts,
      );
      document.querySelectorAll("[data-arc-control]").forEach((b) => {
        const key = b.dataset.arcControl;
        b.addEventListener(
          "pointerdown",
          (e) => {
            if (this.mode !== "playing" || e.button !== 0) return;
            e.preventDefault();
            unlockSound();
            b.setPointerCapture(e.pointerId);
            this.pointers.set(e.pointerId, b);
            this.press(key, true, "pointer:" + e.pointerId);
          },
          opts,
        );
        const release = (e) => {
          if (this.pointers.delete(e.pointerId)) this.press(key, false, "pointer:" + e.pointerId);
        };
        for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(event, release, opts);
        b.addEventListener(
          "keydown",
          (e) => {
            if (!["Enter", " "].includes(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            if (!e.repeat && this.mode === "playing") {
              unlockSound();
              this.press(key, true, "button:" + e.code);
            }
          },
          opts,
        );
        b.addEventListener(
          "keyup",
          (e) => {
            if (["Enter", " "].includes(e.key)) {
              e.preventDefault();
              this.press(key, false, "button:" + e.code);
            }
          },
          opts,
        );
      });
    }
    key(e, down) {
      const source = "keyboard:" + e.code,
        held = this.sources.get(source);
      if (!down && held) {
        e.preventDefault();
        this.press(held, false, source);
        return;
      }
      // Focus can fall back to <body> after a clicked control is re-rendered; the open game still owns the keys.
      if ((!this.root.contains(document.activeElement) && document.activeElement !== document.body) || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const key = {
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
        ArrowUp: "jump",
        w: "jump",
        W: "jump",
        ArrowDown: "down",
        s: "down",
        S: "down",
        " ": "action",
        r: "rotate",
        R: "rotate",
        h: "hint",
        H: "hint",
        1: "piece1",
        2: "piece2",
        3: "piece3",
        Backspace: "back",
      }[e.key];
      if ((e.key === "p" || e.key === "P") && down && !e.repeat) {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (!key || (e.target.closest("button") && e.key === " ") || this.mode !== "playing") return;
      e.preventDefault();
      if (!e.repeat) {
        if (down) unlockSound();
        this.press(key, down, source);
      }
    }
    press(key, down, source) {
      if (!down) key = this.sources.get(source) || key;
      if (this.mode !== "playing" && down) return;
      const before = this.keys.has(key);
      if (down) this.sources.set(source, key);
      else this.sources.delete(source);
      const after = [...this.sources.values()].includes(key);
      if (after) this.keys.add(key);
      else this.keys.delete(key);
      this.root.querySelectorAll("[data-arc-control]").forEach((b) => b.classList.toggle("is-held", this.keys.has(b.dataset.arcControl)));
      if (after && !before) this.command(key);
      if (!after && before) this.release(key);
    }
    command() {}
    release() {}
    held(...keys) {
      return keys.some((k) => this.keys.has(k));
    }
    clearKeys() {
      this.keys.clear();
      this.sources.clear();
      const captures = [...this.pointers];
      this.pointers.clear();
      for (const [id, b] of captures) if (b.hasPointerCapture(id)) b.releasePointerCapture(id);
      this.root.querySelectorAll("[data-arc-control]").forEach((b) => b.classList.remove("is-held"));
    }
    start() {
      if (this.mode === "over") return openArcade(this.g);
      const fresh = this.mode === "ready";
      this.mode = "playing";
      $("#arcOverlay").hidden = true;
      $("#arcPause").disabled = false;
      $("#arcPause").textContent = "Ⅱ Duraklat";
      this.clearKeys();
      this.accumulator = 0;
      this.hudTick = 0;
      this.last = performance.now();
      this.begin?.(fresh);
      this.run();
      $("#arcCanvas")?.focus({ preventScroll: true });
    }
    run() {}
    pause() {
      if (this.mode !== "playing") return;
      this.mode = "paused";
      cancelAnimationFrame(this.raf);
      this.clearKeys();
      stopSound();
      this.overlay("Mola zamanı", "Hazır olduğunda kaldığın yerden devam et.", "Devam et", false);
      $("#arcPause").textContent = "▶ Devam et";
    }
    togglePause() {
      if (this.mode === "playing") this.pause();
      else if (this.mode === "paused") {
        unlockSound();
        this.start();
      }
    }
    overlay(title, text, button, picker = true) {
      $("#arcOverlayTitle").textContent = title;
      $("#arcOverlayText").textContent = text;
      $("#arcStart").textContent = button;
      $("#arcDiff").hidden = !picker;
      $("#arcOverlay").hidden = false;
    }
    finish(won = false, award = true) {
      if (this.mode === "over") return;
      this.mode = "over";
      cancelAnimationFrame(this.raf);
      this.clearKeys();
      $("#arcPause").disabled = true;
      const previous = best(this.g.id, this.diff),
        record = saveBest(this.g.id, this.diff, this.score);
      $("#arcBest").textContent = fmt(record);
      this.overlay(
        won ? "Görev tamamlandı!" : "Bir tur daha?",
        fmt(this.score) +
          " puan · " +
          DIFFS[this.diff].label +
          (this.score > previous && this.score > 0 ? " · Yeni rekor!" : "") +
          (this.summary ? " · " + this.summary() : "") +
          (won ? (this.diff === "hard" ? " · Zor seviyeyi bitirdin, harika!" : " · Bir üst zorluğu dene!") : " · Yeniden deneyerek puanını artır."),
        "Yeniden oyna",
      );
      sfx(won ? "win" : "hit");
      this.hud();
      if (won && award)
        window.BTOyunExperience?.award(this.g.id, {
          target: $("#arcOverlay>div"),
          stage: $("#arcSurface"),
          detail: fmt(this.score) + " puan · " + DIFFS[this.diff].label,
        });
    }
    notice(text, bad = false) {
      const box = $("#arcStatus");
      if (!box) return;
      box.textContent = text;
      box.classList.toggle("bad", bad);
      this.messageUntil = this.elapsed + 2.5;
    }
    metricText() {
      return "0";
    }
    thirdText() {
      const hearts = "♥ ".repeat(Math.max(0, this.lives)).trim() || "0";
      return this.shield ? hearts + " 🛡" : hearts;
    }
    hud() {
      const update = (id, value) => {
        const element = this.root.querySelector("#" + id);
        if (element && this.hudValues[id] !== value) {
          element.textContent = value;
          this.hudValues[id] = value;
        }
      };
      update("arcScore", fmt(this.score));
      update("arcMetric", String(this.metricText()));
      update("arcLives", String(this.thirdText()));
      if (this.messageUntil && this.elapsed > this.messageUntil) {
        $("#arcStatus").classList.remove("bad");
        $("#arcStatus").textContent = "Hedef: " + goalText(this.g, this.diff) + " · " + DIFFS[this.diff].label;
        this.messageUntil = 0;
      }
    }
    destroy() {
      this.view?.destroy();
      cancelAnimationFrame(this.raf);
      this.abort.abort();
      this.clearKeys();
      this.mode = "closed";
      this.root.remove();
    }
    draw() {}
  }

  // ---------------------------------------------------------------- canvas games
  class ActionGame extends BaseGame {
    constructor(g, diff) {
      super(g, diff);
      this.canvas = $("#arcCanvas");
      this.ctx = this.canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
      this.ctx.scale(dpr, dpr);
      this.particles = [];
      this.floats = [];
      this.shakeTime = 0;
      this.countdown = 0;
      this.invincible = 0;
      this.shield = 0;
      this.chain = 0;
      this.level = 1;
      const opts = { signal: this.abort.signal };
      this.canvas.addEventListener(
        "pointerdown",
        (e) => {
          if (this.mode !== "playing") return;
          e.preventDefault();
          this.canvas.setPointerCapture(e.pointerId);
          this.canvas.focus({ preventScroll: true });
          unlockSound();
          this.pointer("down", this.canvasPos(e), e);
        },
        opts,
      );
      this.canvas.addEventListener(
        "pointermove",
        (e) => {
          if (this.mode === "playing") this.pointer("move", this.canvasPos(e), e);
        },
        opts,
      );
      for (const name of ["pointerup", "pointercancel"])
        this.canvas.addEventListener(
          name,
          (e) => {
            if (this.mode === "playing") this.pointer("up", this.canvasPos(e), e);
          },
          opts,
        );
      this.init();
    }
    init() {}
    pointer() {}
    canvasPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
    }
    begin(fresh) {
      if (fresh) this.countdown = 2.4;
      else this.countdown = Math.max(this.countdown, 0.8);
    }
    get mult() {
      return Math.min(5, 1 + Math.floor(this.chain / 5));
    }
    // Fixed physics steps keep controls and collisions consistent on slower screens.
    advance(dt) {
      if (this.mode !== "playing") return;
      this.accumulator = (this.accumulator || 0) + clamp(dt, 0, 0.2);
      const step = 1 / 120;
      while (this.accumulator + 1e-9 >= step && this.mode === "playing") {
        this.accumulator = Math.max(0, this.accumulator - step);
        this.shakeTime = Math.max(0, this.shakeTime - step);
        this.particles = this.particles.filter((p) => {
          p.life -= step;
          p.x += p.vx * step;
          p.y += p.vy * step;
          p.vy += (p.gravity || 0) * step;
          return p.life > 0;
        });
        this.floats = this.floats.filter((f) => {
          f.life -= step;
          f.y -= 38 * step;
          return f.life > 0;
        });
        if (this.countdown > 0) {
          const before = Math.ceil(this.countdown - 0.4);
          this.countdown -= step;
          if (Math.ceil(this.countdown - 0.4) !== before && this.countdown > 0.4) sfx("tick");
          continue;
        }
        this.elapsed += step;
        this.invincible = Math.max(0, this.invincible - step);
        this.step(step);
      }
    }
    step() {}
    run() {
      this.raf = requestAnimationFrame((t) => {
        if (this.mode !== "playing") return;
        if (!this.canvas.isConnected || !$("#modal").classList.contains("show")) return stopArcade();
        const dt = clamp((t - this.last) / 1000, 0, 0.2);
        this.last = t;
        this.advance(dt);
        this.draw();
        this.hudTick = (this.hudTick || 0) + dt;
        if (this.hudTick >= 0.1 || this.mode !== "playing") {
          this.hudTick = 0;
          this.hud();
        }
        if (this.mode === "playing") this.run();
      });
    }
    burst(x, y, color, count = 12, speed = 130) {
      for (let i = 0; i < count; i++)
        this.particles.push({ x, y, vx: rand(-speed, speed), vy: rand(-speed, speed), life: rand(0.25, 0.6), color, gravity: 160 });
    }
    float(x, y, text, color = "#ffe76e") {
      this.floats.push({ x, y, text, color, life: 0.9 });
      if (this.floats.length > 14) this.floats.shift();
    }
    shake(time = 0.25) {
      this.shakeTime = Math.max(this.shakeTime, time);
    }
    hurt(x, y) {
      if (this.invincible) return false;
      this.chain = 0;
      this.shake(0.3);
      if (this.shield) {
        this.shield = 0;
        this.invincible = 1;
        sfx("bounce");
        this.burst(x, y, "#8fe9ff", 18);
        this.float(x, y - 30, "Kalkan kırıldı", "#8fe9ff");
        this.notice("Kalkan çarpışmayı engelledi!");
        return false;
      }
      this.lives--;
      this.invincible = 1.6;
      sfx("hit");
      this.burst(x, y, "#ff969b", 16);
      this.notice("Çarpışma! " + this.lives + " can kaldı.", true);
      if (this.lives <= 0) this.finish(false);
      return true;
    }
    levelUp(text) {
      this.level++;
      sfx("level");
      this.float(W / 2, 120, "Seviye " + this.level + " · " + text, "#a8f5ff");
      this.notice("Seviye " + this.level + ": " + text);
    }
    bg() {
      if (!this.bgCanvas) {
        this.bgCanvas = document.createElement("canvas");
        this.bgCanvas.width = W;
        this.bgCanvas.height = H;
        const c = this.bgCanvas.getContext("2d"),
          sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#0d1530");
        sky.addColorStop(1, "#18223f");
        c.fillStyle = sky;
        c.fillRect(0, 0, W, H);
        c.strokeStyle = "#ffffff0d";
        c.lineWidth = 1;
        for (let x = 0; x < W; x += 60) {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, H);
          c.stroke();
        }
        for (let y = 0; y < H; y += 60) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }
        for (let i = 0; i < 45; i++) {
          c.fillStyle = i % 4 ? "#7e8baa" : "#c9d6f4";
          c.fillRect((i * 137) % W, (i * 91) % H, i % 3 === 0 ? 3 : 2, 2);
        }
      }
      this.ctx.drawImage(this.bgCanvas, 0, 0, W, H);
    }
    rect(x, y, w, h, color, r = 7) {
      const c = this.ctx;
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(x, y, w, h, r);
      c.fill();
    }
    circle(x, y, r, color) {
      const c = this.ctx;
      c.fillStyle = color;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    label(text, x, y, size = 18, color = "#fff", align = "center") {
      const c = this.ctx;
      c.font = `800 ${size}px system-ui, "Segoe UI", sans-serif`;
      c.textAlign = align;
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeStyle = "#0b1226";
      c.strokeText(text, x, y);
      c.fillStyle = color;
      c.fillText(text, x, y);
    }
    emoji(icon, x, y, size) {
      const c = this.ctx;
      c.font = size + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(icon, x, y);
    }
    ring(x, y, t = 0) {
      const c = this.ctx,
        squash = Math.abs(Math.cos(this.elapsed * 4 + t));
      c.strokeStyle = "#ffe76e";
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(x, y, 4 + 7 * squash, 11, 0, 0, Math.PI * 2);
      c.stroke();
    }
    powerIcon(kind, x, y) {
      const info = POWERS[kind];
      this.circle(x, y, 17, info.color + "44");
      const c = this.ctx;
      c.strokeStyle = info.color;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, 17 + Math.sin(this.elapsed * 6) * 2, 0, Math.PI * 2);
      c.stroke();
      this.emoji(info.icon, x, y + 1, 20);
    }
    progressBar(value, text) {
      const c = this.ctx,
        x = 20,
        y = 14,
        w = W - 40;
      this.rect(x, y, w, 10, "#ffffff1a", 5);
      this.rect(x, y, Math.max(10, w * clamp(value, 0, 1)), 10, this.g.color, 5);
      this.label(text, W - 22, 40, 15, "#dfe8fb", "right");
      if (this.mult > 1) this.label("Seri ×" + this.mult, 22, 40, 16, "#ffe76e", "left");
      c.textAlign = "left";
    }
    draw() {
      const c = this.ctx;
      c.save();
      if (this.shakeTime > 0) c.translate(rand(-5, 5) * this.shakeTime * 3, rand(-5, 5) * this.shakeTime * 3);
      this.bg();
      this.render(c);
      this.particles.forEach((p) => {
        c.globalAlpha = Math.min(1, p.life * 3);
        this.rect(p.x, p.y, 5, 5, p.color, 2);
      });
      c.globalAlpha = 1;
      this.floats.forEach((f) => {
        c.globalAlpha = Math.min(1, f.life * 2);
        this.label(f.text, f.x, f.y, 17, f.color);
      });
      c.globalAlpha = 1;
      c.restore();
      this.renderTop?.(c);
      if (this.mode === "playing" && this.countdown > 0) {
        const n = Math.ceil(this.countdown - 0.4);
        c.fillStyle = "#0b122680";
        c.fillRect(0, 0, W, H);
        this.label(n > 0 ? String(n) : "BAŞLA!", W / 2, H / 2, n > 0 ? 96 : 64, this.g.color);
        this.label(DIFFS[this.diff].icon + " " + DIFFS[this.diff].label + " · Hedef: " + goalText(this.g, this.diff), W / 2, H / 2 + 80, 20, "#dfe8fb");
      }
    }
    render() {}
  }
  const POWERS = {
    shield: { icon: "🛡️", color: "#8fe9ff", name: "Kalkan" },
    magnet: { icon: "🧲", color: "#ff8fb1", name: "Mıknatıs" },
    heart: { icon: "❤️", color: "#ff7b8a", name: "Can" },
    nitro: { icon: "⚡", color: "#ffd166", name: "Nitro" },
    rocket: { icon: "🚀", color: "#ffb36b", name: "Roket" },
    wide: { icon: "↔️", color: "#7da5ff", name: "Geniş raket" },
    multi: { icon: "✳️", color: "#51e6c2", name: "Çoklu top" },
    slow: { icon: "🐢", color: "#c59aff", name: "Yavaş top" },
    life: { icon: "❤️", color: "#ff7b8a", name: "Can" },
  };

  // ---------------------------------------------------------------- Robo Koşu
  const GROUND = 450;
  class RoboRun extends ActionGame {
    init() {
      this.p = { x: 140, y: GROUND - 48, w: 44, h: 48, vy: 0, onGround: true, jumps: 0, slide: false };
      this.distance = 0;
      this.speed = this.t.speed;
      this.objects = [];
      this.coins = [];
      this.powers = [];
      this.spawn = 1.2;
      this.magnet = 0;
      this.cleared = 0;
      this.rings = 0;
      this.bonus = 0;
      this.scroll = 0;
      this.skyline = Array.from({ length: 16 }, (_, i) => ({ x: i * 70, w: rand(40, 66), h: rand(50, 150) }));
    }
    metricText() {
      return fmt(this.distance) + " / " + fmt(this.t.goal) + " m";
    }
    summary() {
      return this.rings + " halka · " + this.cleared + " engel";
    }
    command(key) {
      const p = this.p;
      if (["jump", "action"].includes(key)) {
        if (p.onGround) {
          p.vy = -740;
          p.onGround = false;
          p.jumps = 1;
          sfx("jump");
        } else if (p.jumps < 2) {
          p.vy = -640;
          p.jumps = 2;
          sfx("jump");
          this.burst(p.x + p.w / 2, p.y + p.h, "#51e6c2", 8, 90);
        }
      }
    }
    release(key) {
      // Releasing jump early cuts the arc, so taps make short hops and holds jump high.
      if (["jump", "action"].includes(key) && this.p.vy < -330 && !this.held("jump", "action")) this.p.vy = -330;
    }
    pointer(type, pos) {
      if (type === "up") return this.press("down", false, "canvas");
      if (type !== "down") return;
      if (pos.y > GROUND - 10) this.press("down", true, "canvas");
      else this.command("jump");
    }
    spawnPattern() {
      const t = this.t,
        d = this.distance,
        x = W + 40,
        options = ["crate", "crate"];
      if (d >= t.walls) options.push("wall", "long");
      if (d >= t.drones) options.push("drone", "drone");
      if (t.combos !== false && d >= t.combos) options.push("combo");
      const kind = pick(options);
      const crate = (cx, w = rand(40, 54)) => ({ kind: "crate", x: cx, y: GROUND - 42, w, h: 42 });
      const drone = (cx) => ({ kind: "drone", x: cx, y: GROUND - 66, w: 52, h: 34, phase: rand(0, 6) });
      if (kind === "crate") this.objects.push(crate(x));
      if (kind === "wall") this.objects.push({ kind: "wall", x, y: GROUND - 80, w: 34, h: 80 });
      if (kind === "long") this.objects.push(crate(x, 96));
      if (kind === "drone") this.objects.push(drone(x));
      if (kind === "combo") {
        this.objects.push(crate(x));
        this.objects.push(drone(x + this.speed * 1.05));
      }
      // Rings follow the safe line: above jumps, at floor height for drones.
      const ringY = kind === "drone" ? GROUND - 20 : GROUND - 150,
        count = kind === "drone" ? 3 : 4;
      for (let i = 0; i < count; i++)
        this.coins.push({ x: x + (kind === "drone" ? -30 + i * 45 : -40 + i * 42), y: ringY + (kind === "drone" ? 0 : -Math.sin((i / (count - 1)) * Math.PI) * 30) });
      if (Math.random() < t.power) {
        const kinds = ["shield", "magnet"];
        if (this.lives < this.maxLives) kinds.push("heart");
        this.powers.push({ kind: pick(kinds), x: x + this.speed * 0.6, y: GROUND - 190 });
      }
      const [a, b] = t.gap,
        squeeze = 1 - 0.25 * clamp(d / t.goal, 0, 1);
      this.spawn = rand(a, b) * squeeze + (kind === "combo" ? 1 : kind === "long" ? 0.25 : 0);
    }
    step(dt) {
      const t = this.t,
        p = this.p,
        progress = clamp(this.distance / t.goal, 0, 1);
      this.speed = lerp(t.speed, t.maxSpeed, progress);
      this.distance += (this.speed * dt) / 10;
      this.scroll += this.speed * dt;
      if (Math.floor(this.distance / 500) + 1 > this.level) this.levelUp("hız artıyor!");
      this.magnet = Math.max(0, this.magnet - dt);
      const sliding = this.held("down") && p.onGround;
      if (sliding !== p.slide) {
        p.slide = sliding;
        p.h = sliding ? 26 : 48;
        p.y = GROUND - p.h;
      }
      p.vy += (this.held("down") && !p.onGround ? 4200 : 2000) * dt;
      p.y += p.vy * dt;
      if (p.y >= GROUND - p.h) {
        if (!p.onGround && p.vy > 300) this.burst(p.x + p.w / 2, GROUND, "#51e6c2", 5, 60);
        p.y = GROUND - p.h;
        p.vy = 0;
        p.onGround = true;
        p.jumps = 0;
      } else p.onGround = false;
      this.spawn -= dt;
      if (this.spawn <= 0) this.spawnPattern();
      const box = { x: p.x + 7, y: p.y + 5, w: p.w - 14, h: p.h - 7 };
      for (const o of this.objects) {
        o.x -= this.speed * dt;
        if (o.kind === "drone") o.y = GROUND - 66 + Math.sin(this.elapsed * 5 + o.phase) * 3;
        if (!o.hit && overlap(box, o)) {
          o.hit = true;
          this.hurt(p.x + p.w / 2, p.y);
          if (this.mode === "over") return;
        }
        if (!o.hit && !o.passed && o.x + o.w < p.x) {
          o.passed = true;
          this.cleared++;
          this.bonus += 10 * this.mult;
          this.float(p.x + 30, p.y - 20, "+" + 10 * this.mult, "#a8f5ff");
        }
      }
      this.objects = this.objects.filter((o) => o.x > -140);
      const cx = p.x + p.w / 2,
        cy = p.y + p.h / 2;
      this.coins = this.coins.filter((c) => {
        c.x -= this.speed * dt;
        if (this.magnet && Math.hypot(c.x - cx, c.y - cy) < 260) {
          c.x += (cx - c.x) * Math.min(1, dt * 9);
          c.y += (cy - c.y) * Math.min(1, dt * 9);
        }
        if (Math.hypot(c.x - cx, c.y - cy) < 34) {
          this.rings++;
          this.chain++;
          this.bonus += 20 * this.mult;
          this.burst(c.x, c.y, "#ffe76e", 6, 80);
          sfx("coin");
          if (this.chain % 5 === 0) this.float(cx, p.y - 40, "Seri ×" + this.mult + "!", "#ffe76e");
          return false;
        }
        return c.x > -50;
      });
      this.powers = this.powers.filter((o) => {
        o.x -= this.speed * dt;
        if (Math.hypot(o.x - cx, o.y - cy) < 46) {
          this.collect(o.kind, o.x, o.y);
          return false;
        }
        return o.x > -50;
      });
      this.score = Math.floor(this.distance) + this.bonus;
      if (this.distance >= t.goal && this.mode === "playing") {
        this.bonus += this.lives * 150;
        this.score = Math.floor(this.distance) + this.bonus;
        this.finish(true);
      }
    }
    collect(kind, x, y) {
      sfx("power");
      this.bonus += 50;
      this.burst(x, y, POWERS[kind].color, 14);
      this.float(x, y - 30, POWERS[kind].name + "!", POWERS[kind].color);
      if (kind === "shield") this.shield = 1;
      if (kind === "magnet") this.magnet = 8;
      if (kind === "heart") this.lives = Math.min(this.maxLives, this.lives + 1);
      this.notice(kind === "shield" ? "Kalkan aktif: bir çarpışmayı engeller." : kind === "magnet" ? "Mıknatıs 8 saniye halkaları çeker." : "Bir can kazandın!");
    }
    render(c) {
      // Far city silhouettes give a sense of speed without distracting from hazards.
      c.fillStyle = "#1c2a4a";
      for (const b of this.skyline) {
        const x = ((((b.x - this.scroll * 0.15) % 1120) + 1120) % 1120) - 110;
        c.fillRect(x, GROUND - b.h, b.w, b.h);
      }
      this.rect(0, GROUND, W, H - GROUND, "#202f46", 0);
      this.rect(0, GROUND, W, 5, "#51e6c2", 0);
      for (let x = -(this.scroll % 80); x < W; x += 80) this.rect(x, GROUND + 35, 36, 4, "#41546e", 0);
      for (const o of this.objects) {
        if (o.kind === "drone") {
          this.rect(o.x, o.y + 8, o.w, o.h - 10, o.hit ? "#7d6a9e" : "#b58cff", 10);
          this.circle(o.x + o.w / 2, o.y + 18, 6, "#ff5f7a");
          c.strokeStyle = "#dcd0ff";
          c.lineWidth = 3;
          const spin = Math.sin(this.elapsed * 40) * 12;
          c.beginPath();
          c.moveTo(o.x + 4 - spin, o.y + 3);
          c.lineTo(o.x + 4 + spin, o.y + 3);
          c.moveTo(o.x + o.w - 4 - spin, o.y + 3);
          c.lineTo(o.x + o.w - 4 + spin, o.y + 3);
          c.stroke();
        } else {
          const color = o.kind === "wall" ? "#ff7b8a" : "#ffb36b";
          this.rect(o.x, o.y, o.w, o.h, o.hit ? "#8a6170" : color, 6);
          c.strokeStyle = "#00000033";
          c.lineWidth = 3;
          for (let x = o.x + 12; x < o.x + o.w - 4; x += 20) {
            c.beginPath();
            c.moveTo(x, o.y + 5);
            c.lineTo(x - 8, o.y + o.h - 5);
            c.stroke();
          }
        }
      }
      this.coins.forEach((q, i) => this.ring(q.x, q.y, i));
      this.powers.forEach((o) => this.powerIcon(o.kind, o.x, o.y));
      const p = this.p;
      if (!this.invincible || Math.floor(this.elapsed * 10) % 2 === 0) {
        c.save();
        c.translate(p.x + p.w / 2, p.y + p.h);
        if (p.slide) c.scale(1.25, 0.58);
        else if (!p.onGround) c.rotate(p.jumps === 2 ? this.elapsed * 12 : -0.12);
        this.emoji("🤖", 0, -25, 50);
        c.restore();
      }
      if (this.shield) {
        c.strokeStyle = "#8fe9ffcc";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(p.x + p.w / 2, p.y + p.h / 2, 38, 0, Math.PI * 2);
        c.stroke();
      }
      if (this.magnet) this.label("🧲 " + Math.ceil(this.magnet), p.x + p.w / 2, p.y - 24, 14, "#ff8fb1");
    }
    renderTop() {
      this.progressBar(this.distance / this.t.goal, "Seviye " + this.level + " · " + Math.round(this.speed / 10) + " m/sn");
    }
  }

  // ---------------------------------------------------------------- Neon Ralli
  const LANES = [280, 450, 620];
  class Rally extends ActionGame {
    init() {
      this.lane = 1;
      this.p = { x: 450, y: 430, tilt: 0 };
      this.distance = 0;
      this.speed = this.t.speed;
      this.objects = [];
      this.coins = [];
      this.powers = [];
      this.spawn = 1;
      this.nitro = 40;
      this.magnet = 0;
      this.bonus = 0;
      this.nearMiss = 0;
      this.smashed = 0;
      this.scroll = 0;
      this.boosting = false;
    }
    metricText() {
      return fmt(this.distance) + " / " + fmt(this.t.goal) + " m";
    }
    summary() {
      return this.nearMiss + " kıl payı · " + this.smashed + " nitro kırışı";
    }
    command(key) {
      if (["left", "right"].includes(key)) {
        const next = clamp(this.lane + (key === "left" ? -1 : 1), 0, 2);
        if (next !== this.lane) {
          this.lane = next;
          this.p.tilt = key === "left" ? -0.25 : 0.25;
          sfx("place");
        }
      }
      if (["jump", "action"].includes(key) && this.nitro < 10) this.notice("Nitro deposu boş. Halka topla!", true);
    }
    pointer(type, pos) {
      if (type === "up") return this.press("jump", false, "canvas");
      if (type !== "down") return;
      if (Math.abs(pos.x - this.p.x) < 60 && pos.y > 300) this.press("jump", true, "canvas");
      else this.command(pos.x < this.p.x ? "left" : "right");
    }
    makeRow() {
      const t = this.t,
        progress = clamp(this.distance / t.goal, 0, 1),
        blocked = Math.random() < t.double * (0.4 + progress) ? 2 : 1,
        lanes = [0, 1, 2].sort(() => Math.random() - 0.5),
        taken = lanes.slice(0, blocked),
        free = lanes.slice(blocked);
      for (const lane of taken) {
        const kind = Math.random() < 0.5 ? "barrier" : "car",
          swerve = blocked === 1 && kind === "car" && Math.random() < t.swerve;
        const target = swerve ? clamp(lane + pick([-1, 1]), 0, 2) : lane;
        this.objects.push({ kind, lane, target: target === lane ? (lane === 0 ? 1 : lane - 1) : target, swerve, x: LANES[lane], y: -80, w: 84, h: kind === "car" ? 96 : 56, color: pick(["#ff969b", "#ffb36b", "#c59aff", "#7de0ff"]) });
      }
      const coinLane = pick(free);
      for (let i = 0; i < 3; i++) this.coins.push({ x: LANES[coinLane], y: -80 - i * 55 });
      if (Math.random() < t.power) {
        const kinds = ["shield", "magnet", "nitro"];
        if (this.lives < this.maxLives) kinds.push("heart");
        this.powers.push({ kind: pick(kinds), x: LANES[pick(free)], y: -260 });
      }
      const [a, b] = t.gap;
      this.spawn = rand(a, b) * (1 - 0.2 * progress) * (blocked === 2 ? 1.15 : 1);
    }
    step(dt) {
      const t = this.t,
        p = this.p,
        progress = clamp(this.distance / t.goal, 0, 1);
      this.boosting = this.held("jump", "action") && this.nitro > 0;
      if (this.boosting) this.nitro = Math.max(0, this.nitro - 38 * dt);
      const target = lerp(t.speed, t.maxSpeed, progress) * (this.boosting ? 1.55 : 1);
      this.speed += (target - this.speed) * Math.min(1, dt * 3);
      this.distance += (this.speed * dt) / 10;
      this.scroll += this.speed * dt;
      if (Math.floor(this.distance / 500) + 1 > this.level) this.levelUp("trafik hızlanıyor!");
      this.magnet = Math.max(0, this.magnet - dt);
      p.x += (LANES[this.lane] - p.x) * Math.min(1, dt * 14);
      p.tilt *= Math.exp(-dt * 8);
      this.spawn -= dt;
      if (this.spawn <= 0) this.makeRow();
      const car = { x: p.x - 24, y: p.y - 40, w: 48, h: 80 };
      for (const o of this.objects) {
        o.y += this.speed * dt;
        if (o.swerve && o.y > 60 && o.y < 240) o.x += (LANES[o.target] - o.x) * Math.min(1, dt * 2.6);
        const box = { x: o.x - o.w / 2 + 6, y: o.y - o.h / 2 + 6, w: o.w - 12, h: o.h - 12 };
        if (!o.hit && overlap(car, box)) {
          o.hit = true;
          if (this.boosting) {
            this.smashed++;
            this.bonus += 40 * this.mult;
            this.burst(o.x, o.y, o.color, 22, 220);
            this.float(o.x, o.y, "KIRILDI! +" + 40 * this.mult, "#ffd166");
            this.shake(0.15);
            sfx("clear");
          } else {
            this.hurt(p.x, p.y - 30);
            if (this.mode === "over") return;
          }
        }
        if (!o.hit && !o.checked && o.y - o.h / 2 > p.y + 40) {
          o.checked = true;
          if (Math.abs(o.x - p.x) < 185) {
            this.nearMiss++;
            this.chain++;
            this.bonus += 15 * this.mult;
            this.float(p.x, p.y - 70, "Kıl payı! +" + 15 * this.mult, "#a8f5ff");
          }
        }
      }
      this.objects = this.objects.filter((o) => o.y < H + 120 && !(o.hit && this.boosting && o.y > H));
      this.coins = this.coins.filter((c) => {
        c.y += this.speed * dt;
        if (this.magnet && Math.abs(c.y - p.y) < 260) c.x += (p.x - c.x) * Math.min(1, dt * 8);
        if (Math.hypot(c.x - p.x, c.y - p.y) < 44) {
          this.chain++;
          this.bonus += 20 * this.mult;
          this.nitro = Math.min(100, this.nitro + 9);
          sfx("coin");
          this.burst(c.x, c.y, "#ffe76e", 6, 80);
          return false;
        }
        return c.y < H + 50;
      });
      this.powers = this.powers.filter((o) => {
        o.y += this.speed * dt;
        if (Math.hypot(o.x - p.x, o.y - p.y) < 50) {
          sfx("power");
          this.bonus += 50;
          this.float(o.x, o.y - 30, POWERS[o.kind].name + "!", POWERS[o.kind].color);
          if (o.kind === "shield") this.shield = 1;
          if (o.kind === "magnet") this.magnet = 8;
          if (o.kind === "nitro") this.nitro = 100;
          if (o.kind === "heart") this.lives = Math.min(this.maxLives, this.lives + 1);
          return false;
        }
        return o.y < H + 50;
      });
      this.score = Math.floor(this.distance) + this.bonus;
      if (this.distance >= t.goal && this.mode === "playing") {
        this.bonus += this.lives * 150;
        this.score = Math.floor(this.distance) + this.bonus;
        this.finish(true);
      }
    }
    drawCar(x, y, color, w = 50, h = 86, angle = 0, player = false) {
      const c = this.ctx;
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      this.rect(-w / 2 + 3, -h / 2 + 6, w, h, "#0006", 12);
      this.rect(-w / 2, -h / 2, w, h, color, 12);
      this.rect(-w / 2 + 7, -h / 2 + 14, w - 14, 20, "#0b1428cc", 6);
      this.rect(-w / 2 + 7, h / 2 - 26, w - 14, 14, "#0b1428aa", 5);
      this.rect(-w / 2 - 4, -h / 2 + 12, 6, 18, "#111", 2);
      this.rect(w / 2 - 2, -h / 2 + 12, 6, 18, "#111", 2);
      this.rect(-w / 2 - 4, h / 2 - 30, 6, 18, "#111", 2);
      this.rect(w / 2 - 2, h / 2 - 30, 6, 18, "#111", 2);
      if (player) {
        this.rect(-w / 2 + 6, -h / 2 - 2, 10, 6, "#fff6b0", 3);
        this.rect(w / 2 - 16, -h / 2 - 2, 10, 6, "#fff6b0", 3);
      } else {
        this.rect(-w / 2 + 6, h / 2 - 4, 10, 6, "#ff4d6d", 3);
        this.rect(w / 2 - 16, h / 2 - 4, 10, 6, "#ff4d6d", 3);
      }
      c.restore();
    }
    render(c) {
      c.fillStyle = "#0e1a2e";
      c.fillRect(0, 0, 180, H);
      c.fillRect(720, 0, 180, H);
      for (let y = -(-this.scroll % 140) - 140; y < H; y += 140) {
        this.rect(60, y, 60, 60, "#16294a", 10);
        this.rect(780, y + 70, 60, 60, "#16294a", 10);
      }
      this.rect(180, 0, 540, H, "#222e46", 0);
      this.rect(180, 0, 6, H, "#7da5ff", 0);
      this.rect(714, 0, 6, H, "#7da5ff", 0);
      for (const x of [365, 535]) for (let y = (this.scroll % 100) - 100; y < H; y += 100) this.rect(x, y, 5, 48, "#596780", 0);
      if (this.boosting) {
        c.strokeStyle = "#ffd16655";
        c.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const x = 190 + ((i * 97 + this.scroll * 0.3) % 520),
            y = (i * 131 + this.scroll * 2) % H;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 60);
          c.stroke();
        }
      }
      for (const o of this.objects) {
        if (o.hit && this.boosting) continue;
        if (o.kind === "barrier") {
          this.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, o.hit ? "#7a5562" : "#ff969b", 8);
          c.fillStyle = "#fff3";
          for (let x = o.x - o.w / 2 + 8; x < o.x + o.w / 2 - 10; x += 22) {
            c.beginPath();
            c.moveTo(x, o.y + o.h / 2 - 6);
            c.lineTo(x + 10, o.y + o.h / 2 - 6);
            c.lineTo(x + 20, o.y - o.h / 2 + 6);
            c.lineTo(x + 10, o.y - o.h / 2 + 6);
            c.fill();
          }
        } else this.drawCar(o.x, o.y, o.hit ? "#6c6f80" : o.color, 54, 92, o.swerve ? (LANES[o.target] - o.x) * -0.002 : 0);
        if (o.swerve && !o.hit && o.y < 200 && o.y > -20 && Math.floor(this.elapsed * 6) % 2) this.label(LANES[o.target] < o.x ? "◀" : "▶", o.x, o.y - 62, 18, "#ffd166");
      }
      this.coins.forEach((q, i) => this.ring(q.x, q.y, i));
      this.powers.forEach((o) => this.powerIcon(o.kind, o.x, o.y));
      const p = this.p;
      if (this.boosting) {
        this.circle(p.x - 10, p.y + 52 + rand(0, 10), 8, "#ffb36baa");
        this.circle(p.x + 10, p.y + 52 + rand(0, 10), 8, "#ffd166aa");
      }
      if (!this.invincible || Math.floor(this.elapsed * 10) % 2 === 0) this.drawCar(p.x, p.y, this.g.color, 50, 84, p.tilt, true);
      if (this.shield) {
        c.strokeStyle = "#8fe9ffcc";
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(p.x, p.y, 44, 58, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    renderTop() {
      this.progressBar(this.distance / this.t.goal, "Seviye " + this.level + " · " + Math.round(this.speed / 4) + " km/sa");
      this.rect(20, H - 34, 160, 16, "#0b1226cc", 8);
      this.rect(22, H - 32, 156 * (this.nitro / 100), 12, this.boosting ? "#ffb36b" : "#ffd166", 6);
      this.label("NİTRO " + Math.round(this.nitro) + "%", 22, H - 48, 13, "#ffd166", "left");
    }
  }

  // ---------------------------------------------------------------- Zıplayan Küre
  class Bounce extends ActionGame {
    init() {
      this.p = { x: 450, y: 440, r: 16, vx: 0, vy: -700, rocket: 0 };
      this.platforms = [{ x: 350, y: 475, w: 200, type: "normal" }];
      this.lastPlat = { x: 450, y: 475 };
      this.coins = [];
      this.powers = [];
      this.camera = 0;
      this.distance = 0;
      this.bonus = 0;
      this.coinsTaken = 0;
      this.topReached = 475;
      this.fillPlatforms();
    }
    metricText() {
      return Math.floor(this.distance) + " / " + this.t.goal + " m";
    }
    summary() {
      return this.coinsTaken + " halka";
    }
    addPlatform() {
      const t = this.t,
        f = clamp(this.distance / t.goal, 0, 1),
        gap = rand(lerp(t.gap[0], t.gap[1] - 30, f), lerp(t.gap[0] + 25, t.gap[1], f)),
        y = this.lastPlat.y - Math.min(gap, 165),
        w = Math.max(60, lerp(t.width[0], t.width[1], f) + rand(-15, 15)),
        cx = (((this.lastPlat.x + rand(-230, 230)) % W) + W) % W,
        r = Math.random(),
        early = this.platforms.length < 6;
      let type = "normal";
      if (!early) {
        if (r < t.spring) type = "spring";
        else if (r < t.spring + t.moving * (0.3 + f)) type = "moving";
        else if (r < t.spring + t.moving * (0.3 + f) + t.fragile * (0.3 + f)) type = "fragile";
      }
      const x = clamp(cx - w / 2, 10, W - w - 10);
      this.platforms.push({ x, y, w, type, baseX: x, phase: rand(0, 6), range: rand(50, 120) });
      this.lastPlat = { x: x + w / 2, y };
      if (Math.random() < 0.35) this.coins.push({ x: x + w / 2, y: y - 45 });
      if (!early && Math.random() < t.rocket) this.powers.push({ kind: "rocket", x: x + w / 2, y: y - 50 });
      // Extra fragile decoys add choices without breaking the guaranteed route.
      if (!early && Math.random() < t.fragile * 0.6) {
        const dx = (x + w / 2 + rand(220, 420)) % W;
        this.platforms.push({ x: clamp(dx - 45, 10, W - 100), y: y + rand(-30, 30), w: 90, type: "fragile", baseX: 0, phase: 0, range: 0, decoy: true });
      }
    }
    fillPlatforms() {
      while (this.lastPlat.y > this.camera - 260) this.addPlatform();
    }
    respawn() {
      const y = this.camera + H - 110,
        x = clamp(this.p.x - 90, 10, W - 190);
      this.platforms.push({ x, y, w: 180, type: "normal", baseX: x, phase: 0, range: 0 });
      this.p.x = x + 90;
      this.p.y = y - 40;
      this.p.vy = -820;
      this.invincible = 1.5;
    }
    step(dt) {
      const p = this.p,
        t = this.t,
        dir = (this.held("right") ? 1 : 0) - (this.held("left") ? 1 : 0);
      p.vx += (dir * 400 - p.vx) * Math.min(1, dt * 9);
      p.x += p.vx * dt;
      if (p.x < -p.r) p.x += W + p.r * 2;
      if (p.x > W + p.r) p.x -= W + p.r * 2;
      const previous = p.y;
      if (p.rocket > 0) {
        p.rocket -= dt;
        p.vy = -950;
        if (Math.random() < 0.6) this.particles.push({ x: p.x + rand(-6, 6), y: p.y + 18 - this.camera, vx: rand(-30, 30), vy: 160, life: 0.4, color: "#ffb36b", gravity: 0 });
      } else p.vy += 1250 * dt;
      p.y += p.vy * dt;
      for (const o of this.platforms) {
        if (o.type === "moving") o.x = clamp(o.baseX + Math.sin(this.elapsed * 1.6 + o.phase) * o.range, 5, W - o.w - 5);
        if (o.broken) {
          o.y += 260 * dt;
          continue;
        }
        if (p.rocket <= 0 && p.vy > 0 && previous + p.r <= o.y + 2 && p.y + p.r >= o.y && p.x + p.r * 0.6 > o.x && p.x - p.r * 0.6 < o.x + o.w) {
          p.y = o.y - p.r;
          p.vy = o.type === "spring" ? -1080 : -700;
          sfx(o.type === "spring" ? "power" : "bounce");
          this.burst(p.x, o.y - this.camera, o.type === "spring" ? "#ffe76e" : "#ffcb68", 6, 80);
          if (o.type === "spring") this.float(p.x, o.y - this.camera - 40, "Yay!", "#ffe76e");
          if (o.type === "fragile") {
            o.broken = true;
            this.burst(o.x + o.w / 2, o.y - this.camera, "#b5835a", 12);
          }
          if (o.y < this.topReached - 5) {
            this.topReached = o.y;
            this.chain++;
            this.bonus += 5 * this.mult;
          }
        }
      }
      this.camera = Math.min(this.camera, p.y - 220);
      const height = (475 - p.y) / 5;
      if (height > this.distance) {
        const before = Math.floor(this.distance / 100);
        this.distance = height;
        if (Math.floor(this.distance / 100) > before) this.levelUp("platformlar zorlaşıyor!");
      }
      this.fillPlatforms();
      this.platforms = this.platforms.filter((o) => o.y < this.camera + H + 80);
      this.coins = this.coins.filter((c) => {
        if (Math.hypot(c.x - p.x, c.y - p.y) < 32) {
          this.coinsTaken++;
          this.chain++;
          this.bonus += 25 * this.mult;
          sfx("coin");
          this.burst(c.x, c.y - this.camera, "#ffe76e", 6, 80);
          return false;
        }
        return c.y < this.camera + H + 80;
      });
      this.powers = this.powers.filter((o) => {
        if (Math.hypot(o.x - p.x, o.y - p.y) < 36) {
          p.rocket = 1.6;
          sfx("power");
          this.bonus += 50;
          this.float(p.x, p.y - this.camera - 40, "Roket!", "#ffb36b");
          this.notice("Roket seni yukarı taşıyor!");
          return false;
        }
        return o.y < this.camera + H + 80;
      });
      this.score = Math.floor(this.distance) * 4 + this.bonus;
      if (p.y - this.camera > H + 50) {
        this.chain = 0;
        this.lives--;
        sfx("hit");
        this.shake(0.3);
        if (this.lives <= 0) return this.finish(false);
        this.notice("Düştün! " + this.lives + " can kaldı. Yeni bir platform geldi.", true);
        this.respawn();
      } else if (this.distance >= t.goal) {
        this.bonus += this.lives * 150;
        this.score = Math.floor(this.distance) * 4 + this.bonus;
        this.finish(true);
      }
    }
    render(c) {
      const cam = this.camera;
      // Altitude bands slowly change the sky color as the player climbs.
      const band = clamp(this.distance / this.t.goal, 0, 1);
      c.fillStyle = `rgba(${Math.round(lerp(40, 120, band))},${Math.round(lerp(60, 50, band))},${Math.round(lerp(120, 160, band))},0.25)`;
      c.fillRect(0, 0, W, H);
      for (let m = Math.ceil(this.distance / 50) * 50 - 100; m < this.distance + 150; m += 50) {
        const y = 475 - m * 5 - cam;
        if (y < 0 || y > H || m <= 0) continue;
        c.fillStyle = "#ffffff12";
        c.fillRect(0, y, W, 1);
        this.label(m + " m", W - 12, y - 10, 12, "#8fa0c4", "right");
      }
      for (const o of this.platforms) {
        const y = o.y - cam,
          colors = { normal: "#ffcb68", moving: "#c59aff", fragile: "#b5835a", spring: "#ffcb68" };
        c.globalAlpha = o.broken ? 0.5 : 1;
        this.rect(o.x, y, o.w, 14, colors[o.type]);
        if (o.type === "fragile") {
          c.strokeStyle = "#5b3b23";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(o.x + o.w * 0.3, y);
          c.lineTo(o.x + o.w * 0.38, y + 14);
          c.moveTo(o.x + o.w * 0.7, y);
          c.lineTo(o.x + o.w * 0.62, y + 14);
          c.stroke();
        } else this.rect(o.x + 9, y + 14, o.w - 18, 6, "#675845", 0);
        if (o.type === "spring") {
          this.rect(o.x + o.w / 2 - 14, y - 12, 28, 12, "#ff7b8a", 3);
          c.strokeStyle = "#fff";
          c.lineWidth = 2;
          c.beginPath();
          for (let i = 0; i < 4; i++) c.lineTo(o.x + o.w / 2 - 10 + i * 7, y - (i % 2 ? 2 : 10));
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      this.coins.forEach((q, i) => this.ring(q.x, q.y - cam, i));
      this.powers.forEach((o) => this.powerIcon(o.kind, o.x, o.y - cam));
      const p = this.p;
      if (!this.invincible || Math.floor(this.elapsed * 10) % 2 === 0) {
        const squash = clamp(1 + p.vy / 4000, 0.8, 1.2);
        c.save();
        c.translate(p.x, p.y - cam);
        c.scale(1 / squash, squash);
        this.circle(0, 0, p.r, "#75c2ff");
        c.strokeStyle = "#d9f1ff";
        c.lineWidth = 4;
        c.stroke();
        this.circle(-5, -5, 4, "#ffffffaa");
        c.restore();
        if (p.rocket > 0) this.emoji("🚀", p.x, p.y - cam + 30, 22);
      }
    }
    renderTop() {
      this.progressBar(this.distance / this.t.goal, "Seviye " + this.level + " · " + Math.floor(this.distance) + " m");
    }
  }

  // ---------------------------------------------------------------- Meteor Kırıcı
  // '1'-'3': hit points, '#': steel (unbreakable), '*': capsule brick, '.': empty
  const WAVES = [
    ["11111111", "11111111", "22222222"],
    ["2.2..2.2", "11111111", "1*1111*1", "11111111"],
    ["22222222", "1#1111#1", "1*1221*1", "11111111"],
    ["3..33..3", "2222*222", "1#1##1#1", "11111111", "..1111.."],
    ["33333333", "2#2**2#2", "22222222", "#1#11#1#", "11111111"],
  ];
  const BRICK_COLORS = ["#7da5ff", "#51e6c2", "#ffcb68", "#ff969b"];
  class Breaker extends ActionGame {
    init() {
      this.p = { x: 450, y: 478, w: this.t.paddle, h: 14 };
      this.wave = 1;
      this.balls = [];
      this.drops = [];
      this.wideTime = 0;
      this.slowTime = 0;
      this.descendTimer = 0;
      this.broken = 0;
      this.resetBall();
      this.makeBricks();
    }
    metricText() {
      return this.wave + " / " + this.t.waves;
    }
    summary() {
      return this.broken + " blok";
    }
    resetBall() {
      this.balls = [{ x: this.p.x, y: this.p.y - 12, r: 9, vx: 0, vy: 0, stuck: true }];
      this.chain = 0;
    }
    makeBricks() {
      this.objects = [];
      const rows = WAVES[this.wave - 1],
        width = (W - 20) / 8;
      rows.forEach((row, r) =>
        [...row].forEach((ch, col) => {
          if (ch === ".") return;
          let hp = ch === "#" ? Infinity : ch === "*" ? 1 : Number(ch);
          if (this.diff === "easy") {
            if (ch === "#") hp = 2;
            hp = Math.min(hp, 2);
          }
          this.objects.push({ x: 10 + col * width + 3, y: 62 + r * 34, w: width - 6, h: 26, hp, max: hp, steel: hp === Infinity, power: ch === "*" });
        }),
      );
      this.descendTimer = 0;
      this.totalBricks = this.objects.filter((o) => !o.steel).length;
    }
    get speed() {
      return Math.min(this.t.maxBall, this.t.ball + (this.wave - 1) * 25) * (this.slowTime > 0 ? 0.7 : 1);
    }
    command(key) {
      if (!["launch", "action", "jump"].includes(key)) return;
      for (const b of this.balls)
        if (b.stuck) {
          b.stuck = false;
          const angle = rand(-0.45, 0.45);
          b.vx = Math.sin(angle) * this.speed;
          b.vy = -Math.cos(angle) * this.speed;
          sfx("jump");
        }
    }
    pointer(type, pos) {
      this.p.x = clamp(pos.x, this.p.w / 2 + 5, W - this.p.w / 2 - 5);
      if (type === "down") this.command("launch");
    }
    normalize(b, speed = this.speed) {
      const length = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / length) * speed;
      b.vy = (b.vy / length) * speed;
      // Avoid endless near-horizontal bounces.
      if (Math.abs(b.vy) < speed * 0.3) {
        b.vy = Math.sign(b.vy || -1) * speed * 0.3;
        b.vx = Math.sign(b.vx || 1) * Math.sqrt(speed * speed - b.vy * b.vy);
      }
    }
    drop(x, y) {
      const kinds = ["wide", "multi", "slow"];
      if (this.lives < this.maxLives + 2) kinds.push("life");
      this.drops.push({ kind: pick(kinds), x, y });
    }
    collect(kind) {
      sfx("power");
      this.score += 30;
      this.float(this.p.x, this.p.y - 40, POWERS[kind].name + "!", POWERS[kind].color);
      if (kind === "wide") this.wideTime = 12;
      if (kind === "slow") {
        this.slowTime = 9;
        for (const b of this.balls) if (!b.stuck) this.normalize(b);
      }
      if (kind === "life") this.lives++;
      if (kind === "multi") {
        const source = this.balls.find((b) => !b.stuck) || this.balls[0];
        if (source.stuck) this.command("launch");
        for (const a of [-0.5, 0.5].slice(0, Math.max(0, 6 - this.balls.length))) {
          const angle = Math.atan2(source.vx, -source.vy) + a;
          this.balls.push({ x: source.x, y: source.y, r: 9, vx: Math.sin(angle) * this.speed, vy: -Math.abs(Math.cos(angle)) * this.speed, stuck: false });
        }
      }
    }
    step(dt) {
      const p = this.p,
        t = this.t,
        dir = (this.held("right") ? 1 : 0) - (this.held("left") ? 1 : 0);
      this.wideTime = Math.max(0, this.wideTime - dt);
      const before = this.slowTime;
      this.slowTime = Math.max(0, this.slowTime - dt);
      if (before > 0 && this.slowTime === 0) for (const b of this.balls) if (!b.stuck) this.normalize(b);
      p.w = lerp(p.w, t.paddle * (this.wideTime > 0 ? 1.5 : 1), Math.min(1, dt * 8));
      p.x = clamp(p.x + dir * 600 * dt, p.w / 2 + 5, W - p.w / 2 - 5);
      if (t.descend) {
        this.descendTimer += dt;
        if (this.descendTimer >= t.descend) {
          this.descendTimer = 0;
          for (const o of this.objects) o.y += 18;
          this.notice("Meteorlar yaklaşıyor!", true);
          this.shake(0.2);
          if (this.objects.some((o) => !o.steel && o.y + o.h > p.y - 60)) {
            this.notice("Meteorlar rakete ulaştı!", true);
            return this.finish(false);
          }
        }
      }
      for (const b of this.balls) {
        if (b.stuck) {
          b.x = p.x;
          b.y = p.y - b.r - 2;
          continue;
        }
        const oldX = b.x,
          oldY = b.y;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx);
          sfx("bounce");
        }
        if (b.x > W - b.r) {
          b.x = W - b.r;
          b.vx = -Math.abs(b.vx);
          sfx("bounce");
        }
        if (b.y < b.r + 4) {
          b.y = b.r + 4;
          b.vy = Math.abs(b.vy);
          sfx("bounce");
        }
        if (b.vy > 0 && oldY + b.r <= p.y + 2 && b.y + b.r >= p.y && Math.abs(b.x - p.x) < p.w / 2 + b.r) {
          b.y = p.y - b.r;
          // A small minimum angle stops the ball from bouncing straight up and down forever.
          let angle = clamp((b.x - p.x) / (p.w / 2), -1, 1) * 1.05;
          if (Math.abs(angle) < 0.14) angle = (angle < 0 || (angle === 0 && Math.random() < 0.5) ? -1 : 1) * 0.14;
          b.vx = Math.sin(angle) * this.speed;
          b.vy = -Math.cos(angle) * this.speed;
          this.chain = 0;
          sfx("bounce");
          this.burst(b.x, p.y, "#7da5ff", 6, 80);
        }
        for (const o of this.objects) {
          if (o.hp <= 0 || !overlap({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, o)) continue;
          // Separate the ball from the brick before the next physics step.
          const fromLeft = oldX + b.r <= o.x,
            fromRight = oldX - b.r >= o.x + o.w,
            fromTop = oldY + b.r <= o.y,
            fromBottom = oldY - b.r >= o.y + o.h;
          if (fromLeft || fromRight) {
            b.x = fromLeft ? o.x - b.r - 0.01 : o.x + o.w + b.r + 0.01;
            b.vx = fromLeft ? -Math.abs(b.vx) : Math.abs(b.vx);
          } else if (fromTop || fromBottom) {
            b.y = fromTop ? o.y - b.r - 0.01 : o.y + o.h + b.r + 0.01;
            b.vy = fromTop ? -Math.abs(b.vy) : Math.abs(b.vy);
          } else {
            b.vy = -b.vy;
            b.y += Math.sign(b.vy) * 4;
          }
          if (o.steel) {
            sfx("bounce");
            this.burst(b.x, b.y, "#c7cfdd", 4, 60);
            break;
          }
          o.hp--;
          this.chain++;
          sfx("clear");
          this.burst(b.x, b.y, BRICK_COLORS[Math.min(3, o.max - 1)], 8);
          if (o.hp === 0) {
            this.broken++;
            const points = 20 * o.max * this.mult;
            this.score += points;
            this.float(o.x + o.w / 2, o.y + 10, "+" + points, this.mult > 1 ? "#ffe76e" : "#fff");
            if (o.power || Math.random() < t.drop) this.drop(o.x + o.w / 2, o.y + o.h / 2);
          } else this.score += 5;
          break;
        }
      }
      this.objects = this.objects.filter((o) => o.hp > 0);
      this.balls = this.balls.filter((b) => b.y < H + 25);
      this.drops = this.drops.filter((d) => {
        d.y += 170 * dt;
        if (d.y + 14 >= p.y && d.y - 14 <= p.y + p.h && Math.abs(d.x - p.x) < p.w / 2 + 14) {
          this.collect(d.kind);
          return false;
        }
        return d.y < H + 30;
      });
      if (!this.balls.length) {
        this.lives--;
        this.chain = 0;
        sfx("hit");
        this.shake(0.3);
        if (this.lives <= 0) return this.finish(false);
        this.drops = [];
        this.wideTime = 0;
        this.slowTime = 0;
        this.resetBall();
        this.notice("Top düştü. " + this.lives + " can kaldı. Boşluk veya dokunarak yeniden fırlat.", true);
      }
      if (!this.objects.some((o) => !o.steel)) {
        this.score += 150 * this.wave + this.lives * 50;
        if (this.wave >= t.waves) return this.finish(true);
        this.wave++;
        this.level = this.wave;
        this.makeBricks();
        this.drops = [];
        this.resetBall();
        this.float(W / 2, 260, "Dalga " + this.wave + "!", "#a8f5ff");
        this.notice("Dalga " + this.wave + " başladı. Top biraz daha hızlı!");
        sfx("level");
      }
    }
    render(c) {
      for (const o of this.objects) {
        if (o.steel) {
          this.rect(o.x, o.y, o.w, o.h, "#7d879c");
          c.strokeStyle = "#c7cfdd";
          c.lineWidth = 2;
          c.strokeRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
          continue;
        }
        this.rect(o.x, o.y, o.w, o.h, BRICK_COLORS[Math.min(3, o.hp - 1)]);
        this.rect(o.x + 4, o.y + 3, o.w - 8, 5, "#ffffff40", 3);
        if (o.max > 1 && o.hp < o.max) {
          c.strokeStyle = "#0b1226aa";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(o.x + o.w * 0.3, o.y + 2);
          c.lineTo(o.x + o.w * 0.45, o.y + o.h / 2);
          c.lineTo(o.x + o.w * 0.35, o.y + o.h - 2);
          c.stroke();
        }
        if (o.power) this.emoji("✨", o.x + o.w / 2, o.y + o.h / 2 + 1, 15);
      }
      if (this.t.descend) {
        const left = 1 - this.descendTimer / this.t.descend;
        this.rect(W / 2 - 80, 44, 160 * left, 4, "#ff969b88", 2);
      }
      for (const d of this.drops) {
        this.rect(d.x - 26, d.y - 13, 52, 26, POWERS[d.kind].color, 13);
        this.emoji(POWERS[d.kind].icon, d.x, d.y + 1, 16);
      }
      const p = this.p;
      this.rect(p.x - p.w / 2, p.y, p.w, p.h, this.wideTime ? "#a8f5ff" : "#7da5ff");
      this.rect(p.x - p.w / 2 + 6, p.y + 2, p.w - 12, 4, "#ffffff66", 2);
      for (const b of this.balls) {
        this.circle(b.x, b.y, b.r + 4, this.slowTime ? "#c59aff44" : "#fff1b633");
        this.circle(b.x, b.y, b.r, "#fff1b6");
      }
      if (this.balls.some((b) => b.stuck) && this.countdown <= 0) this.label("Boşluk / dokun: topu fırlat", W / 2, 420, 18, "#b9c6dd");
    }
    renderTop() {
      this.progressBar(1 - this.objects.filter((o) => !o.steel).length / Math.max(1, this.totalBricks), "Dalga " + this.wave + " / " + this.t.waves);
    }
  }

  // ---------------------------------------------------------------- Blok Ustası
  const SHAPES = {
    easy: [
      [[0, 0]],
      [[0, 0], [1, 0]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]],
    ],
    normal: [
      [[0, 0]],
      [[0, 0], [1, 0]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    ],
    hard: [
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
      [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    ],
  };
  const blockColors = ["#51e6c2", "#7da5ff", "#ffcb68", "#c59aff", "#ff969b"];
  const normalize = (cells) => {
    const minX = Math.min(...cells.map((c) => c[0])),
      minY = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - minX, y - minY]);
  };
  const rotateCells = (cells) => normalize(cells.map(([x, y]) => [-y, x]));
  const size = (cells) => [Math.max(...cells.map((c) => c[0])) + 1, Math.max(...cells.map((c) => c[1])) + 1];
  // The piece's middle cell lands on the chosen board cell, which also works after rotation.
  const anchor = (cells) => {
    const [w, h] = size(cells);
    return [Math.floor((w - 1) / 2), Math.floor((h - 1) / 2)];
  };
  class BlockGame extends BaseGame {
    constructor(g, diff) {
      super(g, diff);
      this.grid = Array(64).fill(null);
      this.lines = 0;
      this.combo = 0;
      this.selected = null;
      this.pieces = [];
      this.hints = this.t.hints;
      this.timeLeft = this.t.timer;
      this.goalReached = false;
      this.newPieces();
      this.draw();
      const opts = { signal: this.abort.signal };
      $("#arcBoard").addEventListener("pointerleave", () => this.clearPreview(), opts);
      window.addEventListener("pointermove", (e) => this.dragMove(e), opts);
      window.addEventListener("pointerup", (e) => this.dragEnd(e), opts);
      window.addEventListener("pointercancel", () => this.dragCancel(), opts);
      if (!this.t.hints) $('[data-arc-control="hint"]')?.setAttribute("hidden", "");
      if (!this.t.rotate) $('[data-arc-control="rotate"]')?.setAttribute("hidden", "");
    }
    begin() {
      clearInterval(this.timer);
      if (this.t.timer)
        this.timer = setInterval(() => {
          if (this.mode !== "playing") return;
          this.elapsed += 0.25;
          this.timeLeft -= 0.25;
          if (this.timeLeft <= 3.01 && Math.abs(this.timeLeft - Math.round(this.timeLeft)) < 0.01 && this.timeLeft > 0) sfx("tick");
          if (this.timeLeft <= 0) this.timeout();
          this.hud();
        }, 250);
    }
    pause() {
      clearInterval(this.timer);
      this.dragCancel();
      super.pause();
    }
    finish(won, award) {
      clearInterval(this.timer);
      this.dragCancel();
      super.finish(won, award);
    }
    destroy() {
      clearInterval(this.timer);
      this.dragCancel();
      super.destroy();
    }
    metricText() {
      return this.lines + " / " + this.t.target;
    }
    thirdText() {
      return this.t.timer ? Math.ceil(this.timeLeft) + " sn" : String(this.hints);
    }
    summary() {
      return this.lines + " çizgi";
    }
    randomPiece() {
      const set = SHAPES[this.t.set];
      let cells = set[Math.floor(rand(0, set.length))].map((c) => [...c]);
      if (this.t.rotate) for (let i = Math.floor(rand(0, 4)); i > 0; i--) cells = rotateCells(cells);
      return { cells, color: pick(blockColors), used: false };
    }
    newPieces() {
      // Easier levels re-roll a set that has no legal move on the current board.
      for (let attempt = 0; attempt < (this.diff === "hard" ? 1 : 12); attempt++) {
        this.pieces = Array.from({ length: 3 }, () => this.randomPiece());
        if (this.anyFit()) break;
      }
      this.selected = null;
    }
    fits(cells, row, col) {
      return cells.every(([x, y]) => row + y < 8 && col + x < 8 && row + y >= 0 && col + x >= 0 && !this.grid[(row + y) * 8 + col + x]);
    }
    variants(cells) {
      if (!this.t.rotate) return [cells];
      const list = [cells];
      for (let i = 0; i < 3; i++) list.push(rotateCells(list.at(-1)));
      return list;
    }
    findMove() {
      let bestMove = null;
      this.pieces.forEach((p, index) => {
        if (p.used) return;
        this.variants(p.cells).forEach((cells, turns) => {
          for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
              if (!this.fits(cells, r, c)) continue;
              const filled = new Set(cells.map(([x, y]) => (r + y) * 8 + c + x));
              let lines = 0;
              for (let k = 0; k < 8; k++) {
                if ([...Array(8)].every((_, j) => this.grid[k * 8 + j] || filled.has(k * 8 + j))) lines++;
                if ([...Array(8)].every((_, j) => this.grid[j * 8 + k] || filled.has(j * 8 + k))) lines++;
              }
              const value = lines * 10 + cells.length + (turns ? -0.5 : 0);
              if (!bestMove || value > bestMove.value) bestMove = { index, turns, r, c, cells, value };
            }
        });
      });
      return bestMove;
    }
    anyFit() {
      return this.pieces.some((p) => !p.used && this.variants(p.cells).some((cells) => [...Array(64).keys()].some((i) => this.fits(cells, Math.floor(i / 8), i % 8))));
    }
    command(key) {
      if (key === "rotate") this.rotate();
      if (key === "hint") this.hint();
      if (key.startsWith("piece")) this.select(Number(key.slice(5)) - 1);
    }
    key(e, down) {
      if (down && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && e.target.matches("[data-arc-cell]") && this.mode === "playing") {
        e.preventDefault();
        const index = Number(e.target.dataset.arcCell),
          r = Math.floor(index / 8),
          c = index % 8,
          next = e.key === "ArrowLeft" ? r * 8 + Math.max(0, c - 1) : e.key === "ArrowRight" ? r * 8 + Math.min(7, c + 1) : e.key === "ArrowUp" ? Math.max(0, r - 1) * 8 + c : Math.min(7, r + 1) * 8 + c;
        this.cells.forEach((b) => (b.tabIndex = -1));
        this.cells[next].tabIndex = 0;
        this.cells[next].focus();
        return;
      }
      super.key(e, down);
    }
    select(index) {
      if (this.mode !== "playing" || !this.pieces[index] || this.pieces[index].used) return;
      unlockSound();
      this.selected = index;
      this.syncPieces();
      this.cells.forEach((x) => x.classList.remove("wrong"));
      this.clearPreview();
      this.notice("Parça seçildi. Tahtaya sürükle ya da bir hücre seç" + (this.t.rotate ? " · R: döndür" : "") + ".");
      sfx("place");
    }
    rotate() {
      if (this.mode !== "playing") return;
      if (!this.t.rotate) return this.notice("Zor seviyede parçalar döndürülemez.", true);
      if (this.selected === null) return this.notice("Döndürmek için önce bir parça seç.");
      const p = this.pieces[this.selected];
      p.cells = rotateCells(p.cells);
      sfx("place");
      this.draw();
      if (this.hoverIndex !== undefined) this.preview(this.hoverIndex);
      if (this.drag) this.drag.ghost.replaceChildren(this.shapeElement(p));
    }
    hint() {
      if (this.mode !== "playing") return;
      if (!this.hints) return this.notice(this.t.hints ? "İpucu hakkın bitti." : "Bu seviyede ipucu yok.", true);
      const move = this.findMove();
      if (!move) return;
      this.hints--;
      this.pieces[move.index].cells = move.cells;
      this.selected = move.index;
      this.draw();
      move.cells.forEach(([x, y]) => this.cells[(move.r + y) * 8 + move.c + x].classList.add("arc-hint"));
      setTimeout(() => this.cells?.forEach((b) => b.classList.remove("arc-hint")), 1800);
      this.notice("İpucu: parlayan alana seçili parçayı yerleştir.");
      sfx("power");
      this.hud();
    }
    timeout() {
      // Running out of time drops a stone block that must be cleared with a line.
      this.timeLeft = this.t.timer;
      this.combo = 0;
      const empty = this.grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (empty.length) {
        const i = pick(empty);
        this.grid[i] = "#6f7890";
        this.draw();
        this.cells[i].classList.add("arc-pop");
      }
      sfx("hit");
      this.notice("Süre doldu! Tahtaya bir taş blok düştü.", true);
      if (!this.anyFit()) this.finish(this.goalReached, false);
    }
    clearPreview() {
      this.cells?.forEach((b) => {
        b.classList.remove("arc-ghost", "arc-ghost-bad");
        b.style.removeProperty("--piece-color");
      });
    }
    origin(index, cells) {
      const [ax, ay] = anchor(cells);
      return [Math.floor(index / 8) - ay, (index % 8) - ax];
    }
    preview(index) {
      this.hoverIndex = index;
      this.clearPreview();
      if (this.mode !== "playing" || this.selected === null) return;
      const p = this.pieces[this.selected],
        [r, c] = this.origin(index, p.cells),
        ok = this.fits(p.cells, r, c);
      p.cells.forEach(([x, y]) => {
        if (r + y >= 8 || c + x >= 8 || r + y < 0 || c + x < 0) return;
        const b = this.cells[(r + y) * 8 + c + x];
        b.classList.add(ok ? "arc-ghost" : "arc-ghost-bad");
        b.style.setProperty("--piece-color", p.color);
      });
    }
    place(index) {
      if (this.mode !== "playing") return;
      unlockSound();
      if (this.selected === null) {
        this.notice("Önce üç parçadan birini seç ya da parçayı tahtaya sürükle.");
        return;
      }
      const p = this.pieces[this.selected],
        [r, c] = this.origin(index, p.cells);
      if (!this.fits(p.cells, r, c)) {
        this.clearPreview();
        this.cells[index].classList.add("wrong");
        this.notice("Parça bu noktaya sığmıyor. Boş hücreleri ve tahta sınırını kontrol et.", true);
        sfx("hit");
        return;
      }
      p.cells.forEach(([x, y]) => (this.grid[(r + y) * 8 + c + x] = p.color));
      p.used = true;
      this.score += p.cells.length * 5;
      const cleared = new Set();
      let lines = 0;
      for (let row = 0; row < 8; row++)
        if (this.grid.slice(row * 8, row * 8 + 8).every(Boolean)) {
          lines++;
          for (let col = 0; col < 8; col++) cleared.add(row * 8 + col);
        }
      for (let col = 0; col < 8; col++)
        if (Array.from({ length: 8 }, (_, row) => this.grid[row * 8 + col]).every(Boolean)) {
          lines++;
          for (let row = 0; row < 8; row++) cleared.add(row * 8 + col);
        }
      if (lines) {
        this.combo++;
        this.lines += lines;
        cleared.forEach((i) => (this.grid[i] = null));
        const points = lines * 100 * lines + Math.max(0, this.combo - 1) * 60;
        this.score += points;
        sfx("clear");
        let text = lines + " çizgi temizlendi! +" + points + (this.combo > 1 ? " · Seri ×" + this.combo : "");
        if (this.grid.every((v) => !v)) {
          this.score += 300;
          text += " · Tahta tertemiz! +300";
        }
        this.notice(text);
      } else {
        this.combo = 0;
        sfx("place");
        this.notice("Parça yerleşti. Bir sonraki hamleni planla.");
      }
      this.selected = null;
      this.timeLeft = this.t.timer;
      if (this.pieces.every((x) => x.used)) this.newPieces();
      this.draw();
      cleared.forEach((i) => this.cells[i].classList.add("arc-pop"));
      if (!this.goalReached && this.lines >= this.t.target) {
        this.goalReached = true;
        sfx("win");
        this.notice("Görev tamamlandı: " + this.t.target + " çizgi! Rekor için devam edebilirsin.");
        window.BTOyunExperience?.award("block-master", { stage: $("#arcSurface"), detail: this.lines + " çizgi · " + DIFFS[this.diff].label });
      }
      if (!this.anyFit()) this.finish(this.goalReached, false);
    }
    shapeElement(p) {
      const [width, height] = size(p.cells),
        el = document.createElement("div");
      el.className = "arc-piece-shape";
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("--shape-columns", width);
      el.style.setProperty("--piece-color", p.color);
      el.innerHTML = Array.from({ length: width * height }, (_, cell) => `<i class="${p.cells.some(([x, y]) => x === cell % width && y === Math.floor(cell / width)) ? "filled" : ""}"></i>`).join("");
      return el;
    }
    dragStart(e, index) {
      if (this.mode !== "playing" || e.button !== 0 || this.pieces[index].used) return;
      this.drag = { index, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== "mouse", moved: false, ghost: null };
    }
    dragMove(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      if (!d.moved) {
        d.moved = true;
        this.select(d.index);
        d.ghost = document.createElement("div");
        d.ghost.className = "arc-drag-ghost";
        d.ghost.style.setProperty("--ghost-cell", this.cells[0].getBoundingClientRect().width + "px");
        d.ghost.append(this.shapeElement(this.pieces[d.index]));
        (document.fullscreenElement || document.body).append(d.ghost);
      }
      e.preventDefault();
      // On touch screens the piece floats above the finger so it stays visible.
      const lift = d.touch ? 70 : 0,
        step = this.cells[0].getBoundingClientRect().width + 5,
        [ax, ay] = anchor(this.pieces[d.index].cells);
      // Keep the piece's anchor cell exactly under the pointer, matching the board preview.
      d.ghost.style.left = e.clientX - (ax + 0.5) * step + "px";
      d.ghost.style.top = e.clientY - lift - (ay + 0.5) * step + "px";
      const cell = this.cellAt(e.clientX, e.clientY - lift);
      if (cell !== null) this.preview(cell);
      else this.clearPreview();
    }
    cellAt(x, y) {
      const board = $("#arcBoard").getBoundingClientRect();
      if (x < board.left || x > board.right || y < board.top || y > board.bottom) return null;
      const hit = this.cells.find((b) => {
        const r = b.getBoundingClientRect();
        return x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 3 && y <= r.bottom + 3;
      });
      return hit ? Number(hit.dataset.arcCell) : null;
    }
    dragEnd(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      d.ghost?.remove();
      if (!d.moved) return this.select(d.index);
      const cell = this.cellAt(e.clientX, e.clientY - (d.touch ? 70 : 0));
      if (cell !== null) this.place(cell);
      else this.clearPreview();
    }
    dragCancel() {
      this.drag?.ghost?.remove();
      this.drag = null;
    }
    syncPieces() {
      document.querySelectorAll("[data-arc-piece]").forEach((x) => {
        const on = Number(x.dataset.arcPiece) === this.selected;
        x.classList.toggle("is-selected", on);
        x.setAttribute("aria-pressed", String(on));
      });
    }
    draw() {
      const board = $("#arcBoard");
      if (!board) return;
      if (!this.cells) {
        board.innerHTML = Array.from({ length: 64 }, (_, i) => `<button data-arc-cell="${i}" tabindex="${i === 0 ? 0 : -1}" class="arc-cell"></button>`).join("");
        this.cells = [...board.children];
        this.cells.forEach((b, i) => {
          b.onclick = () => this.place(i);
          b.onpointerenter = () => this.preview(i);
          b.onfocus = () => this.preview(i);
        });
      }
      this.cells.forEach((b, i) => {
        const color = this.grid[i];
        b.className = "arc-cell" + (color ? " arc-cell-filled" : "");
        b.setAttribute("aria-label", `${Math.floor(i / 8) + 1}. satır ${(i % 8) + 1}. sütun · ${color ? "dolu" : "boş"}`);
        b.style.removeProperty("--piece-color");
        if (color) b.style.setProperty("--cell-color", color);
        else b.style.removeProperty("--cell-color");
      });
      const pieces = $("#arcPieces");
      pieces.replaceChildren(
        ...this.pieces.map((p, i) => {
          const b = document.createElement("button");
          b.dataset.arcPiece = i;
          b.disabled = p.used;
          b.className = "arc-piece" + (this.selected === i ? " is-selected" : "");
          b.setAttribute("aria-pressed", String(this.selected === i));
          b.style.setProperty("--piece-color", p.color);
          b.innerHTML = `<span>Parça ${i + 1}${p.used ? " · ✓" : ""}</span>`;
          b.append(this.shapeElement(p));
          b.insertAdjacentHTML("beforeend", `<small>${p.cells.length} blok</small>`);
          b.addEventListener("pointerdown", (e) => this.dragStart(e, i));
          b.addEventListener("click", (e) => {
            if (e.detail === 0) this.select(i);
          });
          return b;
        }),
      );
      this.hud();
    }
  }

  // ---------------------------------------------------------------- Algoritma Robotu
  // Players write a short command sequence, run it and debug it: the core idea of an algorithm.
  const MOVES = { jump: [0, -1, "⬆️", "Yukarı"], down: [0, 1, "⬇️", "Aşağı"], left: [-1, 0, "⬅️", "Sola"], right: [1, 0, "➡️", "Sağa"] };
  class RobotCode extends BaseGame {
    constructor(g, diff) {
      super(g, diff);
      this.stage = 0;
      this.program = [];
      this.running = false;
      this.newLevel();
    }
    begin() {
      this.draw();
    }
    metricText() {
      return Math.min(this.stage + 1, this.t.levels) + " / " + this.t.levels;
    }
    summary() {
      return this.stage + " bölüm";
    }
    pause() {
      if (this.running) return;
      super.pause();
    }
    destroy() {
      clearTimeout(this.runTimer);
      super.destroy();
    }
    // Breadth-first search finds the shortest route that also collects every star.
    solve(level) {
      const n = level.size,
        full = (1 << level.stars.length) - 1,
        key = (x, y, m) => (y * n + x) * 8 + m,
        seen = new Set(),
        queue = [[level.start.x, level.start.y, 0, 0]];
      seen.add(key(level.start.x, level.start.y, 0));
      while (queue.length) {
        const [x, y, mask, d] = queue.shift();
        if (x === level.flag.x && y === level.flag.y && mask === full) return d;
        for (const [dx, dy] of Object.values(MOVES)) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || level.walls.has(ny * n + nx)) continue;
          let m = mask;
          level.stars.forEach((s, i) => {
            if (s.x === nx && s.y === ny) m |= 1 << i;
          });
          const k = key(nx, ny, m);
          if (!seen.has(k)) {
            seen.add(k);
            queue.push([nx, ny, m, d + 1]);
          }
        }
      }
      return 0;
    }
    newLevel() {
      const t = this.t,
        n = t.size;
      for (let attempt = 0; attempt < 400; attempt++) {
        const cell = () => ({ x: Math.floor(rand(0, n)), y: Math.floor(rand(0, n)) }),
          start = cell(),
          flag = cell();
        if (Math.abs(start.x - flag.x) + Math.abs(start.y - flag.y) < n - 1 + Math.min(this.stage, 2)) continue;
        const walls = new Set(),
          used = new Set([start.y * n + start.x, flag.y * n + flag.x]);
        for (let i = 0; i < n * n * (t.walls + this.stage * 0.02); i++) {
          const c = cell(),
            id = c.y * n + c.x;
          if (!used.has(id)) walls.add(id);
        }
        const stars = [];
        while (stars.length < t.stars) {
          const c = cell(),
            id = c.y * n + c.x;
          if (used.has(id) || walls.has(id)) continue;
          used.add(id);
          stars.push(c);
        }
        const level = { size: n, start, flag, walls, stars },
          best = this.solve(level);
        if (best && best <= t.maxSteps) {
          level.best = best;
          level.limit = best + t.extra;
          this.level = level;
          this.program = [];
          this.robot = { ...start };
          this.collected = new Set();
          this.draw();
          return;
        }
      }
    }
    command(key) {
      if (this.running) return;
      if (MOVES[key]) {
        if (this.program.length >= this.level.limit) return this.notice("En fazla " + this.level.limit + " komut kullanabilirsin. Daha kısa bir yol düşün!", true);
        this.program.push(key);
        sfx("place");
      }
      if (key === "back") this.program.pop();
      if (key === "clear") this.program = [];
      if (key === "action" || key === "run") return this.runProgram();
      this.resetRobot();
      this.draw();
    }
    resetRobot() {
      this.robot = { ...this.level.start };
      this.collected = new Set();
      this.crash = null;
    }
    runProgram() {
      if (this.mode !== "playing" || this.running) return;
      if (!this.program.length) return this.notice("Önce aşağıdaki oklarla bir komut dizisi oluştur.", true);
      this.resetRobot();
      this.running = true;
      this.pc = 0;
      $("#arcPause").disabled = true;
      this.draw();
      const stepOnce = () => {
        if (this.mode !== "playing") return;
        const key = this.program[this.pc],
          [dx, dy] = MOVES[key],
          n = this.level.size,
          nx = this.robot.x + dx,
          ny = this.robot.y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || this.level.walls.has(ny * n + nx)) {
          this.crash = { x: nx, y: ny };
          return this.endRun(false, `${this.pc + 1}. komutta robot ${nx < 0 || ny < 0 || nx >= n || ny >= n ? "tahtanın dışına çıkmak" : "duvara çarpmak"} üzere. Hatalı komutu bul ve düzelt (hata ayıklama).`);
        }
        this.robot = { x: nx, y: ny };
        this.level.stars.forEach((s, i) => {
          if (s.x === nx && s.y === ny && !this.collected.has(i)) {
            this.collected.add(i);
            sfx("coin");
          }
        });
        sfx("bounce");
        this.pc++;
        this.draw();
        if (this.pc >= this.program.length) {
          const atFlag = nx === this.level.flag.x && ny === this.level.flag.y,
            allStars = this.collected.size === this.level.stars.length;
          if (atFlag && allStars) return this.endRun(true);
          return this.endRun(false, atFlag ? "Bayrağa ulaştın ama tüm yıldızları toplamadın." : "Komutlar bitti ama robot bayrağa ulaşmadı. Eksik adımları ekle.");
        }
        this.runTimer = setTimeout(stepOnce, this.t.speed);
      };
      this.runTimer = setTimeout(stepOnce, 250);
    }
    endRun(ok, message) {
      this.running = false;
      $("#arcPause").disabled = false;
      if (ok) {
        const used = this.program.length,
          perfect = used === this.level.best,
          points = 100 + this.level.stars.length * 30 + (perfect ? 80 : Math.max(0, 40 - (used - this.level.best) * 10));
        this.score += points;
        sfx("win");
        this.stage++;
        if (this.stage >= this.t.levels) {
          this.score += this.lives * 50;
          return this.finish(true);
        }
        this.notice(`Harika! ${used} komut kullandın${perfect ? " · en kısa algoritma! +80" : " · en kısa çözüm " + this.level.best + " komut"}. +${points}`);
        this.newLevel();
        return;
      }
      this.lives--;
      sfx("hit");
      this.draw();
      this.notice(message + " " + (this.lives > 0 ? this.lives + " deneme hakkın kaldı." : ""), true);
      if (this.lives <= 0) this.finish(false);
    }
    draw() {
      const box = $("#arcRobot");
      if (!box || !this.level) return;
      const { size: n, walls, stars, flag } = this.level;
      let cells = "";
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const id = y * n + x,
            robot = this.robot.x === x && this.robot.y === y,
            starIndex = stars.findIndex((s) => s.x === x && s.y === y),
            crash = this.crash && this.crash.x === x && this.crash.y === y;
          let content = "";
          if (walls.has(id)) content = "🧱";
          else if (robot) content = "🤖";
          else if (flag.x === x && flag.y === y) content = "🏁";
          else if (starIndex >= 0 && !this.collected.has(starIndex)) content = "⭐";
          cells += `<div class="arc-rb-cell ${walls.has(id) ? "wall" : ""} ${robot ? "robot" : ""} ${crash ? "crash" : ""}">${content}</div>`;
        }
      box.innerHTML = `<div class="arc-rb-board" style="--n:${n}" role="img" aria-label="${n} satır ${n} sütunlu tahta. Robotu bayrağa götür${stars.length ? ", yolda tüm yıldızları topla" : ""}.">${cells}</div><div class="arc-rb-side"><p class="arc-rb-task">🎯 Görev: 🤖 → 🏁${stars.length ? " · ⭐ " + stars.length + " yıldızın hepsini topla" : ""}<br><small>En fazla ${this.level.limit} komut</small></p><div class="arc-rb-program" aria-label="Komut dizisi">${this.program.map((k, i) => `<span class="${this.running && i === this.pc - 1 ? "now" : ""}" title="${MOVES[k][3]}">${MOVES[k][2]}</span>`).join("") || "<em>Komut dizin boş</em>"}</div><div class="arc-rb-count">${this.program.length} / ${this.level.limit} komut</div><div class="arc-rb-actions"><button data-rb="back">⌫ Sil</button><button data-rb="clear">Temizle</button><button data-rb="run" class="run">▶ Çalıştır</button></div></div>`;
      box.querySelectorAll("[data-rb]").forEach((b) => {
        b.disabled = this.running || this.mode !== "playing";
        b.onclick = () => this.command(b.dataset.rb);
      });
      this.hud();
    }
  }

  // ---------------------------------------------------------------- Donanım Eşleştirme
  const HARDWARE = [
    ["🖱️", "Fare", "İmleci hareket ettirir · giriş birimi"],
    ["⌨️", "Klavye", "Harf ve rakam yazmamızı sağlar · giriş birimi"],
    ["🖥️", "Monitör", "Görüntüyü ekranda gösterir · çıkış birimi"],
    ["🖨️", "Yazıcı", "Belgeyi kâğıda basar · çıkış birimi"],
    ["🎧", "Kulaklık", "Sesi yalnızca bize duyurur · çıkış birimi"],
    ["🎤", "Mikrofon", "Sesimizi bilgisayara aktarır · giriş birimi"],
    ["📷", "Kamera", "Görüntü yakalar · giriş birimi"],
    ["🔊", "Hoparlör", "Sesi ortama verir · çıkış birimi"],
    ["💾", "Depolama birimi", "Dosyaları kalıcı olarak saklar"],
    ["🧠", "İşlemci (CPU)", "Komutları işler; bilgisayarın beynidir"],
    ["📶", "Wi-Fi", "Kablosuz ağ bağlantısı sağlar"],
    ["🔐", "Parola", "Hesabımızı yetkisiz kişilere karşı korur"],
  ];
  class TechMatch extends BaseGame {
    constructor(g, diff) {
      super(g, diff);
      const items = [...HARDWARE].sort(() => Math.random() - 0.5).slice(0, this.t.pairs);
      // Easy and medium match a device with its name; hard matches the name with its job.
      this.cards = items
        .flatMap((item, pair) => [
          { pair, face: this.t.mode === "job" ? item[0] + " " + item[1] : item[0], kind: this.t.mode === "job" ? "name" : "icon", item },
          { pair, face: this.t.mode === "job" ? item[2] : item[1], kind: "text", item },
        ])
        .sort(() => Math.random() - 0.5);
      this.open = [];
      this.found = 0;
      this.moves = 0;
      this.combo = 0;
      this.timeLeft = this.t.time;
      this.peeking = false;
      this.draw();
    }
    begin(fresh) {
      clearInterval(this.timer);
      if (fresh && this.t.peek) {
        this.peeking = true;
        this.draw();
        this.notice("Kartları ezberle! " + this.t.peek + " saniye sonra kapanacak.");
        setTimeout(() => {
          this.peeking = false;
          this.draw();
        }, this.t.peek * 1000);
      }
      this.timer = setInterval(() => {
        if (this.mode !== "playing" || this.peeking) return;
        this.elapsed += 0.25;
        if (this.t.time) {
          this.timeLeft -= 0.25;
          if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.notice("Süre doldu!", true);
            return this.finish(false);
          }
        }
        this.hud();
      }, 250);
    }
    pause() {
      clearInterval(this.timer);
      super.pause();
    }
    finish(won, award) {
      clearInterval(this.timer);
      super.finish(won, award);
    }
    destroy() {
      clearInterval(this.timer);
      clearTimeout(this.flipBack);
      super.destroy();
    }
    metricText() {
      return this.found + " / " + this.t.pairs;
    }
    thirdText() {
      return this.t.time ? Math.ceil(this.timeLeft) + " sn" : this.moves + " hamle";
    }
    summary() {
      return this.moves + " hamle";
    }
    flip(i) {
      const card = this.cards[i];
      if (this.mode !== "playing" || this.peeking || card.done || this.open.includes(i) || this.open.length >= 2) return;
      unlockSound();
      this.open.push(i);
      sfx("place");
      this.draw();
      if (this.open.length < 2) return;
      this.moves++;
      const [a, b] = this.open.map((x) => this.cards[x]);
      if (a.pair === b.pair) {
        a.done = b.done = true;
        this.open = [];
        this.found++;
        this.combo++;
        const points = 100 + (this.combo - 1) * 40;
        this.score += points;
        sfx("clear");
        this.notice(`✔ ${a.item[0]} ${a.item[1]}: ${a.item[2]}. +${points}${this.combo > 1 ? " · Seri ×" + this.combo : ""}`);
        this.draw();
        if (this.found === this.t.pairs) {
          this.score += Math.max(0, Math.ceil(this.timeLeft) * 5) + Math.max(0, (this.t.pairs * 2 - this.moves) * 15);
          this.finish(true);
        }
      } else {
        this.combo = 0;
        this.score = Math.max(0, this.score - 10);
        sfx("hit");
        this.notice("Eşleşmedi. Kartların yerini aklında tut.", true);
        this.flipBack = setTimeout(() => {
          this.open = [];
          this.draw();
        }, 900);
      }
      this.hud();
    }
    draw() {
      const box = $("#arcMatch");
      if (!box) return;
      box.style.setProperty("--cols", this.t.cols);
      box.innerHTML = this.cards
        .map((c, i) => {
          const shown = c.done || this.open.includes(i) || this.peeking || this.mode === "over";
          return `<button class="arc-mc ${shown ? "shown" : ""} ${c.done ? "done" : ""} arc-mc-${c.kind}" data-mc="${i}" aria-label="${shown ? esc(c.face) : "Kapalı kart " + (i + 1)}"><span>${shown ? esc(c.face) : "?"}</span></button>`;
        })
        .join("");
      box.querySelectorAll("[data-mc]").forEach((b) => (b.onclick = () => this.flip(Number(b.dataset.mc))));
      this.hud();
    }
  }

  // ---------------------------------------------------------------- Güvenlik Dedektifi
  // [statement, safe?, explanation]
  const SAFETY = [
    ["Şifrem: K@r3nfil!92", true, "Uzun ve harf, rakam, sembol içeren şifreler tahmin edilmesi zordur."],
    ["Şifrem: 123456", false, "En çok kullanılan ve ilk denenen şifrelerden biridir."],
    ["Şifrem doğum tarihim: 12052012", false, "Doğum tarihi gibi kişisel bilgiler kolay tahmin edilir."],
    ["“Tebrikler, telefon kazandın! Hemen linke tıkla.” mesajı", false, "Bu bir oltalama (phishing) tuzağıdır. Linke tıklama."],
    ["Bilgisayarımın güncellemelerini açık tutuyorum.", true, "Güncellemeler güvenlik açıklarını kapatır."],
    ["Tanımadığım biri okulumu ve adresimi sordu.", false, "Kişisel bilgileri tanımadığın kişilerle paylaşma, bir büyüğüne haber ver."],
    ["Her sitede aynı şifreyi kullanıyorum.", false, "Bir site ele geçirilirse tüm hesapların tehlikeye girer."],
    ["Okul bilgisayarında işim bitince oturumu kapattım.", true, "Ortak cihazlarda oturumu kapatmak hesabını korur."],
    ["Ücretsiz oyun için bilinmeyen bir siteden dosya indirdim.", false, "Bilinmeyen kaynaklardaki dosyalar virüs içerebilir."],
    ["Uygulamaları resmi uygulama mağazasından indiriyorum.", true, "Resmi mağazalar uygulamaları güvenlik kontrolünden geçirir."],
    ["Okul kartımın fotoğrafını sosyal medyada paylaştım.", false, "Kimlik bilgilerin kötü niyetli kişilerin eline geçebilir."],
    ["Fotoğraf paylaşmadan önce konum bilgisini kapattım.", true, "Konum bilgisi nerede olduğunu herkese gösterebilir."],
    ["Siber zorbalığa uğrayınca öğretmenime anlattım.", true, "Güvendiğin bir yetişkinden yardım istemek doğru adımdır."],
    ["Arkadaşımın utandırıcı fotoğrafını gruba gönderdim.", false, "Bu siber zorbalıktır ve arkadaşını üzer."],
    ["İki adımlı doğrulamayı açtım.", true, "Şifren çalınsa bile hesabına girmek zorlaşır."],
    ["Şifremi not alıp ekranın kenarına yapıştırdım.", false, "Ekranı gören herkes şifreni öğrenebilir."],
    ["Tanımadığım kişinin gönderdiği ekli dosyayı açtım.", false, "Ekli dosyalar zararlı yazılım taşıyabilir."],
    ["Bir haberi paylaşmadan önce farklı kaynaklardan kontrol ettim.", true, "Doğrulamak yanlış bilginin yayılmasını önler."],
    ["İnternette gördüğüm her haberi hemen paylaşırım.", false, "Yanlış veya sahte haberlerin yayılmasına neden olabilir."],
    ["Önemli dosyalarımın yedeğini aldım.", true, "Yedek, cihaz bozulsa bile dosyalarını kurtarır."],
    ["Antivirüs programının uyarısını görmezden geldim.", false, "Uyarılar seni tehlikeli dosyalardan korumak içindir."],
    ["Adres çubuğunda “https” ve kilit simgesini kontrol ettim.", true, "Bu, bağlantının şifreli olduğunu gösterir."],
    ["Arkadaşımın şifresini öğrenip hesabına girdim.", false, "Başkasının hesabına izinsiz girmek yanlıştır ve suçtur."],
    ["Başkasının yazdığı ödevi kendi adımla paylaştım.", false, "Emeğe saygı: alıntı yaparken kaynak göstermelisin."],
    ["Bir saat ekran başında kaldıktan sonra mola verdim.", true, "Mola gözlerini ve duruşunu korur."],
    ["Kafedeki şifresiz Wi-Fi’da ailemin banka şifresini girdim.", false, "Açık ağlarda bilgiler başkaları tarafından izlenebilir."],
    ["Oyundaki yabancı biri “hediye için şifreni ver” dedi, vermedim.", true, "Şifreni kimseyle paylaşmamalısın."],
    ["Bir arkadaşımın fotoğrafını paylaşmadan önce izin aldım.", true, "Başkalarının fotoğrafını izinsiz paylaşmamalıyız."],
  ];
  class SafetyGame extends ActionGame {
    init() {
      this.deck = [];
      this.card = null;
      this.correct = 0;
      this.answered = 0;
      this.feedback = null;
      this.next = 0.3;
    }
    metricText() {
      return this.correct + " / " + this.t.goal;
    }
    summary() {
      return this.correct + " doğru · " + (this.answered - this.correct) + " yanlış";
    }
    deal() {
      if (!this.deck.length) this.deck = [...SAFETY].sort(() => Math.random() - 0.5);
      const [text, safe, why] = this.deck.pop(),
        time = Math.max(this.t.minTime, this.t.time - this.correct * this.t.speedUp);
      this.card = { text, safe, why, y: 70, time, age: 0 };
    }
    command(key) {
      if (!this.card || this.feedback) return;
      if (key === "left") this.answer(false);
      if (key === "right") this.answer(true);
    }
    pointer(type, pos) {
      if (type === "down") this.command(pos.x < W / 2 ? "left" : "right");
    }
    answer(safe) {
      const c = this.card,
        ok = safe === c.safe;
      this.answered++;
      if (ok) {
        this.correct++;
        this.chain++;
        const points = Math.round((50 + 50 * (1 - c.age / c.time)) * this.mult);
        this.score += points;
        sfx("coin");
        this.burst(safe ? 700 : 200, 300, safe ? "#51e6c2" : "#ff969b", 14);
        this.float(W / 2, 150, "+" + points, "#ffe76e");
      } else {
        this.chain = 0;
        this.lives--;
        sfx("hit");
        this.shake(0.25);
      }
      this.feedback = { ok, safe: c.safe, why: c.why, life: ok ? this.t.read : this.t.read + 1.2 };
      this.notice((ok ? "Doğru! " : "Yanlış. ") + (c.safe ? "GÜVENLİ: " : "RİSKLİ: ") + c.why, !ok);
      this.card = null;
      if (this.lives <= 0) return this.finish(false);
      if (this.correct >= this.t.goal) {
        this.score += this.lives * 100;
        return this.finish(true);
      }
    }
    step(dt) {
      if (this.feedback) {
        this.feedback.life -= dt;
        if (this.feedback.life <= 0) {
          this.feedback = null;
          this.next = 0.25;
        }
        return;
      }
      if (!this.card) {
        this.next -= dt;
        if (this.next <= 0) this.deal();
        return;
      }
      const c = this.card;
      c.age += dt;
      c.y = 70 + (c.age / c.time) * 330;
      if (c.age >= c.time) {
        this.answered++;
        this.chain = 0;
        this.lives--;
        sfx("hit");
        this.feedback = { ok: false, late: true, safe: c.safe, why: c.why, life: this.t.read + 1.2 };
        this.notice("Süre bitti. " + (c.safe ? "GÜVENLİ: " : "RİSKLİ: ") + c.why, true);
        this.card = null;
        if (this.lives <= 0) this.finish(false);
      }
    }
    wrap(text, width) {
      const words = text.split(" "),
        lines = [];
      let line = "";
      this.ctx.font = "700 22px system-ui, sans-serif";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (this.ctx.measureText(test).width > width && line) {
          lines.push(line);
          line = w;
        } else line = test;
      }
      lines.push(line);
      return lines;
    }
    render(c) {
      this.rect(0, 0, 160, H, "#ff969b14", 0);
      this.rect(W - 160, 0, 160, H, "#51e6c214", 0);
      this.label("⛔ RİSKLİ", 80, H / 2, 22, "#ff969b");
      this.label("← tuşu", 80, H / 2 + 30, 14, "#b9c6dd");
      this.label("✅ GÜVENLİ", W - 80, H / 2, 22, "#51e6c2");
      this.label("→ tuşu", W - 80, H / 2 + 30, 14, "#b9c6dd");
      this.rect(180, 450, W - 360, 6, "#ff969b55", 3);
      const card = this.card;
      if (card) {
        const lines = this.wrap(card.text, 460),
          h = 70 + lines.length * 30;
        this.rect(200, card.y, W - 400, h, "#f6f8fc", 16);
        this.rect(200, card.y + h - 8, (W - 400) * (1 - card.age / card.time), 8, card.age / card.time > 0.7 ? "#ff969b" : this.g.color, 4);
        c.fillStyle = "#1c2c47";
        c.font = "700 22px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        lines.forEach((l, i) => c.fillText(l, W / 2, card.y + 34 + i * 30));
      }
      const f = this.feedback;
      if (f) {
        const lines = this.wrap(f.why, 480);
        this.rect(190, 150, W - 380, 120 + lines.length * 28, f.ok ? "#123b33f0" : "#4a1f2cf0", 18);
        this.label((f.ok ? "✔ Doğru! " : f.late ? "⏰ Süre bitti! " : "✖ Yanlış! ") + (f.safe ? "Bu durum GÜVENLİ" : "Bu durum RİSKLİ"), W / 2, 190, 24, f.ok ? "#51e6c2" : "#ff969b");
        c.fillStyle = "#e7eefb";
        c.font = "600 20px system-ui, sans-serif";
        c.textAlign = "center";
        lines.forEach((l, i) => c.fillText(l, W / 2, 240 + i * 28));
      }
    }
    renderTop() {
      this.progressBar(this.correct / this.t.goal, this.correct + " doğru");
    }
  }

  // A separate library keeps the subject activities and their progress filters intact.
  let section = "lessons";
  $("#studentMode").insertAdjacentHTML("afterend", '<button class="pill" id="arcadeMode" role="tab" aria-selected="false" aria-controls="arcadeLibrary">🎮 Oyunlar</button>');
  $("#studentMode").setAttribute("role", "tab");
  $("#studentMode").setAttribute("aria-selected", "true");
  $("#studentMode").setAttribute("aria-controls", "activities");
  document
    .querySelector("footer")
    .insertAdjacentHTML(
      "beforebegin",
      '<section id="arcadeLibrary" class="arc-library" role="tabpanel" aria-labelledby="arcadeMode" hidden><div class="arc-library-heading"><div class="arc-hero-text"><span class="arc-eyebrow">OYUN MOLASI</span><h1>Bir oyun seç.<br>Hemen oyna.</h1><p>Penaltı at, çiftliğini büyüt, robotu kodla. Her oyunda kolay, orta ve zor seviye seni bekliyor.</p><div class="arc-hero-stats"><span><b>' + games.length + '</b> oyun</span><span><b>' + games.filter((g) => g.edu).length + '</b> eğitsel</span><span><b>3</b> zorluk</span><span>⌨️ Klavye · 👆 Dokunmatik</span></div></div><div class="arc-library-side"><div id="arcContinue" class="arc-continue"></div><div class="arc-library-badges"></div></div></div><div class="arc-filters" id="arcFilters" role="toolbar" aria-label="Oyunları filtrele"></div><div id="arcadeGrid" class="arc-library-grid"></div></section>',
    );
  // Library filters and a "continue" card make the next game one click away.
  const CATS = {
    all: ["Tümü", "🎮"],
    edu: ["Eğitsel", "📚"],
    action: ["Aksiyon", "⚡"],
    mind: ["Zekâ ve keşif", "🧩"],
  };
  const TAGS = { "robo-run": "action", "neon-rally": "action", "sky-bounce": "action", "meteor-breaker": "action", penalty: "action", drive: "action", "block-master": "mind", farm: "mind", "robot-code": "edu mind", "tech-match": "edu mind", "safety-detective": "edu" };
  const NEW = new Set(["farm", "robot-code", "tech-match", "safety-detective"]);
  let filter = CATS[read("btoyun-arcade-filter", "all")] ? read("btoyun-arcade-filter", "all") : "all";
  const inCat = (g, cat) => cat === "all" || (TAGS[g.id] || "").split(" ").includes(cat);
  function coverHtml(g, i) {
    return g.premium ? `<img src="assets/play/art/${g.cover}" alt="" loading="lazy">` : `<span class="arc-cover-icon" aria-hidden="true">${g.icon}</span><b>${g.cover}</b>`;
  }
  function renderContinue() {
    const lastId = read("btoyun-arcade-last", ""),
      last = games.find((g) => g.id === lastId),
      day = Math.floor(Date.now() / 864e5),
      g = last || games[day % games.length];
    $("#arcContinue").innerHTML = `<span class="arc-continue-label">${last ? "Kaldığın yerden devam et" : "Bugünün önerisi"}</span><div class="arc-continue-row"><span class="arc-continue-thumb" style="--arc-accent:${g.color}">${g.premium ? `<img src="assets/play/art/${g.cover}" alt="">` : g.icon}</span><div><b>${g.name}</b><small>${g.genre} · Rekor ${fmt(best(g.id))}</small></div></div><button class="arc-continue-play" data-arc-play="${g.id}">▶ Oyna</button>`;
  }
  function renderFilters() {
    $("#arcFilters").innerHTML = Object.entries(CATS)
      .map(([k, [label, icon]]) => `<button data-arc-filter="${k}" class="${k === filter ? "active" : ""}" aria-pressed="${k === filter}">${icon} ${label} <small>${games.filter((g) => inCat(g, k)).length}</small></button>`)
      .join("");
    document.querySelectorAll("[data-arc-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          filter = b.dataset.arcFilter;
          write("btoyun-arcade-filter", filter);
          renderArcade();
        }),
    );
  }
  function renderArcade() {
    window.BTOyunExperience?.library();
    renderContinue();
    renderFilters();
    $("#arcadeGrid").innerHTML = games
      .map((g, i) => {
        const diff = g.premium ? null : diffOf(g.id),
          record = best(g.id);
        return `<article class="arc-card ${g.premium ? "pg-feature-card" : ""}" style="--arc-accent:${g.color}" ${inCat(g, filter) ? "" : "hidden"}><button class="arc-cover arc-cover-${i} ${g.premium ? "pg-feature-cover" : ""}" data-arc-play="${g.id}" aria-label="${esc(g.name)} oyna"><span class="arc-card-genre">${g.genre}</span>${g.edu ? `<span class="arc-edu-badge">📚 Eğitsel · ${g.edu}</span>` : ""}${NEW.has(g.id) ? '<span class="arc-new-badge">YENİ</span>' : ""}${coverHtml(g, i)}<span class="arc-cover-play" aria-hidden="true">▶</span></button><div class="arc-card-body"><h2>${g.name}</h2><p>${g.summary}</p><div class="arc-card-meta"><span>${g.premium ? "🎯 " + g.goal : "🎚️ Seviye: " + DIFFS[diff].icon + " " + DIFFS[diff].label}</span><span class="${record ? "arc-has-record" : ""}">🏆 ${record ? "Rekor " + fmt(record) : "Henüz rekor yok"}</span></div><button class="arc-play-button" data-arc-play="${g.id}">▶ Oyna</button></div></article>`;
      })
      .join("");
    document.querySelectorAll("[data-arc-play]").forEach(
      (b) =>
        (b.onclick = () => {
          const g = games.find((g) => g.id === b.dataset.arcPlay);
          write("btoyun-arcade-last", g.id);
          if (g.premium) window.openPremiumGame(g.id);
          else openArcade(g);
        }),
    );
  }
  function selectSection(value, changeHash = true) {
    stopArcade();
    section = value;
    const arcade = section === "arcade";
    $("#activities").hidden = arcade;
    document.querySelector(".hero").hidden = arcade;
    $("#arcadeLibrary").hidden = !arcade;
    $("#studentMode").classList.toggle("active", !arcade);
    $("#arcadeMode").classList.toggle("active", arcade);
    $("#studentMode").setAttribute("aria-selected", String(!arcade));
    $("#arcadeMode").setAttribute("aria-selected", String(arcade));
    document.body.classList.toggle("arcade-section", arcade);
    if (arcade) renderArcade();
    if (changeHash) {
      try {
        history.replaceState(null, "", arcade ? "#oyunlar" : location.pathname + location.search);
      } catch {}
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("#arcadeMode").onclick = () => selectSection("arcade");
  $("#studentMode").onclick = () => selectSection("lessons");
  window.addEventListener("hashchange", () => selectSection(location.hash === "#oyunlar" ? "arcade" : "lessons", false));
  const oldOpenModal = openModal;
  openModal = function (...args) {
    stopArcade();
    oldOpenModal(...args);
  };
  const oldCloseModal = closeModal;
  closeModal = function () {
    stopArcade();
    oldCloseModal();
    if (section === "arcade") renderArcade();
  };
  $("#closeModal").onclick = closeModal;
  const oldOpenActivity = openActivity;
  openActivity = function (id) {
    stopArcade();
    oldOpenActivity(id);
  };
  const oldRender = render;
  render = function () {
    oldRender();
    if (section === "arcade") renderArcade();
  };
  renderArcade();
  if (location.hash === "#oyunlar") selectSection("arcade", false);
})();
