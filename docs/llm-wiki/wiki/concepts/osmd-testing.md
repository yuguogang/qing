---
title: OSMD 测试
status: ready
owners: 清谱项目组
source: raw/tech-research/20260726_OSMD_Testing.md
last_reviewed: 2026-07-26
sensitivity: internal
---

# OSMD 测试

## 视觉回归测试

自动生成所有示例乐谱 PNG，与基准图对比检测视觉变化。

```bash
npm run test:visual:build   # 一键测试
npm run generate:blessed    # 生成基准图
npm run test:visual         # 对比当前与基准
```

对比图例：
- 灰色 = 未变化
- 红色 = 基准有、当前缺失
- 黑色（红框）= 当前有、基准没有

## 单元测试

测试文件位于 `test/`，镜像 `src/` 结构，文件名 `_Test` 后缀。

## 清谱项目参考

- 视觉回归测试思路可用于验证三色锚线/七色谱渲染正确性
- 单元测试覆盖练习控制器节拍判定逻辑

## 关联页面

- [[OSMD]]
- [[OSMD构建与调试]]
