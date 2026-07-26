# OSMD Testing - 原始素材

来源: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Testing

## 视觉回归测试 (Visual Regression Tests)

仅支持 Unix/Mac/WSL2。

自动生成所有示例乐谱的 PNG 图片，并与"基准"图片对比，检测视觉变化。

对比图例：
- 灰色 = 两张图共有（未变化）
- 红色 = 基准图有、当前图缺失
- 黑色（红框）= 当前图有、基准图没有

### 使用方式

```bash
# 一键测试（需先生成基准图 npm run generate:blessed）
npm run test:visual:build

# 分步执行
npm run build          # 每次修改后需要重新构建
npm run generate:blessed  # 生成基准图
npm run test:visual       # 对比当前与基准
```

### 流程

1. 将 OSMD 恢复到对比基准状态（如 checkout develop）
2. `npm install`
3. `npm run build`
4. `npm run generate:blessed`
5. 切换到修改后的代码
6. `npm run build`
7. `npm run test:visual`

## 单元测试

测试文件位于 `test/` 目录，镜像 `src/` 结构，文件名以 `_Test` 结尾。
