/**
 * 练习控制器（cursor 驱动架构）
 *
 * 核心设计：让 OSMD cursor 自己步进，利用其内置的 repeat/跳转逻辑，
 * controller 跟随 cursor 而非驱动 cursor。
 *
 * 流程：
 * 1. 预扫描：用 cursor 走一遍全曲，记录每一步的 musicTime + notes
 * 2. tick：按 cursorSchedule 的时间表调用 cursor.next()，OSMD 内部自动处理 repeat 回跳
 * 3. 音频：cursor.next() 后从 cursor.NotesUnderCursor() 实时读取并播放
 * 4. 判定：handleKeyPress 直接读取 cursor.NotesUnderCursor() 做判定
 */

import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { PianoAudioEngine } from './audio-engine';

export type PracticeMode = 'browse' | 'follow' | 'sightsinging';
export type TimingGrade = 'perfect' | 'good' | 'miss';

const PERFECT_THRESHOLD_MS = 100;
const GOOD_THRESHOLD_MS = 300;
const DEFAULT_BPM = 80;

interface CursorStepInfo {
  step: number;
  timeSec: number; // 以 DEFAULT_BPM=80 为基准的秒数
  notes: { midi: number; duration: number }[];
}

// 兼容旧接口的 PianoNote 类型
interface PianoNote {
  midi: number;
  startTime: number;
  duration: number;
  velocity: number;
}

export interface PracticeStats {
  totalNotes: number;
  hitNotes: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
}

export interface PracticeCallbacks {
  onNoteHit?: (note: number, grade: TimingGrade, delta: number) => void;
  onNoteMiss?: (note: number) => void;
  onComboChange?: (combo: number) => void;
  onStatsUpdate?: (stats: PracticeStats) => void;
  onCursorStepChange?: (step: number) => void;
  onFinish?: () => void;
  onActiveNotesChange?: (activeNotes: Set<number>) => void;
}

// 从 OSMD Note 提取 MIDI
function getMidiFromNote(note: { Pitch?: { Octave: number; FundamentalNote: number; Accidental?: number } | null }): number {
  if (!note.Pitch) return -1;
  const accidental = note.Pitch.Accidental ?? 0;
  return (note.Pitch.Octave + 1) * 12 + note.Pitch.FundamentalNote + accidental;
}

export class PracticeController {
  private osmd: OpenSheetMusicDisplay | null = null;
  private audioEngine: PianoAudioEngine | null = null;
  private mode: PracticeMode = 'browse';
  private bpm = DEFAULT_BPM;
  private isRunning = false;
  private isPaused = false;
  private startTime = 0;
  private pausedTime = 0;

  // cursor 驱动时间表
  private cursorSchedule: CursorStepInfo[] = [];
  private nextStepIndex = 0;
  private currentCursorStep = 0;

  // 判定窗口
  private expectedNotes: Set<number> = new Set();
  private judgments: Map<number, TimingGrade> = new Map();
  private currentStepStartTime = 0;

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

  // 活跃音符
  private activeNotes: Set<number> = new Set();

  // 回调
  private callbacks: PracticeCallbacks = {};
  private tickInterval: number | null = null;

  constructor(mode: PracticeMode = 'browse', bpm: number = DEFAULT_BPM, audioEngine?: PianoAudioEngine) {
    this.mode = mode;
    this.bpm = bpm;
    if (audioEngine) {
      this.audioEngine = audioEngine;
    }
  }

  setCallbacks(callbacks: PracticeCallbacks) {
    this.callbacks = callbacks;
  }

  // 设置模式
  setMode(mode: PracticeMode) {
    this.mode = mode;
  }

  // 设置 BPM
  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  // 兼容旧接口：设置音频引擎（忽略参数，内部按需创建）
  setAudioContext(_audioContext: AudioContext) {
    if (!this.audioEngine) {
      this.audioEngine = new PianoAudioEngine();
    }
  }

  // 兼容旧接口：设置 OSMD
  setOSMD(osmd: OpenSheetMusicDisplay) {
    this.osmd = osmd;
  }

