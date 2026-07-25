"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Music } from "lucide-react";
import ScoreViewer from "@/components/ScoreViewer";
import { PracticeControls } from "@/components/PracticeControls";
import { MIDIStatus } from "@/components/MIDIStatus";
import { PracticeStats } from "@/components/PracticeStats";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";
import { useMIDI } from "@/hooks/useMIDI";
import { midiToNoteName, calculateAccuracy } from "@/lib/note-matching";
import type { MIDINoteEvent } from "@/hooks/useMIDI";
import { beyerNo1Xml } from "@/lib/scores/beyer-no1";
import { PianoAudioEngine } from "@/lib/audio-engine";
import { parseMusicXMLNotes } from "@/lib/musicxml-parser";
import { Button } from "@/components/ui/button";

const SAMPLE_SCORES = [
  { id: "beyer-1", name: "拜厄 No.1", content: beyerNo1Xml },
];

export default function Home() {
  const [selectedScore, setSelectedScore] = useState(SAMPLE_SCORES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(80);
  const [volume, setVolume] = useState(80);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [totalMeasures, setTotalMeasures] = useState(8);
  const [anchorMode, setAnchorMode] = useState(true);

  // UI toggles
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // 音频引擎
  const audioEngineRef = useRef<PianoAudioEngine | null>(null);
  const [parsedNotes, setParsedNotes] = useState<Array<{ midi: number; duration: number; startTime: number }>>([]);

  // 初始化音频引擎
  useEffect(() => {
    const engine = new PianoAudioEngine();
    audioEngineRef.current = engine;
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
      // 简单估算：每 4 个音符为 1 小节
      const estimatedMeasures = Math.ceil(notes.length / 4);
      setTotalMeasures(estimatedMeasures);
    }
  }, [selectedScore]);

  // 播放伴奏
  const playAccompaniment = useCallback(() => {
    if (!audioEngineRef.current || parsedNotes.length === 0) return;

    const engine = audioEngineRef.current;
    const bpm = tempo;
    const vol = volume / 100;

    // 逐个播放音符
    parsedNotes.forEach((note) => {
      engine.playNote(note.midi, bpm, vol);
    });

    setIsPlaying(true);
  }, [parsedNotes, tempo, volume]);

  // 暂停伴奏
  const stopAccompaniment = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
      setIsPlaying(false);
    }
  }, []);

  // 处理播放/暂停
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAccompaniment();
    } else {
      playAccompaniment();
    }
  }, [isPlaying, playAccompaniment, stopAccompaniment]);

  // 处理速度变化
  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    // 速度变化时需要重新播放才能生效
  }, []);

  // 处理音量变化
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioEngineRef.current) {
      audioEngineRef.current.setVolume(newVolume / 100);
    }
  }, []);

  // Practice stats
  const [correctNotes, setCorrectNotes] = useState(0);
  const [wrongNotes, setWrongNotes] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // 统一的音符处理函数（MIDI 和虚拟键盘共用）
  const handleNotePlay = useCallback((noteNumber: number) => {
    const noteName = midiToNoteName(noteNumber);
    setLastPlayedNote(noteName);
    setActiveNotes((prev) => new Set(prev).add(noteNumber));

    // 简单验证：暂时只记录音符被弹奏
    // 完整实现需要与谱面预期音符比较
    setIsCorrect(true);
    setCorrectNotes((prev) => prev + 1);
    setTotalNotes((prev) => prev + 1);

    // 500ms 后移除激活状态
    setTimeout(() => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteNumber);
        return next;
      });
    }, 500);
  }, []);

  // MIDI hook
  const { connections, isSupported, connect, disconnect } = useMIDI({
    onNoteOn: (event: MIDINoteEvent) => {
      handleNotePlay(event.noteNumber);
    },
    onNoteOff: (_event: MIDINoteEvent) => {
      // Handle note off if needed
    },
  });

  const accuracy = calculateAccuracy(correctNotes, totalNotes);

  // 虚拟键盘音符处理
  const handleNoteOn = useCallback((noteNumber: number) => {
    handleNotePlay(noteNumber);
  }, [handleNotePlay]);

  // 当前音符（用于虚拟键盘高亮）
  const currentNote = null; // TODO: 从乐谱中获取当前应弹奏的音符

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleRestart = useCallback(() => {
    setIsPlaying(false);
    setCurrentMeasure(1);
    setCorrectNotes(0);
    setWrongNotes(0);
    setTotalNotes(0);
    setLastPlayedNote(null);
    setIsCorrect(null);
  }, []);

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
                  handleRestart();
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
        {/* 左侧：乐谱 + 虚拟键盘 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 乐谱显示区 */}
          <main className="flex-1 overflow-auto" style={{ minHeight: '400px' }}>
            <ScoreViewer
              musicXml={selectedScore.content}
              anchorMode={anchorMode}
              isPlaying={isPlaying}
              currentMeasure={currentMeasure}
            />
          </main>

          {/* 虚拟键盘区 - 可收起 */}
          {showKeyboard && (
            <div className="border-t bg-card" style={{ height: '200px' }}>
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
              <div className="p-4 overflow-hidden" style={{ height: 'calc(100% - 40px)' }}>
                <VirtualKeyboard
                  onNotePlay={handleNoteOn}
                  activeNotes={activeNotes}
                />
              </div>
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
                <PracticeStats
                  correctNotes={correctNotes}
                  wrongNotes={wrongNotes}
                  totalNotes={totalNotes}
                  accuracy={accuracy}
                  lastPlayedNote={lastPlayedNote}
                  isCorrect={isCorrect}
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
        isPlaying={isPlaying}
        tempo={tempo}
        volume={volume}
        currentMeasure={currentMeasure}
        totalMeasures={totalMeasures}
        onPlay={handlePlayPause}
        onPause={handlePlayPause}
        onRestart={handleRestart}
        onTempoChange={handleTempoChange}
        onVolumeChange={handleVolumeChange}
        onMeasureChange={setCurrentMeasure}
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
