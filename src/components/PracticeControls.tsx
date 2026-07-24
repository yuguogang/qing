"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Music,
} from "lucide-react";

interface PracticeControlsProps {
  isPlaying: boolean;
  tempo: number;
  volume: number;
  currentMeasure: number;
  totalMeasures: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTempoChange: (tempo: number) => void;
  onVolumeChange: (volume: number) => void;
  onMeasureChange?: (measure: number) => void;
}

export function PracticeControls({
  isPlaying,
  tempo,
  volume,
  currentMeasure,
  totalMeasures,
  onPlay,
  onPause,
  onRestart,
  onTempoChange,
  onVolumeChange,
  onMeasureChange,
}: PracticeControlsProps) {
  return (
    <div className="border-t bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRestart}
            title="重新开始"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onMeasureChange?.(currentMeasure + 1)}
            title="下一小节"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Measure Display */}
        <div className="flex items-center gap-2 text-sm">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">
            第 {currentMeasure} / {totalMeasures} 小节
          </span>
        </div>

        {/* Tempo Control */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            速度
          </span>
          <Slider
            value={[tempo]}
            min={40}
            max={200}
            step={5}
            onValueChange={(value) => onTempoChange(value[0])}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{tempo} BPM</span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={(value) => onVolumeChange(value[0])}
            className="flex-1"
          />
          <span className="text-sm font-mono w-10 text-right">{volume}%</span>
        </div>
      </div>
    </div>
  );
}
