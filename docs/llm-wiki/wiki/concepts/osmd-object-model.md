---
title: OSMD 对象模型
status: ready
source_count: 1
last_reviewed: 2026-07-26
---

# OSMD 对象模型

## 摘要
OSMD 拥有独立于底层渲染库 VexFlow 的对象模型，用于处理大型逻辑组织的乐谱结构。

## OSMD vs VexFlow 对象模型对比

### VexFlow 的局限

VexFlow 不提供以下能力：
- 逻辑连接多个 StaffLines（乐器）
- 连接小节序列
- 统一管理时间戳

所有属性必须单独添加到每个乐器和小节，难以处理复杂乐谱。

### OSMD 的解决方案

OSMD 创建了自己的数据结构，然后逐小节在 VexFlow 中独立绘制。

## 核心对象

### StaffEntry 体系

| 对象 | 说明 |
|------|------|
| **SourceStaffEntry** | 数据类，包含一个乐器在一个时间戳的所有声部条目 |
| **GraphicalStaffEntry** | SourceStaffEntry 的图形对应 |
| **VexFlowStaffEntry** | VexFlow 特定的图形信息 |

### 其他关键对象

- **MusicSheet**: 完整乐谱对象
- **Instrument**: 乐器对象
- **Staff**: 谱表对象
- **Measure**: 小节对象
- **VoiceEntry**: 声部条目
- **Note**: 音符对象

## 坐标系统

### OSMD 坐标

- **y=0** 从顶部谱线开始
- 向下每线增加 **1**
- 高音谱号底部谱线（E）在 **y=4**

### VexFlow 坐标

- **y 值向上递增**
- 顶部谱线 y 值更高
- 默认谱线间距 **10 像素** = OSMD 的 **1 单位**

## 与清谱的关系

理解对象模型是实现以下功能的基础：
- 三色锚线着色（访问 StaffLine 对象）
- 音符高亮（访问 GraphicalNote 对象）
- 交互式光标（遍历 StaffEntry）

## 引用来源
- `../raw/tech-research/20260726_OSMD_ObjectModel.md`

## 关联页面
- [[OSMD]]
- [[OSMD处理流程]]
- [[音符时序提取]]
