'use client';

import { useState } from 'react';
import ScoreViewer from '@/components/ScoreViewer';
import beyerNo1 from '@/lib/scores/beyer-no1';

const SAMPLE_SCORES = [
  { id: 'beyer-1', name: '拜厄 No.1', content: beyerNo1 },
];

export default function Home() {
  const [selectedScore, setSelectedScore] = useState(SAMPLE_SCORES[0]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">清</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">清谱</h1>
            <span className="text-xs text-gray-400 ml-2">三色锚线谱交互式练琴</span>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedScore.id}
              onChange={(e) => {
                const score = SAMPLE_SCORES.find((s) => s.id === e.target.value);
                if (score) setSelectedScore(score);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {SAMPLE_SCORES.map((score) => (
                <option key={score.id} value={score.id}>
                  {score.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 overflow-hidden">
        <ScoreViewer musicXml={selectedScore.content} />
      </main>

      {/* 底部信息 */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2 text-center">
        <p className="text-xs text-gray-400">
          三色锚线识谱法 by 郑锡勇 | 清谱 - 练琴即识谱
        </p>
      </footer>
    </div>
  );
}
