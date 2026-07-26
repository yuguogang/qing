# OSMD Exporting PNG, SVG and PDF - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exporting-PNG,-SVG-and-PDF

## PNG / SVG 导出

使用 `test/Util/generateImages_browserless.mjs` 脚本：

```bash
node test/Util/generateImages_browserless.mjs osmdBuildDir sampleDirectory imageDirectory svg|png [width|0] [height|0] [filterRegex|all|allSmall] [--debug|--osmdtesting] [debugSleepTime]
```

- pageWidth 和 pageHeight 设为 0 表示不分页（无尽页面）
- 支持 browserless（无头浏览器）和 server-side 导出

示例：
```bash
node test/Util/generateImages_browserless.mjs ../../build ./test/data/ ./export png
```

## SVG 导出 API

OSMD 提供 `osmd.exportSvg()` 方法直接导出 SVG 字符串。

## PDF 导出

PDF 导出**不是 OSMD 核心功能**，是 Demo 中的演示特性。

代码位置：`demo/index.js`（搜索 "Generate PDF"）

使用的 PDF 库存在已知问题：
- 透明度渲染问题（issue #1296）
- 仅供演示用途，非官方支持

建议寻找更好的 PDF 库或修复现有问题并提交 PR。

## 相关 Issue

- #670: PNG/SVG 导出实现讨论
- #1296: PDF 透明度问题
