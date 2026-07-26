---
title: OSMD (OpenSheetMusicDisplay)
status: ready
source_count: 4
last_reviewed: 2026-07-26
---

# OSMD

## 摘要
基于 VexFlow 的浏览器端 MusicXML 渲染引擎，由 PhonicScore 维护，BSD 开源协议。清谱项目的核心乐谱渲染引擎。

## 技术规格
- **仓库**: github.com/opensheetmusicdisplay/opensheetmusicdisplay
- **语言**: TypeScript
- **底层**: VexFlow (SVG/Canvas)
- **输入**: MusicXML (.xml, .musicxml)
- **输出**: SVG (默认) / Canvas
- **包大小**: ~1.5MB (minified)
- **协议**: BSD 开源协议

## 安装方式

### npm
```bash
pnpm add opensheetmusicdisplay
```

### 浏览器 script
```html
<script src="opensheetmusicdisplay.min.js"></script>
<!-- 或通过 unpkg -->
<script src="https://unpkg.com/opensheetmusicdisplay@0.8.3/build/opensheetmusicdisplay.min.js"></script>
```

## 核心 API

### 基础用法
```typescript
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

const osmd = new OpenSheetMusicDisplay(container, {
  autoResize: true,
  drawingParameters: "default" // or "compact", "preview", "compacttight"
});

await osmd.load(musicXmlUrl);
await osmd.render();
```

### 单手显示
```typescript
osmd.sheet.Instruments[0].Staves[1].Visible = false;
osmd.render();
```

### 样式定制
```typescript
osmd.engravingRules.StaffLineColor = "#999";
osmd.engravingRules.NoteColor = "#333";
```

## 构造选项 (IOSMDOptions)

| 选项 | 类型 | 说明 |
|------|------|------|
| autoResize | boolean | 是否自动适应容器大小 |
| backend | "svg"\|"canvas" | 渲染后端 |
| drawingParameters | string | 绘图参数: "default", "compact", "preview", "compacttight" |
| drawTitle | boolean | 是否绘制标题 |
| pageFormat | string | 页面格式: "A4_P", "A4_L" 等 |

运行时修改选项: `osmd.setOptions(optionsObject)`

## 处理流程

OSMD 将 MusicXML 转换为渲染乐谱的完整流程:

1. **输入**: MusicXML 文档
2. **解析**: MusicSheetReader 提取 score-partwise 元素
3. **读取**: 创建 instrumentReaders, 初始化时间戳
4. **构建**: 逐乐器、逐小节读取，构建 MusicSheet 对象
5. **图形化**: 生成图形表示
6. **渲染**: 输出 SVG/Canvas

详见 [[OSMD处理流程]]

## 对象模型

OSMD 拥有独立于 VexFlow 的对象模型:

- **StaffEntry**: 包含一个乐器在一个时间戳的所有声部条目
- **SourceStaffEntry**: 数据类
- **GraphicalStaffEntry**: 图形对应
- **VexFlowStaffEntry**: VexFlow 特定图形信息

坐标系统:
- OSMD: y=0 从顶部谱线开始，向下递增
- VexFlow: y 值向上递增

详见 [[OSMD对象模型]]

## 音符时序提取

通过 cursor 的迭代器提取音符及其时间戳:

```typescript
const iterator = osmd.cursor.Iterator;
while (!iterator.EndReached) {
  const voices = iterator.CurrentVoiceEntries;
  for (const ve of voices) {
    for (const note of ve.Notes) {
      // 提取音符和时间戳
    }
  }
  iterator.moveToNext();
}
```

详见 [[音符时序提取]]

## 与清谱的关系
清谱的核心渲染引擎选择。用于将 MusicXML 格式的乐谱渲染为带三色锚线的交互式五线谱。

## 引用来源
- `../raw/tech-research/20260726_OSMD_GettingStarted.md`
- `../raw/tech-research/20260726_OSMD_ProcessingFlow.md`
- `../raw/tech-research/20260726_OSMD_ObjectModel.md`
- `../raw/tech-research/20260726_OSMD_NoteTiming.md`

## 关联页面
- [[乐谱渲染引擎对比]]
- [[渲染引擎选型决策]]
- [[三色锚线识谱法]]
- [[OSMD处理流程]]
- [[OSMD对象模型]]
- [[音符时序提取]]
