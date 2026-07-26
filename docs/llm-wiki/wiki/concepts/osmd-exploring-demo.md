---
title: OSMD Demo 探索
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_ExploringDemo.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD Demo 探索

## 在线 Demo

https://opensheetmusicdisplay.github.io/demo/

- 左上角选择示例乐谱，或拖放 MusicXML/MXL 文件
- 控制台可访问 `osmd` 对象

## 控制台交互示例

```javascript
osmd.Version  // "1.3.0-dev"

// 修改音符颜色
osmd.graphic.measureList[0][0].staffEntries[0]
  .graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#FF0000"

osmd.render()  // 必须重新渲染
```

## 数据模型 vs 图形模型

- `osmd.Sheet` — 数据模型（渲染前可访问）
- `osmd.graphic` — 图形模型（渲染后可访问）

## 清谱项目借鉴

- 暖橙棕主题色 `#d25701` 参考 OSMD 官方 Demo
- 音符着色系统基于 `noteheadColor` API
- 光标控制基于 Cursor API

## 关联页面

- [[OSMD]]
- [[OSMD对象模型]]
- [[OSMD处理流程]]
