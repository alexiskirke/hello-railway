(() => {
  const {
    SYMBOLS,
    REEL_COUNT,
    SPIN_COST,
    START_BANK,
    INSERT,
    wrap,
    money,
    scoreLine,
    applyNudge,
  } = window.FruitEngine;

  const LOOPS = 8;
  const STORAGE_KEY = "conjuring-fruit-bank";
  const quiet = new URLSearchParams(window.location.search).has("mute");

  const audio = new window.MachineAudio();
  const state = {
    bank: loadBank(),
    lastWin: 0,
    spinning: false,
    holdOffer: false,
    held: [false, false, false],
    nudges: 0,
    positions: [0, 1, 2],
    muted: quiet,
  };

  const els = {
    reels: document.getElementById("reels"),
    holds: document.getElementById("holds"),
    nudges: document.getElementById("nudges"),
    credits: document.getElementById("credits"),
    win: document.getElementById("win"),
    banner: document.getElementById("banner"),
    spin: document.getElementById("spin-btn"),
    insert: document.getElementById("insert-btn"),
    mute: document.getElementById("mute-btn"),
    reset: document.getElementById("reset-btn"),
    holdLamp: document.getElementById("hold-lamp"),
    nudgeLamp: document.getElementById("nudge-lamp"),
    nudgeCount: document.getElementById("nudge-count"),
    gate: document.getElementById("gate"),
    enter: document.getElementById("enter-btn"),
    paytable: document.getElementById("paytable"),
    payList: document.getElementById("pay-list"),
    payBtn: document.getElementById("paytable-btn"),
    closePays: document.getElementById("close-pays"),
    app: document.getElementById("app"),
  };

  const strips = [];
  const holdButtons = [];
  const nudgeUp = [];
  const nudgeDown = [];

  function loadBank() {
    const raw = Number.parseFloat(window.localStorage.getItem(STORAGE_KEY) || "");
    return Number.isFinite(raw) ? raw : START_BANK;
  }

  function saveBank() {
    window.localStorage.setItem(STORAGE_KEY, String(state.bank));
  }

  function cellSize() {
    const reel = els.reels.querySelector(".reel");
    return reel ? reel.getBoundingClientRect().height / 3 : 96;
  }

  function applyStrip(reel, position, animate, duration = 0) {
    const node = strips[reel];
    const center = LOOPS * SYMBOLS.length * 0.5 + position;
    const y = (center - 1) * cellSize();
    node.style.transition = animate ? `transform ${duration}ms cubic-bezier(0.12, 0.7, 0.08, 1)` : "none";
    node.style.transform = `translate3d(0, ${-y}px, 0)`;
  }

  function renderMeters() {
    els.credits.textContent = money(state.bank);
    els.win.textContent = money(state.lastWin);
    els.nudgeCount.textContent = String(state.nudges);
    els.app.classList.toggle("broke", state.bank < SPIN_COST);
  }

  function setBanner(text) {
    els.banner.textContent = text;
  }

  function updateLamps() {
    els.holdLamp.classList.toggle("on", state.holdOffer || state.held.some(Boolean));
    els.nudgeLamp.classList.toggle("on", state.nudges > 0);
    els.nudgeLamp.classList.toggle("nudge", state.nudges > 0);
    holdButtons.forEach((btn, i) => {
      btn.disabled = !state.holdOffer && !state.held[i];
      btn.classList.toggle("available", state.holdOffer);
      btn.classList.toggle("held", state.held[i]);
      btn.textContent = state.held[i] ? "HELD" : "HOLD";
    });
    [...nudgeUp, ...nudgeDown].forEach((btn) => {
      btn.disabled = state.nudges <= 0 || state.spinning;
      btn.classList.toggle("available", state.nudges > 0 && !state.spinning);
    });
    els.spin.disabled = state.spinning || state.nudges > 0 || state.bank < SPIN_COST;
  }

  function payline() {
    return state.positions.map((pos) => SYMBOLS[wrap(pos)]);
  }

  function score() {
    return scoreLine(state.positions);
  }

  function flashWins(isWin) {
    [...els.reels.children].forEach((reel) => reel.classList.toggle("win-flash", isWin));
    if (isWin) {
      window.setTimeout(() => flashWins(false), 1400);
    }
  }

  function clearFeatures() {
    state.holdOffer = false;
    state.held = [false, false, false];
    state.nudges = 0;
  }

  function offerFeature() {
    const roll = Math.random();
    if (roll < 0.46) {
      state.holdOffer = true;
      audio.holdBeep();
      setBanner("HOLD lamps on — lock a reel, then spin");
    } else if (roll < 0.78) {
      state.nudges = 2 + Math.floor(Math.random() * 4);
      audio.holdBeep();
      setBanner(`NUDGE feature — ${state.nudges} nudges`);
    } else {
      setBanner("No feature. Spin again.");
      audio.lose();
    }
  }

  function settle(fromNudge = false) {
    const result = score();
    if (result.amount > 0) {
      state.bank += result.amount;
      state.lastWin = result.amount;
      saveBank();
      clearFeatures();
      flashWins(true);
      audio.win(result.jackpot);
      navigator.vibrate?.(result.jackpot ? [40, 40, 80] : [30, 40, 30]);
      setBanner(`${result.label} pays ${money(result.amount)}`);
    } else if (fromNudge) {
      if (state.nudges <= 0) {
        setBanner("Nudges gone. The house keeps it.");
        audio.lose();
      } else {
        setBanner(`${state.nudges} nudge${state.nudges === 1 ? "" : "s"} left`);
      }
    } else if (state.held.some(Boolean)) {
      clearFeatures();
      setBanner("Held reels missed. Dead spin.");
      audio.lose();
    } else {
      offerFeature();
    }
    renderMeters();
    updateLamps();
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function spin() {
    if (state.spinning || state.nudges > 0) {
      return;
    }
    if (state.bank < SPIN_COST) {
      setBanner("Bank empty — feed the machine +$20");
      return;
    }

    audio.unlock();
    state.spinning = true;
    state.lastWin = 0;
    state.bank -= SPIN_COST;
    saveBank();
    renderMeters();
    flashWins(false);
    const wasHold = state.holdOffer || state.held.some(Boolean);
    state.holdOffer = false;
    updateLamps();
    setBanner(wasHold ? "Held reels locked" : "Reels spinning");
    els.spin.disabled = true;

    const targets = state.positions.map((pos, i) => (state.held[i] ? pos : Math.floor(Math.random() * SYMBOLS.length)));

    await Promise.all(
      targets.map(async (target, i) => {
        if (state.held[i]) {
          return;
        }
        const extra = 12 + i * 6;
        const start = state.positions[i];
        const distance = extra + wrap(target - start);
        const duration = 900 + i * 280;
        applyStrip(i, start + distance, true, duration);
        const ticks = Math.floor(duration / 70);
        for (let t = 0; t < ticks; t += 1) {
          window.setTimeout(() => audio.spinTick(), t * 70 + i * 40);
        }
        await sleep(duration);
        state.positions[i] = target;
        applyStrip(i, target, false);
        audio.stop();
        navigator.vibrate?.(18);
      })
    );

    state.spinning = false;
    if (!wasHold) {
      state.held = [false, false, false];
    }
    settle(false);
  }

  function nudge(reel, direction) {
    if (state.spinning || state.nudges <= 0) {
      return;
    }
    audio.unlock();
    audio.nudge();
    state.nudges -= 1;
    state.positions[reel] = applyNudge(state.positions[reel], direction);
    applyStrip(reel, state.positions[reel], true, 160);
    navigator.vibrate?.(12);
    settle(true);
  }

  function insertCash() {
    audio.unlock();
    audio.coin();
    state.bank += INSERT;
    saveBank();
    renderMeters();
    updateLamps();
    setBanner(`Inserted ${money(INSERT)}`);
  }

  function buildReels() {
    els.reels.innerHTML = "";
    els.holds.innerHTML = "";
    els.nudges.innerHTML = "";
    for (let i = 0; i < REEL_COUNT; i += 1) {
      const reel = document.createElement("div");
      reel.className = "reel";
      const strip = document.createElement("div");
      strip.className = "reel-strip";
      for (let loop = 0; loop < LOOPS; loop += 1) {
        SYMBOLS.forEach((symbol) => {
          const img = document.createElement("img");
          img.src = symbol.file;
          img.alt = symbol.name;
          strip.append(img);
        });
      }
      reel.append(strip);
      els.reels.append(reel);
      strips[i] = strip;

      const hold = document.createElement("button");
      hold.type = "button";
      hold.className = "hold-btn";
      hold.textContent = "HOLD";
      hold.addEventListener("click", () => {
        if (!state.holdOffer && !state.held[i]) {
          return;
        }
        audio.unlock();
        audio.click();
        state.held[i] = !state.held[i];
        updateLamps();
      });
      els.holds.append(hold);
      holdButtons[i] = hold;

      const col = document.createElement("div");
      col.className = "nudge-col";
      const up = document.createElement("button");
      up.type = "button";
      up.className = "nudge-btn";
      up.textContent = "▲";
      up.addEventListener("click", () => nudge(i, 1));
      const down = document.createElement("button");
      down.type = "button";
      down.className = "nudge-btn";
      down.textContent = "▼";
      down.addEventListener("click", () => nudge(i, -1));
      col.append(up, down);
      els.nudges.append(col);
      nudgeUp[i] = up;
      nudgeDown[i] = down;
    }
  }

  function buildPaytable() {
    els.payList.innerHTML = "";
    [...SYMBOLS]
      .sort((a, b) => b.payout - a.payout)
      .forEach((symbol) => {
        const item = document.createElement("li");
        item.innerHTML = `<img src="${symbol.file}" alt=""> <span>${symbol.name}</span> <strong>${money(symbol.payout)}</strong>`;
        els.payList.append(item);
      });
  }

  function layoutStrips() {
    state.positions.forEach((pos, i) => applyStrip(i, pos, false));
  }

  function waitForArt() {
    const images = [...document.querySelectorAll(".reel img")];
    return Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            })
      )
    ).then(layoutStrips);
  }

  function enter() {
    audio.unlock();
    audio.setMuted(state.muted);
    audio.coin();
    els.gate.remove();
    layoutStrips();
    updateLamps();
  }

  if (state.muted) {
    audio.setMuted(true);
    els.mute.textContent = "Sound off";
  }

  buildReels();
  buildPaytable();
  renderMeters();
  updateLamps();
  waitForArt();
  window.addEventListener("resize", layoutStrips);
  window.addEventListener("orientationchange", () => window.setTimeout(layoutStrips, 120));

  els.enter.addEventListener("click", enter);
  els.spin.addEventListener("click", () => {
    audio.unlock();
    audio.click();
    spin();
  });
  els.insert.addEventListener("click", insertCash);
  els.mute.addEventListener("click", () => {
    state.muted = !state.muted;
    audio.unlock();
    audio.setMuted(state.muted);
    els.mute.textContent = state.muted ? "Sound off" : "Sound on";
  });
  els.reset.addEventListener("click", () => {
    state.bank = START_BANK;
    state.lastWin = 0;
    clearFeatures();
    saveBank();
    renderMeters();
    updateLamps();
    setBanner("Bank reset to $25.00");
  });
  els.payBtn.addEventListener("click", () => {
    els.paytable.hidden = false;
  });
  els.closePays.addEventListener("click", () => {
    els.paytable.hidden = true;
  });
})();
