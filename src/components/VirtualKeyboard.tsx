"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── 88 键钢琴常量 ───
const MIDI_MIN = 21; // A0
const MIDI_MAX = 108; // C8
const TOTAL_WHITE_KEYS = 52;

// ─── 键盘快捷键映射（两行布局） ───
// 第一行：Q-P 覆盖 C4-C6 白键，2-0 覆盖对应黑键
// 第二行：Z-/ 覆盖 C3-C5 白键，S-' 覆盖对应黑键
const KEYBOARD_MAP: Record<string, number> = {
  // 第一行白键 (Q-P[\]) → C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6
  q: 60, w: 62, e: 64, r: 65, t: 67, y: 69, u: 71, i: 72, o: 74, p: 76,
  "[": 77, "]": 79, "\\": 81,
  // 第一行黑键 (2-0=) → C#4 D#4 F#4 G#4 A#4 C#5 D#5 F#5 G#5 A#5
  "2": 61, "3": 63, "5": 66, "6": 68, "7": 70, "9": 73, "0": 75, "=": 78, "-": 80,
  // 第二行白键 (Z-/) → C3 D3 E3 F3 G3 A3 B3 C4 D4 E4
  z: 48, x: 50, c: 52, v: 53, b: 55, n: 57, m: 59, ",": 60, ".": 62, "/": 64,
  // 第二行黑键 (S-';) → C#3 D#3 F#3 G#3 A#3 C#4 D#4
  s: 49, d: 51, g: 54, h: 56, j: 58, l: 61, ";": 63, "'": 65,
};

interface KeyDef {
  midi: number;
  isBlack: boolean;
  noteName: string;
  octave: number;
  keyLabel: string;
}

function isBlackKey(midi: number): boolean {
  const pc = midi % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

function noteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return names[midi % 12];
}

function buildKeys(): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const isBlack = isBlackKey(midi);
    const octave = Math.floor(midi / 12) - 1;
    const name = noteName(midi);
    // 查找键盘映射（取第一个匹配的键）
    const keyLabel = Object.entries(KEYBOARD_MAP).find(([, m]) => m === midi)?.[0] ?? "";
    keys.push({ midi, isBlack, noteName: name, octave, keyLabel });
  }
  return keys;
}

const ALL_KEYS = buildKeys();

// 白键索引映射（用于黑键定位）
function getWhiteKeyIndex(midi: number): number {
  let count = 0;
  for (let m = MIDI_MIN; m < midi; m++) {
    if (!isBlackKey(m)) count++;
  }
  return count;
}

// ─── Props ───
interface VirtualKeyboardProps {
  onNotePlay: (midiNote: number) => void;
  activeNotes: Set<number>;
  noteVelocities?: Map<number, number>; // MIDI 力度 0-127
}

