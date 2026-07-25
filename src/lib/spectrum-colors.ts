/**
 * 浅雅七色谱 - 按音高（音名）给音符着色
 *
 * 七色映射（基于彩虹色 + 柔和调）：
 * C - 红 #E74C3C
 * D - 橙 #E67E22
 * E - 黄 #F1C40F
 * F - 绿 #2ECC71
 * G - 青 #1ABC9C
 * A - 蓝 #3498DB
 * B - 紫 #9B59B6
 */

export const SPECTRUM_COLORS: Record<string, string> = {
  C: "#E74C3C", // 红
  D: "#E67E22", // 橙
  E: "#F1C40F", // 黄
  F: "#2ECC71", // 绿
  G: "#1ABC9C", // 青
  A: "#3498DB", // 蓝
  B: "#9B59B6", // 紫
};

/** MIDI 音名（C, C#, D, ...） */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 根据 MIDI 音符编号获取音名 */
export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

/** 根据 MIDI 音符编号获取七色谱颜色 */
export function getSpectrumColor(midi: number): string {
  const noteName = midiToNoteName(midi);
  // 提取音名（去掉升降号）
  const baseName = noteName.replace("#", "").replace("b", "");
  return SPECTRUM_COLORS[baseName] || "#333333";
}

/**
 * 给 OSMD 渲染的乐谱应用浅雅七色谱
 * 遍历所有音符，按音高设置 noteheadColor
 */
export function applySpectrumColors(container: HTMLElement): void {
  const svg = container.querySelector("svg");
  if (!svg) return;

  // 查找所有音符元素（OSMD 渲染的 g.note 或带有 data-midi 的元素）
  const noteGroups = svg.querySelectorAll("g.note");
  noteGroups.forEach((group) => {
    // 尝试从 data 属性或 class 获取 MIDI 信息
    const dataMidi = group.getAttribute("data-midi");
    if (dataMidi) {
      const midi = parseInt(dataMidi, 10);
      const color = getSpectrumColor(midi);
      // 给符头着色
      const noteheads = group.querySelectorAll(".vf-notehead");
      noteheads.forEach((nh) => {
        (nh as SVGElement).setAttribute("fill", color);
      });
      // 给符干着色
      const stems = group.querySelectorAll(".vf-stem");
      stems.forEach((s) => {
        (s as SVGElement).setAttribute("stroke", color);
      });
    }
  });
}

/**
 * 清除七色谱着色
 */
export function clearSpectrumColors(container: HTMLElement): void {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const noteheads = svg.querySelectorAll(".vf-notehead");
  noteheads.forEach((nh) => {
    nh.removeAttribute("fill");
  });

  const stems = svg.querySelectorAll(".vf-stem");
  stems.forEach((s) => {
    s.removeAttribute("stroke");
  });
}
