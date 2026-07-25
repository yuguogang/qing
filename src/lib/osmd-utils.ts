/**
 * 清谱 - OSMD 乐谱渲染工具
 *
 * 基于 OpenSheetMusicDisplay 引擎，实现三色锚线五线谱渲染。
 * 核心功能：加载 MusicXML → 渲染五线谱 → 三色锚线着色 → 光标移动
 */

import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

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
    disableCursor: false, // 启用内置光标
    followCursor: true,  // 光标跟随滚动
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
 * 应用三色锚线着色（基于 OSMD GraphicalLine API）
 *
 * 通过 OSMD 内部 API 获取五线谱线的精确坐标，然后插入彩色 SVG 线条：
 * - 第三线（中央C锚点）：暖红色实线
 * - 上加一线：蓝色虚线
 * - 下加一线：绿色虚线
 *
 * 优势：不再依赖"宽度排序"启发式方法，坐标完全精确。
 */
export function applyAnchorColors(
  osmd: OpenSheetMusicDisplay,
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

  // 通过 OSMD API 获取五线谱线的精确坐标
  const staffLineData = extractStaffLinePositions(osmd);
  if (!staffLineData || staffLineData.length === 0) {
    console.log('[Anchor] No staff line positions from OSMD API, falling back to SVG scan');
    // 降级方案：使用旧的 SVG 扫描方法
    return applyAnchorColorsFallback(container, config);  }

  console.log('[Anchor] OSMD API found', staffLineData.length, 'staff line groups');
  let anchorLinesApplied = 0;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svgWidth = svg.viewBox?.baseVal?.width || svg.clientWidth || 1000;

  for (const group of staffLineData) {
    const { lines, staffLineIndex } = group;

    // lines 已经按 Y 坐标排序（第1线在上，第5线在下）
    if (lines.length < 5) continue;

    const thirdLineY = lines[2].y;
    const topLineY = lines[0].y;
    const bottomLineY = lines[4].y;
    const spacing = lines[1].y - lines[0].y;
    const upperLedgerY = topLineY - spacing;
    const lowerLedgerY = bottomLineY + spacing;
    const lineX1 = lines[0].x;
    const lineX2 = lines[0].x2;

    console.log(`[Anchor] StaffLine #${staffLineIndex}: thirdY=${thirdLineY.toFixed(1)}, spacing=${spacing.toFixed(1)}, x1=${lineX1.toFixed(1)}, x2=${lineX2.toFixed(1)}`);

    // 红色线（第三线）- 实线，插入到最底层
    const redLine = document.createElementNS(svgNS, 'line');
    redLine.setAttribute('x1', String(lineX1));
    redLine.setAttribute('y1', String(thirdLineY));
    redLine.setAttribute('x2', String(lineX2));
    redLine.setAttribute('y2', String(thirdLineY));
    redLine.setAttribute('stroke', '#FF0000');
    redLine.setAttribute('stroke-width', '3');
    redLine.setAttribute('stroke-opacity', '0.7');
    redLine.dataset.anchorLine = 'middle';
    svg.insertBefore(redLine, svg.firstChild);
    anchorLinesApplied++;

    // 蓝色线（上加一线）- 虚线
    const blueLine = document.createElementNS(svgNS, 'line');
    blueLine.setAttribute('x1', String(lineX1));
    blueLine.setAttribute('y1', String(upperLedgerY));
    blueLine.setAttribute('x2', String(lineX2));
    blueLine.setAttribute('y2', String(upperLedgerY));
    blueLine.setAttribute('stroke', ANCHOR_COLORS.upperLedger);
    blueLine.setAttribute('stroke-width', '3');
    blueLine.setAttribute('stroke-opacity', '0.9');
    blueLine.setAttribute('stroke-dasharray', '8,4');
    blueLine.dataset.anchorLine = 'upperLedger';
    svg.appendChild(blueLine);
    anchorLinesApplied++;

    // 绿色线（下加一线）- 虚线
    const greenLine = document.createElementNS(svgNS, 'line');
    greenLine.setAttribute('x1', String(lineX1));
    greenLine.setAttribute('y1', String(lowerLedgerY));
    greenLine.setAttribute('x2', String(lineX2));
    greenLine.setAttribute('y2', String(lowerLedgerY));
    greenLine.setAttribute('stroke', ANCHOR_COLORS.lowerLedger);
    greenLine.setAttribute('stroke-width', '3');
    greenLine.setAttribute('stroke-opacity', '0.9');
    greenLine.setAttribute('stroke-dasharray', '8,4');
    greenLine.dataset.anchorLine = 'lowerLedger';
    svg.appendChild(greenLine);
    anchorLinesApplied++;
  }

  const allElements = svg.querySelectorAll('*');
  return {
    totalElements: allElements.length,
    staffLinesFound: staffLineData.length,
    anchorLinesApplied,
  };
}

