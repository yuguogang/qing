---
title: 音符时序提取
status: ready
source_count: 1
last_reviewed: 2026-07-26
---

# 音符时序提取

## 摘要
从 OSMD 渲染的乐谱中提取音符及其精确时间戳的方法，是实现跟弹模式和视奏模式的核心技术。

## 核心概念

**音符本身不包含实际时序**，需要通过 cursor 的迭代器（MusicPartManagerIterator）获取。

迭代器在每个位置提供：
- 当前时间戳（currentTimeStamp）
- 当前声部条目（CurrentVoiceEntries）
- 当前小节（CurrentMeasure）

## 时间戳转换规则

假设 **60 BPM**，**4/4** 拍号：

| OSMD 时间戳 | 拍位 | 秒数（×4） |
|-------------|------|-----------|
| 0 | 第1拍 | 0 |
| 0.25 | 第2拍 | 1 |
| 0.5 | 第3拍 | 2 |
| 0.75 | 第4拍 | 3 |

对于不规则节奏 `[1/4, 1/8, 1/8, 1/4, 1/4]`：
- OSMD 时间戳: `[0, 0.25, 0.375, 0.5, 0.75]`
- 秒数: `[0, 1, 1.5, 2, 3]`

## 基础实现（恒定 BPM）

```typescript
var allNotes = [];
osmd.cursor.reset();
const iterator = osmd.cursor.Iterator;

while (!iterator.EndReached) {
  const voices = iterator.CurrentVoiceEntries;
  for (let i = 0; i < voices.length; i++) {
    const v = voices[i];
    const notes = v.Notes;
    for (let j = 0; j < notes.length; j++) {
      const note = notes[j];
      if (note != null && note.halfTone != 0 && !note.isRest()) {
        allNotes.push({
          "note": note,
          "halftone": note.halfTone + 12,
          "time": iterator.currentTimeStamp.realValue * 4 * 60 / bpm
        });
      }
    }
  }
  iterator.moveToNext();
}
```

## 进阶实现（变 BPM）

处理乐谱中速度变化的场景：

```typescript
let totalDuration = 0;
const beatRealValue = 0.25;
const iterator = osmd.cursor.Iterator.clone();

// 重置到开头
while (!iterator.frontReached) {
  iterator.moveToPrevious();
}

const maxSteps = 10e6;
let loopSteps = 0;
const allNotes = [];

while (!iterator.EndReached) {
  const measure = iterator.CurrentMeasure;
  const tempoInBPM = measure.TempoInBPM;
  const beatLengthInMs = 60000.0 / tempoInBPM;
  const currentBpm = iterator.CurrentBpm ?? measure.TempoInBPM;
  
  for (const ve of iterator.CurrentVoiceEntries) {
    for (const note of ve.Notes) {
      allNotes.push({
        note: note,
        halftone: note.halfTone + 12,
        time: note.Length.RealValue * 4 * 60 / currentBpm
      });
    }
  }
  
  totalDuration += measure.Duration.RealValue * beatLengthInMs / beatRealValue;
  iterator.moveToNext();
  loopSteps++;
  
  if (loopSteps >= maxSteps) {
    console.error("getSheetDuration: hit maximum loop limit");
    break;
  }
}
```

## GraphicalNote 操作

### 获取 SVG 元素

```typescript
const currentTopNote = osmd.cursor.Iterator.currentVoiceEntries[0].notes[0];
const gNote = osmd.rules.GNote(currentTopNote);
gNote.getSVGGElement();
```

### 从光标获取图形音符

```typescript
osmd.cursor.GNotesUnderCursor()[0].getSVGGElement()
```

## 与清谱的关系

此技术是实现以下功能的核心：
- **跟弹模式**：节拍判定、音符匹配
- **视奏模式**：节拍光标、进度同步
- **练习统计**：计算演奏时长、准确率

## 引用来源
- `../raw/tech-research/20260726_OSMD_NoteTiming.md`

## 关联页面
- [[OSMD]]
- [[OSMD对象模型]]
- [[实时拾音纠错]]
