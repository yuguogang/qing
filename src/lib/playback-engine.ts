/**
 * PlaybackEngine — 帧驱动播放引擎
 *
 * 核心设计原则（按优化计划）：
 * 1. Cursor 是唯一的真相源 — 所有状态只从 cursor.Iterator 读取
 * 2. 帧驱动 — 使用 requestAnimationFrame，禁止 setInterval/setTimeout
 * 3. 事件驱动 — 通过 EventBus 广播 position-changed
 * 4. 无预扫描 — 不构建 cursorSchedule，实时推进 cursor
 *
 * 时间基准：CurrentEnrolledTimestamp（单调递增，自动处理 repeat/跳转）
 *
 * 流程：
 *   requestAnimationFrame → 计算 deltaTime → elapsedTime += deltaTime
 *   → advanceCursorTo(elapsedTime) → while cursor.Iterator.CurrentEnrolledTimestamp < target → cursor.next()
 *   → 每次 next() 后读取 NotesUnderCursor() → emit position-changed
 */

import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { eventBus } from './event-bus';

export type PlaybackState = 'stopped' | 'playing' | 'paused';

const DEFAULT_BPM = 80;
const LOOK_AHEAD_SECONDS = 0.5; // 提前触发 note:start 的时间

export class PlaybackEngine {
  private osmd: OpenSheetMusicDisplay | null = null;
  private state: PlaybackState = 'stopped';
  private elapsedTime = 0;           // 已播放秒数
  private bpm = DEFAULT_BPM;
  private tempoMultiplier = 1.0;     // 实时变速倍数

  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  private lastTimestamp: number | null = null; // performance.now() 上一次时间戳
  private rafId: number | null = null;

  // 总步数/总时长（轻量预扫描，仅获取元数据不保存时间表）
  private totalSteps = 0;
  private totalDuration = 0;          // 秒

  // 当前 step 计数器（用于 position-changed）
  private stepIndex = 0;

  // 节拍判定相关（对跟弹/视奏模式有用）
  private expectedNotes: Set<number> = new Set();
  private judgmentWindowStart = 0;    // performance.now() 时间

  constructor(bpm: number = DEFAULT_BPM) {
    this.bpm = bpm;
  }

  // ─── 设置 OSMD 实例 ───
  setOsmd(osmd: OpenSheetMusicDisplay): void {
    this.osmd = osmd;
    if (osmd.cursor) {
      osmd.cursor.hide(); // 我们用事件驱动 UI 高亮，隐藏内置光标
    }
  }

  // ─── 轻量预扫描获取总步数和总时长 ───
  scanMetadata(): { totalSteps: number; totalDuration: number } {
    if (!this.osmd?.cursor) return { totalSteps: 0, totalDuration: 0 };

    const cursor = this.osmd.cursor;
    cursor.reset();
    cursor.show();

    let steps = 0;
    let duration = 0;
    let prevTime = 0;

    // 读取第一个位置
    let notes = cursor.NotesUnderCursor();
    if (notes.length > 0) {
      const ts = cursor.iterator.CurrentEnrolledTimestamp.RealValue;
      duration += ts - prevTime;
      prevTime = ts;
      steps++;
    }

    while (!cursor.iterator.EndReached) {
      cursor.next();
      notes = cursor.NotesUnderCursor();
      if (notes.length === 0) continue;
      // 用 sourceTimestamp 检测 repeat 回跳
      const enrolledTs = cursor.iterator.CurrentEnrolledTimestamp.RealValue;
      const sourceTs = cursor.iterator.CurrentSourceTimestamp.RealValue;
      if (sourceTs < prevTime) {
        // repeat 回跳：累加 enrolledTimestamp 增量
        duration += enrolledTs - cursor.iterator.CurrentEnrolledTimestamp.RealValue + (prevTime - sourceTs);
      } else {
        duration += enrolledTs - prevTime;
      }
      prevTime = enrolledTs;
      steps++;
    }

    // 转换为秒（CurrentEnrolledTimestamp 以 whole note 为单位）
    // whole note = 4 quarter notes, 秒 = quarter * (60/bpm)
    const timeSec = duration * (60 / this.bpm);

    cursor.reset();
    cursor.hide();

    this.totalSteps = steps;
    this.totalDuration = timeSec;
    return { totalSteps: steps, totalDuration: timeSec };
  }

