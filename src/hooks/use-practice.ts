'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PlaybackEngine, type PlaybackState } from '@/lib/playback-engine';
import { MidiScheduler } from '@/lib/midi-scheduler';
import { PianoAudioEngine } from '@/lib/audio-engine';
import { eventBus } from '@/lib/event-bus';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

export type PracticeMode = 'browse' | 'follow' | 'sightsinging';
export type TimingGrade = 'perfect' | 'good' | 'miss';

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

export interface PracticeHookState {
  isPlaying: boolean;
  isPaused: boolean;
  currentCursorStep: number;
  totalCursorSteps: number;
  stats: PracticeStats;
  lastGrade: TimingGrade | null;
  lastDelta: number;
  cursorNotes: number[];
  elapsedTime: number;
  totalDuration: number;
  progress: number;
}

const PERFECT_THRESHOLD_MS = 100;
const GOOD_THRESHOLD_MS = 300;
const EMPTY_STATS: PracticeStats = {
  totalNotes: 0, hitNotes: 0, perfectCount: 0, goodCount: 0,
  missCount: 0, combo: 0, maxCombo: 0, accuracy: 0,
};

export function usePractice(
  mode: PracticeMode = 'follow',
  bpm: number = 80,
  audioContext: AudioContext | null = null
) {
  const engineRef = useRef<PlaybackEngine | null>(null);
  const audioEngineRef = useRef<PianoAudioEngine | null>(null);
  const schedulerRef = useRef<MidiScheduler | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const statsRef = useRef<PracticeStats>({ ...EMPTY_STATS });
  const modeRef = useRef(mode);

  const [state, setState] = useState<PracticeHookState>({
    isPlaying: false,
    isPaused: false,
    currentCursorStep: 0,
    totalCursorSteps: 0,
    stats: { ...EMPTY_STATS },
    lastGrade: null,
    lastDelta: 0,
    cursorNotes: [],
    elapsedTime: 0,
    totalDuration: 0,
    progress: 0,
  });

  // 节拍判定窗口
  const judgmentWindowRef = useRef<{
    expectedNotes: Set<number>;
    judgments: Map<number, TimingGrade>;
    windowStart: number;
  }>({
    expectedNotes: new Set(),
    judgments: new Map(),
    windowStart: 0,
  });

  // 更新统计的辅助函数
  const updateStats = useCallback((updater: (prev: PracticeStats) => PracticeStats) => {
    statsRef.current = updater(statsRef.current);
    setState(prev => ({ ...prev, stats: { ...statsRef.current } }));
  }, []);

  // 初始化引擎
  useEffect(() => {
    const engine = new PlaybackEngine(bpm);
    const audioEngine = new PianoAudioEngine();
    const scheduler = new MidiScheduler(audioEngine);

    engineRef.current = engine;
    audioEngineRef.current = audioEngine;
    schedulerRef.current = scheduler;

    // 订阅 position-changed 事件更新 UI
    const unsubPosition = eventBus.on('position-changed', (payload) => {
      setState(prev => ({
        ...prev,
        currentCursorStep: payload.stepIndex,
        totalCursorSteps: payload.totalSteps,
        cursorNotes: payload.notes.map(n => n.midi),
        elapsedTime: payload.enrolledTime,
        totalDuration: prev.totalDuration || payload.enrolledTime / (payload.progress || 0.01),
        progress: payload.progress,
      }));

      // 更新判定窗口
      judgmentWindowRef.current.expectedNotes = new Set(payload.notes.map(n => n.midi));
      judgmentWindowRef.current.windowStart = performance.now();
      judgmentWindowRef.current.judgments = new Map();
    });

    // 订阅 playback:state
    const unsubState = eventBus.on('playback:state', (payload) => {
      setState(prev => ({
        ...prev,
        isPlaying: payload.state === 'playing',
        isPaused: payload.state === 'paused',
      }));
    });

    // 订阅 playback:stop
    const unsubStop = eventBus.on('playback:stop', (payload) => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentCursorStep: payload.reason === 'completed' ? prev.totalCursorSteps : 0,
      }));
      if (payload.reason === 'completed') {
        const s = statsRef.current;
        updateStats(() => ({ ...s }));
      }
    });

    return () => {
      unsubPosition();
      unsubState();
      unsubStop();
      engine.dispose();
      scheduler.dispose();
      audioEngine.dispose();
    };
  }, [bpm, updateStats]);

  // mode 变化时更新
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // 设置 OSMD
  const setOSMD = useCallback((osmd: OpenSheetMusicDisplay) => {
    osmdRef.current = osmd;
    engineRef.current?.setOsmd(osmd);
  }, []);

  // 加载音符（预扫描元数据）
  const loadNotes = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !osmdRef.current) return;

    const meta = engine.scanMetadata();
    setState(prev => ({
      ...prev,
      totalCursorSteps: meta.totalSteps,
      totalDuration: meta.totalDuration,
      stats: {
        ...prev.stats,
        totalNotes: meta.totalSteps,
      },
    }));
    statsRef.current.totalNotes = meta.totalSteps;
  }, []);

  // 开始播放
  const start = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // 先扫元数据（如果需要）
    if (engine.getTotalSteps() === 0) {
      const meta = engine.scanMetadata();
      setState(prev => ({
        ...prev,
        totalCursorSteps: meta.totalSteps,
        totalDuration: meta.totalDuration,
      }));
    }

    // 重置统计
    statsRef.current = { ...EMPTY_STATS, totalNotes: statsRef.current.totalNotes };
    judgmentWindowRef.current = {
      expectedNotes: new Set(),
      judgments: new Map(),
      windowStart: 0,
    };

    engine.play();
  }, []);

  // 停止
  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  // 暂停/继续
  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.getState() === 'playing') {
      engine.pause();
    } else if (engine.getState() === 'paused') {
      engine.resume();
    }
  }, []);

  // 处理按键（节拍判定）
  const handleKeyPress = useCallback((midiNote: number): TimingGrade | null => {
    if (modeRef.current === 'browse') return null;
    const engine = engineRef.current;
    if (!engine || engine.getState() !== 'playing') return null;

    const jw = judgmentWindowRef.current;
    const now = performance.now();
    const elapsed = now - jw.windowStart;

    // 检查音符是否在当前判定窗口中
    if (!jw.expectedNotes.has(midiNote)) return null;

    // 已在当前窗口判定过
    if (jw.judgments.has(midiNote)) return null;

    // 计算等级
    let grade: TimingGrade;
    if (elapsed <= PERFECT_THRESHOLD_MS) {
      grade = 'perfect';
    } else if (elapsed <= GOOD_THRESHOLD_MS) {
      grade = 'good';
    } else {
      grade = 'miss';
    }

    jw.judgments.set(midiNote, grade);

    // 更新统计
    updateStats((prev) => {
      const next = { ...prev };
      if (grade === 'perfect') {
        next.perfectCount++;
        next.combo++;
      } else if (grade === 'good') {
        next.goodCount++;
        next.combo++;
      } else {
        next.missCount++;
        next.combo = 0;
      }
      next.hitNotes = next.perfectCount + next.goodCount;
      next.maxCombo = Math.max(next.maxCombo, next.combo);
      next.accuracy = next.totalNotes > 0
        ? Math.round((next.hitNotes / next.totalNotes) * 1000) / 10
        : 0;
      return next;
    });

    setState(prev => ({
      ...prev,
      lastGrade: grade,
      lastDelta: elapsed,
    }));

    return grade;
  }, [updateStats]);

  const reset = useCallback(() => {
    engineRef.current?.stop();
    statsRef.current = { ...EMPTY_STATS, totalNotes: statsRef.current.totalNotes };
    judgmentWindowRef.current = {
      expectedNotes: new Set(),
      judgments: new Map(),
      windowStart: 0,
    };
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentCursorStep: 0,
      elapsedTime: 0,
      progress: 0,
      stats: { ...EMPTY_STATS, totalNotes: prev.stats.totalNotes },
      lastGrade: null,
      lastDelta: 0,
      cursorNotes: [],
    }));
  }, []);

  const getStartTime = useCallback((): number => 0, []);

  return {
    state,
    setOSMD,
    loadNotes,
    start,
    stop,
    pause,
    reset,
    handleKeyPress,
    getStartTime,
  };
}
