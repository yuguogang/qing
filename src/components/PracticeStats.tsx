"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Target, TrendingUp, Zap, Activity } from "lucide-react";
import type { PracticeStats, TimingGrade, PracticeMode } from "@/hooks/use-practice";

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

// 新的练习统计面板组件
interface PracticeStatsPanelProps {
  stats: PracticeStats;
  lastGrade: TimingGrade | null;
  lastDelta: number;
  isPlaying: boolean;
  mode: PracticeMode;
}

export function PracticeStatsPanel({
  stats,
  lastGrade,
  lastDelta,
  isPlaying,
  mode,
}: PracticeStatsPanelProps) {
  const gradeColors = {
    perfect: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    good: 'text-green-500 bg-green-50 border-green-200',
    miss: 'text-red-500 bg-red-50 border-red-200',
  };

  const gradeLabels = {
    perfect: '完美',
    good: '良好',
    miss: '偏差',
  };

  return (
    <div className="space-y-3">
      {/* 模式显示 */}
      <Badge variant={mode === 'follow' ? 'default' : 'secondary'} className="w-full justify-center">
        {mode === 'follow' ? '跟弹模式' : '视奏模式'}
      </Badge>

      {/* 状态显示 */}
      {isPlaying && (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-muted-foreground">练习中...</span>
        </div>
      )}

      {/* 上次判定 */}
      {lastGrade && (
        <Card className={gradeColors[lastGrade]}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{gradeLabels[lastGrade]}</p>
            <p className="text-xs">
              {lastDelta > 0 ? '+' : ''}{lastDelta}ms
            </p>
          </CardContent>
        </Card>
      )}

      {/* 连击数 */}
      <Card>
        <CardContent className="p-3 text-center">
          <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{stats.combo}</p>
          <p className="text-xs text-muted-foreground">当前连击</p>
        </CardContent>
      </Card>

      {/* 统计网格 */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-600">{stats.perfectCount}</p>
            <p className="text-xs text-muted-foreground">完美</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{stats.goodCount}</p>
            <p className="text-xs text-muted-foreground">良好</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{stats.missCount}</p>
            <p className="text-xs text-muted-foreground">偏差</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{stats.maxCombo}</p>
            <p className="text-xs text-muted-foreground">最高连击</p>
          </CardContent>
        </Card>
      </div>

      {/* 准确率 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">准确率</span>
            </div>
            <span className="text-lg font-bold">{stats.accuracy}%</span>
          </div>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 进度 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>进度</span>
          <span>{stats.hitNotes} / {stats.totalNotes}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${stats.totalNotes > 0 ? (stats.hitNotes / stats.totalNotes) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
