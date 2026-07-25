'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PracticeController, type TimingGrade, type PracticeStats } from '@/lib/practice-controller';
import type { PracticeMode } from '@/lib/practice-controller';

export type { PracticeMode, TimingGrade, PracticeStats };
import type { PianoNote } from '@/lib/audio-engine';

// Hook 返回的状态
export interface PracticeHookState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  currentNoteIndex: number;
  cursorProgress: number; // 0-1
  currentMeasure: number;
  stats: PracticeStats;
  lastGrade: TimingGrade | null;
  lastDelta: number; // 上次判定的时间差（ms）
}

export function usePractice(
  mode: PracticeMode = 'follow',
  bpm: number = 80,
  audioContext: AudioContext | null = null
) {
  const controllerRef = useRef<PracticeController | null>(null);
  const [state, setState] = useState<PracticeHookState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    currentNoteIndex: 0,
    cursorProgress: 0,
    currentMeasure: 1,
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
    lastGrade: null,
    lastDelta: 0,
  });

  // 初始化控制器
  useEffect(() => {
    controllerRef.current = new PracticeController(mode, bpm);
    if (audioContext) {
      controllerRef.current.setAudioContext(audioContext);
    }

    return () => {
      controllerRef.current?.stop();
    };
  }, [mode, bpm, audioContext]);

  // 更新音频上下文
  useEffect(() => {
    if (controllerRef.current && audioContext) {
      controllerRef.current.setAudioContext(audioContext);
    }
  }, [audioContext]);

  // 加载音符
  const loadNotes = useCallback((notes: PianoNote[]) => {
    if (!controllerRef.current) return;
    controllerRef.current.loadNotes(notes);
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalNotes: notes.length,
      },
    }));
  }, []);

  // 开始练习
  const start = useCallback(() => {
    if (!controllerRef.current) return;

    // 设置回调
    controllerRef.current.setCallbacks({
      onProgress: (currentTime, currentNoteIndex) => {
        setState(prev => ({
          ...prev,
          currentTime,
          currentNoteIndex,
          cursorProgress: controllerRef.current?.getCursorProgress() || 0,
          currentMeasure: controllerRef.current?.getCurrentMeasure() || 1,
        }));
      },
      onNoteHit: (note, grade, delta) => {
        setState(prev => ({
          ...prev,
          lastGrade: grade,
          lastDelta: delta,
          stats: controllerRef.current?.getState().stats || prev.stats,
        }));
      },
      onNoteMiss: (note) => {
        setState(prev => ({
          ...prev,
          lastGrade: 'miss',
          stats: controllerRef.current?.getState().stats || prev.stats,
        }));
      },
      onTimingCheck: (grade) => {
        // 节奏偏差提示
        console.log('[Practice] Timing check:', grade);
      },
      onComplete: (stats) => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          stats,
        }));
      },
    });

    controllerRef.current.start();
    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
  }, []);

  // 停止练习
  const stop = useCallback(() => {
    controllerRef.current?.stop();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
    }));
  }, []);

  // 暂停/继续
  const pause = useCallback(() => {
    controllerRef.current?.pause();
    setState(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  }, []);

  // 处理按键输入
  const handleKeyPress = useCallback((midiNote: number): TimingGrade | null => {
    return controllerRef.current?.handleKeyPress(midiNote) || null;
  }, []);

  // 重置
  const reset = useCallback(() => {
    controllerRef.current?.stop();
    setState({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      currentNoteIndex: 0,
      cursorProgress: 0,
      currentMeasure: 1,
      stats: {
        totalNotes: state.stats.totalNotes,
        hitNotes: 0,
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        combo: 0,
        maxCombo: 0,
        accuracy: 0,
      },
      lastGrade: null,
      lastDelta: 0,
    });
  }, [state.stats.totalNotes]);

  return {
    state,
    loadNotes,
    start,
    stop,
    pause,
    handleKeyPress,
    reset,
  };
}
