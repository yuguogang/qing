# OSMD Exploring the Demo - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exploring-the-Demo

## 在线 Demo

https://opensheetmusicdisplay.github.io/demo/

使用最新发布版本。可从左上角选择示例乐谱，或拖放自己的 MusicXML/MXL 文件。

## 控制台交互

`osmd` 对象在浏览器控制台可访问。

### 示例：修改音符颜色

```javascript
// 版本号
osmd.Version  // "1.3.0-dev"

// 将第一小节的休止符变红
osmd.graphic.measureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#FF0000"

// 钢琴音符变蓝
osmd.graphic.measureList[0][1].staffEntries[1].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = "#0000FF"

// 必须重新渲染才能看到效果
osmd.render()
```

### 数据模型 vs 图形模型

- `osmd.Sheet` — 数据模型（渲染前可访问）
  ```javascript
  osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0].VoiceEntries[0].Notes[0].noteheadColor
  ```
- `osmd.graphic` — 图形模型（渲染后可访问）

## 实用技巧

- 修改后必须调用 `osmd.render()` 才能看到效果
- 本地 Demo 有 "Re-render" 按钮
- 可以动态修改 `EngravingRules` 来调整渲染样式
