# OSMD Getting Started - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Getting-Started

## 快速开始 (Plain Javascript/HTML)

```html
<div id="osmdContainer"/>
<script src="opensheetmusicdisplay.min.js"></script>
<script>
  var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdContainer");
  osmd.setOptions({
    backend: "svg",
    drawTitle: true,
    // drawingParameters: "compacttight"
  });
  osmd.load("http://downloads2.makemusic.com/musicxml/MozaVeilSample.xml")
    .then(function() {
      osmd.render();
    });
</script>
```

## 导入方式

- webpack: https://github.com/opensheetmusicdisplay/webpack-usage-example
- SystemJS: https://github.com/opensheetmusicdisplay/systemjs-usage-example
- Plain Javascript/HTML: https://github.com/opensheetmusicdisplay/RawJavascript-usage-example
- Vue: https://github.com/nicolas-cardona/vuejs2-opensheetmusicdisplay
- React Component (WIP): https://github.com/opensheetmusicdisplay/react-opensheetmusicdisplay

npm 包: https://www.npmjs.com/package/opensheetmusicdisplay

## 移动端和服务端

- 移动端: 使用 WebView 加载 OSMD
- 服务端生成 PNG/SVG: 使用 node 脚本浏览器less生成

## OSMD 选项

```javascript
var osmd = new OpenSheetMusicDisplay(div, {
  autoResize: false,
  backend: "canvas",
  drawingParameters: "compacttight",
  drawTitle: false,
  pageFormat: "A4_P",
});
```

选项接口: IOSMDOptions (OSMDOptions.ts)

运行时修改选项: `osmd.setOptions(optionsObject)`

### EngravingRules 修改

```javascript
osmd.EngravingRules.StaffLineColor = "#AABBAA";
```

### 自动调整大小

默认启用,可关闭: `{autoResize: false}`

### 乐器/声部选择

可选择不渲染某些声部,详见 Exploring the Demo 页面
