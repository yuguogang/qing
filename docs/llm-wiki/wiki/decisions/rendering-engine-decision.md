---
title: 渲染引擎选型决策
status: ready
last_reviewed: 2026-07-24
---

# 渲染引擎选型决策

## 背景
清谱项目需要在前端渲染标准五线谱，并支持三色锚线颜色定制。候选方案：OSMD、alphaTab、VexFlow 直接使用。

## 决策
**选择 OSMD（OpenSheetMusicDisplay）作为主渲染引擎**

## 决策依据

### 1. 原计划错误：将 alphaTab 与 OSMD 并列为推荐方案
原 plan.md 写道「alphaTab / OSMD 前端引擎渲染」，暗示两者可互换。经调研发现：

| 关键差异 | OSMD | alphaTab |
|---------|------|----------|
| MusicXML 支持 | ✅ 核心功能，完整解析 | ⚠️ 实验性，功能不完整 |
| 钢琴谱定位 | ✅ 专为标准五线谱设计 | ❌ 主攻吉他谱/Tab |
| 样式定制 | ✅ 通过 VexFlow 底层深度定制 | ⚠️ 定制接口有限 |

### 2. alphaTab 的 MusicXML 实验性支持是重大风险
alphaTab 的核心格式是 Guitar Pro，MusicXML 解析能力未经充分验证。对于以钢琴五线谱为核心的清谱项目，选择 MusicXML 支持不成熟的引擎是架构风险。

### 3. OSMD 的 VexFlow 底层提供足够的三色锚线定制能力
- `setKeyStyle()` 可对单个音符着色
- `engravingRules` 暴露谱线粗细、字体等参数
- SVG 输出可通过 DOM 操作实现谱线颜色覆盖

## 替代方案
- **VexFlow 直接使用**: 更灵活但工作量大，需自行实现 MusicXML 解析
- **alphaTab**: 仅在其内置播放功能为刚需时考虑（但清谱可用 Web Audio API 替代）

## 后果
- 正面：MusicXML 完整支持，钢琴谱渲染质量最优，定制能力强
- 负面：无内置播放功能，需额外集成音频引擎
- 风险：OSMD 社区版本更新节奏需持续关注
