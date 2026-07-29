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
  private activeOscillators: OscillatorNode[] = []; // 跟踪活跃的振荡器

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

    console.log(`[audioEngine] playNote: midi=${midi}, duration=${duration.toFixed(3)}, velocity=${velocity}, ctxState=${this.audioContext.state}`);

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const frequency = midiToFrequency(midi);

    // 钢琴音色 = 纯基波（最纯净的音色，避免"难听"的谐波）
    const harmonics = [
      { ratio: 1, gain: 1.0, type: 'sine' as const },      // 基波
    ];

    const noteGain = ctx.createGain();
    noteGain.connect(this.masterGain);

    // ADSR 包络（短促断奏，音符间留空隙）
    const attack = 0.005;  // 快速起音
    const decay = 0.05;    // 快速衰减
    const sustain = 0.15;  // 低延音
    const release = 0.05;  // 短释放，避免连奏感

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(velocity * 0.6, now + attack); // 降低整体音量
    noteGain.gain.exponentialRampToValueAtTime(sustain * velocity * 0.6, now + attack + decay);
    noteGain.gain.setValueAtTime(sustain * velocity * 0.6, now + duration - release);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // 添加谐波
    harmonics.forEach(({ ratio, gain, type }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency * ratio;

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = gain * 0.25; // 降低谐波音量

      // 高频谐波快速衰减（模拟真实钢琴）
      if (ratio >= 4) {
        harmonicGain.gain.setValueAtTime(gain * 0.25, now);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
      }

      osc.connect(harmonicGain);
      harmonicGain.connect(noteGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
      
      // 跟踪活跃的振荡器
      this.activeOscillators.push(osc);
      osc.onended = () => {
        const index = this.activeOscillators.indexOf(osc);
        if (index > -1) {
          this.activeOscillators.splice(index, 1);
        }
      };
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
    
    // 停止所有活跃的振荡器
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // 振荡器可能已经停止
      }
    });
    this.activeOscillators = [];
  }

  // 是否正在播放
  getPlaying(): boolean {
    return this.isPlaying;
  }

  // 获取 AudioContext（用于提示音等）
  getAudioContext(): AudioContext | null {
    return this.audioContext;
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