  // 预扫描 cursor 生成时间表
  buildCursorSchedule(): CursorStepInfo[] {
    if (!this.osmd?.cursor) return [];

    // 保存当前位置
    const savedStep = this.currentCursorStep;

    // 从头扫描
    this.osmd.cursor.reset();
    this.osmd.cursor.show();

    const schedule: CursorStepInfo[] = [];
    let step = 0;
    let realMusicTime = 0;
    let prevMusicTime = -1;

    // 先 next() 到第一个有效位置
    this.osmd.cursor.next();

    while (!this.osmd.cursor.iterator.EndReached) {
      const notes = this.osmd.cursor.NotesUnderCursor();
      const noteInfos: { midi: number; duration: number }[] = [];

      for (const note of notes) {
        if (note.Pitch) {
          const midi = getMidiFromNote(note);
          // note.Length.RealValue 以 whole note 为单位，转换为 quarter note 单位
          const duration = (note.Length?.RealValue ?? 0.5) * 4;
          noteInfos.push({ midi, duration });
        }
      }

      const musicTime = this.osmd.cursor.iterator.CurrentSourceTimestamp.RealValue;

      // 计算实际演奏时间（考虑 repeat 回跳）
      if (prevMusicTime >= 0) {
        const delta = musicTime - prevMusicTime;
        if (delta >= 0) {
          realMusicTime += delta;
        } else {
          // 回跳发生：增加回跳段的长度
          realMusicTime += prevMusicTime - musicTime;
        }
      }

      // CurrentSourceTimestamp.RealValue 以 whole note 为单位，转换为 quarter note 再计算秒
      const timeSec = realMusicTime * 4 * (60 / DEFAULT_BPM);
      schedule.push({ step, timeSec, notes: noteInfos });
      step++;
      prevMusicTime = musicTime;

      this.osmd.cursor.next();
    }

    // 恢复光标到开头
    this.osmd.cursor.reset();

    // 如果之前有位置，恢复
    if (savedStep > 0) {
      for (let i = 0; i < savedStep; i++) {
        if (!this.osmd.cursor.iterator.EndReached) {
          this.osmd.cursor.next();
        }
      }
    }

    this.cursorSchedule = schedule;
    this.stats.totalNotes = schedule.reduce((sum, s) => sum + s.notes.length, 0);
    console.log('[buildCursorSchedule] built', schedule.length, 'steps. first 3:', schedule.slice(0, 3), 'last 3:', schedule.slice(-3));

    return schedule;
  }

  // 加载并预扫描（兼容旧接口：可传任意参数，内部忽略）
  loadNotes(_manager?: unknown): PianoNote[] {
    this.buildCursorSchedule();

    // 同时返回 PianoNote[] 供 audioEngine.playSequence 使用（浏览模式）
    const pianoNotes: PianoNote[] = [];
    for (const step of this.cursorSchedule) {
      for (const note of step.notes) {
        pianoNotes.push({
          midi: note.midi,
          startTime: step.timeSec,
          duration: note.duration * (60 / DEFAULT_BPM),
          velocity: 0.8,
        });
      }
    }

    return pianoNotes;
  }

  // 开始
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.nextStepIndex = 0;
    this.currentCursorStep = 0;
    this.expectedNotes = new Set();
    this.judgments = new Map();

    // 重置光标
    this.osmd?.cursor?.reset();
    this.osmd?.cursor?.show();

    // 浏览模式：直接播放完整序列
    if (this.mode === 'browse') {
      const notes = this.loadNotes();
      this.audioEngine?.playSequence(notes, this.bpm);
      // 浏览模式不需要逐 tick 推进 cursor，只需更新统计时间
      this.tickInterval = window.setInterval(() => {
        if (!this.isRunning || this.isPaused) return;
        this.callbacks.onStatsUpdate?.({ ...this.stats });
      }, 100);
      return;
    }

