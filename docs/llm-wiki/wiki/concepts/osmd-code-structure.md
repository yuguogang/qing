---
title: OSMD 代码结构
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_DirectoryLayout.md, raw/tech-research/20260726_OSMD_ClassDocumentation.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD 代码结构

## 目录布局

| 目录 | 说明 |
|------|------|
| `src/` | 全部源码 |
| `src/Common/` | 基础数据对象、枚举、文件IO、日志 |
| `src/MusicalScore/` | 乐谱核心逻辑 |
| `src/MusicalScore/Graphical/` | 图形对象（与 VexFlow 无关） |
| `src/MusicalScore/ScoreIO/` | MusicXML 读取解析 |
| `test/` | 测试（镜像 src 结构，`_Test` 后缀） |
| `demo/` | 示例浏览器 |
| `build/` | 构建产物 |

## 关键类

- **OpenSheetMusicDisplay** — 主入口，构造/加载/渲染
- **MusicSheetReader** — MusicXML 解析器（`createMusicSheet`）
- **EngravingRules** — 渲染规则（线宽、颜色、间距）
- **Cursor** — 播放光标
- **GraphicalNote** — Note 的图形对应物
- **TransposeCalculator** — 移调计算器

## API 文档

自动生成：https://opensheetmusicdisplay.github.io/classdoc/

## 关联页面

- [[OSMD]]
- [[OSMD构建与调试]]
- [[OSMD对象模型]]
