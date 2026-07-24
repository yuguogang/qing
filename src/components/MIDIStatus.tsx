"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bluetooth,
  BluetoothConnected,
  Music2,
  AlertCircle,
} from "lucide-react";
import type { MIDIConnection } from "@/hooks/useMIDI";

interface MIDIStatusProps {
  connections: MIDIConnection[];
  isSupported: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function MIDIStatus({
  connections,
  isSupported,
  onConnect,
  onDisconnect,
}: MIDIStatusProps) {
  const isConnected = connections.some((c) => c.connected);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>浏览器不支持 Web MIDI API</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isConnected ? (
        <>
          <div className="flex items-center gap-2">
            <BluetoothConnected className="h-4 w-4 text-green-500" />
            <Badge variant="secondary" className="gap-1">
              <Music2 className="h-3 w-3" />
              {connections[0].name}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
          >
            断开
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          className="gap-2"
        >
          <Bluetooth className="h-4 w-4" />
          连接 MIDI 设备
        </Button>
      )}
    </div>
  );
}
