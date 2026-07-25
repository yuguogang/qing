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
}

export default function ScoreViewer({
  musicXml,
  initialConfig,
  anchorMode = true,
  isPlaying = false,
  currentMeasure = 1,
}: ScoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [config, setConfig] = useState<OsmdConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化 OSMD 并加载乐谱
  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !musicXml) return;

    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        console.log('[ScoreViewer] Initializing OSMD...');

        // 等待 DOM 完全就绪
        await new Promise(resolve => setTimeout(resolve, 100));

        // 清理旧实例
        if (osmdRef.current) {
          osmdRef.current = null;
        }

        // 清空容器
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        // 创建 OSMD 实例
        const osmd = createOsmdInstance(container, config);
        osmdRef.current = osmd;

        console.log('[ScoreViewer] OSMD instance created, loading MusicXML...');

        // 加载并渲染
        await loadAndRender(osmd, musicXml, config.zoom);

        console.log('[ScoreViewer] MusicXML loaded and rendered');

        if (cancelled) return;

        // 应用 CSS 缩放
        const svg = container.querySelector('svg');
        if (svg && config.zoom !== 1) {
          svg.style.transform = `scale(${config.zoom})`;
          svg.style.transformOrigin = 'top left';
        }

        // 应用三色锚线
        if (config.anchorMode && containerRef.current) {
          // 等待 SVG 渲染完成
          requestAnimationFrame(() => {
            if (containerRef.current) {
              applyAnchorColors(containerRef.current, config);
              console.log('[ScoreViewer] Anchor colors applied');
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

  // 监听容器尺寸变化，自动重新渲染
  useEffect(() => {
    if (!containerRef.current || !osmdRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // 只有当尺寸大于 0 时才重新渲染
        if (width > 0 && height > 0 && osmdRef.current) {
          console.log('[ScoreViewer] Container resized:', width, height);
          // 重新渲染以适应新尺寸
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

  // 缩放处理 - 使用 CSS transform 实现实时缩放
  const handleZoomChange = useCallback(
    (newZoom: number) => {
      setConfig((prev) => ({ ...prev, zoom: newZoom }));
      // 使用 CSS transform 实现即时缩放反馈
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
        // 重新渲染以应用/移除锚线颜色
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          if (newConfig.anchorMode) {
            applyAnchorColors(containerRef.current, newConfig);
          } else {
            // 移除所有锚线颜色，恢复默认
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
      </div>

      {/* 乐谱显示区域 */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4" style={{ minHeight: '500px' }}>
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

        <div
          ref={containerRef}
          className="w-full"
          style={{ 
            display: loading || error ? 'none' : 'block', 
            minHeight: '400px',
            overflow: 'visible'
          }}
        />
      </div>
    </div>
  );
}
