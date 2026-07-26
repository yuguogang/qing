# OSMD Build Instructions - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Build-Instructions

## 前置条件

- Node.js (推荐 Node 14)
- npm

## 构建步骤

```bash
git clone https://github.com/opensheetmusicdisplay/opensheetmusicdisplay.git
cd opensheetmusicdisplay
npm install
```

如果 Mac/Linux 上 npm install 报错：
```bash
CXX=gcc-10 npm i
```

如果仍然失败，降级 Node 到 14（`nvm use 14`）或 Python 到 3.8。

## 构建产物

```bash
npm run build
```

产物：`build/opensheetmusicdisplay.min.js`

## 常见问题

- `EINVAL` 错误：`npm cache clean --force` 或删除 node_modules 重装
- `npm install` 会自动执行 `npm build`
- 如果 package.json 未变更，无需重新 `npm install`
