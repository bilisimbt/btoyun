(() => {
  "use strict";
  const BADGES = {
    lesson: [
      "Etkinlik Kâşifi",
      "Bir ders etkinliğini tamamla.",
      "medal",
      "Yeni bir görevi tamamladın. Öğrendiklerini bir sonraki etkinlikte kullan!",
    ],
  };
  const STORAGE = "btoyun-badges-v1",
    VIEW = "btoyun-game-view";
  let current = null,
    lastFullscreenExit = 0;
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  function earned() {
    const raw = read(STORAGE, {}),
      result = {};
    for (const id of Object.keys(BADGES)) {
      const n = raw?.[id]?.count;
      if (Number.isFinite(n) && n > 0)
        result[id] = { count: Math.min(999999, Math.floor(n)) };
    }
    return result;
  }
  const tier = (count) =>
    count >= 5
      ? { name: "Altın", className: "gold" }
      : count >= 3
        ? { name: "Gümüş", className: "silver" }
        : { name: "Bronz", className: "bronze" };
  function symbol(kind) {
    const paths = {
      cup: "M11 8h18v9c0 10-18 10-18 0V8zm0 2H6v5c0 5 5 6 7 6m16-11h5v5c0 5-5 6-7 6M20 25v7m-7 3h14",
      star: "m20 7 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z",
      ball: "M33 20a13 13 0 1 1-26 0 13 13 0 0 1 26 0zm-13-7 6 4-2 7h-8l-2-7zm0-7v7m13 7-7-3m-2 7 4 7m-12-7-4 7M7 20l7-3",
      wheel:
        "M33 20a13 13 0 1 1-26 0 13 13 0 0 1 26 0zM20 7v9m13 4h-9m-4 13v-9M7 20h9m8 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
      bolt: "m22 5-13 18h10l-2 12 14-19H21z",
      puzzle: "M9 9h10v5c7-3 7 7 0 4v5h-5c3 7-7 7-4 0H5V13h4zm14 14h10v10H23z",
      medal:
        "m11 6 9 13 9-13M10 6h7m6 0h7m-1 22a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-6 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z",
    };
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${paths[kind] || paths.star}"/></svg>`;
  }
  function badgeArt(id, count = 1) {
    return `<span class="gx-medal gx-${tier(count).className}"><span class="gx-medal-ring"></span>${symbol(BADGES[id][2])}<i aria-hidden="true">${"★".repeat(count >= 5 ? 3 : count >= 3 ? 2 : 1)}</i></span>`;
  }
  function refreshCounts() {
    const n = Object.keys(earned()).length;
    document
      .querySelectorAll("[data-gx-count]")
      .forEach((b) => (b.textContent = `Rozetlerim · ${n}`));
  }
  function reduced() {
    return (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      read("btoyun-play-motion", false) === true
    );
  }
  function celebrate(stage) {
    stage?.querySelector(".gx-celebration")?.remove();
    if (!stage || reduced()) return;
    const box = document.createElement("div");
    box.className = "gx-celebration";
    box.setAttribute("aria-hidden", "true");
    const colors = ["#ffd973", "#67efc8", "#a8c7ff", "#d9b0ff", "#ffaab0"];
    box.innerHTML =
      Array.from(
        { length: 50 },
        (_, i) =>
          `<i style="--x:${Math.random() * 100}%;--delay:${Math.random() * 0.35}s;--color:${colors[i % colors.length]};--drift:${Math.random() * 180 - 90}px;--turn:${Math.random() * 600 - 300}deg"></i>`,
      ).join("") + '<span class="gx-burst"></span>';
    stage.append(box);
    setTimeout(() => box.remove(), 2600);
  }
  function award(id, { target, stage, victory = true, detail = "" } = {}) {
    if (!BADGES[id]) return;
    const data = earned(),
      old = data[id]?.count || 0;
    data[id] = { count: old + 1 };
    if (victory && !data["first-win"]) data["first-win"] = { count: 1 };
    write(STORAGE, data);
    refreshCounts();
    const level = tier(old + 1),
      rankUp = old > 0 && tier(old).className !== level.className;
    const card = document.createElement("div");
    card.className = "gx-award" + (reduced() ? " gx-no-motion" : "");
    card.setAttribute("role", "status");
    card.innerHTML = `${badgeArt(id, old + 1)}<div><span class="gx-award-kicker">${!old ? "YENİ ROZET" : rankUp ? "ROZETİN YÜKSELDİ" : "BİR BAŞARI DAHA"}</span><h4>${BADGES[id][0]}</h4><b>${level.name} rozet · ${old + 1}. başarı</b><p>${BADGES[id][3]}</p>${detail ? '<small class="gx-award-detail"></small>' : ""}</div>`;
    if (detail) card.querySelector(".gx-award-detail").textContent = detail;
    if (target) {
      target.querySelector(".gx-award")?.remove();
      const actions = target.querySelector(
        ".pg-actions,#arcStart,.answer-actions",
      );
      if (actions) actions.before(card);
      else target.append(card);
    } else {
      card.classList.add("gx-award-toast");
      (document.fullscreenElement || document.body).append(card);
      setTimeout(() => card.remove(), 4400);
    }
    celebrate(
      stage ||
        target?.closest(".pg-frame,.arc-surface") ||
        document.querySelector(".dialog"),
    );
    return { id, count: old + 1 };
  }
  function gallery(parent = document.body, beforeOpen) {
    if (document.querySelector(".gx-gallery")) return;
    beforeOpen?.();
    const opener = document.activeElement,
      data = earned(),
      dialog = document.createElement("dialog");
    dialog.className = "gx-gallery";
    dialog.innerHTML = `<div class="gx-gallery-head"><div><span>BAŞARI KOLEKSİYONUN</span><h2>Rozetlerim</h2><p>${Object.keys(data).length} / ${Object.keys(BADGES).length} rozet · Bronz: 1, gümüş: 3, altın: 5 başarı</p></div><button class="gx-gallery-close" aria-label="Rozetleri kapat">✕</button></div><p class="gx-local-note">Rozetler yalnızca bu cihaz ve tarayıcıda saklanır.</p><div class="gx-gallery-grid">${Object.keys(
      BADGES,
    )
      .map(
        (id) =>
          `<article class="gx-badge-card ${data[id] ? "" : "gx-locked"}">${badgeArt(id, data[id]?.count || 1)}<h3>${BADGES[id][0]}</h3><p>${BADGES[id][1]}</p><b>${data[id] ? `${tier(data[id].count).name} · ${data[id].count} başarı` : "Henüz kazanılmadı"}</b></article>`,
      )
      .join("")}</div>`;
    parent.append(dialog);
    const close = () => {
      dialog.close();
      dialog.remove();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    dialog.querySelector(".gx-gallery-close").onclick = close;
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dialog.addEventListener("keydown", (e) => e.stopPropagation());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close();
    });
    dialog.showModal();
    dialog.querySelector(".gx-gallery-close").focus();
  }
  function library() {
    const box = document.querySelector(".arc-library-badges");
    if (!box || box.querySelector("[data-gx-count]")) {
      refreshCounts();
      return;
    }
    const b = document.createElement("button");
    b.dataset.gxCount = "";
    b.className = "gx-library-button";
    b.onclick = () => gallery(document.body);
    box.append(b);
    refreshCounts();
  }
  function mount({
    root,
    stage,
    tools,
    beforeDialog,
    onResize,
    status,
    fullscreenButton,
  }) {
    current?.destroy();
    const dialog = root.closest(".dialog"),
      modal = dialog.closest("#modal"),
      abort = new AbortController();
    let dead = false;
    modal.classList.add("game-modal");
    dialog.classList.add("game-dialog");
    root.classList.add("gx-game-root");
    const wide = document.createElement("button");
    wide.className = "gx-view-button";
    wide.type = "button";
    const collection = document.createElement("button");
    collection.type = "button";
    collection.dataset.gxCount = "";
    collection.className = "gx-badges-button";
    const full = fullscreenButton || document.createElement("button");
    full.type = "button";
    if (!fullscreenButton) {
      full.className = "gx-full-button";
      tools.append(full);
    }
    tools.append(wide, collection);
    const resize = () => {
      if (dead) return;
      requestAnimationFrame(() => {
        if (!dead) {
          onResize?.();
          window.dispatchEvent(new Event("resize"));
        }
      });
    };
    function setView(value, persist = true) {
      if (dead) return;
      const isWide = value === "wide";
      dialog.classList.toggle("game-wide", isWide);
      root.dataset.gxView = isWide ? "wide" : "window";
      wide.textContent = isWide ? "Pencere görünümü" : "Geniş görünüm";
      wide.setAttribute("aria-pressed", String(isWide));
      if (persist) write(VIEW, isWide ? "wide" : "window");
      resize();
    }
    wide.onclick = () =>
      setView(dialog.classList.contains("game-wide") ? "window" : "wide");
    collection.onclick = () => gallery(dialog, beforeDialog);
    const updateFull = () => {
      const active = document.fullscreenElement === dialog;
      full.textContent = active ? "Tam ekrandan çık" : "Tam ekran";
      full.setAttribute("aria-pressed", String(active));
      resize();
    };
    full.onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else {
          setView("wide");
          await dialog.requestFullscreen({ navigationUI: "hide" });
        }
        updateFull();
      } catch {
        setView("wide");
        status?.("Tarayıcı tam ekranı açamadı. Geniş görünüm açık.");
      }
    };
    document.addEventListener(
      "fullscreenchange",
      () => {
        if (!document.fullscreenElement) lastFullscreenExit = Date.now();
        updateFull();
      },
      { signal: abort.signal },
    );
    setView(read(VIEW, "wide"), false);
    updateFull();
    refreshCounts();
    const controller = {
      destroy() {
        if (dead) return;
        dead = true;
        abort.abort();
        dialog.querySelector(".gx-gallery")?.remove();
        dialog
          .querySelectorAll(".gx-celebration,.gx-award-toast")
          .forEach((n) => n.remove());
        if (document.fullscreenElement === dialog)
          document.exitFullscreen().catch(() => {});
        modal.classList.remove("game-modal");
        dialog.classList.remove("game-dialog", "game-wide");
        root.classList.remove("gx-game-root");
        if (current === controller) current = null;
      },
      setView,
    };
    current = controller;
    return controller;
  }
  window.BTOyunExperience = {
    award,
    celebrate,
    gallery,
    library,
    mount,
    hasDialog: () => !!document.querySelector(".gx-gallery"),
    consumeEscape: () =>
      !!document.fullscreenElement ||
      !!document.querySelector(".gx-gallery") ||
      Date.now() - lastFullscreenExit < 350,
  };
})();