/**
 * 从 OSMD GraphicSheet 提取五线谱线的精确坐标
 *
 * 路径：osmd.GraphicSheet.MusicPages → MusicSystems → StaffLines → StaffLine.StaffLines (GraphicalLine[])
 * 每个 StaffLine 有 5 条 GraphicalLine，分别对应五线谱的第1-5线
 */
interface StaffLinePosition {
  y: number;    // 线的 Y 坐标
  x: number;    // 线的起始 X 坐标
  x2: number;   // 线的结束 X 坐标
}

interface StaffLineGroup {
  staffLineIndex: number;
  lines: StaffLinePosition[];  // 5 条线，按 Y 坐标从上到下排序
}

function extractStaffLinePositions(osmd: OpenSheetMusicDisplay): StaffLineGroup[] | null {
  try {
    const graphicSheet = osmd.GraphicSheet;
    if (!graphicSheet) {
      console.log('[Anchor] No GraphicSheet');
      return null;
    }

    const musicPages = graphicSheet.MusicPages;
    if (!musicPages || musicPages.length === 0) {
      console.log('[Anchor] No MusicPages');
      return null;
    }

    const result: StaffLineGroup[] = [];

    for (const page of musicPages) {
      const systems = page.MusicSystems;
      if (!systems) continue;

      for (const system of systems) {
        const staffLines = system.StaffLines;
        if (!staffLines) continue;

        for (let sli = 0; sli < staffLines.length; sli++) {
          const staffLineObj = staffLines[sli];
          const graphicalLines = staffLineObj.StaffLines;
          if (!graphicalLines || graphicalLines.length < 5) continue;

          // 提取 5 条线的坐标
          const lines: StaffLinePosition[] = graphicalLines
            .slice(0, 5)
            .map((gl: { Start: { x: number; y: number }; End: { x: number; y: number } }) => ({
              y: gl.Start.y,
              x: gl.Start.x,
              x2: gl.End.x,
            }))
            .sort((a: StaffLinePosition, b: StaffLinePosition) => a.y - b.y);

          result.push({
            staffLineIndex: sli,
            lines,
          });
        }
      }
    }

    return result.length > 0 ? result : null;
  } catch (err) {
    console.log('[Anchor] Error extracting staff line positions:', err);
    return null;
  }
}

/**
 * 降级方案：通过 SVG 扫描识别五线谱线位置（旧的启发式方法）
 */
