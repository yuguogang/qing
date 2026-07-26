# OSMD Class Documentation - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Class-Documentation

## 自动生成文档

OSMD 提供自动生成的类文档，托管在 GitHub Pages：
https://opensheetmusicdisplay.github.io/classdoc/

该文档从 TypeScript 源码注释自动生成，覆盖所有公开 API。

## 关键 API 类

- **OpenSheetMusicDisplay**: 主入口，构造、加载、渲染
- **IOSMDOptions**: 配置选项接口
- **EngravingRules**: 渲染规则（线宽、颜色、间距等）
- **Cursor**: 播放光标
- **MusicSheet**: 乐谱数据模型
- **MusicSheetReader**: MusicXML 读取器
- **GraphicalMusicSheet**: 图形化乐谱
- **Note**: 音符对象（含 NoteheadColor、TransposedPitch）
- **TransposeCalculator**: 移调计算器

## 使用方式

在开发时查阅类文档以了解方法签名、参数类型和返回值。
