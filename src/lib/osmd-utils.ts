/**
 * 清谱 - OSMD 乐谱渲染工具
 *
 * 基于 OpenSheetMusicDisplay 引擎，实现三色锚线五线谱渲染。
 * 核心功能：加载 MusicXML → 渲染五线谱 → 三色锚线着色 → 光标移动
 */

import { OpenSheetMusicDisplay, Note } from 'opensheetmusicdisplay';

// 三色锚线配色方案
export const ANCHOR_COLORS = {
  // 第三线（中央C所在行）- 暖红色
  middleLine: '#E74C3C',
  // 上加一线（高音谱表上方）- 蓝色
  upperLedger: '#3498DB',
  // 下加一线（低音谱表下方）- 绿色
  lowerLedger: '#27AE60',
} as const;

export type AnchorColorKey = keyof typeof ANCHOR_COLORS;

/**
 * OSMD 渲染配置
 */
export interface OsmdConfig {
  /** 是否启用三色锚线模式 */
  anchorMode: boolean;
  /** 是否启用浅雅七色谱模式 */
  rainbowMode: boolean;
  /** 谱面缩放比例 */
  zoom: number;
}

export const DEFAULT_CONFIG: OsmdConfig = {
  anchorMode: true,
  rainbowMode: false,
  zoom: 1.0,
};

/**
 * 创建 OSMD 实例
 */
export function createOsmdInstance(
  container: HTMLElement,
  config: OsmdConfig = DEFAULT_CONFIG,
): OpenSheetMusicDisplay {
  const osmd = new OpenSheetMusicDisplay(container, {
    autoResize: true,
    backend: 'svg',
    drawingParameters: 'compacttight',
    drawTitle: true,
    drawSubtitle: true,
    drawComposer: true,
    drawPartNames: true,
    newPageFromXML: false,
    pageFormat: 'A4',
    disableCursor: false,
    followCursor: true,
    cursorsOptions: [{
      follow: true,
      type: 0,
      color: '#22C55E',
      alpha: 0.9,
    }],
  });

  return osmd;
}

/**
 * 加载 MusicXML 并渲染
 */
export async function loadAndRender(
  osmd: OpenSheetMusicDisplay,
  musicXmlContent: string,
  zoom: number = 1.0,
): Promise<void> {
  // 设置缩放比例（必须在 load 之前）
  osmd.Zoom = zoom * 100; // OSMD 使用百分比
  await osmd.load(musicXmlContent);
  osmd.render();
}

/**
 * 解析 SVG path 的 d 属性坐标
 * 支持 "M50 189.5L358 189.5" 或 "M50 189.5 L358 189.5"
 */
function parseLineCoords(d: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const match = d.match(/M\s*([\d.]+)\s+([\d.]+)\s*L\s*([\d.]+)\s+([\d.]+)/);
  if (match) {
    return {
      x1: parseFloat(match[1]),
      y1: parseFloat(match[2]),
      x2: parseFloat(match[3]),
      y2: parseFloat(match[4]),
    };
  }
  return null;
}

/**
 * 应用三色锚线着色（基于 .vf-measure 精确扫描）
 *
 * 参考 /Users/ygg/vs/ai/osmd/RawJavascript-usage-example/index.html 中的锚线实现：
 * - 第三线（正中间）：红色实线
 * - 上加一线（第五线上方一个 spacing）：蓝色实线
 * - 下加一线（第一线下方一个 spacing）：绿色实线
 *
 * 通过 OSMD 渲染后生成的 .vf-measure 内部 path[stroke-width="1"] 定位五线谱线，
 * 解析 d 属性获得精确坐标，不再依赖 bbox 启发式扫描。
 */
