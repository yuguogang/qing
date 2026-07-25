"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ScoreViewer from "@/components/ScoreViewer";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";
import { useMIDI } from "@/hooks/useMIDI";
import { usePractice, type PracticeMode } from "@/hooks/use-practice";
import { midiToNoteName } from "@/lib/note-matching";
import type { MIDINoteEvent } from "@/hooks/useMIDI";
import { beyerNo1Xml } from "@/lib/scores/beyer-no1";
import { PianoAudioEngine, type PianoNote } from "@/lib/audio-engine";
import { parseMusicXMLNotes } from "@/lib/musicxml-parser";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

// ===== 常量 =====
const SAMPLE_SCORES = [
  { id: "beyer-1", name: "拜厄 No.1", content: beyerNo1Xml },
];

type DisplayMode = "standard" | "anchor" | "spectrum";

// ===== 子组件 =====

/** 顶部控制栏 */
function TopBar({
  collapsed,
  onToggle,
  selectedScore,
  scores,
  onScoreChange,
  displayMode,
  onDisplayModeChange,
  practiceMode,
  onPracticeModeChange,
  tempo,
  onTempoChange,
  zoom,
  onZoomChange,
  isPlaying,
}: {
  collapsed: boolean;
  onToggle: () => void;
  selectedScore: typeof SAMPLE_SCORES[0];
  scores: typeof SAMPLE_SCORES;
  onScoreChange: (score: typeof SAMPLE_SCORES[0]) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  practiceMode: PracticeMode;
  onPracticeModeChange: (mode: PracticeMode) => void;
  tempo: number;
  onTempoChange: (t: number) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  isPlaying: boolean;
}) {
  return (
    <div className={`collapsible-panel bg-card border-b ${collapsed ? "collapsed" : ""}`} style={{ height: collapsed ? 8 : 48 }}>
      <div className="collapse-toggle" onClick={onToggle} title="展开控制栏" />
      {!collapsed && (
        <div className="flex items-center justify-between h-full px-4 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">清</span>
            </div>
            <span className="text-sm font-semibold text-foreground">清谱</span>
          </div>

          {/* 曲谱选择 */}
          <select
            value={selectedScore.id}
            onChange={(e) => {
              const s = scores.find((x) => x.id === e.target.value);
              if (s) onScoreChange(s);
            }}
            className="px-2 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
          >
            {scores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* 显示模式 */}
          <div className="flex items-center rounded-lg border p-0.5 shrink-0">
            {(["standard", "anchor", "spectrum"] as DisplayMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onDisplayModeChange(m)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  displayMode === m
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {{ standard: "标准", anchor: "锚线", spectrum: "七色" }[m]}
              </button>
            ))}
          </div>

          {/* 练习模式 */}
          <div className="flex items-center rounded-lg border p-0.5 shrink-0">
            {(["follow", "sight"] as PracticeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onPracticeModeChange(m)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  practiceMode === m
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                {{ follow: "跟弹", sight: "视奏" }[m]}
              </button>
            ))}
          </div>

          {/* BPM */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">BPM</span>
            <input
              type="range"
              min={30}
              max={200}
              value={tempo}
              onChange={(e) => onTempoChange(Number(e.target.value))}
              className="w-20 h-1 accent-primary"
              disabled={isPlaying}
            />
            <span className="text-xs font-mono w-8 text-right">{tempo}</span>
          </div>

          {/* 缩放 */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">缩放</span>
            <input
              type="range"
              min={50}
              max={200}
              value={Math.round(zoom * 100)}
              onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
              className="w-16 h-1 accent-primary"
            />
            <span className="text-xs font-mono w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>

          {/* 折叠按钮 */}
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="折叠控制栏"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** 底部统计条 */
function StatsBar({
  combo,
  perfect,
  good,
  miss,
  accuracy,
  isPlaying,
}: {
  combo: number;
  perfect: number;
  good: number;
  miss: number;
  accuracy: number;
  isPlaying: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-6 px-4 py-1.5 bg-card border-t text-xs" style={{ height: 32 }}>
      <span className="stat-item">
        连击: <span className="font-bold text-primary">{combo}</span>
      </span>
      <span className="stat-item">
        完美: <span className="font-bold text-yellow-600">{perfect}</span>
      </span>
      <span className="stat-item">
        良好: <span className="font-bold text-green-600">{good}</span>
      </span>
      <span className="stat-item">
        偏差: <span className="font-bold text-red-500">{miss}</span>
      </span>
      <span className="stat-item">
        准确率: <span className="font-bold">{accuracy.toFixed(1)}%</span>
      </span>
      {isPlaying && (
        <span className="flex items-center gap-1 text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          演奏中
        </span>
      )}
    </div>
  );
}

/** 底部虚拟键盘面板 */
function KeyboardPanel({
  collapsed,
  onToggle,
  onNotePlay,
  activeNotes,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNotePlay: (n: number) => void;
  activeNotes: Set<number>;
}) {
  return (
    <div className={`collapsible-panel bg-card border-t ${collapsed ? "collapsed" : ""}`} style={{ height: collapsed ? 8 : 120 }}>
      <div className="collapse-toggle" onClick={onToggle} title="展开虚拟键盘" />
      {!collapsed && (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-3 py-1 border-b">
            <span className="text-xs font-medium text-muted-foreground">虚拟键盘</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">A-K 白键 · W-P 黑键</span>
              <button
                onClick={onToggle}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="折叠键盘"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 px-2 py-1 overflow-hidden">
            <VirtualKeyboard
              onNotePlay={onNotePlay}
              activeNotes={activeNotes}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 主页面 =====
export default function Home() {
  const [selectedScore, setSelectedScore] = useState(SAMPLE_SCORES[0]);
  const [tempo, setTempo] = useState(80);
  const [volume, setVolume] = useState(80);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("anchor");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("follow");
  const [zoom, setZoom] = useState(1);

  // 折叠状态
  const [topCollapsed, setTopCollapsed] = useState(false);
  const [keyboardCollapsed, setKeyboardCollapsed] = useState(false);

  // 音频引擎
  const audioEngineRef = useRef<PianoAudioEngine | null>(null);
  const [parsedNotes, setParsedNotes] = useState<PianoNote[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const engine = new PianoAudioEngine();
    audioEngineRef.current = engine;
    audioContextRef.current = engine.getAudioContext();
    return () => { engine.stop(); };
  }, []);

  useEffect(() => {
    const notes = parseMusicXMLNotes(selectedScore.content);
    setParsedNotes(notes);
  }, [selectedScore]);

  const [audioContextState, setAudioContextState] = useState<AudioContext | null>(null);

  const {
    state: practiceState,
    setOSMD,
    loadNotes,
    start,
    stop,
    pause,
    handleKeyPress,
    reset,
  } = usePractice(practiceMode, tempo, audioContextState);

  useEffect(() => {
    setAudioContextState(audioContextRef.current);
  }, []);

  useEffect(() => {
    if (parsedNotes.length > 0) loadNotes(parsedNotes);
  }, [parsedNotes, loadNotes]);

  const handleOsmdReady = useCallback((osmd: OpenSheetMusicDisplay) => {
    setOSMD(osmd);
  }, [setOSMD]);

  // 伴奏
  const accompanimentTimeoutsRef = useRef<number[]>([]);

  const playAccompaniment = useCallback(() => {
    if (!audioEngineRef.current || parsedNotes.length === 0) return;
    const engine = audioEngineRef.current;
    const bpm = tempo;
    const vol = volume / 100;
    const secondsPerBeat = 60 / bpm;
    accompanimentTimeoutsRef.current.forEach(id => clearTimeout(id));
    accompanimentTimeoutsRef.current = [];
    parsedNotes.forEach((note) => {
      const delay = note.startTime * secondsPerBeat * 1000;
      const timeout = window.setTimeout(() => {
        engine.playNote(note.midi, note.duration * secondsPerBeat, vol);
      }, delay);
      accompanimentTimeoutsRef.current.push(timeout);
    });
  }, [parsedNotes, tempo, volume]);

  const stopAccompaniment = useCallback(() => {
    accompanimentTimeoutsRef.current.forEach(id => clearTimeout(id));
    accompanimentTimeoutsRef.current = [];
    audioEngineRef.current?.stop();
  }, []);

  // 播放/暂停
  const handlePlayPause = useCallback(() => {
    if (practiceState.isPlaying) {
      stopAccompaniment();
      pause();
    } else {
      if (practiceMode === "follow") playAccompaniment();
      start();
    }
  }, [practiceState.isPlaying, practiceMode, playAccompaniment, start, pause, stopAccompaniment]);

  // 重新开始
  const handleRestart = useCallback(() => {
    stopAccompaniment();
    stop();
    reset();
    setTimeout(() => {
      if (practiceMode === "follow") playAccompaniment();
      start();
    }, 100);
  }, [stopAccompaniment, stop, reset, practiceMode, playAccompaniment, start]);

  // 模式切换
  const handleModeChange = useCallback((mode: PracticeMode) => {
    setPracticeMode(mode);
    if (practiceState.isPlaying) reset();
  }, [practiceState.isPlaying, reset]);

  // 显示模式切换
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
  }, []);

  // 音符处理
  const handleNotePlay = useCallback((noteNumber: number) => {
    if (audioEngineRef.current) {
      audioEngineRef.current.playNote(noteNumber, 0.5, volume / 100);
    }
    handleKeyPress(noteNumber);
  }, [volume, handleKeyPress]);

  // MIDI
  const { connections, isSupported, connect, disconnect } = useMIDI({
    onNoteOn: (event: MIDINoteEvent) => { handleNotePlay(event.noteNumber); },
    onNoteOff: () => {},
  });

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") { e.preventDefault(); handlePlayPause(); }
      if (e.code === "KeyR") { e.preventDefault(); handleRestart(); }
      if (e.code === "ArrowLeft") setTempo((t) => Math.max(30, t - 5));
      if (e.code === "ArrowRight") setTempo((t) => Math.min(200, t + 5));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePlayPause, handleRestart]);

  const currentNote = practiceState.currentCursorStep < parsedNotes.length
    ? parsedNotes[practiceState.currentCursorStep]
    : null;

  const anchorMode = displayMode === "anchor";
  const spectrumMode = displayMode === "spectrum";

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* 顶部控制栏（可折叠） */}
      <TopBar
        collapsed={topCollapsed}
        onToggle={() => setTopCollapsed(!topCollapsed)}
        selectedScore={selectedScore}
        scores={SAMPLE_SCORES}
        onScoreChange={(s) => { setSelectedScore(s); reset(); }}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
        practiceMode={practiceMode}
        onPracticeModeChange={handleModeChange}
        tempo={tempo}
        onTempoChange={setTempo}
        zoom={zoom}
        onZoomChange={setZoom}
        isPlaying={practiceState.isPlaying}
      />

      {/* 乐谱展示区 */}
      <div className="flex-1 overflow-hidden score-wrapper">
        <ScoreViewer
          musicXml={selectedScore.content}
          anchorMode={anchorMode}
          spectrumMode={spectrumMode}
          isPlaying={practiceState.isPlaying}
          currentCursorStep={practiceState.currentCursorStep}
          totalCursorSteps={practiceState.totalCursorSteps}
          lastGrade={practiceState.lastGrade}
          onOsmdReady={handleOsmdReady}
          zoom={zoom}
        />
      </div>

      {/* 统计条 */}
      <StatsBar
        combo={practiceState.stats.combo}
        perfect={practiceState.stats.perfectCount}
        good={practiceState.stats.goodCount}
        miss={practiceState.stats.missCount}
        accuracy={practiceState.stats.accuracy}
        isPlaying={practiceState.isPlaying}
      />

      {/* 虚拟键盘（可折叠） */}
      <KeyboardPanel
        collapsed={keyboardCollapsed}
        onToggle={() => setKeyboardCollapsed(!keyboardCollapsed)}
        onNotePlay={handleNotePlay}
        activeNotes={new Set(currentNote ? [currentNote.midi] : [])}
      />

      {/* 底部浮动控制：播放/暂停 + MIDI */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
        {/* MIDI 按钮 */}
        {isSupported && (
          <button
            onClick={connections.length > 0 ? disconnect : connect}
            className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              connections.length > 0
                ? "bg-green-500 text-white"
                : "bg-card border text-muted-foreground hover:text-foreground"
            }`}
            title={connections.length > 0 ? "断开 MIDI" : "连接 MIDI"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </button>
        )}

        {/* 播放/暂停 */}
        <button
          onClick={handlePlayPause}
          className="w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          title={practiceState.isPlaying ? "暂停" : "播放"}
        >
          {practiceState.isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
