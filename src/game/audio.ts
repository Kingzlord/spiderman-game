type Sound = 'web' | 'swing' | 'hit' | 'hurt' | 'bomb' | 'win' | 'lose';

export class GameAudio {
  private context: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) { this.muted = muted; }

  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Audio is optional when a browser disallows it. */ }
  }

  play(sound: Sound) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const context = this.context;
    const now = context.currentTime;
    const notes: Record<Sound, [number, number, number, OscillatorType]> = {
      web: [1050, 230, 0.12, 'triangle'],
      swing: [160, 660, 0.3, 'sine'],
      hit: [460, 120, 0.12, 'square'],
      hurt: [140, 45, 0.24, 'sawtooth'],
      bomb: [95, 25, 0.36, 'sawtooth'],
      win: [440, 880, 0.65, 'triangle'],
      lose: [240, 65, 0.8, 'triangle'],
    };
    const [start, end, duration, type] = notes[sound];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound === 'web' ? 0.045 : 0.07, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  destroy() {
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}