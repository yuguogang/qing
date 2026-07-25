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
  const lines = svg.querySelectorAll('line, path');

  lines.forEach((line) => {
    const el = line as SVGGraphicsElement;
    let bbox: DOMRect | null = null;
    try {
      bbox = el.getBBox();
    } catch {
      return;
    }
    if (!bbox) return;

    // 检测是否为水平线（五线谱线条）
    const isHorizontal = bbox.height < 2 && bbox.width > 20;
    if (!isHorizontal) return;

    // 根据 Y 坐标判断线条类型并着色
    const y = bbox.y;
    const svgHeight = svg.viewBox?.baseVal?.height || 1000;
    const relativeY = y / svgHeight;

    // 第三线大约在谱表中间位置
    if (Math.abs(relativeY - 0.5) < 0.02) {
      applyColor(el, ANCHOR_COLORS.middleLine);
    }
    // 上加一线在谱表上方
    else if (relativeY < 0.15) {
      applyColor(el, ANCHOR_COLORS.upperLedger);
    }
    // 下加一线在谱表下方
    else if (relativeY > 0.85) {
      applyColor(el, ANCHOR_COLORS.lowerLedger);
    }
  });
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
    el.setAttribute('stroke', color);
    el.setAttribute('fill', 'none');
  }
}

/**
 * 设置缩放
 */
export function setZoom(osmd: OpenSheetMusicDisplay, zoom: number): void {
  osmd.Zoom = zoom * 100;
  osmd.render();
}
