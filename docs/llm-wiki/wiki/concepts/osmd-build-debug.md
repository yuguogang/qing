---
title: OSMD 构建与调试
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_BuildInstructions.md, raw/tech-research/20260726_OSMD_Debugging.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD 构建与调试

## 构建流程

```bash
git clone https://github.com/opensheetmusicdisplay/opensheetmusicdisplay.git
cd opensheetmusicdisplay
npm install    # 自动执行 npm build
npm run build  # 产出 build/opensheetmusicdisplay.min.js
```

- 推荐 Node 14
- Mac/Linux 报错：`CXX=gcc-10 npm i`
- `EINVAL` 错误：`npm cache clean --force` 或删 node_modules 重装

## 本地 Demo 调试

```bash
npm start     # webpack-dev-server → http://localhost:8000/
```

- 拖放 MusicXML 文件即可渲染
- URL 参数：`?debugControls=0` 隐藏调试控件
- 控制台可访问 `osmd` 对象：`osmd.version`、`osmd.sheet`、`osmd.render()`
- 修改源码后自动热更新

## VSCode 调试

使用 Debugger for Chrome 扩展，配置 launch.json 指向 `http://localhost:8000`，可在 TS 源码设断点。

## 关联页面

- [[OSMD]]
- [[OSMD处理流程]]
- [[OSMD对象模型]]
