/**
 * 钢琴音频引擎 - Web Audio API 实现
 * 使用谐波叠加模拟钢琴音色
 */

// MIDI 音符编号转频率 (Hz)
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface PianoNote {
  midi: number;
  startTime: number; // 秒
  duration: number;  // 秒
  velocity: number;  // 0-1
}

export class PianoAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private playStartTime = 0;
  private playTimeouts: number[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  // 设置音量 (0-1)
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  // 播放单个音符（钢琴音色）
  playNote(midi: number, duration: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const frequency = midiToFrequency(midi);

    // 钢琴音色 = 基波 + 谐波（2 次、3 次、4 次）
    const harmonics = [
      { ratio: 1, gain: 1.0 },      // 基波
      { ratio: 2, gain: 0.5 },      // 2 次谐波
      { ratio: 3, gain: 0.25 },     // 3 次谐波
      { ratio: 4, gain: 0.125 },    // 4 次谐波
    ];

    const noteGain = ctx.createGain();
    noteGain.connect(this.masterGain);

    // ADSR 包络
    const attack = 0.005;
    const decay = 0.1;
    const sustain = 0.4;
    const release = Math.min(0.3, duration * 0.3);

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(velocity, now + attack);
    noteGain.gain.linearRampToValueAtTime(sustain * velocity, now + attack + decay);
    noteGain.gain.setValueAtTime(sustain * velocity, now + duration - release);
    noteGain.gain.linearRampToValueAtTime(0, now + duration);

    // 添加谐波
    harmonics.forEach(({ ratio, gain }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = gain * 0.3; // 降低谐波音量

      osc.connect(harmonicGain);
      harmonicGain.connect(noteGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // 播放音符序列（伴奏）
  playSequence(notes: PianoNote[], bpm: number): void {
    if (!this.audioContext) return;

    this.stop();
    this.isPlaying = true;
    this.playStartTime = this.audioContext.currentTime;

    // 计算时间缩放（基于 BPM）
    const originalBpm = 80;
    const timeScale = originalBpm / bpm;

    notes.forEach((note) => {
      const scaledStart = note.startTime * timeScale;
      const scaledDuration = note.duration * timeScale;

      const timeout = window.setTimeout(() => {
        if (this.isPlaying) {
          this.playNote(note.midi, scaledDuration, note.velocity);
        }
      }, scaledStart * 1000);

      this.playTimeouts.push(timeout);
    });

    // 播放完成后自动停止
    const lastNote = notes[notes.length - 1];
    if (lastNote) {
      const totalDuration = (lastNote.startTime + lastNote.duration) * timeScale * 1000;
      const endTimeout = window.setTimeout(() => {
        this.stop();
      }, totalDuration);
      this.playTimeouts.push(endTimeout);
    }
  }

  // 停止播放
  stop(): void {
    this.isPlaying = false;
    this.playTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.playTimeouts = [];
  }

  // 是否正在播放
  getPlaying(): boolean {
    return this.isPlaying;
  }

  // 销毁引擎
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
