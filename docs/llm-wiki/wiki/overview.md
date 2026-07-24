---
title: 清谱项目知识图谱 - 全局概览
status: ready
owners: 清谱项目组
source_count: 6
last_reviewed: 2026-07-24
sensitivity: internal
---

# 清谱 (QingPu) 项目知识图谱

## 摘要
本 Wiki 基于 Karpathy LLM Wiki 模式构建，系统性整理清谱项目的技术选型、竞品分析、知识产权、架构决策等核心知识。服务于项目决策、开发实施和风险控制。

## 项目定位
国内首款三色锚线标准五线谱交互式练琴产品，聚焦「练琴即识谱」，与 Simply Piano 形成错位互补。

## 知识图谱结构

### 核心概念 (concepts/)
- [[三色锚线识谱法]] — 核心差异化技术原理
- [[乐谱渲染引擎对比]] — OSMD vs alphaTab vs VexFlow 技术选型
- [[实时拾音纠错]] — MIDI + 麦克风双通道技术方案
- [[云端转谱架构]] — mscz → MusicXML → 三色谱渲染链路

### 实体页 (entities/)
- [[OSMD]] — OpenSheetMusicDisplay 引擎详情
- [[alphaTab]] — 备选渲染引擎评估
- [[VexFlow]] — 底层渲染库能力边界
- [[Simply Piano]] — 核心竞品分析

### 决策记录 (decisions/)
- [[渲染引擎选型决策]] — 为什么选 OSMD 而非 alphaTab
- [[三色锚线 IP 风险]] — 版权授权与合规方案
- [[V1.0 范围裁剪]] — MVP 功能优先级与工期修正

### 故障/风险 (incidents/)
- 暂无

## 核心链接索引
- 原始素材: `../raw/tech-research/`, `../raw/competitor-analysis/`, `../raw/ip-legal/`
- 决策记录: `./decisions/`
- 概念页面: `./concepts/`

## 关联页面
- [[三色锚线识谱法]] ↔ [[乐谱渲染引擎对比]] ↔ [[云端转谱架构]]
- [[渲染引擎选型决策]] → [[OSMD]], [[VexFlow]]
- [[三色锚线 IP 风险]] → [[三色锚线识谱法]]
