# MuseScore 命令行转谱方案调研

- 来源: musescore.org handbook
- 日期: 2026-07-24
- 状态: 已验证

## 核心方案

### MuseScore CLI 转换
MuseScore 支持命令行批量转换文件格式：
```bash
# Linux/Mac
mscore input.mscz -o output.musicxml
mscore input.mscz -o output.pdf
mscore input.mscz -o output.svg
mscore input.mscz -o output.midi

# Windows
MuseScore4.exe input.mscz -o output.musicxml
```

### 支持的导出格式
- MusicXML（.musicxml, .xml）
- MIDI（.mid）
- PDF / PNG / SVG
- OGG / MP3 / FLAC / WAV

### 云端部署方案
1. **Docker 封装**: 将 MuseScore 打包为 Docker 镜像
2. **任务队列**: 使用 Bull/BullMQ (Node.js) 管理转谱任务
3. **流程**: 用户上传 mscz → 入队列 → Worker 调用 MuseScore CLI → 输出 MusicXML → 存入对象存储
4. **扩容**: Docker Compose / K8s 水平扩展 Worker

### 注意事项
- MuseScore 4 基于 Qt，Docker 镜像体积较大（~500MB+）
- 需要 Xvfb（虚拟显示）运行 headless 模式
- 并发转谱需注意内存占用
- **版权**: MuseScore 本身为 GPL v3，但仅作为服务端工具使用（不修改源码、不分发），不触发 GPL 传染

### 替代方案
- **musicxml2musicxml**: 纯 JS 的 MusicXML 解析/转换库
- **直接解析 mscz**: mscz 本质是 zip 包含 mscx（XML格式），可解压后直接解析
  - 优势: 无需安装 MuseScore
  - 劣势: 需要自行实现解析逻辑，工作量大

### 推荐方案
**Docker + MuseScore CLI** 为 V1.0 方案，稳定可靠。
长期可探索纯 JS 解析 mscz 的轻量化方案。
