# OSMD 处理流程 - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/How-OSMD-processes-Sheet-Music

## 处理流程概览

1. 输入: MusicXML 文档
2. 提取 score-partwise 元素
3. 传递给 MusicSheetReader
4. 生成 MusicSheet 对象
5. 图形化处理
6. 输出: 渲染的乐谱

## 核心代码

```typescript
let path: string = "http://www.example.org/my-sheet-music.xml";
let doc: Document = /* Retrieve the XML document */;
let score: Element = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
let reader: MusicSheetReader = new MusicSheetReader();
let sheet: MusicSheet = reader.createMusicSheet(score, path);
```

## MusicSheetReader.createMusicSheet 方法

- 创建 instrumentReaders
- 初始化 currentFraction (全局时间)
- 确定乐器数量和每行谱表的线数
- 循环读取每个乐器的下一个小节

## 文件路径

- MusicSheetReader: src/MusicalScore/ScoreIO/MusicSheetReader.ts
