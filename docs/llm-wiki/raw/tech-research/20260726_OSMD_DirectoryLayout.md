# OSMD Directory Layout & Code Structure - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Directory-Layout-and-Code-Structure

## 目录结构

| 目录 | 说明 |
|------|------|
| `build/` | 构建产物 |
| `dist/` | TypeScript → JavaScript 转译输出 |
| `src/` | 全部源代码 |
| `test/` | 测试代码和资源（镜像 src 结构，文件名 `_Test` 后缀） |
| `test/data/` | 示例 MusicXML 文档 |
| `demo/` | 示例乐谱浏览器代码 |
| `external/` | VexFlow 类型定义 |
| `node_modules/` | npm 依赖（构建后出现） |
| `typings/` | 依赖类型定义（构建后出现） |

## 源码结构 (src/)

### Common/
- **DataObjects**: 基础数据对象（分数、点、矩形、颜色等）
- **Enums**: 字体和文本样式常量
- **FileIO**: .xml 和 .mxl 文件处理
- **Logging.ts**: 信息和调试日志

### MusicalScore/
- **Graphical**: 图形对象定义（**与 VexFlow 无关**）
  - `GraphicalNote` — Note 的图形对应物
- **ScoreIO**: MusicXML 读取和解析
- **MusicSheet**: 乐谱数据模型
- **VoiceData**: 声部数据

### 关键类
- `OpenSheetMusicDisplay` — 主入口类
- `MusicSheetReader` — MusicXML 解析器
- `EngravingRules` — 渲染规则配置
- `Cursor` — 光标控制
