/**
 * MusicXML 音符解析器
 * 从 MusicXML 中提取音符时序信息，用于伴奏播放与光标同步
 *
 * 正确性改进：
 * - 按 <measure>、<voice>、<backup>/<forward>/<chord> 计算绝对开始时间
 * - 和弦内多个音符共享同一 startTime
 * - 多个声部（如钢琴左右手）可以并行发声
 */

import type { PianoNote } from './audio-engine';

// 默认 BPM，与 PracticeController 默认一致
const DEFAULT_BPM = 80;

// 音符名称转 MIDI 编号
function noteToMidi(step: string, octave: number, alter: number = 0): number {
  const noteMap: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const baseMidi = (octave + 1) * 12 + noteMap[step] + alter;
  return baseMidi;
}

// 解析 MusicXML 字符串，提取音符序列
export function parseMusicXMLNotes(xmlString: string): PianoNote[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const division = parseInt(doc.querySelector('divisions')?.textContent || '1', 10) || 1;
  const beatDuration = 60 / DEFAULT_BPM;

  const notes: PianoNote[] = [];

  const measures = doc.querySelectorAll('measure');
  let measureOffset = 0; // 当前小节起始时间（拍）

  measures.forEach((measure) => {
    // 每个 voice 独立维护当前时间（拍）
    const voiceTimes: Record<number, number> = {};
    const lastChordStart: Record<number, number> = {};
    let currentVoice = 1;

    // 获取或初始化 voice 时间
    const getVoiceTime = (voice: number): number => {
      if (!(voice in voiceTimes)) {
        voiceTimes[voice] = 0;
      }
      return voiceTimes[voice];
    };

    measure.childNodes.forEach((node) => {
      if (!(node instanceof Element)) return;

      if (node.tagName === 'backup') {
        const duration = parseInt(node.querySelector('duration')?.textContent || '0', 10);
        if (duration > 0) {
          // backup 让所有 voice 的时间统一回退（音乐时间回退语义）
          Object.keys(voiceTimes).forEach((key) => {
            const v = Number(key);
            voiceTimes[v] = Math.max(0, voiceTimes[v] - duration / division);
          });
        }
        return;
      }

      if (node.tagName === 'forward') {
        const duration = parseInt(node.querySelector('duration')?.textContent || '0', 10);
        if (duration > 0) {
          voiceTimes[currentVoice] = getVoiceTime(currentVoice) + duration / division;
        }
        return;
      }

      if (node.tagName !== 'note') return;

      // 休止符只推进时间，不产出音符
      if (node.querySelector('rest')) {
        const voice = parseInt(node.querySelector('voice')?.textContent || String(currentVoice), 10);
        const duration = parseInt(node.querySelector('duration')?.textContent || '0', 10);
        if (duration > 0) {
          voiceTimes[voice] = getVoiceTime(voice) + duration / division;
          currentVoice = voice;
        }
        return;
      }

      const pitch = node.querySelector('pitch');
      if (!pitch) return;

      const step = pitch.querySelector('step')?.textContent || 'C';
      const octave = parseInt(pitch.querySelector('octave')?.textContent || '4', 10);
      const alter = parseInt(pitch.querySelector('alter')?.textContent || '0', 10);
      const duration = parseInt(node.querySelector('duration')?.textContent || '1', 10);
      const voice = parseInt(node.querySelector('voice')?.textContent || String(currentVoice), 10);
      const isChord = node.querySelector('chord') !== null;

      const midi = noteToMidi(step, octave, alter);
      const startInBeats = isChord
        ? lastChordStart[voice] ?? getVoiceTime(voice)
        : getVoiceTime(voice);

      const noteDurationInBeats = duration / division;

      notes.push({
        midi,
        startTime: (measureOffset + startInBeats) * beatDuration,
        duration: noteDurationInBeats * beatDuration,
        velocity: 0.8,
      });

      if (isChord) {
        // 和弦音符不推进时间
        lastChordStart[voice] = startInBeats;
      } else {
        voiceTimes[voice] = startInBeats + noteDurationInBeats;
        lastChordStart[voice] = startInBeats;
      }
      currentVoice = voice;
    });

    // 小节结束后，offset 推进到下一小节起点
    const measureDuration = Object.values(voiceTimes).reduce((max, t) => Math.max(max, t), 0);
    measureOffset += measureDuration;
  });

  // 按 startTime 排序，方便后续统一处理
  notes.sort((a, b) => a.startTime - b.startTime || a.midi - b.midi);
  return notes;
}

// 分离左右手音符（基于 voice 启发式：voice 1 为右手，其余为左手）
export function separateHands(notes: PianoNote[], xmlString: string): { right: PianoNote[]; left: PianoNote[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const noteElements = doc.querySelectorAll('note');

  const right: PianoNote[] = [];
  const left: PianoNote[] = [];

  let noteIndex = 0;
  noteElements.forEach((noteEl) => {
    if (noteEl.querySelector('rest')) return;
    if (!noteEl.querySelector('pitch')) return;

    const voice = parseInt(noteEl.querySelector('voice')?.textContent || '1', 10);
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
