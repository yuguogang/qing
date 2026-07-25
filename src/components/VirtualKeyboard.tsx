"use client";

import { useEffect, useCallback, useState } from "react";

interface VirtualKeyboardProps {
  onNotePlay: (noteNumber: number) => void;
  activeNotes?: Set<number>;
}

// 电脑键盘映射到 MIDI 音符（中央C=60）
const KEY_MAP: Record<string, number> = {
  // 白键 - 下排
  a: 60, // C4 (中央C)
  s: 62, // D4
  d: 64, // E4
  f: 65, // F4
  g: 67, // G4
  h: 69, // A4
  j: 71, // B4
  k: 72, // C5
  l: 74, // D5
  ";": 76, // E5

  // 黑键 - 上排
  w: 61, // C#4
  e: 63, // D#4
  t: 66, // F#4
  y: 68, // G#4
  u: 70, // A#4
  o: 73, // C#5
  p: 75, // D#5
};

// 音符名称映射
const NOTE_NAMES: Record<number, string> = {
  60: "C4",
  61: "C#4",
  62: "D4",
  63: "D#4",
  64: "E4",
  65: "F4",
  66: "F#4",
  67: "G4",
  68: "G#4",
  69: "A4",
  70: "A#4",
  71: "B4",
  72: "C5",
  73: "C#5",
  74: "D5",
  75: "D#5",
  76: "E5",
};

// 键盘布局定义
interface KeyDef {
  note: number;
  type: "white" | "black";
  key?: string;
  label: string;
}

const KEYS: KeyDef[] = [
  { note: 60, type: "white", key: "a", label: "C4" },
  { note: 61, type: "black", key: "w", label: "C#4" },
  { note: 62, type: "white", key: "s", label: "D4" },
  { note: 63, type: "black", key: "e", label: "D#4" },
  { note: 64, type: "white", key: "d", label: "E4" },
  { note: 65, type: "white", key: "f", label: "F4" },
  { note: 66, type: "black", key: "t", label: "F#4" },
  { note: 67, type: "white", key: "g", label: "G4" },
  { note: 68, type: "black", key: "y", label: "G#4" },
  { note: 69, type: "white", key: "h", label: "A4" },
  { note: 70, type: "black", key: "u", label: "A#4" },
  { note: 71, type: "white", key: "j", label: "B4" },
  { note: 72, type: "white", key: "k", label: "C5" },
  { note: 73, type: "black", key: "o", label: "C#5" },
  { note: 74, type: "white", key: "l", label: "D5" },
  { note: 75, type: "black", key: "p", label: "D#5" },
  { note: 76, type: "white", key: ";", label: "E5" },
];

export function VirtualKeyboard({ onNotePlay, activeNotes = new Set() }: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // 处理音符触发
  const handleNoteTrigger = useCallback(
    (noteNumber: number) => {
      onNotePlay(noteNumber);
    },
    [onNotePlay],
  );

  // 鼠标点击触发
  const handleMouseDown = useCallback(
    (note: number) => {
      handleNoteTrigger(note);
    },
    [handleNoteTrigger],
  );

  // 电脑键盘按下
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const key = e.key.toLowerCase();
      const note = KEY_MAP[key];

      if (note !== undefined) {
        e.preventDefault();
        setPressedKeys((prev) => new Set(prev).add(key));
        handleNoteTrigger(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleNoteTrigger]);

  // 分离白键和黑键
  const whiteKeys = KEYS.filter((k) => k.type === "white");
  const blackKeys = KEYS.filter((k) => k.type === "black");

  // 计算黑键位置（相对于白键）
  const getBlackKeyPosition = (note: number): number => {
    const whiteKeyWidth = 100 / whiteKeys.length;
    const whiteKeyIndex = whiteKeys.findIndex((k) => {
      const nextWhite = whiteKeys[whiteKeys.indexOf(k) + 1];
      return note > k.note && (!nextWhite || note < nextWhite.note);
    });
    return whiteKeyIndex * whiteKeyWidth + whiteKeyWidth * 0.65;
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>虚拟钢琴键盘</span>
        <span>用鼠标点击或电脑键盘弹奏（A-K 白键，W-P 黑键）</span>
      </div>

      <div className="relative mx-auto h-32 w-full max-w-3xl">
        {/* 白键 */}
        <div className="absolute inset-0 flex">
          {whiteKeys.map((key) => {
            const isActive = activeNotes.has(key.note);
            const isPressed = pressedKeys.has(key.key || "");

            return (
              <button
                key={key.note}
                onMouseDown={() => handleMouseDown(key.note)}
                className={`relative flex-1 border border-gray-300 rounded-b-md transition-colors ${
                  isActive || isPressed
                    ? "bg-blue-200 border-blue-400"
                    : "bg-white hover:bg-gray-50"
                }`}
                style={{ height: "100%" }}
              >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">
                  {key.key?.toUpperCase()}
                </span>
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                  {key.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 黑键 */}
        {blackKeys.map((key) => {
          const isActive = activeNotes.has(key.note);
          const isPressed = pressedKeys.has(key.key || "");
          const left = getBlackKeyPosition(key.note);

          return (
            <button
              key={key.note}
              onMouseDown={() => handleMouseDown(key.note)}
              className={`absolute top-0 w-[8%] h-[60%] rounded-b-md transition-colors z-10 ${
                isActive || isPressed
                  ? "bg-blue-600 border-blue-700"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
              style={{ left: `${left}%` }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-300">
                {key.key?.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-white border border-gray-300"></div>
          <span>白键（自然音）</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-900"></div>
          <span>黑键（升降音）</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-200 border border-blue-400"></div>
          <span>当前音符</span>
        </div>
      </div>
    </div>
  );
}
