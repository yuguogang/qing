# 清谱 v2 大版本改造计划

## 一、背景与目标

以 OSMD 官方仓库 `opensheetmusicdisplay/opensheetmusicdisplay` 为基础，fork 其 demo 架构，替换头部控制面板为「清谱」专属功能面板，叠加三色锚线、浅雅七色谱、虚拟键盘练习、MIDI 播放等核心功能。

### 核心目标
1. 保留 OSMD 官方 demo 的大气简洁布局（全宽乐谱、暖橙棕主题、侧边栏控制面板）
2. 替换 demo 头部控制框为清谱专属控制面板
3. 叠加清谱核心功能：显示模式、练习模式、虚拟键盘、MIDI、自动滚动

---

## 二、OSMD Demo 架构分析

### 2.1 技术栈
| 项目 | OSMD Demo | 清谱当前 |
|------|-----------|----------|
| 框架 | 纯 HTML/JS + Webpack | Next.js 16 + React 19 |
| UI 库 | Semantic UI (CDN) | shadcn/ui + Tailwind CSS 4 |
| 端口 | 8000 (webpack-dev-server) | 5000 (Next.js) |
| 包管理 | npm | pnpm |
| 语言 | JavaScript | TypeScript 5 |

### 2.2 Demo 文件结构
```
demo/
├── index.html          # 主页面，含 Semantic UI 控件
├── index.js            # 主逻辑：OSMD 初始化、控件事件、光标、缩放、导出
├── demo.css            # 样式：暖橙棕主题、响应式布局
├── embedded_demo.html  # 嵌入式 demo
└── resources/          # 图标资源
```

### 2.3 Demo 布局结构
```
┌──────────────────────────────────────────────┐
│ topBar                                        │
│  ┌─ selectSampleContainer (曲谱选择) ──────┐  │
│  ├─ header (Logo + 标题)                   │  │
│  └─ versionDiv (版本号)                    │  │
├────────┬─────────────────────────────────────┤
│divControls (侧边栏，360px，可折叠)           │
│  ├─ zoomControls (缩放)                     │
│  ├─ cursorControls (光标：显示/隐藏/前后)    │
│  ├─ selectBounding (调试：边框显示)          │
│  ├─ debugControls (调试：重渲染/清除)        │
│  ├─ pageSize (页面尺寸)                     │
│  └─ transpose (移调)                        │
├────────┴─────────────────────────────────────┤
│ osmdCanvasDiv (乐谱渲染区，全宽)              │
│                                               │
└──────────────────────────────────────────────┘
```

### 2.4 关键 API（OSMD 内部）
| API | 用途 |
|-----|------|
| `osmd.cursor.show()` / `hide()` | 光标显隐 |
| `osmd.cursor.next()` | 光标前进一个音符 |
| `osmd.cursor.reset()` | 光标重置 |
| `osmd.cursor.Iterator` | 音符迭代器（MusicPartManagerIterator） |
| `iterator.CurrentVoiceEntries` | 当前位置的所有声部音符 |
| `iterator.moveToNext()` | 移动到下一个位置 |
| `iterator.currentTimeStamp` | 当前时间戳（RealNoteTimestamp） |
| `osmd.EngravingRules.StaffLineColor` | 五线谱线颜色（全局） |
| `osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem` | 每行小节数 |
| `osmd.zoom` | 缩放比例 |
| `osmd.setOptions()` | 设置渲染选项 |
| `osmd.render()` | 重新渲染 |
| `osmd.graphic` | 图形化乐谱对象（GraphicSheet） |
| `note.sourceNote.NoteheadColor` | 音符符头颜色（公开 getter/setter） |
| `osmd.Sheet` | 数据模型（MusicSheet） |

---

## 三、改造方案

### 方案选择：在 OSMD Demo 基础上改造（而非在 Next.js 中嵌入）

**理由**：
- OSMD demo 已经完美处理了 OSMD 的渲染生命周期、缩放、光标、导出等
- 纯 HTML/JS 架构更轻量，与 OSMD 内部 API 交互更直接
- 避免 Next.js SSR 与 OSMD DOM 操作的兼容问题
- 可以直接使用 OSMD 的 webpack 构建链

### 3.1 项目结构（改造后）

```
opensheetmusicdisplay/
├── demo/
│   ├── index.html              # 【改造】主页面
│   ├── index.js                # 【改造】主逻辑
│   ├── demo.css                # 【保留+扩展】样式
│   ├── qingpu/                 # 【新增】清谱专属模块
│   │   ├── controls.js         #   控制面板逻辑
│   │   ├── controls.css        #   控制面板样式
│   │   ├── practice.js         #   练习模式控制器
│   │   ├── anchor-lines.js     #   三色锚线
│   │   ├── color-spectrum.js   #   浅雅七色谱
│   │   ├── virtual-keyboard.js #   虚拟键盘
│   │   ├── midi-player.js      #   MIDI 播放器
│   │   ├── audio-engine.js     #   音频合成
│   │   └── auto-scroll.js      #   自动滚动
│   └── resources/              # 【保留+扩展】图标资源
├── src/                        # 【不动】OSMD 源码
├── build/                      # 【不动】构建输出
└── package.json                # 【扩展】新增依赖
```

### 3.2 控制面板改造

**替换前（OSMD Demo 侧边栏）**：
- 缩放按钮
- 光标控制（显示/隐藏/前进/后退/重置）
- 调试选项（边框显示/Skyline/Bottomline）
- 页面尺寸
- 移调

**替换后（清谱整体布局）**：

