# 清谱 QingPu v2.0

基于 OSMD (OpenSheetMusicDisplay) 的钢琴练习应用，支持跟弹/视奏模式、三色锚线识谱、浅雅七色谱渲染。

## 核心定位

本项目主打国内首款三色锚线标准五线谱交互式练琴产品——清谱。彻底区别于 Simply Piano 等传统练琴软件，不走"弱化五线谱、游戏化快速弹曲"的轻量化入门路线，聚焦全年龄段（特别是成人自学、琴行教学）核心痛点：识谱难、记谱难、脱离软件不会识谱、上下加一线认音卡顿。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **乐谱渲染**: opensheetmusicdisplay ^2.1.0
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **主题色**: 暖橙棕 `#d25701`

## 快速开始

### 启动开发服务器

```bash
pnpm install
pnpm dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。

### 构建生产版本

```bash
pnpm build
```

## 项目结构

```
src/
├── app/                      # Next.js App Router 目录
│   ├── globals.css          # 全局样式 + 主题变量 + OSMD 覆盖
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 主页面（v2 布局入口）
├── components/              # React 组件目录
│   ├── ui/                  # shadcn/ui 基础组件
│   ├── ScoreViewer.tsx      # 乐谱显示（OSMD 渲染 + 光标 + 自动滚动）
│   ├── VirtualKeyboard.tsx  # 虚拟钢琴键盘
│   └── PracticeStats.tsx    # 练习统计面板
├── hooks/                   # 自定义 React Hooks
│   ├── use-practice.ts      # 练习模式 Hook
│   └── useMIDI.ts           # MIDI 设备 Hook
└── lib/                     # 工具函数库
    ├── osmd-utils.ts        # OSMD 工具（创建实例、加载、锚线着色）
    ├── spectrum-colors.ts   # 浅雅七色谱（按音高着色）
    ├── practice-controller.ts # 练习控制器
    ├── audio-engine.ts      # Web Audio 音频引擎
    └── utils.ts             # 通用工具函数
```

## 核心功能

### 显示模式

| 模式 | 说明 |
|------|------|
| 标准 | 原始黑白乐谱 |
| 三色锚线 | 三条彩色基准线辅助识谱 |
| 浅雅七色 | 按音高（C-B）七彩着色 |

### 练习模式

- **浏览**：自由查看乐谱
- **跟弹**：伴奏 + 用户按键 + 节拍判定
- **视奏**：节拍光标 + 用户按键 + 节拍判定

### 节拍判定规则

- **完美 (Perfect)**: ±100ms 内按下正确键
- **良好 (Good)**: ±100-300ms 内按下正确键
- **偏差 (Miss)**: >±300ms 或按错键

## 开发规范

- **必须使用 pnpm** 作为包管理器
- **优先使用 shadcn/ui 组件**
- **遵循 Next.js App Router 规范**
- **使用 TypeScript** 进行类型安全开发
- **使用 `@/` 路径别名** 导入模块

## 参考文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [shadcn/ui 组件文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [OSMD 文档](https://opensheetmusicdisplay.github.io/)
