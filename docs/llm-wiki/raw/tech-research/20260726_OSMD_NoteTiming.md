# OSMD 音符时序提取教程 - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Tutorial---Extracting-note-timing-for-playing

## 核心概念

音符本身不包含实际时序,需要通过 cursor 的迭代器获取。

## 时间戳转换

假设 60 BPM, 4/4 拍号:
- 第一拍: 0
- 第二拍: 0.25
- 第三拍: 0.5
- 第四拍: 0.75

乘以 4 得到秒数: [0, 1, 2, 3]

对于 [1/4, 1/8, 1/8, 1/4, 1/4]:
- OSMD 时间戳: [0, 0.25, 0.375, 0.5, 0.75]
- 秒数: [0, 1, 1.5, 2, 3]

## 基础代码 (恒定 BPM)

```javascript
var allNotes = [];
this.osmd.cursor.reset();
const iterator = this.osmd.cursor.Iterator;

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
          "halftone": note.halfTone+12,
          "time": iterator.currentTimeStamp.realValue * 4 * 60/bpm
        });
      }
    }
  }
  iterator.moveToNext();
}
```

## 处理变 BPM 的代码

```javascript
let totalDuration = 0;
const beatRealValue = 0.25;
const iterator = osmd.cursor.Iterator.clone();
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
}
```

## GraphicalNote 操作

获取 SVG 元素:

```javascript
const currentTopNote = osmd.cursor.Iterator.currentVoiceEntries[0].notes[0];
const gNote = osmd.rules.GNote(currentTopNote);
gNote.getSVGGElement();
```

从光标获取图形音符:

```javascript
osmd.cursor.GNotesUnderCursor()[0].getSVGGElement()
```
