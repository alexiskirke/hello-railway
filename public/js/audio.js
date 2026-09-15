(() => {
  class MachineAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.master = null;
    }

    unlock() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.master) {
        this.master.gain.value = muted ? 0 : 0.22;
      }
    }

    tone(freq, duration, type, gainValue, attack = 0.01) {
      if (!this.ctx || this.muted) {
        return;
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    noise(duration, gainValue) {
      if (!this.ctx || this.muted) {
        return;
      }
      const now = this.ctx.currentTime;
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(now);
    }

    click() {
      this.noise(0.04, 0.18);
      this.tone(180, 0.05, "square", 0.08);
    }

    spinTick() {
      this.noise(0.03, 0.12);
      this.tone(140, 0.03, "square", 0.05);
    }

    stop() {
      this.tone(90, 0.12, "triangle", 0.2);
      this.noise(0.08, 0.2);
    }

    holdBeep() {
      this.tone(880, 0.12, "square", 0.12);
      this.tone(1320, 0.08, "square", 0.06);
    }

    nudge() {
      this.tone(220, 0.07, "square", 0.1);
      this.noise(0.05, 0.16);
    }

    coin() {
      this.tone(980, 0.08, "sine", 0.14);
      this.tone(1480, 0.16, "sine", 0.1);
    }

    lose() {
      this.tone(110, 0.25, "sawtooth", 0.08);
    }

    win(jackpot) {
      const notes = jackpot ? [523, 659, 784, 1046, 784, 1046] : [392, 523, 659, 784];
      notes.forEach((note, i) => {
        window.setTimeout(() => this.tone(note, 0.18, "triangle", 0.16), i * 90);
      });
      if (jackpot) {
        window.setTimeout(() => {
          for (let i = 0; i < 8; i += 1) {
            window.setTimeout(() => this.tone(1200 + i * 40, 0.07, "sine", 0.1), i * 70);
          }
        }, 500);
      }
    }
  }

  window.MachineAudio = MachineAudio;
})();