export function VirtualKeyboard({ onNotePlay, activeNotes, noteVelocities }: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef(false);
  const lastPlayedRef = useRef<number | null>(null);

  // ─── 键盘事件 ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const midi = KEYBOARD_MAP[key];
      if (midi !== undefined) {
        e.preventDefault();
        setPressedKeys((prev) => new Set(prev).add(midi));
        onNotePlay(midi);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const midi = KEYBOARD_MAP[key];
      if (midi !== undefined) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onNotePlay]);

  // ─── 指针事件（支持点击 + 拖拽滑奏） ───
  const getMidiFromPointer = useCallback((e: React.PointerEvent<HTMLDivElement>): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top;

    // 先检查黑键（在上层）
    for (const key of ALL_KEYS) {
      if (!key.isBlack) continue;
      const whiteIndex = getWhiteKeyIndex(key.midi);
      const whiteKeyWidth = rect.width / TOTAL_WHITE_KEYS;
      const blackLeft = (whiteIndex * whiteKeyWidth) + whiteKeyWidth * 0.65;
      const blackWidth = whiteKeyWidth * 0.6;
      const blackHeight = rect.height * 0.62;
      if (x >= blackLeft && x <= blackLeft + blackWidth && y <= blackHeight) {
        return key.midi;
      }
    }
    // 再检查白键
    const whiteKeyWidth = rect.width / TOTAL_WHITE_KEYS;
    for (const key of ALL_KEYS) {
      if (key.isBlack) continue;
      const whiteIndex = getWhiteKeyIndex(key.midi);
      const left = whiteIndex * whiteKeyWidth;
      if (x >= left && x <= left + whiteKeyWidth) {
        return key.midi;
      }
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      pointerDownRef.current = true;
      const midi = getMidiFromPointer(e);
      if (midi !== null) {
        lastPlayedRef.current = midi;
        setPressedKeys((prev) => new Set(prev).add(midi));
        onNotePlay(midi);
      }
    },
    [getMidiFromPointer, onNotePlay]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDownRef.current) return;
      const midi = getMidiFromPointer(e);
      if (midi !== null && midi !== lastPlayedRef.current) {
        // 释放上一个键
        if (lastPlayedRef.current !== null) {
          setPressedKeys((prev) => {
            const next = new Set(prev);
            next.delete(lastPlayedRef.current!);
            return next;
          });
        }
        lastPlayedRef.current = midi;
        setPressedKeys((prev) => new Set(prev).add(midi));
        onNotePlay(midi);
      }
    },
    [getMidiFromPointer, onNotePlay]
  );

  const handlePointerUp = useCallback(() => {
    pointerDownRef.current = false;
    if (lastPlayedRef.current !== null) {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(lastPlayedRef.current!);
        return next;
      });
      lastPlayedRef.current = null;
    }
  }, []);

  // ─── 激活状态计算 ───
  const isActive = (midi: number) => activeNotes.has(midi) || pressedKeys.has(midi);
  const getVelocity = (midi: number): number => {
    if (pressedKeys.has(midi)) return 100; // 键盘/鼠标按压默认力度
    return noteVelocities?.get(midi) ?? 100;
  };

  // ─── 渲染 ───
  const containerWidth = TOTAL_WHITE_KEYS * 24; // 每白键 24px

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ touchAction: "pan-x" }}
    >
      <div className="relative h-full" style={{ width: containerWidth, minWidth: containerWidth }}>
        {/* 白键层 */}
        <div className="flex h-full">
          {ALL_KEYS.filter((k) => !k.isBlack).map((key) => {
            const active = isActive(key.midi);
            const vel = getVelocity(key.midi);
            const opacity = 0.5 + (vel / 127) * 0.5;
            return (
              <div
                key={`w-${key.midi}`}
                className={`
                  relative flex-1 h-full flex flex-col items-center justify-end pb-1
                  border border-gray-300/60 rounded-b-md
                  transition-all duration-75 ease-out
                  ${active
                    ? "bg-[#d25701]/20 border-[#d25701]/50 translate-y-[1px] shadow-inner"
                    : "bg-gradient-to-b from-white to-gray-100 hover:to-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
                  }
                `}
                style={{
                  minWidth: 0,
                  ...(active ? { backgroundColor: `rgba(210, 87, 1, ${opacity * 0.15})` } : {}),
                }}
                title={`${key.noteName}${key.octave} ${key.keyLabel ? `(${key.keyLabel.toUpperCase()})` : ""}`}
                data-testid={`piano-key-${key.noteName}${key.octave}`}
              >
                {/* 激活指示条 */}
                {active && (
                  <div
                    className="absolute top-0 left-1 right-1 h-1 rounded-full"
                    style={{
                      backgroundColor: `rgba(210, 87, 1, ${opacity})`,
                    }}
                  />
                )}
                {/* 键名标签 */}
                <span className={`text-[7px] font-medium select-none leading-none ${active ? "text-[#d25701]" : "text-gray-400"}`}>
                  {key.noteName}
                </span>
                {/* 键盘快捷键标签 */}
                {key.keyLabel && (
                  <span className={`text-[6px] select-none leading-none mt-0.5 ${active ? "text-[#d25701]/70" : "text-gray-300"}`}>
                    {key.keyLabel.toUpperCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 黑键层 */}
        {ALL_KEYS.filter((k) => k.isBlack).map((key) => {
          const whiteIndex = getWhiteKeyIndex(key.midi);
          const left = (whiteIndex / TOTAL_WHITE_KEYS) * 100 + (100 / TOTAL_WHITE_KEYS) * 0.65;
          const active = isActive(key.midi);
          const vel = getVelocity(key.midi);
          const opacity = 0.5 + (vel / 127) * 0.5;
          return (
            <div
              key={`b-${key.midi}`}
              className={`
                absolute top-0 z-10 rounded-b-sm cursor-pointer
                transition-all duration-75 ease-out
                ${active
                  ? "bg-[#d25701] translate-y-[1px] shadow-inner"
                  : "bg-gradient-to-b from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 shadow-[0_3px_6px_rgba(0,0,0,0.3)]"
                }
              `}
              style={{
                width: `${(100 / TOTAL_WHITE_KEYS) * 0.6}%`,
                height: "62%",
                left: `${left}%`,
                ...(active ? { backgroundColor: `rgba(210, 87, 1, ${opacity})` } : {}),
              }}
              title={`${key.noteName}${key.octave} ${key.keyLabel ? `(${key.keyLabel.toUpperCase()})` : ""}`}
              data-testid={`piano-key-${key.noteName}${key.octave}`}
            >
              {/* 黑键上的标签 */}
              {key.keyLabel && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] select-none ${active ? "text-white/90" : "text-gray-500"}`}>
                  {key.keyLabel.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
