---
title: OSMD 导出 (PNG/SVG/PDF)
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_Exporting.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD 导出 (PNG/SVG/PDF)

## PNG / SVG

使用 `test/Util/generateImages_browserless.mjs`：

```bash
node test/Util/generateImages_browserless.mjs ../../build ./test/data/ ./export png
```

- `pageWidth=0, pageHeight=0` → 无尽页面不分页
- 支持 browserless（无头浏览器）和 server-side
- API：`osmd.exportSvg()` 直接获取 SVG 字符串

## PDF

**非 OSMD 核心功能**，是 Demo 演示特性。

- 代码：`demo/index.js`（"Generate PDF" 按钮）
- 已知问题：透明度渲染（#1296）
- 仅供演示，非官方支持

## 清谱项目使用

- 暗色模式 + PDF 导出已集成到 TopBar
- SVG 导出可用于乐谱分享/打印

## 关联页面

- [[OSMD]]
- [[OSMD构建与调试]]