  // ─── 播放控制 ───
  play(): void {
    if (this.state === 'playing') return;
    if (!this.osmd?.cursor) return;

    this.state = 'playing';
    this.lastTimestamp = null;

    // 如果从头开始，重置光标和计数器
    if (this.elapsedTime === 0) {
      this.osmd.cursor.reset();
      this.stepIndex = 0;
    }

    eventBus.emit('playback:state', { state: 'playing' });
    eventBus.emit('playback:start', { bpm: this.bpm });

    this.rafId = requestAnimationFrame((t) => this.frameLoop(t));
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
    eventBus.emit('playback:state', { state: 'paused' });
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTimestamp = null;
    eventBus.emit('playback:state', { state: 'playing' });
    this.rafId = requestAnimationFrame((t) => this.frameLoop(t));
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.state = 'stopped';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
    this.elapsedTime = 0;
    this.stepIndex = 0;
    this.expectedNotes = new Set();
    eventBus.emit('playback:state', { state: 'stopped' });
    eventBus.emit('playback:stop', { reason: 'user' });
  }

  // ─── 跳转到指定时间 ───
  seekTo(time: number): void {
    if (!this.osmd?.cursor) return;

    this.elapsedTime = Math.max(0, time);
    this.stepIndex = 0;

    // 重置 cursor 并快进到目标时间
    this.osmd.cursor.reset();
    this.advanceCursorTo(this.elapsedTime, true /* silent */);

    // 广播当前位置
    this.broadcastPosition();
  }

  // ─── 变速 ───
  setTempo(bpm: number): void {
    this.bpm = bpm;
  }

  setTempoMultiplier(multiplier: number): void {
    this.tempoMultiplier = Math.max(0.25, Math.min(4.0, multiplier));
  }

  // ─── A-B 循环 ───
  setLoop(start: number, end: number): void {
    this.loopStart = start;
    this.loopEnd = end;
    eventBus.emit('loop:boundary', { loopStart: start, loopEnd: end });
  }

  clearLoop(): void {
    this.loopStart = null;
    this.loopEnd = null;
  }

  // ─── 状态查询 ───
  getState(): PlaybackState {
    return this.state;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getBpm(): number {
    return this.bpm;
  }

  getTotalSteps(): number {
    return this.totalSteps;
  }

  getTotalDuration(): number {
    return this.totalDuration;
  }

  // ─── 节拍判定（跟弹/视奏模式） ───
  getExpectedNotes(): Set<number> {
    return this.expectedNotes;
  }

  getJudgmentWindowStart(): number {
    return this.judgmentWindowStart;
  }

  // ─── 帧循环 ───
  private frameLoop(timestamp: number): void {
    if (this.state !== 'playing') return;

    // 计算 deltaTime
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }
    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // 应用速度倍数
    const deltaSec = (deltaMs / 1000) * this.tempoMultiplier;

    // 推进时间
    this.elapsedTime += deltaSec;

    // A-B 循环检测
    if (this.loopEnd !== null && this.elapsedTime >= this.loopEnd) {
      if (this.loopStart !== null) {
        this.elapsedTime = this.loopStart;
        this.stepIndex = 0;
        this.osmd?.cursor?.reset();
      }
    }

    // 推进 cursor
    this.advanceCursorTo(this.elapsedTime, false);

    // 广播位置
    this.broadcastPosition();

    // 检查是否结束
    if (this.osmd?.cursor?.iterator?.EndReached) {
      this.state = 'stopped';
      this.rafId = null;
      this.lastTimestamp = null;
      this.elapsedTime = 0;
      this.stepIndex = 0;
      eventBus.emit('playback:state', { state: 'stopped' });
      eventBus.emit('playback:stop', { reason: 'completed' });
      return;
    }

    // 继续下一帧
    this.rafId = requestAnimationFrame((t) => this.frameLoop(t));
  }

