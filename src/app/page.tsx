"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Music } from "lucide-react";
import ScoreViewer from "@/components/ScoreViewer";
import { PracticeControls } from "@/components/PracticeControls";
import { MIDIStatus } from "@/components/MIDIStatus";
import { PracticeStatsPanel } from "@/components/PracticeStats";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";
import { ResizableSplit } from "@/components/ResizableSplit";
import { useMIDI } from "@/hooks/useMIDI";
import { usePractice, type PracticeMode } from "@/hooks/use-practice";
import { midiToNoteName } from "@/lib/note-matching";
import type { MIDINoteEvent } from "@/hooks/useMIDI";
import { beyerNo1Xml } from "@/lib/scores/beyer-no1";
import { PianoAudioEngine, type PianoNote } from "@/lib/audio-engine";
import { parseMusicXMLNotes } from "@/lib/musicxml-parser";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

const SAMPLE_SCORES = [
  { id: "beyer-1", name: "拜厄 No.1", content: beyerNo1Xml },
];

export default function Home() {
  const [selectedScore, setSelectedScore] = useState(SAMPLE_SCORES[0]);
  const [tempo, setTempo] = useState(80);
  const [volume, setVolume] = useState(80);
  const [totalMeasures, setTotalMeasures] = useState(8);
  const [anchorMode, setAnchorMode] = useState(true);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('follow');

  // UI toggles
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // 音频引擎
  const audioEngineRef = useRef<PianoAudioEngine | null>(null);
  const [parsedNotes, setParsedNotes] = useState<PianoNote[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 初始化音频引擎
  useEffect(() => {
    const engine = new PianoAudioEngine();
    audioEngineRef.current = engine;
    audioContextRef.current = engine.getAudioContext();
    return () => {
      engine.stop();
    };
  }, []);

  // 解析乐谱音符
  useEffect(() => {
    const notes = parseMusicXMLNotes(selectedScore.content);
    setParsedNotes(notes);
    // 计算总小节数（从解析的音符中获取最大小节号）
    if (notes.length > 0) {
      const estimatedMeasures = Math.ceil(notes.length / 4);
      setTotalMeasures(estimatedMeasures);
    }
  }, [selectedScore]);

  // 使用练习模式 hook
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

  // 同步 audioContext 到 state
  useEffect(() => {
    setAudioContextState(audioContextRef.current);
  }, []);

  // 加载音符到练习控制器
  useEffect(() => {
    if (parsedNotes.length > 0) {
      loadNotes(parsedNotes);
    }
  }, [parsedNotes, loadNotes]);

  // OSMD 实例准备就绪的回调
  const handleOsmdReady = useCallback((osmd: OpenSheetMusicDisplay) => {
    console.log('[Home] OSMD ready, setting to practice controller');
    setOSMD(osmd);
  }, [setOSMD]);

  // 跟踪伴奏定时器
  const accompanimentTimeoutsRef = useRef<number[]>([]);

  // 播放伴奏（跟弹模式）
  const playAccompaniment = useCallback(() => {
    if (!audioEngineRef.current || parsedNotes.length === 0) return;

    const engine = audioEngineRef.current;
    const bpm = tempo;
    const vol = volume / 100;
    const secondsPerBeat = 60 / bpm;

    // 清除之前的定时器
    accompanimentTimeoutsRef.current.forEach(id => clearTimeout(id));
    accompanimentTimeoutsRef.current = [];

    // 按时间顺序调度音符
    parsedNotes.forEach((note) => {
      const delay = note.startTime * secondsPerBeat * 1000;
      const timeout = window.setTimeout(() => {
        engine.playNote(note.midi, note.duration * secondsPerBeat, vol);
      }, delay);
      accompanimentTimeoutsRef.current.push(timeout);
    });
  }, [parsedNotes, tempo, volume]);

  // 停止伴奏
  const stopAccompaniment = useCallback(() => {
    accompanimentTimeoutsRef.current.forEach(id => clearTimeout(id));
    accompanimentTimeoutsRef.current = [];
    audioEngineRef.current?.stop();
  }, []);

  // 处理播放/暂停
  const handlePlayPause = useCallback(() => {
    if (practiceState.isPlaying) {
      stopAccompaniment();
      pause();
    } else {
      if (practiceMode === 'follow') {
        playAccompaniment();
      }
      start();
    }
  }, [practiceState.isPlaying, practiceMode, playAccompaniment, start, pause, stopAccompaniment]);

  // 处理速度变化
  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
  }, []);

  // 处理音量变化
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioEngineRef.current) {
      audioEngineRef.current.setVolume(newVolume / 100);
    }
  }, []);

  // 处理模式切换
  const handleModeChange = useCallback((value: string) => {
    if (value) {
      setPracticeMode(value as PracticeMode);
      if (practiceState.isPlaying) {
        reset();
      }
    }
  }, [practiceState.isPlaying, reset]);

  // 重置
  const handleRestart = useCallback(() => {
    stopAccompaniment();
    stop();
    reset();
    setTimeout(() => {
      if (practiceMode === 'follow') {
        playAccompaniment();
      }
      start();
    }, 100);
  }, [stopAccompaniment, stop, reset, practiceMode, playAccompaniment, start]);

  // 统一的音符处理函数（MIDI 和虚拟键盘共用）
  const handleNotePlay = useCallback((noteNumber: number) => {
    const noteName = midiToNoteName(noteNumber);

    // 播放声音
    if (audioEngineRef.current) {
      audioEngineRef.current.playNote(noteNumber, 0.5, volume / 100);
    }

    // 提交到练习控制器进行判定
    const grade = handleKeyPress(noteNumber);

    return { noteName, grade };
  }, [volume, handleKeyPress]);

  // MIDI hook
  const { connections, isSupported, connect, disconnect } = useMIDI({
    onNoteOn: (event: MIDINoteEvent) => {
      handleNotePlay(event.noteNumber);
    },
    onNoteOff: (_event: MIDINoteEvent) => {
      // Handle note off if needed
    },
  });

  // 虚拟键盘音符处理
  const handleNoteOn = useCallback((noteNumber: number) => {
    handleNotePlay(noteNumber);
  }, [handleNotePlay]);

  // 获取当前应弹奏的音符（用于虚拟键盘高亮）
  const currentNote = practiceState.currentCursorStep < parsedNotes.length
    ? parsedNotes[practiceState.currentCursorStep]
    : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航 */}
      <header className="bg-card border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">清</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">清谱</h1>
              <p className="text-xs text-muted-foreground">三色锚线谱交互式练琴</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 练习模式切换 */}
            <ToggleGroup
              type="single"
              value={practiceMode}
              onValueChange={handleModeChange}
              className="border rounded-lg p-1"
            >
              <ToggleGroupItem value="follow" className="text-xs px-3">
                跟弹模式
              </ToggleGroupItem>
              <ToggleGroupItem value="sight" className="text-xs px-3">
                视奏模式
              </ToggleGroupItem>
            </ToggleGroup>

            {/* 虚拟键盘 Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="gap-2"
            >
              <Music className="h-4 w-4" />
              {showKeyboard ? '收起键盘' : '显示键盘'}
            </Button>

            {/* MIDI Status */}
            <MIDIStatus
              connections={connections}
              isSupported={isSupported}
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {/* Score Selector */}
            <select
              value={selectedScore.id}
              onChange={(e) => {
                const score = SAMPLE_SCORES.find((s) => s.id === e.target.value);
                if (score) {
                  setSelectedScore(score);
                  reset();
                }
              }}
              className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SAMPLE_SCORES.map((score) => (
                <option key={score.id} value={score.id}>
                  {score.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：乐谱 + 虚拟键盘（可调整比例） */}
        <div className="flex-1 overflow-hidden">
          {showKeyboard ? (
            <ResizableSplit
              topChildren={
                <ScoreViewer
                  musicXml={selectedScore.content}
                  anchorMode={anchorMode}
                  isPlaying={practiceState.isPlaying}
                  currentCursorStep={practiceState.currentCursorStep}
                  totalCursorSteps={practiceState.totalCursorSteps}
                  lastGrade={practiceState.lastGrade}
                  onOsmdReady={handleOsmdReady}
                />
              }
              bottomChildren={
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-2 border-b">
                    <button
                      onClick={() => setShowKeyboard(false)}
                      className="flex items-center gap-2 text-sm font-medium hover:bg-secondary rounded-lg px-2 py-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>虚拟键盘</span>
                    </button>
                    <span className="text-xs text-muted-foreground">A-K 白键 · W-P 黑键</span>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <VirtualKeyboard
                      onNotePlay={handleNoteOn}
                      activeNotes={new Set(currentNote ? [currentNote.midi] : [])}
                    />
                  </div>
                </div>
              }
              defaultSplit={0.7}
              minTopHeight={200}
              minBottomHeight={150}
            />
          ) : (
            <div className="h-full overflow-auto">
              <ScoreViewer
                musicXml={selectedScore.content}
                anchorMode={anchorMode}
                isPlaying={practiceState.isPlaying}
                currentCursorStep={practiceState.currentCursorStep}
                totalCursorSteps={practiceState.totalCursorSteps}
                lastGrade={practiceState.lastGrade}
                onOsmdReady={handleOsmdReady}
              />
            </div>
          )}
        </div>

        {/* 右侧面板 - 可收起 */}
        <aside className={`${showStats ? 'w-72' : 'w-10'} border-l bg-card transition-all duration-300 flex flex-col`}>
          {/* Toggle 按钮 */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title={showStats ? '收起统计面板' : '展开统计面板'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showStats ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>

          {showStats && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 练习统计 */}
              <div>
                <h3 className="text-sm font-medium mb-2">练习统计</h3>
                <PracticeStatsPanel
                  stats={practiceState.stats}
                  lastGrade={practiceState.lastGrade}
                  lastDelta={practiceState.lastDelta}
                  isPlaying={practiceState.isPlaying}
                  mode={practiceMode}
                />
              </div>

              {/* 显示设置 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">显示设置</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={anchorMode}
                    onChange={(e) => setAnchorMode(e.target.checked)}
                    className="rounded"
                  />
                  <span>三色锚线模式</span>
                </label>
              </div>

              {/* 快捷键提示 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">快捷键</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">Space</kbd> 播放/暂停</p>
                  <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">R</kbd> 重新开始</p>
                  <p><kbd className="px-1.5 py-0.5 bg-secondary rounded">←→</kbd> 调整速度</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 底部控制栏 */}
      <PracticeControls
        isPlaying={practiceState.isPlaying}
        tempo={tempo}
        volume={volume}
        currentMeasure={1}
        totalMeasures={totalMeasures}
        onPlay={handlePlayPause}
        onPause={handlePlayPause}
        onRestart={handleRestart}
        onTempoChange={handleTempoChange}
        onVolumeChange={handleVolumeChange}
        onMeasureChange={() => {}}
      />

      {/* 底部信息 */}
      <footer className="bg-card border-t px-6 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          三色锚线识谱法 by 郑锡勇 | 清谱 - 练琴即识谱
        </p>
      </footer>
    </div>
  );
}
