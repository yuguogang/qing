# alphaTab

- **类型**: 实体
- **类别**: 乐谱渲染引擎
- **相关**: [[乐谱渲染引擎对比]], [[渲染引擎选型决策]]

## 基本信息

| 属性 | 值 |
|------|-----|
| 官网 | alphatab.net |
| GitHub | 1.7k stars |
| 协议 | MPL 2.0 |
| 语言 | TypeScript |
| 渲染 | SVG / HTML5 Canvas |

## 核心能力

1. 跨平台渲染（Web / .NET / Android）
2. 内置合成器 alphaSynth（SoundFont2/3）
3. 支持标准五线谱、吉他谱、鼓谱、数字简谱
4. 音轨控制、变速、循环
5. 响应式自适应布局

## 关键限制

- **MusicXML 支持为实验性**（experimental），不如 Guitar Pro 成熟
- **主要定位吉他谱/贝斯谱**，钢琴五线谱非核心优化方向

## 与清谱的关系

[[渲染引擎选型决策|已排除]]。alphaTab 的 MusicXML 实验性支持对以钢琴五线谱为核心的清谱项目是架构风险。
