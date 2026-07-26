---
title: OSMD 移调
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_Transposing.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD 移调

## 基本用法

按半音数移调（`-2` = 降 2 半音，D→C）：

```typescript
osmd.TransposeCalculator = new TransposeCalculator();
osmd.Sheet.Transpose = -2;
osmd.updateGraphic();
osmd.render();
```

## 音高字段

- `note.Pitch` — 原始音高（不移调）
- `note.TransposedPitch` — 移调后音高（OSMD 1.3.2+），未移调时为 undefined

## 单乐器移调（1.3.2+）

```typescript
osmd.Sheet.Instruments[0].Transpose = 2;
osmd.updateGraphic();
osmd.render();
```

## 注意事项

- 必须先创建 `TransposeCalculator` 再 `osmd.load()`
- 移调后必须 `updateGraphic()` + `render()`

## 关联页面

- [[OSMD]]
- [[OSMD对象模型]]
