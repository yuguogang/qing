/**
 * 练琴模式控制器
 * 管理光标移动、节拍检测、练习统计
 */

import { type PianoNote } from './audio-engine';

// 节拍判定等级
export type TimingGrade = 'perfect' | 'good' | 'miss';

// 练习统计
export interface PracticeStats {
  totalNotes: number;
  hitNotes: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  combo: number;
  maxCombo: number;
  accuracy: number; // 0-100
}

// 节拍判定配置
const TIMING_THRESHOLDS = {
  perfect: 100, // ±100ms 完美
  good: 300,    // ±100-300ms 良好
};

// 练习模式
export type PracticeMode = 'follow' | 'sight'; // 跟弹模式 / 视奏模式

// 音符判定状态
interface NoteJudgment {
  note: PianoNote;
  expectedTime: number; // 期望按下时间（ms）
  actualTime?: number;  // 实际按下时间（ms）
  grade?: TimingGrade;  // 判定等级
  judged: boolean;      // 是否已判定
}

// 练习控制器状态
export interface PracticeState {
  isPlaying: boolean;
  currentTime: number;      // 当前播放时间（ms）
  currentNoteIndex: number; // 当前音符索引
  stats: PracticeStats;
  mode: PracticeMode;
  bpm: number;
}

// 事件回调
export interface PracticeCallbacks {
  onNoteHit?: (note: PianoNote, grade: TimingGrade, delta: number) => void;
  onNoteMiss?: (note: PianoNote) => void;
  onProgress?: (currentTime: number, currentNoteIndex: number) => void;
  onComplete?: (stats: PracticeStats) => void;
  onTimingCheck?: (grade: TimingGrade) => void; // 节奏偏差提示
}

export class PracticeController {
  private notes: PianoNote[] = [];
  private state: PracticeState;
  private callbacks: PracticeCallbacks = {};
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private judgments: NoteJudgment[] = [];
  private audioContext: AudioContext | null = null;

  constructor(mode: PracticeMode = 'follow', bpm: number = 80) {
    this.state = {
      isPlaying: false,
      currentTime: 0,
      currentNoteIndex: 0,
      stats: {
        totalNotes: 0,
        hitNotes: 0,
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        combo: 0,
        maxCombo: 0,
        accuracy: 0,
      },
      mode,
      bpm,
    };
  }

  // 设置音频上下文（用于提示音）
  setAudioContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  // 计算时间缩放因子（基于 BPM）
  private getTimeScale(): number {
    const originalBpm = 80; // MusicXML 解析时的基准 BPM
    return originalBpm / this.state.bpm;
  }

  // 加载音符序列
  loadNotes(notes: PianoNote[]) {
    this.notes = [...notes].sort((a, b) => a.startTime - b.startTime);
    const timeScale = this.getTimeScale();
    
    this.judgments = this.notes.map(note => ({
      note,
      expectedTime: note.startTime * 1000 * timeScale, // 转换为 ms，考虑 BPM
      judged: false,
    }));
    this.state.stats.totalNotes = this.notes.length;
  }

  // 设置回调
  setCallbacks(callbacks: PracticeCallbacks) {
    this.callbacks = callbacks;
  }

  // 开始练习
  start() {
    if (this.notes.length === 0) return;

    this.state.isPlaying = true;
    this.startTime = performance.now();
    this.state.currentTime = 0;
    this.state.currentNoteIndex = 0;
    
    // 重置统计
    this.state.stats = {
      totalNotes: this.notes.length,
      hitNotes: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 0,
    };

    // 重置判定状态
    this.judgments.forEach(j => {
      j.judged = false;
      j.actualTime = undefined;
      j.grade = undefined;
    });

    this.tick();
  }

  // 停止练习
  stop() {
    this.state.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.callbacks.onComplete?.(this.state.stats);
  }

