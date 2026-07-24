---
title: 云端转谱架构
status: ready
source_count: 2
last_reviewed: 2026-07-24
---

# 云端 MuseScore 转谱渲染服务

## 摘要
用户 mscz 乐谱上传 → 云端 MuseScore 解析 → MusicXML 输出 → 前端 OSMD 三色锚线渲染的完整链路设计。

## 架构流程

```
用户上传 mscz
     ↓
[任务队列] Bull/BullMQ
     ↓
[Worker] Docker + MuseScore CLI
  mscore input.mscz -o output.musicxml
     ↓
[后处理] 解析 MusicXML → 注入三色锚线元数据
     ↓
[存储] 对象存储 (OSS/S3)
     ↓
[前端] OSMD 加载 MusicXML → 渲染三色锚线谱
```

## 关键技术点

### 1. Docker 封装 MuseScore
```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y musescore4 xvfb
# 使用 Xvfb 实现 headless 运行
ENTRYPOINT ["xvfb-run", "mscore"]
```

### 2. 任务队列设计
- 使用 BullMQ (Redis-based) 管理转谱任务
- 支持优先级（VIP 用户优先）
- 失败重试机制（最多 3 次）
- 进度回调（WebSocket 推送）

### 3. MusicXML 后处理
- 解析 MusicXML 中的音符位置信息
- 根据锚线规则注入颜色标记
- 保留标准 MusicXML 结构（兼容打印/导出）

### 4. 并发与扩容
- 单 Worker 内存占用 ~200MB
- 建议初始 2-3 个 Worker 实例
- 高峰期通过 K8s HPA 自动扩容

## 成本估算
- Docker 镜像: ~500MB
- 单文件转谱耗时: 3-10秒
- 服务器: 2C4G 起步，支持 ~10 并发转谱

## 引用来源
- `../../raw/tech-research/20260724_MuseScore_Conversion.md`

## 关联页面
- [[OSMD]]
- [[乐谱渲染引擎对比]]