function applyAnchorColorsFallback(
  container: HTMLElement,
  config: OsmdConfig,
): {
  totalElements: number;
  staffLinesFound: number;
  anchorLinesApplied: number;
} | null {
  if (!config.anchorMode) return null;

  const svg = container.querySelector('svg');
  if (!svg) return null;

  const allElements = svg.querySelectorAll('*');
  const horizontalLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect; tag: string }> = [];

  allElements.forEach((elem) => {
    const el = elem as SVGGraphicsElement;
    const tag = el.tagName.toLowerCase();
    if (tag !== 'line' && tag !== 'path' && tag !== 'rect' && tag !== 'polygon') return;

    let bbox: DOMRect | null = null;
    try { bbox = el.getBBox(); } catch { return; }
    if (!bbox) return;

    if (bbox.height < 15 && bbox.width > 100) {
      horizontalLines.push({ el, bbox, tag });
    }
  });

  // 按宽度降序排序
  horizontalLines.sort((a, b) => b.bbox.width - a.bbox.width);

  let staffLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect }> = [];

  // 寻找等间距的 5 条线
  for (let i = 0; i < horizontalLines.length - 4; i++) {
    const lines = horizontalLines.slice(i, i + 5);
    const spacings = [
      lines[1].bbox.y - lines[0].bbox.y,
      lines[2].bbox.y - lines[1].bbox.y,
      lines[3].bbox.y - lines[2].bbox.y,
      lines[4].bbox.y - lines[3].bbox.y,
    ];

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / 4;
    const isUniform = spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.7);

    if (isUniform && avgSpacing > 2 && avgSpacing < 200) {
      staffLines.push(...lines);
      break;
    }
  }

  if (staffLines.length === 0 && horizontalLines.length >= 5) {
    staffLines = horizontalLines.slice(0, 5);
  }

  staffLines.sort((a, b) => a.bbox.y - b.bbox.y);

  let anchorLinesApplied = 0;

  if (staffLines.length >= 5) {
    const thirdLineY = staffLines[2].bbox.y;
    const spacing = staffLines[1].bbox.y - staffLines[0].bbox.y;
    const topLineY = staffLines[0].bbox.y;
    const bottomLineY = staffLines[4].bbox.y;
    const upperLedgerY = topLineY - spacing;
    const lowerLedgerY = bottomLineY + spacing;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgWidth = svg.viewBox?.baseVal?.width || svg.clientWidth || 1000;

    const redLine = document.createElementNS(svgNS, 'line');
    redLine.setAttribute('x1', '0');
    redLine.setAttribute('y1', String(thirdLineY));
    redLine.setAttribute('x2', String(svgWidth));
    redLine.setAttribute('y2', String(thirdLineY));
    redLine.setAttribute('stroke', '#FF0000');
    redLine.setAttribute('stroke-width', '3');
    redLine.setAttribute('stroke-opacity', '0.7');
    redLine.dataset.anchorLine = 'middle';
    svg.insertBefore(redLine, svg.firstChild);
    anchorLinesApplied++;

    const blueLine = document.createElementNS(svgNS, 'line');
    blueLine.setAttribute('x1', '0');
    blueLine.setAttribute('y1', String(upperLedgerY));
    blueLine.setAttribute('x2', String(svgWidth));
    blueLine.setAttribute('y2', String(upperLedgerY));
    blueLine.setAttribute('stroke', ANCHOR_COLORS.upperLedger);
    blueLine.setAttribute('stroke-width', '3');
    blueLine.setAttribute('stroke-opacity', '0.9');
    blueLine.setAttribute('stroke-dasharray', '8,4');
    blueLine.dataset.anchorLine = 'upperLedger';
    svg.appendChild(blueLine);
    anchorLinesApplied++;

    const greenLine = document.createElementNS(svgNS, 'line');
    greenLine.setAttribute('x1', '0');
    greenLine.setAttribute('y1', String(lowerLedgerY));
    greenLine.setAttribute('x2', String(svgWidth));
    greenLine.setAttribute('y2', String(lowerLedgerY));
    greenLine.setAttribute('stroke', ANCHOR_COLORS.lowerLedger);
    greenLine.setAttribute('stroke-width', '3');
    greenLine.setAttribute('stroke-opacity', '0.9');
    greenLine.setAttribute('stroke-dasharray', '8,4');
    greenLine.dataset.anchorLine = 'lowerLedger';
    svg.appendChild(greenLine);
    anchorLinesApplied++;
  }

  return {
    totalElements: allElements.length,
    staffLinesFound: staffLines.length,
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
      .filter(note => !note.isRest())
      .map(note => {
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
      .filter((midi): midi is number => midi >= 0);
  } catch {
    return [];
  }
}


