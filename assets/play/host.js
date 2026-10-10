import { W, H, store } from "./core.js";
import { EffectsAudio } from "./audio.js";
const meta = {
  penalty: {
    title: "Penaltı Arenası",
    genre: "Futbol · Sürükle-vur",
    color: "#43edbd",
    controls: [
      ["action", "Şut / Kurtar", "Boşluk: tut, bırak"],
      ["left", "Sol", "← / A"],
      ["right", "Sağ", "→ / D"],
      ["up", "↑", "↑ / W"],
      ["down", "↓", "↓ / S"],
    ],
  },
  drive: {
    title: "Denge Sürüşü",
    genre: "Arazi · Fizik",
    color: "#ffbf57",
    controls: [
      ["left", "Fren / Geri", "← / A"],
      ["right", "Gaz", "→ / D"],
    ],
  },
  farm: {
    title: "Mini Çiftlik",
    genre: "Simülasyon · Keşif",
    color: "#8fd65a",
    controls: [
      ["left", "Sol", "← / A"],
      ["up", "Yukarı", "↑ / W"],
      ["down", "Aşağı", "↓ / S"],
      ["right", "Sağ", "→ / D"],
      ["action", "Etkileşim", "Boşluk / E"],
    ],
  },
};
let active = null,
  serial = 0;