```
┌──────────────────────────────────────────────────────────┐
│ 🎹 清谱 QingPu v2.0    [曲谱▼] [标准|锚线|七色]         │ ← 顶部栏
│ [浏览|跟弹|视奏]  BPM 120 [──●──]  缩放 100% [─●─]      │   一行紧凑
├──────────────────────────────────────────────────────────┤
│                                                           │
│                                                           │
│                                                           │
│                    🎼  乐 谱 展 示 区                      │
│               （占屏幕 70%+，自动滚动居中）                │
│                                                           │
│                                                           │
│                                                           │
│                                                           │
├──────────────────────────────────────────────────────────┤
│ 连击: 0  完美: 0  良好: 0  偏差: 0  准确率: --%          │ ← 统计条
├──────────────────────────────────────────────────────────┤
│ 🎹 │█│ │█│ │█│ │█│ │█│ │█│ │█│ │█│ │█│ │█│ │█│ ...     │ ← 虚拟键盘
└──────────────────────────────────────────────────────────┘
```

**布局原则**：
- **顶部栏（~48px）**：一行紧凑控制栏，Logo + 曲谱选择 + 显示模式 + 练习模式 + BPM + 缩放，不占乐谱空间
- **乐谱区（~70% 视口）**：绝对主角，全宽展示，练习时自动滚动保持当前音符居中
- **统计条（~32px）**：一行显示连击/完美/良好/偏差/准确率
- **虚拟键盘（~120px，可折叠）**：钢琴键布局，练习时高亮对应音符，可收起

### 3.3 自动滚动实现

练习时乐谱自动滚动，保持当前演奏位置在屏幕中央：

```
方案：基于 cursor.Iterator 当前位置，计算对应音符在 SVG 中的 Y 坐标，
     使用 scrollTo({ top: noteY - viewportHeight/2, behavior: 'smooth' })
```

**实现步骤**：
1. 通过 `cursor.Iterator` 获取当前音符位置
2. 从 `osmd.graphic` 获取对应 `GraphicalNote` 的 SVG 元素
3. 通过 `getBoundingClientRect()` 获取音符在页面中的位置
4. 计算滚动偏移量：`noteY - containerHeight / 2`
5. 使用 `requestAnimationFrame` 平滑滚动

### 3.4 技术依赖

新增 npm 依赖：
- `tone` (Web Audio 合成，替代自建 audio-engine)
- `webmidi` (MIDI 文件解析与播放)
- 保留 Semantic UI CSS (CDN)

---

## 四、实施步骤

### Phase 1：基础架构搭建
- [ ] 1.1 Clone OSMD 仓库到工作目录
- [ ] 1.2 安装依赖 (`npm install`)
- [ ] 1.3 验证 demo 可运行 (`npm start` → localhost:8000)
- [ ] 1.4 创建 `demo/qingpu/` 目录结构
- [ ] 1.5 创建 `.coze` 配置文件（适配沙箱环境）

### Phase 2：控制面板改造
- [ ] 2.1 移除 demo 原有调试控件（cursor/bounding/debug/transpose）
- [ ] 2.2 实现清谱控制面板 HTML 结构
- [ ] 2.3 实现控制面板 CSS 样式（保持暖橙棕主题）
- [ ] 2.4 实现曲谱选择（下拉 + 拖拽上传）
- [ ] 2.5 实现缩放控制

### Phase 3：显示模式
- [ ] 3.1 实现三色锚线模式（移植现有 SVG 扫描逻辑）
- [ ] 3.2 实现浅雅七色谱模式（使用 `Note.NoteheadColor` API）
- [ ] 3.3 实现标准模式（无额外渲染）
- [ ] 3.4 模式切换联动（切换后自动 re-render）

### Phase 4：练习模式
- [ ] 4.1 移植 PracticeController 到 `practice.js`
- [ ] 4.2 实现跟弹模式（光标 + 节拍检测 + 键盘输入）
- [ ] 4.3 实现视奏模式（光标 + 节拍检测 + 键盘输入，无伴奏）
- [ ] 4.4 实现 BPM 调节滑块
- [ ] 4.5 实现练习统计面板（连击/完美/良好/偏差/准确率）

### Phase 5：虚拟键盘
- [ ] 5.1 实现虚拟键盘 UI（钢琴键布局）
- [ ] 5.2 实现按键高亮（练习时对应音符亮起）
- [ ] 5.3 实现键盘尺寸调节（大/中/小）
- [ ] 5.4 实现键盘显隐开关

### Phase 6：MIDI 播放
- [ ] 6.1 集成 webmidi 库
- [ ] 6.2 实现 MIDI 文件加载
- [ ] 6.3 实现 MIDI 播放/暂停
- [ ] 6.4 实现 MIDI 与光标同步

### Phase 7：自动滚动
- [ ] 7.1 实现音符位置计算
- [ ] 7.2 实现平滑自动滚动
- [ ] 7.3 练习模式自动启用滚动
- [ ] 7.4 浏览模式可手动滚动

### Phase 8：验证与交付
- [ ] 8.1 静态检查 (lint + ts-check)
- [ ] 8.2 功能验证（各模式切换、练习流程）
- [ ] 8.3 更新 AGENTS.md
- [ ] 8.4 更新 DESIGN.md

---

## 五、风险与注意事项

1. **OSMD 版本**：当前 `develop` 分支可能包含未发布的 API 变更，建议锁定版本
2. **npm vs pnpm**：OSMD 使用 npm，沙箱环境推荐 pnpm。需要评估兼容性
3. **端口冲突**：OSMD demo 默认 8000，沙箱要求 5000，需要修改 webpack 配置
4. **Semantic UI**：CDN 加载可能受网络影响，考虑本地化
5. **自动滚动精度**：OSMD 渲染后 SVG 坐标可能与页面坐标有偏移，需要校准
