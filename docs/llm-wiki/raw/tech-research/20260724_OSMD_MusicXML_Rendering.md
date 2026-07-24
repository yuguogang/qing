# OSMD (OpenSheetMusicDisplay) 技术调研

- 来源: GitHub, CSDN, GitCode
- 日期: 2026-07-24
- 状态: 已验证

## 核心信息

### 技术栈
- **底层引擎**: 基于 VexFlow（JavaScript 乐谱渲染库）
- **输入格式**: MusicXML（行业标准交换格式）
- **语言**: TypeScript 编写，兼容 JavaScript
- **渲染方式**: SVG / Canvas 输出
- **运行环境**: 浏览器 + Node.js（无头渲染）

### 核心能力
1. 解析 MusicXML → 内部数据模型 → VexFlow 渲染
2. 支持标准五线谱、吉他谱、弯音、滑音等
3. 丰富的配置选项：页面格式、字体、布局
4. **钢琴谱单手显示功能**: `osmd.sheet.Instruments[0].Staves[1].Visible = false`
5. **音符颜色自定义**: 通过 `osmd.engravingRules.noteColor` 或 VexFlow 的 `setKeyStyle()` 实现
6. **谱线样式控制**: `osmd.engravingRules.staffLineThickness` 等

### 关键 API
```javascript
const osmd = new OpenSheetMusicDisplay("container");
await osmd.load("/path/to/music.xml");
await osmd.render();

// 自定义样式
osmd.engravingRules.noteColor = "#FF5733";
osmd.engravingRules.staffLineThickness = 1.2;
```

### 三色锚线实现可行性
- OSMD 基于 VexFlow，VexFlow 提供 `setKeyStyle(index, {fillStyle: "color"})` 可为单个音符着色
- 谱线颜色需要通过 SVG 图层叠加或 CSS 覆盖实现
- OSMD 的 `engravingRules` 暴露了大量渲染参数，可定制性强
- **关键挑战**: 在不破坏谱面布局的前提下，对特定线条（第三线、加线）进行着色
- **解决方案**: 通过 Canvas/SVG 图层叠加，在渲染后对特定 y 坐标的线条进行颜色覆盖

### 开源协议
- OSMD: BSD 许可证，商用友好
- VexFlow: BSD 许可证，商用友好
