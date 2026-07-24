# alphaTab 乐谱渲染引擎调研

- 来源: alphatab.net, GitCode, CSDN, NuGet
- 日期: 2026-07-24
- 状态: 已验证

## 核心信息

### 技术栈
- **语言**: TypeScript
- **支持格式**: Guitar Pro 3-8, MusicXML（实验性）, Capella, alphaTex
- **渲染方式**: SVG / HTML5 Canvas
- **平台**: Web, .NET, Android
- **内置合成器**: alphaSynth（SoundFont2/3）
- **GitHub Stars**: 1,759

### 核心能力
1. 跨平台渲染（Web/桌面/移动）
2. 内置 MIDI 合成器，支持乐谱播放
3. 支持标准五线谱、吉他谱、鼓谱、数字简谱（jianpu）
4. 响应式布局，自适应屏幕
5. 支持音轨控制、变速、循环
6. 1.4.0 版本新增打击乐谱表、斜线记谱法

### 关键限制
- **MusicXML 支持为实验性**（experimental），不如 Guitar Pro 格式成熟
- **主要定位**: 吉他谱/贝斯谱渲染，非钢琴五线谱专用
- 钢琴五线谱渲染能力存在，但不是核心优化方向

### 与 OSMD 对比
| 维度 | alphaTab | OSMD |
|------|----------|------|
| 核心定位 | 吉他谱/贝斯谱 | 标准五线谱 |
| MusicXML | 实验性支持 | 完整支持（核心功能）|
| 底层引擎 | 自研渲染 | 基于 VexFlow |
| 内置播放 | ✅ alphaSynth | ❌ 需外部音频 |
| 钢琴谱优化 | 一般 | 优秀 |
| 自定义样式 | 有限 | 通过 VexFlow 高度可定制 |
| 社区规模 | 1.7k stars | 更大，PhonicScore 维护 |

### 结论
**对于清谱项目，OSMD 是更优选择**：
1. 钢琴五线谱是核心场景，OSMD 专门为此优化
2. MusicXML 是核心交换格式，OSMD 完整支持
3. VexFlow 底层提供更强的样式定制能力（对三色锚线至关重要）
4. alphaTab 的 MusicXML 实验性支持是重大风险
