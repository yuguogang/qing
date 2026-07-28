'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PracticeController, type TimingGrade, type PracticeStats, type PracticeMode } from '@/lib/practice-controller';
import type { PianoNote } from '@/lib/audio-engine';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

export type { PracticeMode, TimingGrade, PracticeStats };

// Hook 返回的状态
export interface PracticeHookState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  currentCursorStep: number;
  totalCursorSteps: number;
  stats: PracticeStats;
  lastGrade: TimingGrade | null;
  lastDelta: number;
  cursorNotes: number[];
}

export function usePractice(
  mode: PracticeMode = 'follow',
  bpm: number = 80,
  audioContext: AudioContext | null = null
) {
  const controllerRef = useRef<PracticeController | null>(null);
  const notesRef = useRef<PianoNote[]>([]);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<PracticeHookState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    currentCursorStep: 0,
    totalCursorSteps: 0,
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
    cursorNotes: [],
  });

  // 初始化控制器
  useEffect(() => {
    const controller = new PracticeController(mode, bpm);
    if (audioContext) {
      controller.setAudioContext(audioContext);
    }
    // 如果已有 OSMD，设置到控制器
    if (osmdRef.current) {
      controller.setOSMD(osmdRef.current);
    }
    // 重新加载音符（如果已有）
    if (notesRef.current.length > 0) {
      controller.loadNotes(notesRef.current);
    }

    controllerRef.current = controller;

    return () => {
      controller.stop();
    };
  }, [mode, bpm, audioContext]);

  // 设置 OSMD 实例
  const setOSMD = useCallback((osmd: OpenSheetMusicDisplay) => {
    osmdRef.current = osmd;
    if (controllerRef.current) {
      controllerRef.current.setOSMD(osmd);
    }
  }, []);

  // 加载音符
  const loadNotes = useCallback((notes: PianoNote[]) => {
    notesRef.current = notes;
    if (!controllerRef.current) return;
    controllerRef.current.loadNotes(notes);
    setState(prev => ({
      ...prev,
      totalCursorSteps: controllerRef.current?.getTotalCursorSteps() || 0,
      stats: {
        ...prev.stats,
        totalNotes: notes.length,
      },
    }));
  }, []);

  // 轮询更新 UI 状态
  const startPolling = useCallback(() => {
    const poll = () => {
      const controller = controllerRef.current;
      if (!controller || !controller.getIsPlaying()) return;

      setState(prev => ({
        ...prev,
        currentTime: controller.getCurrentTime(),
        currentCursorStep: controller.getCurrentCursorStep(),
        stats: controller.getStats(),
        isPlaying: controller.getIsPlaying(),
        isPaused: controller.getIsPaused(),
      }));

      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
  }, []);

  const stopPolling = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // 开始练习
  const start = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    // 设置回调
    controller.setCallbacks({
      onNoteHit: (_midi, grade, delta) => {
        setState(prev => ({
          ...prev,
          lastGrade: grade,
          lastDelta: delta,
          stats: controller.getStats(),
        }));
      },
      onNoteMiss: (_midi) => {
        setState(prev => ({
          ...prev,
          lastGrade: 'miss',
          stats: controller.getStats(),
        }));
      },
      onCursorStep: (_step) => {
        setState(prev => ({
          ...prev,
          currentCursorStep: controller.getCurrentCursorStep(),
        }));
      },
      onCursorNotes: (midiNotes) => {
        console.log('[usePractice onCursorNotes]', midiNotes);
        setState(prev => ({
          ...prev,
          cursorNotes: midiNotes,
        }));
      },
      onComplete: (stats) => {
        stopPolling();
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          stats,
        }));
      },
    });

    controller.start();
    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
    startPolling();
  }, [startPolling, stopPolling]);

  // 停止练习
  const stop = useCallback(() => {
    controllerRef.current?.stop();
    stopPolling();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
    }));
  }, [stopPolling]);

  // 暂停/继续
  const pause = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    controller.pause();
    const isPaused = controller.getIsPaused();
    setState(prev => ({
      ...prev,
      isPaused,
    }));

    if (isPaused) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [startPolling, stopPolling]);

  // 处理按键输入
  const handleKeyPress = useCallback((midiNote: number): TimingGrade | null => {
    return controllerRef.current?.handleKeyPress(midiNote) || null;
  }, []);

  const getStartTime = useCallback((): number => {
    return controllerRef.current?.getStartTime() || 0;
  }, []);

  // 重置
  const reset = useCallback(() => {
    controllerRef.current?.stop();
    stopPolling();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      currentCursorStep: 0,
      stats: {
        totalNotes: prev.stats.totalNotes,
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
      cursorNotes: [],
    }));
  }, [stopPolling]);

  return {
    state,
    setOSMD,
    loadNotes,
    start,
    stop,
    pause,
    handleKeyPress,
    reset,
    getStartTime,
  };
}
