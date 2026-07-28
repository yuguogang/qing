'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createOsmdInstance,
  loadAndRender,
  applyAnchorColors,
  setZoom,
  type OsmdConfig,
  DEFAULT_CONFIG,
} from '@/lib/osmd-utils';
import { applySpectrumColors, clearSpectrumColors } from '@/lib/spectrum-colors';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { TimingGrade } from '@/lib/practice-controller';

interface ScoreViewerProps {
  musicXml: string;
  anchorMode?: boolean;
  spectrumMode?: boolean;
  isPlaying?: boolean;
  currentCursorStep?: number;
  totalCursorSteps?: number;
  lastGrade?: TimingGrade | null;
  onOsmdReady?: (osmd: OpenSheetMusicDisplay) => void;
  zoom?: number;
}

export default function ScoreViewer({
  musicXml,
  anchorMode = true,
  spectrumMode = false,
  isPlaying = false,
  currentCursorStep = 0,
  totalCursorSteps = 0,
  lastGrade,
  onOsmdReady,
  zoom = 1,
}: ScoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const config = useMemo<OsmdConfig>(() => ({ ...DEFAULT_CONFIG, anchorMode }), [anchorMode]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrade, setShowGrade] = useState(false);
  const hasAppliedAnchorRef = useRef(false);
  const hasAppliedSpectrumRef = useRef(false);
  const loadSuccessRef = useRef(false);
  const prevZoomRef = useRef(zoom);
  const prevModeRef = useRef({ anchorMode, spectrumMode });

  // 判定动画
  useEffect(() => {
    if (lastGrade && isPlaying) {
      setShowGrade(true);
      const timer = setTimeout(() => setShowGrade(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastGrade, isPlaying]);

  // 初始化 OSMD
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !musicXml) return;

    let cancelled = false;
    hasAppliedAnchorRef.current = false;
    hasAppliedSpectrumRef.current = false;
    loadSuccessRef.current = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        await new Promise(resolve => setTimeout(resolve, 200));

        const container = containerRef.current;
        if (!container || cancelled) return;
        container.innerHTML = '';

        const osmd = createOsmdInstance(container, config);
        osmdRef.current = osmd;

        await loadAndRender(osmd, musicXml, zoom);

        if (osmd.cursor) {
          osmd.cursor.hide();
        }

        loadSuccessRef.current = true;
        console.log('[ScoreViewer init success]', { spectrumMode, anchorMode });

        if (cancelled) return;

        if (onOsmdReady) onOsmdReady(osmd);

        // 等待渲染完成
        await new Promise(resolve => setTimeout(resolve, 800));
        if (cancelled) return;

        // 应用七色谱（需在 render 前设置 noteheadColor）
        if (spectrumMode && osmdRef.current) {
          applySpectrumColors(osmdRef.current);
          hasAppliedSpectrumRef.current = true;
        }

        // 重新渲染以应用七色谱
        if (spectrumMode && osmdRef.current) {
          osmdRef.current.render();
        }

        // 应用锚线颜色（render 后插入 SVG 覆盖线）
        if (anchorMode && osmdRef.current && containerRef.current) {
          requestAnimationFrame(() => {
            if (osmdRef.current && containerRef.current) {
              applyAnchorColors(containerRef.current, config);
              hasAppliedAnchorRef.current = true;
            }
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('[ScoreViewer] Error:', err);
        if (!cancelled) {
          osmdRef.current = null;
          loadSuccessRef.current = false;
          setError(err instanceof Error ? err.message : '乐谱加载失败');
          setLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [musicXml]);

  // 显示模式切换（锚线 / 七色谱）统一处理
  // 先完成 OSMD render，再在下一帧绘制锚线，避免 render 覆盖锚线
  // 仅在 mode 真正变化时触发，避免 loading 变化导致重复 render
  useEffect(() => {
    if (!osmdRef.current || loading || !loadSuccessRef.current) return;
    if (prevModeRef.current.anchorMode === anchorMode && prevModeRef.current.spectrumMode === spectrumMode) return;
    prevModeRef.current = { anchorMode, spectrumMode };

    if (spectrumMode) {
      applySpectrumColors(osmdRef.current);
      hasAppliedSpectrumRef.current = true;
    } else {
      clearSpectrumColors(osmdRef.current);
      hasAppliedSpectrumRef.current = false;
    }

    osmdRef.current.render();

    if (anchorMode && containerRef.current) {
      requestAnimationFrame(() => {
        if (osmdRef.current && containerRef.current) {
          applyAnchorColors(containerRef.current, config);
        }
      });
    }
  }, [anchorMode, spectrumMode, loading, config]);

  // 缩放：使用 OSMD 原生 zoom 重新渲染，避免 CSS transform 导致光标变形
  // 仅在 zoom 值真正变化时触发，避免 loading 变化导致重复 render
  useEffect(() => {
    if (!osmdRef.current || loading) return;
    if (prevZoomRef.current === zoom) return;
    prevZoomRef.current = zoom;
    setZoom(osmdRef.current, zoom);
  }, [zoom, loading]);

  // 监听 OSMD 光标元素：把 height 属性同步到 style.height，防止 Tailwind 覆盖。
  // OSMD 光标是一张 30x1 像素的 PNG，它通过设置 img 的 height 属性来纵向拉伸，
  // 从而形成半透明、带边缘模糊的光标效果。Tailwind 的 img { height: auto }
  // 会覆盖该属性，因此我们需要在元素出现或 height 属性变化时同步到 style.height。
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const syncCursorHeight = (img: HTMLImageElement) => {
      const h = img.getAttribute('height');
      if (h && img.style.height !== `${h}px`) {
        img.style.height = `${h}px`;
      }
    };

    const observer = new MutationObserver((mutations) => {
      let shouldSyncAll = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLImageElement && node.id.startsWith('cursorImg-')) {
              syncCursorHeight(node);
              shouldSyncAll = true;
            }
          }
        } else if (
          mutation.type === 'attributes' &&
          mutation.target instanceof HTMLImageElement &&
          mutation.target.id.startsWith('cursorImg-') &&
          mutation.attributeName === 'height'
        ) {
          syncCursorHeight(mutation.target);
        }
      }
      if (shouldSyncAll) {
        container.querySelectorAll<HTMLImageElement>('img[id^="cursorImg-"]').forEach(syncCursorHeight);
      }
    });

    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['height'] });
    container.querySelectorAll<HTMLImageElement>('img[id^="cursorImg-"]').forEach(syncCursorHeight);

    return () => observer.disconnect();
  }, [musicXml]);

  // 自动滚动：练习时保持当前音符居中
  const scrollToCursor = useCallback(() => {
    if (!containerRef.current || !isPlaying) return;
    const container = containerRef.current;

    // OSMD 原生光标是容器内的 img 元素（id 为 cursorImg-0）
    const cursorEl = container.querySelector<HTMLImageElement>('#cursorImg-0, img[id^="cursorImg-"]');
    if (cursorEl) {
      const cursorRect = cursorEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop + cursorRect.top - containerRect.top - containerRect.height / 2;
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(scrollToCursor, 300);
    return () => clearInterval(interval);
  }, [isPlaying, scrollToCursor]);

  // 判定样式
  const gradeStyles = {
    perfect: { bg: 'bg-yellow-400', text: 'text-yellow-600', label: '完美' },
    good: { bg: 'bg-green-400', text: 'text-green-600', label: '良好' },
    miss: { bg: 'bg-red-400', text: 'text-red-600', label: '偏差' },
  };

  const progressPercent = totalCursorSteps > 0
    ? Math.min((currentCursorStep / totalCursorSteps) * 100, 100)
    : 0;

  return (
    <div className="flex flex-col h-full relative">
      {/* 播放进度条 */}
      {isPlaying && (
        <div className="absolute top-2 left-4 right-4 z-10">
          <div className="flex items-center gap-3 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border mx-auto max-w-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">演奏中</span>
            </div>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {currentCursorStep}/{totalCursorSteps}
            </span>
          </div>
        </div>
      )}

      {/* 判定弹出 */}
      {showGrade && lastGrade && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
          <div className={`${gradeStyles[lastGrade].bg} text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg animate-bounce`}>
            {gradeStyles[lastGrade].label}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">加载乐谱中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-destructive">
            <p className="text-lg font-medium">加载失败</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 乐谱容器 */}
      <div
        ref={containerRef}
        className={`w-full flex-1 osmd-container ${isPlaying ? 'playing' : ''}`}
        style={{
          opacity: loading || error ? 0 : 1,
          transition: 'opacity 0.3s ease',
          overflow: 'auto',
        }}
      />
    </div>
  );
}
