/**
 * 练琴模式控制器
 * 使用 OSMD 内置 Cursor API 驱动光标，按节拍精确移动
 */

import { type PianoNote } from './audio-engine';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

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
export type PracticeMode = 'follow' | 'sight';

// 音符事件（按时间排列，用于驱动光标）
interface NoteEvent {
  midi: number;
  startTime: number;  // 秒
  duration: number;   // 秒
  cursorStep: number; // 对应的 cursor.next() 步骤序号
}

// 音符判定状态
interface NoteJudgment {
  event: NoteEvent;
  expectedTime: number; // 期望按下时间（ms）
  actualTime?: number;
  grade?: TimingGrade;
  judged: boolean;
}

// 事件回调
export interface PracticeCallbacks {
  onNoteHit?: (midi: number, grade: TimingGrade, delta: number) => void;
  onNoteMiss?: (midi: number) => void;
  onCursorStep?: (step: number) => void;  // 光标步骤变化
  onComplete?: (stats: PracticeStats) => void;
  onTimingCheck?: (grade: TimingGrade) => void;
}

export class PracticeController {
  private osmd: OpenSheetMusicDisplay | null = null;
  private noteEvents: NoteEvent[] = [];
  private judgments: NoteJudgment[] = [];
  private callbacks: PracticeCallbacks = {};
  private audioContext: AudioContext | null = null;

  // 播放状态
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private currentTime = 0;
  private currentCursorStep = 0;
  private lastCursorStep = -1;
  private animationFrameId: number | null = null;
  private accompanimentTimeouts: number[] = [];

  // 统计
  private stats: PracticeStats = {
    totalNotes: 0,
    hitNotes: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 0,
  };

  private bpm: number;
  private mode: PracticeMode;

  constructor(mode: PracticeMode = 'follow', bpm: number = 80) {
    this.mode = mode;
    this.bpm = bpm;
  }

  // 设置 OSMD 实例
  setOSMD(osmd: OpenSheetMusicDisplay) {
    this.osmd = osmd;
  }

  // 设置音频上下文
  setAudioContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  // 加载音符序列（来自 MusicXML 解析）
  loadNotes(notes: PianoNote[]) {
    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    // 为每个音符分配 cursor 步骤
    // OSMD cursor 按时间步进，每个"时间步"可能包含多个同时发声的音符
    // 我们将同时发声的音符归为一步
    let step = 0;
    let lastStartTime = -1;
    
    this.noteEvents = sorted.map(note => {
      if (note.startTime !== lastStartTime) {
        step++;
        lastStartTime = note.startTime;
      }
      return {
        midi: note.midi,
        startTime: note.startTime,
        duration: note.duration,
        cursorStep: step,
      };
    });

    // 初始化判定
    this.judgments = this.noteEvents.map(event => ({
      event,
      expectedTime: event.startTime * 1000, // ms
      judged: false,
    }));

    this.stats.totalNotes = this.noteEvents.length;
  }

  // 设置回调
  setCallbacks(callbacks: PracticeCallbacks) {
    this.callbacks = callbacks;
  }

  // 获取光标总步骤数
  private calcTotalCursorSteps(): number {
    if (this.noteEvents.length === 0) return 0;
    return this.noteEvents[this.noteEvents.length - 1].cursorStep;
  }

  // 开始练习
  start() {
    if (this.noteEvents.length === 0) return;

    // 初始化 OSMD 光标
    if (this.osmd?.cursor) {
      this.osmd.cursor.reset();
      this.osmd.cursor.show();
      // Tailwind CSS 的 img { height: auto } 会覆盖光标 img 的高度，需要重置
      requestAnimationFrame(() => {
        document.querySelectorAll('#cursorImg-0').forEach(el => {
          (el as HTMLElement).style.height = '';
        });
      });
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.currentTime = 0;
    this.currentCursorStep = 0;
    this.lastCursorStep = -1;

    // 重置统计
    this.stats = {
      totalNotes: this.noteEvents.length,
      hitNotes: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 0,
    };

    // 重置判定
    this.judgments.forEach(j => {
      j.judged = false;
      j.actualTime = undefined;
      j.grade = undefined;
    });

    // 跟弹模式：播放伴奏
    if (this.mode === 'follow') {
      this.playAccompaniment();
    }

    this.tick();
  }

  // 停止练习
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.stopAccompaniment();
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 隐藏光标
    if (this.osmd?.cursor) {
      this.osmd.cursor.hide();
    }

    this.callbacks.onComplete?.(this.stats);
  }

