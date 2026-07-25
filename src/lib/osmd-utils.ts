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
  const staffLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect }> = [];
  
  for (let i = 0; i < horizontalLines.length - 4; i++) {
    const lines = horizontalLines.slice(i, i + 5);
    const spacings = [
      lines[1].bbox.y - lines[0].bbox.y,
      lines[2].bbox.y - lines[1].bbox.y,
      lines[3].bbox.y - lines[2].bbox.y,
      lines[4].bbox.y - lines[3].bbox.y,
    ];
    
    // 检查间距是否大致相等（允许 30% 误差）
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / 4;
    const isUniform = spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.3);
    
    console.log('[Anchor] Checking lines at Y:', lines.map(l => l.bbox.y), 'spacings:', spacings, 'avg:', avgSpacing, 'uniform:', isUniform);
    
    if (isUniform && avgSpacing > 3 && avgSpacing < 100) {
      staffLines.push(...lines);
      console.log('[Anchor] Found staff lines!');
      break; // 找到第一组五线谱就停止
    }
  }

  console.log('[Anchor] Staff lines found:', staffLines.length);

  const debugResult = {
    totalElements: allElements.length,
    horizontalLinesCount: horizontalLines.length,
    staffLinesFound: staffLines.length,
  };
  
  for (let i = 0; i < horizontalLines.length - 4; i++) {
    const lines = horizontalLines.slice(i, i + 5);
    const spacings = [
      lines[1].bbox.y - lines[0].bbox.y,
      lines[2].bbox.y - lines[1].bbox.y,
      lines[3].bbox.y - lines[2].bbox.y,
      lines[4].bbox.y - lines[3].bbox.y,
    ];
    
    // 检查间距是否大致相等（允许 30% 误差）
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / 4;
    const isUniform = spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.3);
    
    console.log('[Anchor] Checking lines at Y:', lines.map(l => l.bbox.y), 'spacings:', spacings, 'avg:', avgSpacing, 'uniform:', isUniform);
    
    if (isUniform && avgSpacing > 3 && avgSpacing < 100) {
      staffLines.push(...lines);
      console.log('[Anchor] Found staff lines!');
      break; // 找到第一组五线谱就停止
    }
  }

  console.log('[Anchor] Staff lines found:', staffLines.length);

  // 如果找到了五线谱线条，应用颜色
  if (staffLines.length >= 5) {
    const thirdLineY = staffLines[2].bbox.y;
    const spacing = staffLines[1].bbox.y - staffLines[0].bbox.y;
    const topLineY = staffLines[0].bbox.y;
    const bottomLineY = staffLines[4].bbox.y;
    const upperLedgerY = topLineY - spacing;
    const lowerLedgerY = bottomLineY + spacing;
    
    console.log('[Anchor] Third line Y:', thirdLineY, 'Spacing:', spacing);
    console.log('[Anchor] Upper ledger Y:', upperLedgerY, 'Lower ledger Y:', lowerLedgerY);
    
    // 遍历所有水平线，根据 Y 坐标应用颜色
    let foundUpperLedger = false;
    let foundLowerLedger = false;
    
    horizontalLines.forEach(({ el, bbox }) => {
      const y = bbox.y;
      
      // 第三线（允许一定误差）
      if (Math.abs(y - thirdLineY) < spacing * 0.3) {
        applyColor(el, ANCHOR_COLORS.middleLine);
      }
      // 上加一线
      else if (Math.abs(y - upperLedgerY) < spacing * 0.5) {
        applyColor(el, ANCHOR_COLORS.upperLedger);
        foundUpperLedger = true;
      }
      // 下加一线
      else if (Math.abs(y - lowerLedgerY) < spacing * 0.5) {
        applyColor(el, ANCHOR_COLORS.lowerLedger);
        foundLowerLedger = true;
      }
    });
    
    console.log('[Anchor] Found upper ledger:', foundUpperLedger, 'lower ledger:', foundLowerLedger);
    
    // 如果乐谱中没有上加一线或下加一线，主动绘制
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth || 1000;
    
    if (!foundUpperLedger) {
      const upperLine = document.createElementNS(svgNS, 'line');
      upperLine.setAttribute('x1', '0');
      upperLine.setAttribute('y1', String(upperLedgerY));
      upperLine.setAttribute('x2', String(svgWidth));
      upperLine.setAttribute('y2', String(upperLedgerY));
      upperLine.setAttribute('stroke', ANCHOR_COLORS.upperLedger);
      upperLine.setAttribute('stroke-width', '2');
      upperLine.setAttribute('stroke-dasharray', '5,5'); // 虚线表示参考线
      svg.appendChild(upperLine);
      console.log('[Anchor] Added upper ledger line');
    }
    
    if (!foundLowerLedger) {
      const lowerLine = document.createElementNS(svgNS, 'line');
      lowerLine.setAttribute('x1', '0');
      lowerLine.setAttribute('y1', String(lowerLedgerY));
      lowerLine.setAttribute('x2', String(svgWidth));
      lowerLine.setAttribute('y2', String(lowerLedgerY));
      lowerLine.setAttribute('stroke', ANCHOR_COLORS.lowerLedger);
      lowerLine.setAttribute('stroke-width', '2');
      lowerLine.setAttribute('stroke-dasharray', '5,5'); // 虚线表示参考线
      svg.appendChild(lowerLine);
      console.log('[Anchor] Added lower ledger line');
    }
    
    console.log('[Anchor] Colors applied to all matching lines');
  } else {
    console.log('[Anchor] No staff lines found, trying simpler approach');
    // 简化方法：直接对前几条水平线着色
    if (horizontalLines.length >= 5) {
      // 假设前 5 条是五线谱
      const simpleStaff = horizontalLines.slice(0, 5);
      const simpleThirdY = simpleStaff[2].bbox.y;
      const simpleSpacing = simpleStaff[1].bbox.y - simpleStaff[0].bbox.y;
      
      horizontalLines.forEach(({ el, bbox }) => {
        if (Math.abs(bbox.y - simpleThirdY) < simpleSpacing * 0.3) {
          applyColor(el, ANCHOR_COLORS.middleLine);
        }
      });
      console.log('[Anchor] Simple approach applied');
    }
  }

  return debugResult;
}

/**
 * 对 SVG 元素应用颜色
 */
function applyColor(el: SVGElement, color: string): void {
  const tag = el.tagName.toLowerCase();
  if (tag === 'line') {
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', '2');
  } else if (tag === 'path') {
    // 只设置 stroke，不修改 fill，避免隐藏线条
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', '2');
  }
}

/**
 * 设置缩放
 */
export function setZoom(osmd: OpenSheetMusicDisplay, zoom: number): void {
  osmd.Zoom = zoom * 100;
  osmd.render();
}
