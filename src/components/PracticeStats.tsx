"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Target, TrendingUp } from "lucide-react";

interface PracticeStatsProps {
  correctNotes: number;
  wrongNotes: number;
  totalNotes: number;
  accuracy: number;
  lastPlayedNote: string | null;
  isCorrect: boolean | null;
}

export function PracticeStats({
  correctNotes,
  wrongNotes,
  totalNotes,
  accuracy,
  lastPlayedNote,
  isCorrect,
}: PracticeStatsProps) {
  return (
    <div className="space-y-3">
      {/* Last Note Feedback */}
      {lastPlayedNote && (
        <Card className={isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="p-3 flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isCorrect ? "正确！" : "再试试"}
              </p>
              <p className="text-xs text-muted-foreground">
                演奏音符：{lastPlayedNote}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{correctNotes}</p>
            <p className="text-xs text-muted-foreground">正确</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{wrongNotes}</p>
            <p className="text-xs text-muted-foreground">错误</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Target className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">准确率</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalNotes > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>练习进度</span>
            <span>{totalNotes} 个音符</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min((totalNotes / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
