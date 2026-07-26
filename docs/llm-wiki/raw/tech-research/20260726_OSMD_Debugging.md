# OSMD Debugging - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Debugging

## 本地 Demo 运行

```bash
npm install   # 首次或 package.json 变更后
npm start     # 启动 webpack-dev-server
# 打开 http://localhost:8000/
```

拖放 MusicXML 文件到窗口即可渲染。

## URL 参数

```
localhost:8000?debugControls=0
```

其他参数见 `demo/index.js`（搜索 `param`，如 `paramShowControls`）。

## 浏览器控制台调试

`osmd` 对象在控制台可访问：
- `osmd.version`
- `osmd.setOptions(...)`
- `osmd.sheet` — 乐谱数据模型
- 每次修改后需调用 `osmd.render()` 才能看到效果

## VSCode 调试

- 使用 VSCode 的 Debugger for Chrome 扩展
- 配置 launch.json 指向 `http://localhost:8000`
- 可在 TypeScript 源码中设置断点

## 热更新

`npm start` 运行 webpack-dev-server，修改源码后自动重编译并刷新浏览器。
