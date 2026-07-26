# OSMD Transposing - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Transposing

## 基本移调

按半音数移调（如 `-2` = 降 2 个半音，D → C）：

```javascript
osmd.TransposeCalculator = new opensheetmusicdisplay.TransposeCalculator();
osmd.Sheet.Transpose = transposeValue; // e.g. -2
osmd.updateGraphic();
osmd.render();
```

## 移调后的音高

- `note.Pitch` — 原始音高（不移调）
- `note.TransposedPitch` — 移调后音高（OSMD 1.3.2+），未移调时为 undefined

```javascript
osmd.Sheet.SourceMeasures[0].VerticalMeasureList[0].staffEntries[1].graphicalVoiceEntries[0].notes[0].sourceNote.TransposedPitch.ToString()
// 'Key: C, Note: 0, octave: 2'
```

## 单乐器移调（OSMD 1.3.2+）

```javascript
osmd.Sheet.Instruments[0].Transpose = 2;
osmd.updateGraphic();
osmd.render();
```

## 注意事项

- 移调后必须调用 `osmd.updateGraphic()` 再 `osmd.render()`
- `TransposeCalculator` 需要在 `osmd.load()` 之前创建
- 单乐器移调从 OSMD 1.3.2 开始支持
