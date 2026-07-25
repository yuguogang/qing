/**
 * 清谱 - OSMD 乐谱渲染工具
 *
 * 基于 OpenSheetMusicDisplay 引擎，实现三色锚线五线谱渲染。
 * 核心功能：加载 MusicXML → 渲染五线谱 → 三色锚线着色
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
 * 应用三色锚线着色
 *
 * 核心逻辑：遍历 SVG 中的五线谱线条，识别关键线条并着色：
 * - 第三线（中央C锚点）：暖红色
 * - 上加一线：蓝色
 * - 下加一线：绿色
 */
export function applyAnchorColors(
  container: HTMLElement,
  config: OsmdConfig,
): {
  totalElements: number;
  horizontalLinesCount: number;
  staffLinesFound: number;
} | null {
  if (!config.anchorMode) return null;

  const svg = container.querySelector('svg');
  if (!svg) {
    console.log('[Anchor] No SVG found');
    return null;
  }

  console.log('[Anchor] SVG found, viewBox:', svg.viewBox?.baseVal);
  console.log('[Anchor] SVG children count:', svg.children.length);

  // 获取所有可能的线条元素（包括 rect, line, path, polygon）
  const allElements = svg.querySelectorAll('*');
  console.log('[Anchor] Total elements:', allElements.length);
  
  // 过滤出水平线条（五线谱线条）
  const horizontalLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect; tag: string }> = [];
  
  allElements.forEach((elem) => {
    const el = elem as SVGGraphicsElement;
    const tag = el.tagName.toLowerCase();
    
    // 只处理可能的线条元素
    if (tag !== 'line' && tag !== 'path' && tag !== 'rect' && tag !== 'polygon') {
      return;
    }
    
    let bbox: DOMRect | null = null;
    try {
      bbox = el.getBBox();
    } catch {
      return;
    }
    if (!bbox) return;

    // 检测是否为水平线（五线谱线条）- 放宽条件
    // path 元素可能包含多个线段，bbox 可能比较大
    const isHorizontal = bbox.height < 15 && bbox.width > 100;
    if (isHorizontal) {
      horizontalLines.push({ el, bbox, tag });
    }
  });

  console.log('[Anchor] Horizontal lines found:', horizontalLines.length);
  
  // 打印前 10 个水平线的信息
  horizontalLines.slice(0, 10).forEach((item, i) => {
    console.log(`[Anchor] Line ${i}: tag=${item.tag}, y=${item.bbox.y}, height=${item.bbox.height}, width=${item.bbox.width}`);
  });

  // 按 Y 坐标排序
  horizontalLines.sort((a, b) => a.bbox.y - b.bbox.y);

  // 找到五线谱的 5 条主线（连续的 5 条线）
  // 五线谱的 5 条线应该是等间距的
  let staffLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect }> = [];
  
  // 方法1：尝试找到等间距的 5 条线
  for (let i = 0; i < horizontalLines.length - 4; i++) {
    const lines = horizontalLines.slice(i, i + 5);
    const spacings = [
      lines[1].bbox.y - lines[0].bbox.y,
      lines[2].bbox.y - lines[1].bbox.y,
      lines[3].bbox.y - lines[2].bbox.y,
      lines[4].bbox.y - lines[3].bbox.y,
    ];
    
    // 检查间距是否大致相等（允许 70% 误差，更宽松）
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / 4;
    const isUniform = spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.7);
    
    console.log('[Anchor] Checking lines at Y:', lines.map(l => l.bbox.y), 'spacings:', spacings, 'avg:', avgSpacing, 'uniform:', isUniform);
    
    if (isUniform && avgSpacing > 2 && avgSpacing < 200) {
      staffLines.push(...lines);
      console.log('[Anchor] Found staff lines!');
      break; // 找到第一组五线谱就停止
    }
  }
  
  // 方法2：如果没找到，直接取前 5 条线（假设它们就是五线谱）
  if (staffLines.length === 0 && horizontalLines.length >= 5) {
    staffLines = horizontalLines.slice(0, 5);
    console.log('[Anchor] Using first 5 lines as staff');
  }

  console.log('[Anchor] Staff lines found:', staffLines.length);

  const debugResult = {
    totalElements: allElements.length,
    horizontalLinesCount: horizontalLines.length,
    staffLinesFound: staffLines.length,
  };

  // 如果找到了五线谱线条，直接插入新的彩色线条
  if (staffLines.length >= 5) {
    const thirdLineY = staffLines[2].bbox.y;
    const spacing = staffLines[1].bbox.y - staffLines[0].bbox.y;
    const topLineY = staffLines[0].bbox.y;
    const bottomLineY = staffLines[4].bbox.y;
    const upperLedgerY = topLineY - spacing;
    const lowerLedgerY = bottomLineY + spacing;
    
    console.log('[Anchor] Third line Y:', thirdLineY, 'Spacing:', spacing);
    console.log('[Anchor] Upper ledger Y:', upperLedgerY, 'Lower ledger Y:', lowerLedgerY);
    
    // 获取 SVG 的 viewBox 宽度
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth || 1000;
    
    // 创建红色线（第三线）- 实线
    const redLine = document.createElementNS(svgNS, 'line');
    redLine.setAttribute('x1', '0');
    redLine.setAttribute('y1', String(thirdLineY));
    redLine.setAttribute('x2', String(svgWidth));
    redLine.setAttribute('y2', String(thirdLineY));
    redLine.setAttribute('stroke', '#FF0000');
    redLine.setAttribute('stroke-width', '8');
    redLine.setAttribute('stroke-opacity', '1');
    svg.appendChild(redLine);
    console.log('[Anchor] Added red line at Y:', thirdLineY);
    
    // 调试：添加一个红色圆点在五线谱中间
    const debugCircle = document.createElementNS(svgNS, 'circle');
    debugCircle.setAttribute('cx', String(svgWidth / 2));
    debugCircle.setAttribute('cy', String(thirdLineY));
    debugCircle.setAttribute('r', '15');
    debugCircle.setAttribute('fill', '#FF0000');
    debugCircle.setAttribute('opacity', '0.8');
    svg.appendChild(debugCircle);
    console.log('[Anchor] Added debug red circle at:', svgWidth / 2, thirdLineY);
    
    // 创建蓝色线（上加一线）- 虚线
    const blueLine = document.createElementNS(svgNS, 'line');
    blueLine.setAttribute('x1', '0');
    blueLine.setAttribute('y1', String(upperLedgerY));
    blueLine.setAttribute('x2', String(svgWidth));
    blueLine.setAttribute('y2', String(upperLedgerY));
    blueLine.setAttribute('stroke', ANCHOR_COLORS.upperLedger);
    blueLine.setAttribute('stroke-width', '3');
    blueLine.setAttribute('stroke-opacity', '0.9');
    blueLine.setAttribute('stroke-dasharray', '8,4');
    blueLine.style.stroke = ANCHOR_COLORS.upperLedger;
    blueLine.style.strokeWidth = '3px';
    blueLine.style.strokeOpacity = '0.9';
    svg.appendChild(blueLine);
    console.log('[Anchor] Added blue line at Y:', upperLedgerY);
    
    // 创建绿色线（下加一线）- 虚线
    const greenLine = document.createElementNS(svgNS, 'line');
    greenLine.setAttribute('x1', '0');
    greenLine.setAttribute('y1', String(lowerLedgerY));
    greenLine.setAttribute('x2', String(svgWidth));
    greenLine.setAttribute('y2', String(lowerLedgerY));
    greenLine.setAttribute('stroke', ANCHOR_COLORS.lowerLedger);
    greenLine.setAttribute('stroke-width', '3');
    greenLine.setAttribute('stroke-opacity', '0.9');
    greenLine.setAttribute('stroke-dasharray', '8,4');
    greenLine.style.stroke = ANCHOR_COLORS.lowerLedger;
    greenLine.style.strokeWidth = '3px';
    greenLine.style.strokeOpacity = '0.9';
    svg.appendChild(greenLine);
    console.log('[Anchor] Added green line at Y:', lowerLedgerY);
  }

  return debugResult;
}

/**
 * 对 SVG 元素应用颜色
 */
function applyColor(el: SVGElement, color: string): void {
  const tag = el.tagName.toLowerCase();
  if (tag === 'line' || tag === 'path') {
    // 使用 style 属性强制覆盖，避免被 CSS 覆盖
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', '3');
    el.setAttribute('stroke-opacity', '1');
    
    // 同时设置 style 属性，确保优先级最高
    el.style.stroke = color;
    el.style.strokeWidth = '3px';
    el.style.strokeOpacity = '1';
    
    console.log('[Anchor] Applied color to', tag);
  }
}

/**
 * 设置缩放
 */
export function setZoom(osmd: OpenSheetMusicDisplay, zoom: number): void {
  osmd.Zoom = zoom * 100;
  osmd.render();
}
