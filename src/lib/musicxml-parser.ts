/**
 * MusicXML 音符解析器
 * 从 MusicXML 中提取音符时序信息，用于伴奏播放
 */

import type { PianoNote } from './audio-engine';

interface MusicXMLNote {
  pitch: {
    step: string; // C, D, E, F, G, A, B
    octave: number;
    alter?: number; // 升降号
  };
  duration: number;
  voice?: number; // 1=右手，2=左手
}

// 音符名称转 MIDI 编号
function noteToMidi(step: string, octave: number, alter: number = 0): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  const baseMidi = (octave + 1) * 12 + noteMap[step] + alter;
  return baseMidi;
}

// 解析 MusicXML 字符串，提取音符序列
export function parseMusicXMLNotes(xmlString: string): PianoNote[] {
  const notes: PianoNote[] = [];

  // 使用 DOMParser 解析 XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // 查找所有音符
  const noteElements = doc.querySelectorAll('note');
  let currentTime = 0;
  const division = parseInt(doc.querySelector('divisions')?.textContent || '1');

  noteElements.forEach((noteEl) => {
    // 跳过休止符
    if (noteEl.querySelector('rest')) return;

    const pitch = noteEl.querySelector('pitch');
    if (!pitch) return;

    const step = pitch.querySelector('step')?.textContent || 'C';
    const octave = parseInt(pitch.querySelector('octave')?.textContent || '4');
    const alter = parseInt(pitch.querySelector('alter')?.textContent || '0');
    const duration = parseInt(noteEl.querySelector('duration')?.textContent || '1');
    const voice = parseInt(noteEl.querySelector('voice')?.textContent || '1');

    // 计算 MIDI 编号
    const midi = noteToMidi(step, octave, alter);

    // 计算时长（秒）- 假设 4 分音符 = 1 拍，BPM = 80
    const bpm = 80;
    const beatDuration = 60 / bpm;
    const noteDuration = (duration / division) * beatDuration;

    notes.push({
      midi,
      startTime: currentTime,
      duration: noteDuration,
      velocity: 0.8,
    });

    currentTime += noteDuration;
  });

  return notes;
}

// 分离左右手音符
export function separateHands(notes: PianoNote[], xmlString: string): { right: PianoNote[]; left: PianoNote[] } {
  const right: PianoNote[] = [];
  const left: PianoNote[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const noteElements = doc.querySelectorAll('note');

  let noteIndex = 0;
  noteElements.forEach((noteEl) => {
    if (noteEl.querySelector('rest')) return;
    if (!noteEl.querySelector('pitch')) return;

    const voice = parseInt(noteEl.querySelector('voice')?.textContent || '1');
    const note = notes[noteIndex];

    if (note) {
      if (voice === 1) {
        right.push(note);
      } else {
        left.push(note);
      }
    }
    noteIndex++;
  });

  return { right, left };
}
