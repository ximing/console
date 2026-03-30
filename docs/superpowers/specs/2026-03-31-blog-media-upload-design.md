# 博客编辑器媒体上传增强设计

## 概述

为博客编辑器添加图片、音频、视频本地上传功能，以及外部链接自动识别嵌入功能。

## 背景

当前博客编辑器（TipTap）仅支持通过 URL 方式插入媒体内容，用户无法直接上传本地文件。本设计旨在添加完整的本地上传支持和外链嵌入功能。

## 功能需求

### 1. 本地上传功能

| 媒体类型 | 文件大小限制 | 支持格式 |
|----------|--------------|----------|
| 图片 | 100MB | jpg, jpeg, png, gif, webp, svg |
| 音频 | 300MB | mp3, wav, ogg, aac, flac |
| 视频 | 500MB | mp4, webm, mov |

### 2. 交互方式

- 通过工具栏按钮触发文件选择器
- 上传过程中显示进度条（百分比）
- 上传成功后自动插入编辑器
- 上传失败显示错误提示

### 3. 外链自动识别嵌入

支持的平台及 URL 格式：

| 平台 | URL 格式 | 嵌入方式 |
|------|----------|----------|
| YouTube | `https://www.youtube.com/watch?v=xxx` | iframe |
| Bilibili | `https://www.bilibili.com/video/BVxxx` | iframe |
| 抖音 | `https://www.douyin.com/video/xxx` | iframe |

## 技术方案

### 存储

使用现有 S3/MinIO 存储服务，不新增存储方案。

### API 设计

**Endpoint:** `POST /api/v1/blogs/media/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (文件)
- Field: `type` (可选: `image` | `audio` | `video`)

**Response (成功):**
```json
{
  "success": true,
  "data": {
    "url": "https://s3.xxx.com/bucket/blogs/media/xxx.jpg",
    "filename": "xxx.jpg",
    "size": 1024000,
    "type": "image"
  }
}
```

**Response (失败):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "文件大小超过限制"
  }
}
```

### 文件限制规则

| 类型 | 最大大小 | MIME 类型 |
|------|----------|-----------|
| image | 100MB | image/jpeg, image/png, image/gif, image/webp, image/svg+xml |
| audio | 300MB | audio/mpeg, audio/wav, audio/ogg, audio/aac, audio/flac |
| video | 500MB | video/mp4, video/webm, video/quicktime |

### 文件路径

上传文件存储路径: `{S3_PREFIX}/blogs/media/{uuid}/{filename}`

**说明:** `S3_PREFIX` 是现有的环境变量（`S3_PREFIX`），复用现有 S3 配置。

### 认证

该接口需要用户认证，使用现有的 `authMiddleware` 中间件校验 JWT token。

### StorageService 接口

复用 `StorageService.uploadFile` 方法，签名如下：

```typescript
uploadFile(
  file: Express.Multer.File,
  options: {
    bucket?: string;           // 可选，默认使用 ATTACHMENT_S3_BUCKET 或 S3_BUCKET
    prefix?: string;           // 可选，默认 'blogs/media'
    filename?: string;         // 可选，默认使用 uuid 生成的文件名
  }
): Promise<{ url: string; filename: string; size: number; mimetype: string }>
```

## 组件设计

### EditorToolbar 修改

新增按钮：
- 图片上传按钮 → 触发 `<input type="file" accept="image/*">`
- 音频上传按钮 → 触发 `<input type="file" accept="audio/*">`
- 视频上传按钮 → 触发 `<input type="file" accept="video/*">`
- 外链嵌入按钮 → 弹出输入框，粘贴 URL 自动识别嵌入

### UploadProgress 组件

上传模态框：
- 显示文件名
- 进度条 + 百分比
- 上传成功/失败状态

**上传流程:**

```
用户点击上传按钮
    ↓
选择文件 (input[type=file])
    ↓
前端校验文件类型和大小 (客户端预检)
    ↓
显示进度模态框
    ↓
通过 XHR/Fetch 上传 (支持进度回调)
    ↓
上传完成 → 获取 S3 URL → 插入编辑器
    ↓
关闭进度模态框
```

**注意:** 不支持上传取消，上传一旦开始无法中断（取消按钮仅关闭 UI，不影响实际上传）。

### 外链识别扩展

使用自定义 TipTap 扩展实现外链识别：

**实现方式:** 自定义 `ExternalVideoExtension`，监听 `paste` 事件

**转换时机:** 用户粘贴 URL 时自动检测并转换

**URL 识别正则:**

| 平台 | 正则 | Video ID 提取 |
|------|------|---------------|
| YouTube | `/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=\|youtu\.be\/)([\w-]+)/` | 第3组 |
| Bilibili | `/^https?:\/\/(www\.)?bilibili\.com\/video\/(BV[\w]+)/` | 第2组 |
| 抖音 | `/^https?:\/\/(www\.)?douyin\.com\/video\/([\w]+)/` | 第2组 |

**嵌入方式:** 使用 TipTap 的 `setYoutubeVideo` 类似机制，通过 `iframe` 插入嵌入式播放器。

## 文件结构

```
apps/server/src/
├── controllers/v1/
│   └── blog-media.controller.ts    # 新增
├── services/
│   └── storage.service.ts           # 复用现有方法
├── routes/v1/
│   └── blog.routes.ts               # 添加路由
└── config/
    └── upload.config.ts             # 新增: 上传配置

apps/web/src/pages/blogs/
├── components/
│   └── editor-toolbar.tsx          # 修改
├── services/
│   └── media-upload.service.ts     # 新增
└── hooks/
    └── use-media-upload.ts         # 新增
```

## 实现步骤

1. **服务端**
   - 创建 `blog-media.controller.ts`
   - 添加 `/api/v1/blogs/media/upload` 路由
   - 复用 `StorageService.uploadFile` 方法
   - 添加文件类型和大小校验

2. **前端**
   - 创建 `media-upload.service.ts`
   - 创建 `use-media-upload.ts` hook
   - 修改 `editor-toolbar.tsx` 添加上传按钮
   - 实现外链 URL 自动识别和嵌入

3. **集成测试**
   - 测试各类型文件上传
   - 测试进度条显示
   - 测试外链识别嵌入

## 错误处理

| 错误类型 | HTTP Code | Error Code | 说明 |
|----------|-----------|------------|------|
| 文件类型不支持 | 400 | INVALID_FILE_TYPE | 客户端预检 + 服务端校验 |
| 文件大小超限 | 400 | FILE_TOO_LARGE | 客户端预检 + 服务端校验 |
| 上传失败 | 500 | UPLOAD_FAILED | S3 上传错误 |
| 未认证 | 401 | UNAUTHORIZED | authMiddleware 拦截 |
