"use client";

import { useState, useCallback } from "react";
import ScoreViewer from "@/components/ScoreViewer";
import { PracticeControls } from "@/components/PracticeControls";
import { MIDIStatus } from "@/components/MIDIStatus";
import { PracticeStats } from "@/components/PracticeStats";
import { useMIDI } from "@/hooks/useMIDI";
import { midiToNoteName, calculateAccuracy } from "@/lib/note-matching";
import type { MIDINoteEvent } from "@/hooks/useMIDI";
import { beyerNo1Xml } from "@/lib/scores/beyer-no1";

const SAMPLE_SCORES = [
  { id: "beyer-1", name: "拜厄 No.1", content: beyerNo1Xml },
];

export default function Home() {
  const [selectedScore, setSelectedScore] = useState(SAMPLE_SCORES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(80);
  const [volume, setVolume] = useState(80);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [anchorMode, setAnchorMode] = useState(true);

  // Practice stats
  const [correctNotes, setCorrectNotes] = useState(0);
  const [wrongNotes, setWrongNotes] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // MIDI hook
  const { connections, isSupported, connect, disconnect } = useMIDI({
    onNoteOn: (event: MIDINoteEvent) => {
      const noteName = midiToNoteName(event.noteNumber);
      setLastPlayedNote(noteName);

      // Simple validation: for now, just track that a note was played
      // In a full implementation, we'd compare with the expected note from the score
      setIsCorrect(true);
      setCorrectNotes((prev) => prev + 1);
      setTotalNotes((prev) => prev + 1);
    },
    onNoteOff: (_event: MIDINoteEvent) => {
      // Handle note off if needed
    },
  });

  const accuracy = calculateAccuracy(correctNotes, totalNotes);

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
        {/* 乐谱显示区 */}
        <main className="flex-1 overflow-auto">
          <ScoreViewer
            musicXml={selectedScore.content}
            anchorMode={anchorMode}
            isPlaying={isPlaying}
            currentMeasure={currentMeasure}
          />
        </main>

        {/* 右侧面板 */}
        <aside className="w-72 border-l bg-card p-4 space-y-4 overflow-y-auto">
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
        </aside>
      </div>

      {/* 底部控制栏 */}
      <PracticeControls
        isPlaying={isPlaying}
        tempo={tempo}
        volume={volume}
        currentMeasure={currentMeasure}
        totalMeasures={8}
        onPlay={handlePlay}
        onPause={handlePause}
        onRestart={handleRestart}
        onTempoChange={setTempo}
        onVolumeChange={setVolume}
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
