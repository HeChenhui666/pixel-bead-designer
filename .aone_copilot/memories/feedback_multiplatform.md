---
name: 多端兼容要求
description: pixel-bead-designer 项目必须同时兼容 Android、iOS、H5 三端，所有代码需考虑多端适配
type: feedback
createdAt: 2026-06-22T15:39:12
---
pixel-bead-designer 项目必须同时兼容 Android、iOS、H5 三端。

Why: 用户明确要求三端兼容，这是项目的核心约束。

How to apply: 所有组件和工具函数编写时，必须使用 UniApp 条件编译（#ifdef APP-PLUS / #ifdef H5 / #ifdef MP-WEIXIN）处理平台差异；避免使用仅某一端支持的 API；Canvas、文件操作、图片选取等敏感 API 必须提供三端实现或降级方案。
