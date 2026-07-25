/**
 * 钢琴音频引擎 - Web Audio API 实现
 * 功能：生成钢琴音色、播放音符、伴奏播放
 */

// MIDI 音符编号转频率 (Hz)
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 音符时长 (秒) = 60 / BPM * 拍数
export function noteDuration(beatType: number, bpm: number): number {
  return (60 / bpm) * beatType;
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
  private scheduledNotes: { source: OscillatorNode; gain: GainNode }[] = [];
  private playStartTime = 0;
  private playTimeout: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  // 设置音量 (0-1)
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  // 播放单个音符
  playNote(midi: number, duration: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 创建振荡器（钢琴音色近似）
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle'; // 三角波接近钢琴音色
    oscillator.frequency.value = midiToFrequency(midi);

    // 创建增益节点（ADSR 包络）
    const gainNode = ctx.createGain();
    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.3;
    const release = 0.3;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain * velocity, now + attack + decay);
    gainNode.gain.setValueAtTime(sustain * velocity, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration);

    this.scheduledNotes.push({ source: oscillator, gain: gainNode });

    // 清理已完成的音符
    this.cleanupFinishedNotes();
  }

  // 播放音符序列（伴奏）
  playSequence(notes: PianoNote[], bpm: number): void {
    if (!this.audioContext) return;

    this.stop();
    this.isPlaying = true;
    this.playStartTime = this.audioContext.currentTime;

    // 计算时间缩放（基于 BPM）
    const originalBpm = 80; // 默认 BPM
    const timeScale = originalBpm / bpm;

    notes.forEach((note) => {
      const scaledStart = note.startTime * timeScale;
      const scaledDuration = note.duration * timeScale;

      const timeout = window.setTimeout(() => {
        if (this.isPlaying) {
          this.playNote(note.midi, scaledDuration, note.velocity);
        }
      }, scaledStart * 1000);

      this.playTimeout = timeout;
    });

    // 播放完成后停止
    const lastNote = notes[notes.length - 1];
    if (lastNote) {
      const totalDuration = (lastNote.startTime + lastNote.duration) * timeScale;
      window.setTimeout(() => {
        this.isPlaying = false;
      }, totalDuration * 1000);
    }
  }

  // 停止播放
  stop(): void {
    this.isPlaying = false;

    // 清除所有定时任务
    if (this.playTimeout !== null) {
      window.clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }

    // 停止所有振荡器
    this.scheduledNotes.forEach(({ source }) => {
      try {
        source.stop();
      } catch (e) {
        // 忽略已停止的振荡器
      }
    });
    this.scheduledNotes = [];
  }

  // 暂停播放
  pause(): void {
    this.isPlaying = false;
    if (this.playTimeout !== null) {
      window.clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }
  }

  // 恢复播放
  resume(): void {
    // TODO: 实现从暂停位置恢复
    this.isPlaying = true;
  }

  // 是否正在播放
  getPlaying(): boolean {
    return this.isPlaying;
  }

  // 清理已完成的音符
  private cleanupFinishedNotes(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    this.scheduledNotes = this.scheduledNotes.filter(({ source }) => {
      // 检查振荡器是否还在运行
      return true; // 简化处理，实际应该检查状态
    });
  }

  // 销毁引擎
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 单例实例
let audioEngineInstance: PianoAudioEngine | null = null;

export function getAudioEngine(): PianoAudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new PianoAudioEngine();
  }
  return audioEngineInstance;
}
