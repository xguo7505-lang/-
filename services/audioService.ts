
class AudioService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playSound(type: 'jump' | 'bell' | 'switch') {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === 'jump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'bell') {
      [440, 880, 1320].forEach((freq, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.connect(g);
        g.connect(this.ctx!.destination);
        o.type = 'sine';
        o.frequency.value = freq * (0.9 + Math.random() * 0.2);
        g.gain.setValueAtTime(0.05 / (i + 1), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        o.start(now);
        o.stop(now + 1.5);
      });
    } else if (type === 'switch') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }
}

export const audioService = new AudioService();