  // 暂停/继续
  pause() {
    if (!this.isPlaying) return;
    
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      // 暂停
      this.stopAccompaniment();
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    } else {
      // 继续
      this.startTime = performance.now() - this.currentTime;
      if (this.mode === 'follow') {
        this.playAccompanimentFrom(this.currentTime / 1000);
      }
      this.tick();
    }
  }

  // 播放伴奏（从开头）
  private playAccompaniment() {
    this.playAccompanimentFrom(0);
  }

  // 从指定时间播放伴奏
  private playAccompanimentFrom(fromTime: number) {
    this.stopAccompaniment();
    
    // 这里简化处理：伴奏由外部控制
    // PracticeController 只负责光标和判定
  }

  // 停止伴奏
  private stopAccompaniment() {
    this.accompanimentTimeouts.forEach(id => clearTimeout(id));
    this.accompanimentTimeouts = [];
  }

  // 主循环
  private tick = () => {
    if (!this.isPlaying || this.isPaused) return;

    const now = performance.now();
    this.currentTime = now - this.startTime;

    // 根据当前时间确定光标应该在哪个步骤
    this.updateCursorPosition();

    // 检查错过的音符
    this.checkMissedNotes();

    // 检查是否完成
    if (this.currentCursorStep > this.getTotalCursorSteps()) {
      this.stop();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // 更新光标位置（基于时间驱动 OSMD cursor）
  private updateCursorPosition() {
    const currentTimeSec = this.currentTime / 1000;

    // 找到当前时间对应的 cursor 步骤
    let targetStep = 0;
    for (let i = 0; i < this.noteEvents.length; i++) {
      if (currentTimeSec >= this.noteEvents[i].startTime) {
        targetStep = this.noteEvents[i].cursorStep;
      } else {
        break;
      }
    }

    // 如果光标步骤变化了，驱动 OSMD cursor 步进
    if (targetStep > this.lastCursorStep) {
      const stepsToAdvance = targetStep - this.lastCursorStep;
      this.lastCursorStep = targetStep;
      this.currentCursorStep = targetStep;

      // 调用 OSMD cursor.next() 实际移动光标
      if (this.osmd?.cursor) {
        try {
          for (let i = 0; i < stepsToAdvance; i++) {
            this.osmd.cursor.next();
          }
        } catch {
          // cursor.next() 可能在某些状态下抛异常，忽略
        }
      }

      this.callbacks.onCursorStep?.(targetStep);
    }
  }

  // 检查错过的音符
  private checkMissedNotes() {
    // 练习开始后 3 秒内不判定错过（给用户准备时间）
    if (this.currentTime < 3000) return;

    const window = 500; // 500ms 后标记为错过

    for (const judgment of this.judgments) {
      if (judgment.judged) continue;

      // 跳过 expectedTime 太小的音符（开头音符需要更多反应时间）
      // 只有当前时间超过音符期望时间至少 1500ms 才判定错过
      const delta = this.currentTime - judgment.expectedTime;
      if (delta > TIMING_THRESHOLDS.good + window && delta > 1500) {
        judgment.judged = true;
        judgment.grade = 'miss';
        this.stats.missCount++;
        this.stats.combo = 0;
        this.updateAccuracy();
        this.callbacks.onNoteMiss?.(judgment.event.midi);
      }
    }
  }

  // 用户按键输入
  handleKeyPress(midiNote: number): TimingGrade | null {
    if (!this.isPlaying || this.isPaused) return null;

    const currentTime = this.currentTime;
    const judgment = this.findJudgmentForNote(midiNote, currentTime);

    if (!judgment || judgment.judged) return null;

    const delta = currentTime - judgment.expectedTime;
    const absDelta = Math.abs(delta);

    let grade: TimingGrade;
    if (absDelta <= TIMING_THRESHOLDS.perfect) {
      grade = 'perfect';
      this.stats.perfectCount++;
      this.stats.combo++;
    } else if (absDelta <= TIMING_THRESHOLDS.good) {
      grade = 'good';
      this.stats.goodCount++;
      this.stats.combo++;
      this.playTimingHint();
      this.callbacks.onTimingCheck?.(grade);
    } else {
      grade = 'miss';
      this.stats.missCount++;
      this.stats.combo = 0;
      this.playTimingHint();
      this.callbacks.onTimingCheck?.(grade);
    }

    judgment.judged = true;
    judgment.actualTime = currentTime;
    judgment.grade = grade;
    this.stats.hitNotes++;

    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    this.updateAccuracy();
    this.callbacks.onNoteHit?.(judgment.event.midi, grade, delta);

    return grade;
  }

  // 找到对应的判定对象
  private findJudgmentForNote(midiNote: number, currentTime: number): NoteJudgment | null {
    const window = TIMING_THRESHOLDS.good;

    for (const judgment of this.judgments) {
      if (judgment.judged) continue;
      if (judgment.event.midi !== midiNote) continue;

      const delta = Math.abs(currentTime - judgment.expectedTime);
      if (delta <= window + 200) {
        return judgment;
      }
    }

    return null;
  }

  // 播放节奏提示音
  private playTimingHint() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // 更新准确率
  private updateAccuracy() {
    const { totalNotes } = this.stats;
    if (totalNotes === 0) {
      this.stats.accuracy = 0;
      return;
    }

    const perfectWeight = this.stats.perfectCount * 1.0;
    const goodWeight = this.stats.goodCount * 0.7;
    const totalWeight = perfectWeight + goodWeight;
    this.stats.accuracy = Math.round((totalWeight / totalNotes) * 100);
  }

  // 获取当前状态
  getStats(): PracticeStats {
    return { ...this.stats };
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getCurrentCursorStep(): number {
    return this.currentCursorStep;
  }

  getTotalCursorSteps(): number {
    return this.calcTotalCursorSteps();
  }
}
