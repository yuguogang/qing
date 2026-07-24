import type { MIDINoteEvent } from "@/hooks/useMIDI";

export interface ScoreNote {
  midiNumber: number;
  step: string;
  octave: number;
  duration: number;
  measure: number;
  voice: number;
  staff: number;
  isRest: boolean;
}

export interface NoteMatchResult {
  isCorrect: boolean;
  expectedNote: ScoreNote | null;
  playedNote: MIDINoteEvent | null;
  distance: number; // semitones difference
}

/**
 * Convert MIDI note number to note name
 */
export function midiToNoteName(midiNumber: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = noteNames[midiNumber % 12];
  return `${noteName}${octave}`;
}

/**
 * Calculate semitone distance between two MIDI notes
 */
export function getNoteDistance(note1: number, note2: number): number {
  return Math.abs(note1 - note2);
}

/**
 * Check if a played note matches the expected note
 * Allows for small timing tolerance
 */
export function matchNote(
  playedEvent: MIDINoteEvent,
  expectedNote: ScoreNote,
  tolerance: number = 0
): NoteMatchResult {
  const distance = getNoteDistance(playedEvent.noteNumber, expectedNote.midiNumber);
  const isCorrect = distance <= tolerance;

  return {
    isCorrect,
    expectedNote,
    playedNote: playedEvent,
    distance,
  };
}

/**
 * Find the closest note in the score to the played note
 */
export function findClosestNote(
  playedEvent: MIDINoteEvent,
  scoreNotes: ScoreNote[],
  currentIndex: number
): { note: ScoreNote; index: number; distance: number } | null {
  // Look ahead a few notes for timing tolerance
  const lookAhead = 5;
  const candidates = scoreNotes.slice(currentIndex, currentIndex + lookAhead);

  let closest: { note: ScoreNote; index: number; distance: number } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const note = candidates[i];
    if (note.isRest) continue;

    const distance = getNoteDistance(playedEvent.noteNumber, note.midiNumber);

    if (!closest || distance < closest.distance) {
      closest = {
        note,
        index: currentIndex + i,
        distance,
      };
    }
  }

  return closest;
}

/**
 * Calculate practice accuracy percentage
 */
export function calculateAccuracy(
  correctNotes: number,
  totalNotes: number
): number {
  if (totalNotes === 0) return 0;
  return Math.round((correctNotes / totalNotes) * 100);
}