    // 跟弹/视奏模式：逐 tick 推进 cursor
    if (this.cursorSchedule.length === 0) {
      this.buildCursorSchedule();
    }
    this.tickInterval = window.setInterval(() => this.tick(), 16);
  }

  // 暂停
  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pausedTime = Date.now();
    this.audioEngine?.stop();
  }

  // 恢复
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    const pauseDuration = Date.now() - this.pausedTime;
    this.startTime += pauseDuration;
    this.isPaused = false;
  }

  // 停止
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.audioEngine?.stop();
    this.callbacks.onFinish?.();
  }

  // 重置
  reset() {
    this.stop();
    this.osmd?.cursor?.reset();
    this.osmd?.cursor?.hide();
    this.nextStepIndex = 0;
    this.currentCursorStep = 0;
    this.stats = {
      totalNotes: this.cursorSchedule.reduce((sum, s) => sum + s.notes.length, 0),
      hitNotes: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 0,
    };
    this.activeNotes = new Set();
    this.callbacks.onActiveNotesChange?.(new Set());
    this.callbacks.onStatsUpdate?.({ ...this.stats });
  }

  // 主 tick
  private tick() {
    if (!this.isRunning || this.isPaused) return;

    const now = Date.now();
    const elapsedMs = now - this.startTime;
    const elapsedSec = elapsedMs / 1000;
    const scaledTime = elapsedSec * (this.bpm / DEFAULT_BPM);

    // 推进 cursor 到当前时间对应的 step
    let loopCount = 0;
    while (this.nextStepIndex < this.cursorSchedule.length) {
      const stepInfo = this.cursorSchedule[this.nextStepIndex];
      if (scaledTime < stepInfo.timeSec) break;
      loopCount++;

      // 步进 cursor（OSMD 内部自动处理 repeat 回跳）
      if (!this.osmd?.cursor) break;
      if (!this.osmd.cursor.iterator.EndReached) {
        this.osmd.cursor.next();
        this.currentCursorStep++;
      }

      // 播放当前 step 的音符（实时读取 cursor 当前位置的音符，避免预扫描缓存问题）
      if (this.mode !== 'browse') {
        const currentNotes = this.osmd.cursor.NotesUnderCursor();
        const noteInfos: { midi: number; duration: number }[] = [];
        for (const note of currentNotes) {
          if (note.Pitch) {
            const midi = getMidiFromNote(note);
            const duration = (note.Length?.RealValue ?? 0.5) * 4 * (60 / this.bpm);
            noteInfos.push({ midi, duration });
          }
        }
        console.log('[tick] step', this.nextStepIndex, 'notes', noteInfos.length, 'timeSec', stepInfo.timeSec.toFixed(3), 'scaledTime', scaledTime.toFixed(3), 'midis', noteInfos.map(n => n.midi));
        for (const note of noteInfos) {
          this.audioEngine?.playNote(note.midi, note.duration, 0.8);
        }
      }

      // 切换判定窗口：先标记上一个窗口的未命中
      this.checkMissedNotes();

      // 设置新窗口
      this.expectedNotes = new Set(stepInfo.notes.map((n) => n.midi));
      this.judgments = new Map();
      this.currentStepStartTime = now;

      // 更新 cursor step 回调
      this.callbacks.onCursorStepChange?.(this.nextStepIndex);

      this.nextStepIndex++;
    }

    // 完成检查：cursor 到达末尾或 schedule 走完
    if (
      this.osmd?.cursor?.iterator?.EndReached ||
      this.nextStepIndex >= this.cursorSchedule.length
    ) {
      console.log('[tick] stop reached. EndReached:', this.osmd?.cursor?.iterator?.EndReached, 'nextStepIndex:', this.nextStepIndex, 'scheduleLength:', this.cursorSchedule.length);
      this.stop();
      return;
    }

    // 检查当前判定窗口超时
    this.checkMissedNotes();

    // 更新活跃音符
    const currentNotes = this.osmd?.cursor?.NotesUnderCursor() ?? [];
    const currentMidis = new Set<number>();
    for (const note of currentNotes) {
      const midi = getMidiFromNote(note);
      if (midi >= 0) currentMidis.add(midi);
    }

    if (!this.areSetsEqual(this.activeNotes, currentMidis)) {
      this.activeNotes = currentMidis;
      this.callbacks.onActiveNotesChange?.(new Set(currentMidis));
    }

    // 更新统计回调
    this.callbacks.onStatsUpdate?.({ ...this.stats });
  }

  // 检查超时未按的音符
  private checkMissedNotes() {
    if (this.expectedNotes.size === 0) return;

    const now = Date.now();
    const elapsed = now - this.currentStepStartTime;

    if (elapsed > GOOD_THRESHOLD_MS) {
      for (const note of this.expectedNotes) {
        if (!this.judgments.has(note)) {
          this.judgments.set(note, 'miss');
          this.recordHit(note, 'miss');
          this.callbacks.onNoteMiss?.(note);
        }
      }
      this.expectedNotes = new Set();
    }
  }

  // 处理按键
  handleKeyPress(midiNote: number): TimingGrade | null {
    if (this.mode === 'browse' || !this.isRunning || this.isPaused) return null;

    const now = Date.now();
    const currentNotes = this.osmd?.cursor?.NotesUnderCursor() ?? [];
    const expectedMidis = new Set<number>();
    for (const note of currentNotes) {
      const midi = getMidiFromNote(note);
      if (midi >= 0) expectedMidis.add(midi);
    }

    // 当前 cursor 位置是否包含该音符
    if (!expectedMidis.has(midiNote)) {
      return null;
    }

    // 已在当前窗口判定过
    if (this.judgments.has(midiNote)) {
      return null;
    }

    // 计算时间偏差
    const timeDiff = Math.abs(now - this.currentStepStartTime);
    let grade: TimingGrade;
    if (timeDiff <= PERFECT_THRESHOLD_MS) {
      grade = 'perfect';
    } else if (timeDiff <= GOOD_THRESHOLD_MS) {
      grade = 'good';
    } else {
      grade = 'miss';
      this.callbacks.onNoteMiss?.(midiNote);
    }

    this.judgments.set(midiNote, grade);
    this.recordHit(midiNote, grade);
    this.callbacks.onNoteHit?.(midiNote, grade, timeDiff);

    return grade;
  }

  // 记录命中
  private recordHit(note: number, grade: TimingGrade) {
    if (grade === 'perfect') {
      this.stats.perfectCount++;
      this.stats.combo++;
    } else if (grade === 'good') {
      this.stats.goodCount++;
      this.stats.combo++;
    } else {
      this.stats.missCount++;
      this.stats.combo = 0;
    }

    this.stats.hitNotes = this.stats.perfectCount + this.stats.goodCount;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
    this.stats.accuracy =
      this.stats.totalNotes > 0
        ? Math.round((this.stats.hitNotes / this.stats.totalNotes) * 1000) / 10
        : 0;

    this.callbacks.onComboChange?.(this.stats.combo);
  }

  // 获取统计
  getStats(): PracticeStats {
    return { ...this.stats };
  }

  // 获取活跃音符
  getActiveNotes(): Set<number> {
    return new Set(this.activeNotes);
  }

  // 播放指定音符
  playNote(midi: number, duration = 0.5) {
    this.audioEngine?.playNote(midi, duration, 0.8);
  }

  // 播放从指定位置开始的伴奏
  playAccompanimentFrom(_startTime: number) {
    // cursor 驱动下，伴奏由 tick 实时触发
  }

  playAccompaniment() {
    // cursor 驱动下，伴奏由 tick 实时触发
  }

  // 兼容 getter
  getTotalCursorSteps(): number {
    return this.cursorSchedule.length;
  }

  getIsPlaying(): boolean {
    return this.isRunning && !this.isPaused;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getCurrentTime(): number {
    return this.isRunning ? Date.now() - this.startTime : 0;
  }

  getCurrentCursorStep(): number {
    return this.currentCursorStep;
  }

  getStartTime(): number {
    return this.startTime;
  }

  // 是否运行中
  isPlaying(): boolean {
    return this.isRunning && !this.isPaused;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  // 工具
  private areSetsEqual(a: Set<number>, b: Set<number>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
