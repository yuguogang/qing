'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createOsmdInstance,
  loadAndRender,
  applyAnchorColors,
  setZoom,
  type OsmdConfig,
  DEFAULT_CONFIG,
} from '@/lib/osmd-utils';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { TimingGrade } from '@/lib/practice-controller';

interface ScoreViewerProps {
  /** MusicXML 内容 */
  musicXml: string;
  /** 初始配置 */
  initialConfig?: Partial<OsmdConfig>;
  /** 是否启用三色锚线模式 */
  anchorMode?: boolean;
  /** 是否正在播放 */
  isPlaying?: boolean;
  /** 当前小节 */
  currentMeasure?: number;
  /** 光标进度 (0-1) */
  cursorProgress?: number;
  /** 上次判定结果 */
  lastGrade?: TimingGrade | null;
}

export default function ScoreViewer({
  musicXml,
  initialConfig,
  anchorMode = true,
  isPlaying = false,
  currentMeasure = 1,
  cursorProgress = 0,
  lastGrade,
}: ScoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [config, setConfig] = useState<OsmdConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showGrade, setShowGrade] = useState(false);

  // 显示判定动画
  useEffect(() => {
    if (lastGrade && isPlaying) {
      setShowGrade(true);
      const timer = setTimeout(() => setShowGrade(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastGrade, isPlaying]);

  // 初始化 OSMD 并加载乐谱
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !musicXml) return;

    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        console.log('[ScoreViewer] Initializing OSMD...');

        await new Promise(resolve => setTimeout(resolve, 200));

        if (osmdRef.current) {
          osmdRef.current = null;
        }

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const osmd = createOsmdInstance(container, config);
        osmdRef.current = osmd;

        console.log('[ScoreViewer] OSMD instance created, loading MusicXML...');

        await loadAndRender(osmd, musicXml, config.zoom);

        console.log('[ScoreViewer] MusicXML loaded and rendered');

        if (cancelled) return;

        const svg = container.querySelector('svg');
        if (svg && config.zoom !== 1) {
          svg.style.transform = `scale(${config.zoom})`;
          svg.style.transformOrigin = 'top left';
        }

        if (config.anchorMode && containerRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          requestAnimationFrame(() => {
            if (containerRef.current) {
              console.log('[ScoreViewer] Calling applyAnchorColors...');
              const anchorResult = applyAnchorColors(containerRef.current, config);
              console.log('[ScoreViewer] Anchor colors applied:', anchorResult);
              
              if (anchorResult) {
                setDebugInfo(`SVG: ${anchorResult.totalElements} elements | Lines: ${anchorResult.horizontalLinesCount}, Staff: ${anchorResult.staffLinesFound}`);
              }
            }
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('[ScoreViewer] Error:', err);
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '乐谱加载失败');
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [musicXml, config.anchorMode]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current || !osmdRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && osmdRef.current) {
          console.log('[ScoreViewer] Container resized:', width, height);
          loadAndRender(osmdRef.current, musicXml, config.zoom).then(() => {
            if (containerRef.current && config.anchorMode) {
              requestAnimationFrame(() => {
                if (containerRef.current) {
                  applyAnchorColors(containerRef.current, config);
                }
              });
            }
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [musicXml, config.anchorMode]);

  // 缩放处理
  const handleZoomChange = useCallback(
    (newZoom: number) => {
      setConfig((prev) => ({ ...prev, zoom: newZoom }));
      if (containerRef.current) {
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          svg.style.transform = `scale(${newZoom})`;
          svg.style.transformOrigin = 'top left';
        }
      }
    },
    [],
  );

  // 锚线模式切换
  const handleAnchorToggle = useCallback(() => {
    setConfig((prev) => {
      const newConfig = { ...prev, anchorMode: !prev.anchorMode };
      if (containerRef.current) {
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          if (newConfig.anchorMode) {
            applyAnchorColors(containerRef.current, newConfig);
          } else {
            const lines = svg.querySelectorAll('line, path');
            lines.forEach((line) => {
              const el = line as SVGElement;
              el.removeAttribute('stroke');
              el.removeAttribute('stroke-width');
            });
          }
        }
      }
      return newConfig;
    });
  }, []);

  // 判定等级对应的样式
  const gradeStyles = {
    perfect: { bg: 'bg-yellow-400', text: 'text-yellow-600', label: '完美' },
    good: { bg: 'bg-green-400', text: 'text-green-600', label: '良好' },
    miss: { bg: 'bg-red-400', text: 'text-red-600', label: '偏差' },
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">三色锚线</span>
          <button
            onClick={handleAnchorToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.anchorMode ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.anchorMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">缩放</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="text-sm text-gray-500 w-12">
            {Math.round(config.zoom * 100)}%
          </span>
        </div>

        {/* 调试信息 */}
        {debugInfo && (
          <div className="ml-auto text-xs text-gray-400 font-mono">
            {debugInfo}
          </div>
        )}
      </div>

      {/* 乐谱显示区域 */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4 relative" style={{ minHeight: '500px' }}>
        {/* 播放进度指示器 */}
        {isPlaying && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">播放中</span>
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${cursorProgress * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                第 {currentMeasure || 1} / 8 小节
              </span>
            </div>
          </div>
        )}

        {/* 判定显示 */}
        {showGrade && lastGrade && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
            <div className={`${gradeStyles[lastGrade].bg} text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg animate-bounce`}>
              {gradeStyles[lastGrade].label}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">正在加载乐谱...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500">
              <p className="text-lg font-medium">加载失败</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="absolute top-2 right-2 bg-yellow-100 border border-yellow-300 rounded px-2 py-1 text-xs font-mono z-20">
            {debugInfo}
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full relative"
          style={{ 
            minHeight: '400px',
            overflow: 'visible',
            opacity: loading || error ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* 移动光标 - 按节拍精确移动 */}
          {isPlaying && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-10"
              style={{
                left: `${cursorProgress * 100}%`,
                transition: 'left 0.05s linear',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
              }}
            >
              {/* 光标顶部三角形 */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-blue-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