  // 暂停/继续
  pause() {
    this.state.isPlaying = !this.state.isPlaying;
    if (this.state.isPlaying) {
      this.startTime = performance.now() - this.state.currentTime;
      this.tick();
    } else if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // 主循环
  private tick = () => {
    if (!this.state.isPlaying) return;

    const now = performance.now();
    this.state.currentTime = now - this.startTime;

    // 更新当前音符索引
    this.updateCurrentNoteIndex();

    // 检查错过的音符
    this.checkMissedNotes();

    // 触发进度回调
    this.callbacks.onProgress?.(
      this.state.currentTime,
      this.state.currentNoteIndex
    );

    // 检查是否完成
    if (this.state.currentNoteIndex >= this.notes.length) {
      this.stop();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // 更新当前音符索引
  private updateCurrentNoteIndex() {
    const timeScale = this.getTimeScale();
    const currentTimeSec = this.state.currentTime / 1000;
    
    // 找到当前应该演奏的音符（考虑 BPM 缩放）
    for (let i = this.state.currentNoteIndex; i < this.notes.length; i++) {
      const note = this.notes[i];
      const noteStartTime = note.startTime * timeScale;
      // 如果当前时间已经超过了音符的开始时间，更新索引
      if (currentTimeSec >= noteStartTime) {
        this.state.currentNoteIndex = i + 1;
      } else {
        break;
      }
    }
  }

  // 检查错过的音符
  private checkMissedNotes() {
    const window = 500; // 500ms 后标记为错过

    for (let i = 0; i < this.judgments.length; i++) {
      const judgment = this.judgments[i];
      if (judgment.judged) continue;

      const delta = this.state.currentTime - judgment.expectedTime;
      
      // 超过判定窗口，标记为错过
      if (delta > TIMING_THRESHOLDS.good + window) {
        judgment.judged = true;
        judgment.grade = 'miss';
        this.state.stats.missCount++;
        this.state.stats.combo = 0;
        this.updateAccuracy();
        this.callbacks.onNoteMiss?.(judgment.note);
      }
    }
  }

  // 用户按键输入
  handleKeyPress(midiNote: number): TimingGrade | null {
    if (!this.state.isPlaying) return null;

    // 找到当前时间附近的待判定音符
    const currentTime = this.state.currentTime;
    const judgment = this.findJudgmentForNote(midiNote, currentTime);

    if (!judgment || judgment.judged) return null;

    const delta = currentTime - judgment.expectedTime;
    const absDelta = Math.abs(delta);

    let grade: TimingGrade;
    if (absDelta <= TIMING_THRESHOLDS.perfect) {
      grade = 'perfect';
      this.state.stats.perfectCount++;
      this.state.stats.combo++;
    } else if (absDelta <= TIMING_THRESHOLDS.good) {
      grade = 'good';
      this.state.stats.goodCount++;
      this.state.stats.combo++;
      // 良好判定但有偏差，触发提示音
      this.playTimingHint();
      this.callbacks.onTimingCheck?.(grade);
    } else {
      // 偏差太大，视为错过
      grade = 'miss';
      this.state.stats.missCount++;
      this.state.stats.combo = 0;
      // 严重偏差，触发提示音
      this.playTimingHint();
      this.callbacks.onTimingCheck?.(grade);
    }

    judgment.judged = true;
    judgment.actualTime = currentTime;
    judgment.grade = grade;
    this.state.stats.hitNotes++;

    if (this.state.stats.combo > this.state.stats.maxCombo) {
      this.state.stats.maxCombo = this.state.stats.combo;
    }

    this.updateAccuracy();
    this.callbacks.onNoteHit?.(judgment.note, grade, delta);

    return grade;
  }

  // 找到对应的判定对象
  private findJudgmentForNote(midiNote: number, currentTime: number): NoteJudgment | null {
    // 在判定窗口内查找匹配的音符
    const window = TIMING_THRESHOLDS.good;

    for (const judgment of this.judgments) {
      if (judgment.judged) continue;
      if (judgment.note.midi !== midiNote) continue;

      const delta = Math.abs(currentTime - judgment.expectedTime);
      if (delta <= window + 200) { // 额外缓冲 200ms
        return judgment;
      }
    }

    return null;
  }

  // 播放节奏提示音（"叮"）
  private playTimingHint() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 高音频的"叮"声
    oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // 更新准确率
  private updateAccuracy() {
    const { hitNotes, totalNotes } = this.state.stats;
    if (totalNotes === 0) {
      this.state.stats.accuracy = 0;
      return;
    }

    // 准确率计算：完美 100%，良好 70%，错过 0%
    const perfectWeight = this.state.stats.perfectCount * 1.0;
    const goodWeight = this.state.stats.goodCount * 0.7;
    const totalWeight = perfectWeight + goodWeight;
    
    this.state.stats.accuracy = Math.round((totalWeight / totalNotes) * 100);
  }

  // 获取当前状态
  getState(): PracticeState {
    return { ...this.state };
  }

  // 获取当前应该演奏的音符（用于光标显示）
  getCurrentNote(): PianoNote | null {
    if (this.state.currentNoteIndex >= this.notes.length) return null;
    return this.notes[this.state.currentNoteIndex];
  }

  // 获取光标进度（0-1）
  getCursorProgress(): number {
    if (this.notes.length === 0) return 0;
    
    const timeScale = this.getTimeScale();
    const totalDuration = (this.notes[this.notes.length - 1].startTime + 
                          this.notes[this.notes.length - 1].duration) * timeScale;
    const currentTimeSec = this.state.currentTime / 1000;
    
    return Math.min(currentTimeSec / totalDuration, 1);
  }

  // 获取当前小节（简化计算，假设每小节4拍）
  getCurrentMeasure(): number {
    const beatsPerMeasure = 4;
    const beatDuration = 60 / this.state.bpm;
    const currentTimeSec = this.state.currentTime / 1000;
    const currentBeat = currentTimeSec / beatDuration;
    return Math.floor(currentBeat / beatsPerMeasure) + 1;
  }
}
