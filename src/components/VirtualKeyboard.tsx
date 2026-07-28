"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 白键 MIDI 映射 (A-K 键，从 C4=60 开始)
const WHITE_KEY_MAP: Record<string, number> = {
  a: 60, // C4
  s: 62, // D4
  d: 64, // E4
  f: 65, // F4
  g: 67, // G4
  h: 69, // A4
  j: 71, // B4
  k: 72, // C5
};

// 黑键 MIDI 映射 (W-P 键)
const BLACK_KEY_MAP: Record<string, number> = {
  w: 61, // C#4
  e: 63, // D#4
  t: 66, // F#4
  y: 68, // G#4
  u: 70, // A#4
  p: 73, // C#5
};

// 键盘布局：白键 + 黑键
interface KeyDef {
  midi: number;
  isBlack: boolean;
  label: string;
  keyLabel: string;
}

const PIANO_KEYS: KeyDef[] = [
  { midi: 60, isBlack: false, label: "C4", keyLabel: "A" },
  { midi: 61, isBlack: true, label: "C#4", keyLabel: "W" },
  { midi: 62, isBlack: false, label: "D4", keyLabel: "S" },
  { midi: 63, isBlack: true, label: "D#4", keyLabel: "E" },
  { midi: 64, isBlack: false, label: "E4", keyLabel: "D" },
  { midi: 65, isBlack: false, label: "F4", keyLabel: "F" },
  { midi: 66, isBlack: true, label: "F#4", keyLabel: "T" },
  { midi: 67, isBlack: false, label: "G4", keyLabel: "G" },
  { midi: 68, isBlack: true, label: "G#4", keyLabel: "Y" },
  { midi: 69, isBlack: false, label: "A4", keyLabel: "H" },
  { midi: 70, isBlack: true, label: "A#4", keyLabel: "U" },
  { midi: 71, isBlack: false, label: "B4", keyLabel: "J" },
  { midi: 72, isBlack: false, label: "C5", keyLabel: "K" },
  { midi: 73, isBlack: true, label: "C#5", keyLabel: "P" },
];

interface VirtualKeyboardProps {
  onNotePlay: (midiNote: number) => void;
  activeNotes: Set<number>;
}

export function VirtualKeyboard({ onNotePlay, activeNotes }: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      const midi = WHITE_KEY_MAP[key] ?? BLACK_KEY_MAP[key];
      if (midi !== undefined) {
        e.preventDefault();
        setPressedKeys((prev) => new Set(prev).add(midi));
        onNotePlay(midi);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const midi = WHITE_KEY_MAP[key] ?? BLACK_KEY_MAP[key];
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

  // 鼠标点击
  const handleMouseDown = useCallback(
    (midi: number) => {
      setPressedKeys((prev) => new Set(prev).add(midi));
      onNotePlay(midi);
    },
    [onNotePlay]
  );

  const handleMouseUp = useCallback((midi: number) => {
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  console.log('[VirtualKeyboard] activeNotes', Array.from(activeNotes));
  const isActive = (midi: number) => activeNotes.has(midi) || pressedKeys.has(midi);

  return (
    <div className="flex h-full items-end relative" style={{ paddingLeft: 2, paddingRight: 2 }}>
      {PIANO_KEYS.map((key) => {
        if (key.isBlack) {
          return (
            <div
              key={key.midi}
              onMouseDown={() => handleMouseDown(key.midi)}
              onMouseUp={() => handleMouseUp(key.midi)}
              onMouseLeave={() => handleMouseUp(key.midi)}
              className={`absolute z-10 rounded-b cursor-pointer transition-colors duration-75 ${
                isActive(key.midi)
                  ? "bg-primary"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
              style={{
                width: "5.5%",
                height: "62%",
                left: `${PIANO_KEYS.findIndex((k) => k.midi === key.midi) * (100 / PIANO_KEYS.length) + (100 / PIANO_KEYS.length) * 0.65}%`,
              }}
              title={`${key.label} (${key.keyLabel})`}
              data-testid={`piano-key-${key.label}`}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 select-none">
                {key.keyLabel}
              </span>
            </div>
          );
        }
        return (
          <div
            key={key.midi}
            onMouseDown={() => handleMouseDown(key.midi)}
            onMouseUp={() => handleMouseUp(key.midi)}
            onMouseLeave={() => handleMouseUp(key.midi)}
            className={`flex-1 border border-gray-300 rounded-b cursor-pointer transition-colors duration-75 flex items-end justify-center pb-1 ${
              isActive(key.midi)
                ? "bg-primary/30 border-primary"
                : "bg-white hover:bg-gray-100"
            }`}
            style={{ minWidth: 0 }}
            title={`${key.label} (${key.keyLabel})`}
            data-testid={`piano-key-${key.label}`}
          >
            <span className="text-[9px] text-gray-400 select-none">{key.keyLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
