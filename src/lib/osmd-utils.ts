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
): void {
  if (!config.anchorMode) return;

  const svg = container.querySelector('svg');
  if (!svg) return;

  // 获取所有线条元素
  const allLines = svg.querySelectorAll('line, path');
  
  // 过滤出水平线条（五线谱线条）
  const horizontalLines: Array<{ el: SVGGraphicsElement; bbox: DOMRect }> = [];
  
  allLines.forEach((line) => {
    const el = line as SVGGraphicsElement;
    let bbox: DOMRect | null = null;
    try {
      bbox = el.getBBox();
    } catch {
      return;
    }
    if (!bbox) return;

    // 检测是否为水平线（五线谱线条）
    const isHorizontal = bbox.height < 3 && bbox.width > 30;
    if (isHorizontal) {
      horizontalLines.push({ el, bbox });
    }
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
    
    // 检查间距是否大致相等（允许 20% 误差）
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / 4;
    const isUniform = spacings.every(s => Math.abs(s - avgSpacing) < avgSpacing * 0.3);
    
    if (isUniform && avgSpacing > 5 && avgSpacing < 50) {
      staffLines.push(...lines);
      break; // 找到第一组五线谱就停止
    }
  }

  // 如果找到了五线谱线条，应用颜色
  if (staffLines.length >= 5) {
    // 第三线（中间那条）- 红色
    if (staffLines[2]) {
      applyColor(staffLines[2].el, ANCHOR_COLORS.middleLine);
    }
    
    // 查找上加一线（在五线谱上方）
    const topLineY = staffLines[0].bbox.y;
    const spacing = staffLines[1].bbox.y - staffLines[0].bbox.y;
    const upperLedgerY = topLineY - spacing;
    
    horizontalLines.forEach(({ el, bbox }) => {
      if (Math.abs(bbox.y - upperLedgerY) < spacing * 0.5) {
        applyColor(el, ANCHOR_COLORS.upperLedger);
      }
    });
    
    // 查找下加一线（在五线谱下方）
    const bottomLineY = staffLines[4].bbox.y;
    const lowerLedgerY = bottomLineY + spacing;
    
    horizontalLines.forEach(({ el, bbox }) => {
      if (Math.abs(bbox.y - lowerLedgerY) < spacing * 0.5) {
        applyColor(el, ANCHOR_COLORS.lowerLedger);
      }
    });
  }
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