  // ─── 推进 cursor 到目标时间 ───
  private advanceCursorTo(targetTime: number, silent: boolean): void {
    if (!this.osmd?.cursor) return;
    const cursor = this.osmd.cursor;

    const targetSec = targetTime;
    let safety = 0;

    while (!cursor.iterator.EndReached && safety < 5000) {
      const enrolled = cursor.iterator.CurrentEnrolledTimestamp.RealValue;
      const enrolledSec = enrolled * (60 / this.bpm);

      // 检查当前 step 是否已经到达目标时间
      if (enrolledSec >= targetSec) break;

      // 检测 repeat 回跳（通过 sourceTimestamp 回退判断）
      const prevSourceTs = cursor.iterator.CurrentSourceTimestamp.RealValue;

      cursor.next();
      safety++;

      // 跳过空 step
      const notes = cursor.NotesUnderCursor();
      if (notes.length === 0) continue;

      this.stepIndex++;

      // 检查是否 repeat 回跳
      const newSourceTs = cursor.iterator.CurrentSourceTimestamp.RealValue;
      if (newSourceTs < prevSourceTs) {
        eventBus.emit('playback:repeat', {
          fromStep: this.stepIndex,
          toStep: this.stepIndex,
        });
      }

      // 非静默模式下广播事件
      if (!silent) {
        this.broadcastStepNotes(notes);
      }

      // 更新判定窗口
      const currentMidis = this.extractNoteMidis(notes);
      this.expectedNotes = new Set(currentMidis);
      this.judgmentWindowStart = performance.now();
    }
  }

  // ─── 广播位置事件 ───
  private broadcastPosition(): void {
    if (!this.osmd?.cursor) return;

    const cursor = this.osmd.cursor;
    const iterator = cursor.iterator;

    // 使用 try-catch 应对某些属性不可用的情况
    let enrolledTime = 0;
    let sourceTimestamp = 0;
    let measureNumber = 0;
    let notes: Array<{ midi: number; pitch: string; duration: number }> = [];

    try {
      enrolledTime = iterator.CurrentEnrolledTimestamp?.RealValue ?? 0;
    } catch { /* ignore */ }

    try {
      sourceTimestamp = iterator.CurrentSourceTimestamp?.RealValue ?? 0;
    } catch { /* ignore */ }

    try {
      const currentMeasure = iterator.CurrentMeasure;
      measureNumber = currentMeasure?.MeasureNumber ?? 0;
    } catch { /* ignore */ }

    try {
      const cursorNotes = cursor.NotesUnderCursor();
      notes = this.extractNoteInfos(cursorNotes);
    } catch { /* ignore */ }

    const enrolledSec = enrolledTime * (60 / this.bpm);
    const progress = this.totalDuration > 0
      ? Math.min(enrolledSec / this.totalDuration, 1)
      : 0;

    eventBus.emit('position-changed', {
      enrolledTime: enrolledSec,
      sourceTimestamp: sourceTimestamp * (60 / this.bpm),
      notes,
      measureNumber,
      stepIndex: this.stepIndex,
      totalSteps: this.totalSteps,
      progress,
    });
  }

  // ─── 广播当前 step 的音符事件 ───
  private broadcastStepNotes(osmdNotes: any[]): void {
    const noteInfos: Array<{ midi: number; duration: number; velocity: number }> = [];

    for (const note of osmdNotes) {
      if (!note.Pitch) continue;
      const midi = note.halfTone + 12; // OSMD 修正
      const duration = (note.Length?.RealValue ?? 0.5) * 4 * (60 / this.bpm);
      noteInfos.push({ midi, duration, velocity: 0.8 });
    }

    // 逐个发射 note:start
    for (const info of noteInfos) {
      eventBus.emit('note:start', info);
    }

    // 也通过 midi:schedule 发射给 MidiScheduler
    eventBus.emit('midi:schedule', {
      notes: noteInfos.map(n => ({
        midi: n.midi,
        startTime: this.elapsedTime,
        duration: n.duration,
        velocity: n.velocity,
      })),
    });
  }

  // ─── 工具方法 ───
  private extractNoteMidis(notes: any[]): number[] {
    const result: number[] = [];
    for (const note of notes) {
      if (note.Pitch) {
        result.push(note.halfTone + 12);
      }
    }
    return result;
  }

  private extractNoteInfos(notes: any[]): Array<{ midi: number; pitch: string; duration: number }> {
    const result: Array<{ midi: number; pitch: string; duration: number }> = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (const note of notes) {
      if (note.Pitch) {
        const midi = note.halfTone + 12;
        const pitch = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const duration = (note.Length?.RealValue ?? 0.5) * 4;
        result.push({ midi, pitch, duration });
      }
    }
    return result;
  }

  // ─── 销毁 ───
  dispose(): void {
    this.stop();
    this.osmd = null;
  }
}
