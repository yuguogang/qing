---
title: OSMD 处理流程
status: ready
source_count: 1
last_reviewed: 2026-07-26
---

# OSMD 处理流程

## 摘要
OSMD 将 MusicXML 文档转换为渲染乐谱的完整内部处理流程，从 XML 解析到最终 SVG/Canvas 输出。

## 核心流程

### 阶段一：输入与解析

```typescript
let path: string = "http://www.example.org/my-sheet-music.xml";
let doc: Document = /* Retrieve the XML document */;
let score: Element = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
```

1. 加载 MusicXML 文档
2. 提取 `score-partwise` 根元素
3. 包装为 IXmlElement 对象

### 阶段二：MusicSheetReader 读取

```typescript
let reader: MusicSheetReader = new MusicSheetReader();
let sheet: MusicSheet = reader.createMusicSheet(score, path);
```

**createMusicSheet 方法执行步骤：**

1. **创建 instrumentReaders** - 为每个乐器创建读取器
2. **初始化 currentFraction** - 全局时间戳，追踪乐谱进度
3. **确定乐器和谱表数量** - 分析每个乐器需要多少条谱线
4. **循环读取小节** - 调用 `instrumentReader.readNextXmlMeasure()` 逐小节读取

### 阶段三：图形化处理

将 MusicSheet 的数据模型转换为图形表示：
- 创建 GraphicalStaffEntry
- 计算音符位置
- 生成 VexFlow 对象

### 阶段四：渲染输出

根据选择的后端输出：
- **SVG**（默认）：生成可缩放矢量图形
- **Canvas**：生成位图

## 关键文件路径

| 文件 | 说明 |
|------|------|
| `src/MusicalScore/ScoreIO/MusicSheetReader.ts` | MusicSheetReader 实现 |
| `src/MusicalScore/Graphical/DrawingParameters.ts` | 绘图参数 |
| `src/OpenSheetMusicDisplay/OSMDOptions.ts` | 构造选项接口 |

## 与清谱的关系

理解 OSMD 处理流程有助于：
- 优化乐谱加载性能
- 自定义渲染流程（如三色锚线着色）
- 扩展功能（如自定义音符标记）

## 引用来源
- `../raw/tech-research/20260726_OSMD_ProcessingFlow.md`

## 关联页面
- [[OSMD]]
- [[OSMD对象模型]]
- [[乐谱渲染引擎对比]]
