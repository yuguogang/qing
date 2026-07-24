"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface MIDINoteEvent {
  noteNumber: number;
  velocity: number;
  timestamp: number;
  channel: number;
}

export interface MIDIConnection {
  name: string;
  manufacturer: string;
  connected: boolean;
}

interface UseMIDIOptions {
  onNoteOn?: (event: MIDINoteEvent) => void;
  onNoteOff?: (event: MIDINoteEvent) => void;
}

export function useMIDI(options: UseMIDIOptions = {}) {
  const { onNoteOn, onNoteOff } = options;
  const [connections, setConnections] = useState<MIDIConnection[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const activeInputsRef = useRef<Map<string, MIDIInput>>(new Map());

  // Check MIDI support
  useEffect(() => {
    if (typeof navigator !== "undefined" && "requestMIDIAccess" in navigator) {
      setIsSupported(true);
    }
  }, []);

  // Handle MIDI messages
  const handleMIDIMessage = useCallback(
    (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data.length < 3) return;

      const status = data[0];
      const noteNumber = data[1];
      const velocity = data[2];
      const channel = status & 0x0f;
      const command = status & 0xf0;

      const midiEvent: MIDINoteEvent = {
        noteNumber,
        velocity,
        timestamp: event.timeStamp,
        channel,
      };

      if (command === 0x90 && velocity > 0) {
        // Note On
        onNoteOn?.(midiEvent);
      } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        // Note Off
        onNoteOff?.(midiEvent);
      }
    },
    [onNoteOn, onNoteOff]
  );

  // Connect to MIDI devices
  const connect = useCallback(async () => {
    if (!isSupported) return;

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccessRef.current = midiAccess;

      const updateConnections = () => {
        const inputs: MIDIConnection[] = [];
        midiAccess.inputs.forEach((input) => {
          inputs.push({
            name: input.name || "Unknown Device",
            manufacturer: input.manufacturer || "Unknown",
            connected: input.connection === "open",
          });

          if (!activeInputsRef.current.has(input.id)) {
            input.onmidimessage = handleMIDIMessage;
            activeInputsRef.current.set(input.id, input);
          }
        });
        setConnections(inputs);
      };

      updateConnections();
      midiAccess.onstatechange = updateConnections;
    } catch (error) {
      console.error("MIDI connection failed:", error);
    }
  }, [isSupported, handleMIDIMessage]);

  // Disconnect MIDI
  const disconnect = useCallback(() => {
    activeInputsRef.current.forEach((input) => {
      input.onmidimessage = null;
    });
    activeInputsRef.current.clear();
    midiAccessRef.current = null;
    setConnections([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connections,
    isSupported,
    connect,
    disconnect,
  };
}
