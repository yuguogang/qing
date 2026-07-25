'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableSplitProps {
  topChildren: React.ReactNode;
  bottomChildren: React.ReactNode;
  minTopHeight?: number;
  minBottomHeight?: number;
  defaultSplit?: number; // 0-1, 表示顶部占比
}

export function ResizableSplit({
  topChildren,
  bottomChildren,
  minTopHeight = 200,
  minBottomHeight = 150,
  defaultSplit = 0.7,
}: ResizableSplitProps) {
  const [split, setSplit] = useState(defaultSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const totalHeight = containerRect.height;
    const mouseY = e.clientY - containerRect.top;

    // 计算新的分割比例
    let newSplit = mouseY / totalHeight;

    // 限制范围
    const minTopRatio = minTopHeight / totalHeight;
    const minBottomRatio = minBottomHeight / totalHeight;
    newSplit = Math.max(minTopRatio, Math.min(1 - minBottomRatio, newSplit));

    setSplit(newSplit);
  }, [minTopHeight, minBottomHeight]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      {/* 顶部区域 */}
      <div
        style={{ 
          flex: `0 0 ${split * 100}%`,
          minHeight: `${minTopHeight}px`,
          overflow: 'auto'
        }}
      >
        {topChildren}
      </div>

      {/* 分割线 */}
      <div
        onMouseDown={handleMouseDown}
        className="h-2 bg-border hover:bg-primary/20 cursor-row-resize flex items-center justify-center transition-colors relative flex-shrink-0"
      >
        <div className="w-12 h-0.5 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* 底部区域 */}
      <div
        style={{ 
          flex: `0 0 ${(1 - split) * 100}%`,
          minHeight: `${minBottomHeight}px`,
          overflow: 'auto'
        }}
      >
        {bottomChildren}
      </div>
    </div>
  );
}
