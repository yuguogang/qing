/**
 * 浅雅七色谱 - 按音高（音名）给音符着色
 *
 * 七色映射（基于彩虹色 + 柔和调）：
 * C - 红 #E74C3C
 * D - 橙 #E67E22
 * E - 黄 #F1C40F
 * F - 绿 #2ECC71
 * G - 青 #1ABC9C
 * A - 蓝 #3498DB
 * B - 紫 #9B59B6
 */

import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

export const SPECTRUM_COLORS: Record<string, string> = {
  C: "#E74C3C", // 红
  D: "#E67E22", // 橙
  E: "#F1C40F", // 黄
  F: "#2ECC71", // 绿
  G: "#1ABC9C", // 青
  A: "#3498DB", // 蓝
  B: "#9B59B6", // 紫
};

/** MIDI 音名（C, C#, D, ...） */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 根据 MIDI 音符编号获取音名 */
export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

/** 根据 MIDI 音符编号获取七色谱颜色 */
export function getSpectrumColor(midi: number): string {
  const noteName = midiToNoteName(midi);
  // 提取音名（去掉升降号）
  const baseName = noteName.replace("#", "").replace("b", "");
  return SPECTRUM_COLORS[baseName] || "#333333";
}

/**
 * 给 OSMD 实例应用浅雅七色谱
 * 通过遍历 Sheet 中的音符并设置 NoteheadColor，然后重新渲染
 */
export function applySpectrumColors(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.Sheet) return;

  const measures = osmd.Sheet.SourceMeasures;
  if (!measures) return;

  for (const measure of measures) {
    const containers = measure.VerticalSourceStaffEntryContainers;
    if (!containers) continue;
    for (const container of containers) {
      const entries = container.StaffEntries;
      if (!entries) continue;
      for (const entry of entries) {
        if (!entry) continue;
        const voiceEntries = entry.VoiceEntries;
        if (!voiceEntries) continue;
        for (const voiceEntry of voiceEntries) {
          if (!voiceEntry) continue;
          const notes = voiceEntry.Notes;
          if (!notes) continue;
          for (const note of notes) {
            if (note.isRest()) continue;
            const pitch = note.Pitch;
            if (!pitch) continue;
            try {
              const midi = (pitch.Octave + 1) * 12 + pitch.FundamentalNote;
              note.NoteheadColor = getSpectrumColor(midi);
            } catch {
              // 某些音符可能无法设置颜色，忽略
            }
          }
        }
      }
    }
  }

  // 注意：调用方需要在设置完颜色后手动调用 osmd.render()
}

/**
 * 清除七色谱着色（基于 OSMD 实例）
 */
export function clearSpectrumColors(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.Sheet) return;

  const measures = osmd.Sheet.SourceMeasures;
  if (!measures) return;

  for (const measure of measures) {
    const containers = measure.VerticalSourceStaffEntryContainers;
    if (!containers) continue;
    for (const container of containers) {
      const entries = container.StaffEntries;
      if (!entries) continue;
      for (const entry of entries) {
        if (!entry) continue;
        const voiceEntries = entry.VoiceEntries;
        if (!voiceEntries) continue;
        for (const voiceEntry of voiceEntries) {
          if (!voiceEntry) continue;
          const notes = voiceEntry.Notes;
          if (!notes) continue;
          for (const note of notes) {
            if (note.NoteheadColor) {
              note.NoteheadColor = "";
            }
          }
        }
      }
    }
  }

  osmd.render();
}
