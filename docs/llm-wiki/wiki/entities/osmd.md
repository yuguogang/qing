---
title: OSMD (OpenSheetMusicDisplay)
status: ready
last_reviewed: 2026-07-24
---

# OSMD

## 摘要
基于 VexFlow 的浏览器端 MusicXML 渲染引擎，由 PhonicScore 维护，BSD 开源协议。

## 技术规格
- **仓库**: github.com/opensheetmusicdisplay/opensheetmusicdisplay
- **语言**: TypeScript
- **底层**: VexFlow (SVG/Canvas)
- **输入**: MusicXML (.xml, .musicxml)
- **输出**: SVG (默认) / Canvas
- **包大小**: ~1.5MB (minified)

## 核心 API
```typescript
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

const osmd = new OpenSheetMusicDisplay(container, {
  autoResize: true,
  drawingParameters: "default" // or "compact", "preview"
});

await osmd.load(musicXmlUrl);
await osmd.render();

// 单手显示
osmd.sheet.Instruments[0].Staves[1].Visible = false;
osmd.render();

// 样式定制
osmd.engravingRules.StaffLineColor = "#999";
osmd.engravingRules.NoteColor = "#333";
```

## 与清谱的关系
清谱的核心渲染引擎选择。用于将 MusicXML 格式的乐谱渲染为带三色锚线的交互式五线谱。

## 关联页面
- [[乐谱渲染引擎对比]]
- [[渲染引擎选型决策]]
- [[三色锚线识谱法]]
