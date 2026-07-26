# 项目上下文

## 清谱 QingPu v2.0

基于 OSMD (OpenSheetMusicDisplay) 的钢琴练习应用，支持跟弹/视奏模式、三色锚线识谱、浅雅七色谱渲染。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **乐谱渲染**: opensheetmusicdisplay ^2.1.0
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **主题色**: 暖橙棕 `#d25701`（参考 OSMD 官方 demo）

## 布局架构

```
┌──────────────────────────────────────────────────────┐
│ 🎹 清谱 v2.0  [曲谱▼] [标准|锚线|七色] [模式] BPM  │ ← 顶部栏（可折叠）
├──────────────────────────────────────────────────────┤
│                 🎼  乐谱展示区（70%+）                 │
├──────────────────────────────────────────────────────┤
│ 统计条                                                │
├──────────────────────────────────────────────────────┤
│ 🎹 虚拟键盘（可折叠）                                  │
└──────────────────────────────────────────────────────┘
```

- 顶部栏和底部键盘**独立折叠**，折叠后乐谱接近全屏沉浸
- 练习时乐谱自动滚动，当前音符保持在屏幕中央

## 目录结构

```
├── public/
│   └── scores/              # 示例 MusicXML 曲谱
├── src/
│   ├── app/
│   │   ├── globals.css      # 全局样式 + 主题变量 + OSMD 覆盖
│   │   ├── layout.tsx       # 根布局
│   │   └── page.tsx         # 主页面（v2 布局入口）
│   ├── components/
│   │   ├── ui/              # Shadcn UI 组件库
│   │   ├── ScoreViewer.tsx  # 乐谱显示（OSMD 渲染 + 光标 + 自动滚动）
│   │   ├── VirtualKeyboard.tsx # 虚拟钢琴键盘（可折叠 + 按键高亮）
│   │   └── PracticeStats.tsx   # 练习统计面板
│   ├── hooks/
│   │   ├── use-practice.ts  # 练习模式 Hook
│   │   └── useMIDI.ts       # MIDI 设备 Hook
│   └── lib/
│       ├── osmd-utils.ts    # OSMD 工具（创建实例、加载、锚线着色）
│       ├── spectrum-colors.ts # 浅雅七色谱（按音高着色）
│       ├── practice-controller.ts # 练习控制器（光标、节拍、统计）
│       ├── audio-engine.ts  # Web Audio 音频引擎
│       └── utils.ts         # 通用工具函数
├── PLAN_v2.md               # v2 改造计划文档
├── DESIGN.md                # 设计规范
└── AGENTS.md                # 本文件
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 核心功能模块

### 显示模式（三种）

| 模式 | 说明 | 实现 |
|------|------|------|
| 标准 | 原始黑白乐谱 | 默认 |
| 三色锚线 | 三条彩色基准线辅助识谱 | `osmd-utils.ts` → `applyAnchorColors()` |
| 浅雅七色 | 按音高（C-B）七彩着色 | `spectrum-colors.ts` → `applySpectrumColors()` |

### 练习模式

- **浏览**：自由查看乐谱
- **跟弹**：伴奏 + 用户按键 + 节拍判定
- **视奏**：节拍光标 + 用户按键 + 节拍判定

### 节拍判定规则

- **完美 (Perfect)**: ±100ms 内按下正确键
- **良好 (Good)**: ±100-300ms 内按下正确键
- **偏差 (Miss)**: >±300ms 或按错键

### 自动滚动

练习时每 300ms 检测光标位置，将当前音符滚动到视口中央。

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码
- 禁止隐式 `any` 和 `as any`
- 所有函数参数、返回值必须标注类型

### OSMD 相关注意事项

- `Cursor` 无 `updateWithTimestamp`，使用 `cursor.next()` 手动步进
- `NotesUnderCursor()` 返回 `Note[]`（非 `GraphicalNote[]`）
- `Note.NoteheadColor`（大写 N）是公开 getter/setter
- `cursorsOptions` 必须在构造函数中传入，`setOptions()` 不生效
- Tailwind CSS 的 `img { height: auto }` 会覆盖光标 img 高度，需在 globals.css 中覆盖