export const activeHost = () => active;
export function stop() {
  serial++;
  active?.destroy();
  active = null;
}
export async function open(id) {
  stop();
  const m = meta[id];
  if (!m) return;
  window.openModal(
    m.title,
    m.genre,
    `<div class="pg-host" style="--pg-accent:${m.color}"><div class="pg-topbar"><div class="pg-hud" id="pgHud"></div><div class="pg-tools"><button id="pgPause" disabled>Duraklat</button><button id="pgRestart" disabled>Yeniden</button><button id="pgSound">Efekt sesi</button><button id="pgFull">Tam ekran</button><button id="pgBack">Oyunlara dön</button></div></div><div class="pg-frame" id="pgFrame"><div class="pg-render" id="pgRender"></div><div class="pg-overlay" id="pgOverlay"><div class="pg-panel"><p class="pg-kicker">${m.genre}</p><h3>${m.title}</h3><p>Oyun hazırlanıyor…</p></div></div><div class="pg-ingame-message" id="pgMessage" role="status"></div></div><div class="pg-controls">${m.controls.map(([key, label, hint]) => `<button data-pg-key="${key}"><b>${label}</b><small>${hint}</small></button>`).join("")}</div><div class="pg-bottom"><p id="pgStatus" role="status">Klavye, fare veya dokunmatik ekranla oyna.</p><details class="pg-settings"><summary>Oyun ayarları</summary><div><label>Görsel kalite <select id="pgQuality"><option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option></select></label><label>Ses düzeyi <input id="pgVolume" type="range" min="0" max="1" step=".05"></label><label><input id="pgMotion" type="checkbox"> Kamera hareketini azalt</label></div></details><span>Müzik yok · Yalnızca oyun efektleri</span></div></div>`,
  );
  document.querySelector(".dialog").classList.add("pg-dialog");
  const version = serial,
    host = new GameHost(id, m);
  active = host;
  try {
    const module = await import(`./${id}.js?v=22`);
    if (version !== serial || host.dead) return;
    host.game = await module.create(host);
    if (version !== serial || host.dead) {
      host.game?.destroy();
      return;
    }
    host.ready = true;
    host.q("#pgRestart").disabled = false;
    host.q("#pgPause").disabled = false;
    host.game.menu();
  } catch (error) {
    if (!host.dead)
      host.overlay("Oyun açılamadı", error.message, [
        ["Yeniden dene", () => open(id)],
        ["Oyunlara dön", () => window.closeModal()],
      ]);
  }
}
export class GameHost {
  constructor(id, meta) {
    this.id = id;
    this.meta = meta;
    this.dead = false;
    this.ready = false;
    this.paused = true;
    this.game = null;
    this.keys = new Set();
    this.sources = new Map();
    this.pointers = new Map();
    this.surfacePointers = new Set();
    this.abort = new AbortController();
    this.audio = new EffectsAudio();
    this.quality = store.read("quality", "high");
    this.reduced = store.read(
      "motion",
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    this.root = document.querySelector(".pg-host");
    this.q = (s) => (s === ".pg-host" ? this.root : this.root.querySelector(s));
    this.root.dataset.game = id;
    const opts = { signal: this.abort.signal };
    this.q("#pgQuality").value = this.quality;
    this.q("#pgVolume").value = this.audio.volume;
    this.q("#pgMotion").checked = this.reduced;
    this.updateSound();
    this.q("#pgPause").onclick = () => this.togglePause();
    this.q("#pgRestart").onclick = () => {
      this.audio.unlock();
      this.clear();
      this.audio.stop();
      this.paused = true;
      this.game?.restart();
    };
    this.q("#pgBack").onclick = () => window.closeModal();
    this.q("#pgSound").onclick = () => {
      this.audio.setMuted(!this.audio.muted);
      this.updateSound();
    };
    this.q("#pgQuality").onchange = (e) => {
      this.quality = e.target.value;
      store.write("quality", this.quality);
      this.game?.quality?.();
    };
    this.q("#pgMotion").onchange = (e) => {
      this.reduced = e.target.checked;
      store.write("motion", this.reduced);
    };
    this.q("#pgVolume").oninput = (e) => this.audio.setVolume(e.target.value);
    this.q("#pgFull").onclick = async () => {
      const frame = this.q(".pg-host");
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await frame.requestFullscreen();
      } catch {
        this.status("Tam ekran bu tarayıcıda kullanılamıyor.");
      }
    };
    this.q(".pg-render").tabIndex = 0;
    this.q(".pg-render").setAttribute("aria-label", meta.title + " oyun alanı");
    window.addEventListener("keydown", (e) => this.key(e, true), opts);
    window.addEventListener("keyup", (e) => this.key(e, false), opts);
    window.addEventListener("blur", () => this.pause(), opts);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) this.pause();
      },
      opts,
    );
    this.q("#pgFrame").addEventListener(
      "pointerdown",
      (e) => {
        const pos = this.pos(e);
        if (
          this.paused ||
          e.button !== 0 ||
          e.target.closest(".pg-overlay") ||
          !pos
        )
          return;
        this.q(".pg-render").focus({ preventScroll: true });
        this.audio.unlock();
        e.preventDefault();
        this.surfacePointers.add(e.pointerId);
        e.currentTarget.setPointerCapture(e.pointerId);
        this.game?.pointer?.("down", pos, e.pointerId);
      },
      opts,
    );
    this.q("#pgFrame").addEventListener(
      "pointermove",
      (e) => {
        const pos = this.pos(e);
        if (!this.paused && pos && !e.target.closest(".pg-overlay"))
          this.game?.pointer?.("move", pos, e.pointerId);
      },
      opts,
    );
    const endSurface = (e, cancelled) => {
      if (this.surfacePointers.delete(e.pointerId))
        this.game?.pointer?.(
          cancelled ? "cancel" : "up",
          this.pos(e),
          e.pointerId,
        );
    };
    this.q("#pgFrame").addEventListener(
      "pointerup",
      (e) => endSurface(e, false),
      opts,
    );
    this.q("#pgFrame").addEventListener(
      "pointercancel",
      (e) => endSurface(e, true),
      opts,
    );
    this.q("#pgFrame").addEventListener(
      "lostpointercapture",
      (e) => endSurface(e, true),
      opts,
    );
    this.q(".pg-controls")
      .querySelectorAll("button")
      .forEach((b) => {
        const key = b.dataset.pgKey;
        b.addEventListener(
          "pointerdown",
          (e) => {
            if (this.paused || e.button !== 0) return;
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
            this.audio.unlock();
            this.pointers.set(e.pointerId, b);
            this.press(key, true, "pointer:" + e.pointerId);
          },
          opts,
        );
        const release = (e, cancelled) => {
          if (this.pointers.delete(e.pointerId))
            this.press(key, false, "pointer:" + e.pointerId, cancelled);
        };
        b.addEventListener("pointerup", (e) => release(e, false), opts);
        for (const name of ["pointercancel", "lostpointercapture"])
          b.addEventListener(name, (e) => release(e, true), opts);
        b.addEventListener(
          "keydown",
          (e) => {
            if (["Enter", " "].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              if (!e.repeat) {
                this.audio.unlock();
                this.press(key, true, "keyboard:" + e.code);
              }
            }
          },
          opts,
        );
        b.addEventListener(
          "keyup",
          (e) => {
            if (["Enter", " "].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              this.press(key, false, "keyboard:" + e.code);
            }
          },
          opts,
        );
      });
    this.experience = window.BTOyunExperience?.mount({
      root: this.root,
      stage: this.q("#pgFrame"),
      tools: this.q(".pg-tools"),
      fullscreenButton: this.q("#pgFull"),
      beforeDialog: () => this.pause(),
      onResize: () => this.game?.resize?.(),
      status: (value) => this.status(value),
    });
  }
  pos(e) {
    const r = this.q("#pgRender").getBoundingClientRect();
    if (!r.width || !r.height) return null;
    let pos;
    {
      const scale = Math.min(r.width / W, r.height / H),
        left = r.left + (r.width - W * scale) / 2,
        top = r.top + (r.height - H * scale) / 2;
      pos = { x: (e.clientX - left) / scale, y: (e.clientY - top) / scale };
    }
    return pos.x >= 0 && pos.x <= W && pos.y >= 0 && pos.y <= H ? pos : null;
  }
  key(e, down) {
    if (this.dead) return;
    const source = "keyboard:" + e.code,
      held = this.sources.get(source);
    if (!down && held) {
      e.preventDefault();
      this.press(held, false, source);
      return;
    }
    if (
      !this.root.contains(document.activeElement) ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (e.target.closest("button") && [" ", "Enter"].includes(e.key)) return;
    if (e.key.toLowerCase() === "p" && down && !e.repeat) {
      e.preventDefault();
      this.togglePause();
      return;
    }
    const key = {
      ArrowLeft: "left",
      a: "left",
      A: "left",
      ArrowRight: "right",
      d: "right",
      D: "right",
      " ": "action",
      Enter: "action",
      e: "action",
      E: "action",
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowDown: "down",
      s: "down",
      S: "down",
    }[e.key];
    if (!key) return;
    e.preventDefault();
    if (!e.repeat) {
      this.audio.unlock();
      this.press(key, down, source);
    }
  }
  press(key, down, source = "manual:" + key, cancelled = false) {
    if (!down) key = this.sources.get(source) || key;
    if (this.dead || (this.paused && down)) return;
    const before = this.keys.has(key);
    if (down) this.sources.set(source, key);
    else this.sources.delete(source);
    const after = [...this.sources.values()].includes(key);
    if (after) this.keys.add(key);
    else this.keys.delete(key);
    if (before !== after) {
      if (cancelled && !after) this.game?.cancelInput?.(key);
      this.game?.input?.(key, after);
    }
    this.q(".pg-controls")
      ?.querySelectorAll("button")
      .forEach((b) =>
        b.classList.toggle("held", this.keys.has(b.dataset.pgKey)),
      );
  }
  clear() {
    this.keys.clear();
    this.sources.clear();
    this.game?.cancelInput?.();
    const captured = [...this.pointers.entries()].map(([id, b]) => [id, b]);
    for (const id of this.surfacePointers)
      captured.push([id, this.q("#pgFrame")]);
    this.pointers.clear();
    this.surfacePointers.clear();
    for (const [id, el] of captured) {
      if (el?.hasPointerCapture(id)) el.releasePointerCapture(id);
    }
    this.q(".pg-controls")
      ?.querySelectorAll(".held")
      .forEach((b) => b.classList.remove("held"));
  }
  updateSound() {
    const b = this.q("#pgSound");
    if (b) {
      b.textContent = this.audio.muted ? "Ses kapalı" : "Efektler açık";
      b.setAttribute("aria-pressed", String(!this.audio.muted));
    }
  }
  hud(items) {
    if (this.dead) return;
    const value = JSON.stringify(items);
    if (value === this.hudValue) return;
    this.hudValue = value;
    this.q("#pgHud").innerHTML = items
      .map(
        ([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`,
      )
      .join("");
  }
  status(value) {
    if (!this.dead) this.q("#pgStatus").textContent = value;
  }
  message(value) {
    if (!this.dead) this.q("#pgMessage").textContent = value;
  }
  reward(id, detail = "") {
    if (!this.dead)
      window.BTOyunExperience?.award(id, {
        target: this.q("#pgOverlay .pg-panel"),
        stage: this.q("#pgFrame"),
        detail,
      });
  }
  overlay(title, description, actions, extra = "") {
    if (this.dead) return;
    this.paused = true;
    this.clear();
    const el = this.q("#pgOverlay");
    el.hidden = false;
    el.innerHTML = `<div class="pg-panel"><p class="pg-kicker">${this.meta.genre}</p><h3>${title}</h3><p>${description}</p>${extra}<div class="pg-actions"></div></div>`;
    for (const [label, fn] of actions) {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => {
        this.audio.unlock();
        this.audio.play("click");
        fn();
      };
      el.querySelector(".pg-actions").append(b);
    }
    this.q("#pgPause").textContent = "Duraklat";
    this.q("#pgPause").disabled = true;
  }
  play() {
    this.q("#pgOverlay").hidden = true;
    this.paused = false;
    this.clear();
    this.q("#pgPause").disabled = false;
    this.q("#pgPause").textContent = "Duraklat";
    this.q(".pg-render").focus({ preventScroll: true });
  }
  pause() {
    if (this.dead || this.paused || !this.game) return;
    this.paused = true;
    this.clear();
    this.audio.stop();
    this.game.pause?.();
    this.q("#pgOverlay").hidden = false;
    this.q("#pgOverlay").innerHTML =
      '<div class="pg-panel"><p class="pg-kicker">OYUN DURAKLATILDI</p><h3>Kısa bir mola</h3><p>Hazır olduğunda kaldığın yerden devam et.</p><div class="pg-actions"><button id="pgResume">Devam et</button></div></div>';
    this.q("#pgResume").onclick = () => {
      this.audio.unlock();
      this.play();
      this.game.resume?.();
    };
    this.q("#pgPause").textContent = "Devam et";
  }
  togglePause() {
    if (!this.ready) return;
    if (this.paused) {
      this.q("#pgResume")?.click();
    } else this.pause();
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.clear();
    this.experience?.destroy();
    this.abort.abort();
    this.game?.destroy();
    this.audio.destroy();
    this.q("#pgRender")?.replaceChildren();
    document.querySelector(".dialog")?.classList.remove("pg-dialog");
    if (document.fullscreenElement?.classList.contains("pg-host"))
      document.exitFullscreen().catch(() => {});
  }
}