export function applyAnchorColors(
  container: HTMLElement,
  config: OsmdConfig,
): {
  totalElements: number;
  staffLinesFound: number;
  anchorLinesApplied: number;
} | null {
  if (!config.anchorMode) return null;

  const svg = container.querySelector('svg');
  if (!svg) {
    console.log('[Anchor] No SVG found');
    return null;
  }

  // 清除旧锚线
  svg.querySelectorAll('[data-anchor-line]').forEach((el) => el.remove());

  const measures = svg.querySelectorAll('.vf-measure');
  if (!measures.length) {
    console.warn('[Anchor] No .vf-measure elements found');
    return null;
  }

  // 颜色顺序：下加一线（绿）、第三线（红）、上加一线（蓝）
  const ANCHOR_LINE_COLORS = [
    ANCHOR_COLORS.lowerLedger,
    ANCHOR_COLORS.middleLine,
    ANCHOR_COLORS.upperLedger,
  ];
  const svgNS = 'http://www.w3.org/2000/svg';
  let staffLinesFound = 0;
  let anchorLinesApplied = 0;

  measures.forEach((measure, idx) => {
    // 直接子 path[stroke-width="1"]，过滤出水平谱线
    const allPaths = measure.querySelectorAll(':scope > path[stroke-width="1"]');
    const staffLines = Array.from(allPaths).filter((p) => {
      const d = p.getAttribute('d');
      return d && d.startsWith('M') && d.includes('L');
    }).slice(0, 5);

    if (staffLines.length !== 5) {
      console.warn(`[Anchor] Measure ${idx + 1} found ${staffLines.length} staff lines, skipping`);
      return;
    }

    staffLinesFound += 5;

    // 解析五条线的 Y 坐标
    const yPositions = staffLines.map((line) => {
      const d = line.getAttribute('d');
      if (!d) return null;
      const coords = parseLineCoords(d);
      return coords ? coords.y1 : null;
    }).filter((y): y is number => y !== null);

    if (yPositions.length !== 5) return;

    yPositions.sort((a, b) => a - b);
    const spacing = yPositions[1] - yPositions[0];

    // 获取左右边界
    const firstLine = staffLines[0];
    const dFirst = firstLine.getAttribute('d');
    if (!dFirst) return;
    const coords = parseLineCoords(dFirst);
    if (!coords) return;
    const { x1, x2 } = coords;

    // 三条锚线 Y 坐标
    const topLineY = yPositions[0];
    const bottomLineY = yPositions[4];
    const thirdLineY = yPositions[2];
    const belowY = bottomLineY + spacing;
    const aboveY = topLineY - spacing;

    const anchorYPositions = [belowY, thirdLineY, aboveY];

    anchorYPositions.forEach((y, i) => {
      const lineEl = document.createElementNS(svgNS, 'line');
      lineEl.setAttribute('x1', String(x1));
      lineEl.setAttribute('y1', String(y));
      lineEl.setAttribute('x2', String(x2));
      lineEl.setAttribute('y2', String(y));
      lineEl.setAttribute('stroke', ANCHOR_LINE_COLORS[i % ANCHOR_LINE_COLORS.length]);
      lineEl.setAttribute('stroke-width', '3');
      lineEl.setAttribute('opacity', '0.6');
      lineEl.setAttribute('data-anchor-line', 'true');
      measure.appendChild(lineEl);
      anchorLinesApplied++;
    });
  });

  return {
    totalElements: svg.querySelectorAll('*').length,
    staffLinesFound,
    anchorLinesApplied,
  };
}

/**
 * 设置缩放
 */
export function setZoom(osmd: OpenSheetMusicDisplay, zoom: number): void {
  osmd.Zoom = zoom * 100;
  osmd.render();
}

/**
 * 显示 OSMD 内置光标
 */
export function showCursor(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.cursor) return;
  osmd.cursor.show();
}

/**
 * 隐藏 OSMD 内置光标
 */
export function hideCursor(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.cursor) return;
  osmd.cursor.hide();
}

/**
 * 重置光标到起始位置
 */
export function resetCursor(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.cursor) return;
  osmd.cursor.reset();
}

/**
 * 将光标移动到下一个音符
 */
export function cursorNext(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.cursor) return;
  osmd.cursor.next();
}

/**
 * 获取光标当前指向的音符的 MIDI 编号列表
 */
export function getCursorNoteMidis(osmd: OpenSheetMusicDisplay): number[] {
  if (!osmd.cursor) return [];
  
  try {
    const notes = osmd.cursor.NotesUnderCursor();
    return notes
      .filter((note: Note) => !note.isRest())
      .map((note: Note) => {
        const pitch = note.Pitch;
        if (!pitch) return -1;
        // OSMD Pitch 转 MIDI 编号
        try {
          // Pitch.Octave: -1 to 9, FundamentalNote: 0(C) to 11(B)
          const midi = (pitch.Octave + 1) * 12 + pitch.FundamentalNote;
          return midi;
        } catch {
          return -1;
        }
      })
      .filter((midi: number): midi is number => midi >= 0);
  } catch {
    return [];
  }
}


