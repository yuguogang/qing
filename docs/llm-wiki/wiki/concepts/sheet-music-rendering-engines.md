---
title: 乐谱渲染引擎对比
status: ready
source_count: 4
last_reviewed: 2026-07-24
---

# 乐谱渲染引擎技术对比

## 摘要
清谱项目前端乐谱渲染引擎的技术选型分析。对比 OSMD、alphaTab、VexFlow 三大方案在钢琴五线谱场景下的能力边界。

## 引擎对比矩阵

| 维度 | OSMD | alphaTab | VexFlow |
|------|------|----------|---------|
| 定位 | 标准五线谱渲染 | 吉他谱/Tab渲染 | 底层渲染库 |
| MusicXML | ✅ 完整支持 | ⚠️ 实验性 | ❌ 需手动构建 |
| 底层技术 | 基于 VexFlow | 自研渲染 | 原生 SVG/Canvas |
| 钢琴谱优化 | ✅ 优秀 | ⚠️ 一般 | ✅ 完全可控 |
| 音符着色 | ✅ setKeyStyle + engravingRules | ⚠️ 有限 | ✅ 完全可控 |
| 谱线定制 | ✅ staffLineThickness 等 | ⚠️ 有限 | ✅ 完全可控 |
| 内置播放 | ❌ | ✅ alphaSynth | ❌ |
| 单手显示 | ✅ 原生支持 | ⚠️ 需定制 | ✅ 完全可控 |
| 响应式 | ✅ autoResize | ✅ 原生 | ⚠️ 需手动 |
| TypeScript | ✅ | ✅ | ✅ |
| 开源协议 | BSD | MPL 2.0 | BSD |
| 社区活跃度 | 高 (PhonicScore) | 中 (1.7k stars) | 高 |

## 三色锚线实现可行性

### OSMD 方案
```javascript
// 音符着色
osmd.engravingRules.NoteheadFillStyle = "red"; // 全局
// 单个音符着色 (通过 VexFlow 底层)
note.setKeyStyle(0, { fillStyle: "#FF0000" });

// 谱线着色 — 需 SVG 图层叠加
// OSMD 渲染后，通过 DOM 操作对特定 y 坐标的线条元素修改颜色
```

### VexFlow 直接方案
```javascript
// 完全控制谱线颜色
stave.setLineColors({
  lineIndex: 2, // 第三线 (0-indexed)
  color: "#FF0000"
});
// 音符着色
note.setKeyStyle(0, { fillStyle: "blue" });
```

## 推荐方案
**OSMD 为主引擎 + VexFlow 底层定制**

理由：
1. OSMD 完整支持 MusicXML，省去格式转换风险
2. 钢琴五线谱为 OSMD 核心场景，渲染质量最优
3. 底层 VexFlow 提供足够的样式定制能力
4. BSD 协议商用友好
5. 社区活跃，问题可追溯

## 引用来源
- `../../raw/tech-research/20260724_OSMD_MusicXML_Rendering.md`
- `../../raw/tech-research/20260724_alphaTab_Engine.md`

## 关联页面
- [[OSMD]]
- [[alphaTab]]
- [[VexFlow]]
- [[渲染引擎选型决策]]
- [[三色锚线识谱法]]
