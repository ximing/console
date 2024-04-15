# 设置功能说明

## 功能概述

用户可以在设置页面管理个人信息，包括：
- 修改用户名
- 上传和更换头像

## 技术实现

### 前端

1. **设置页面结构**
   - 左侧菜单导航（可扩展）
   - 右侧内容区域（路由控制）
   - 当前实现：个人信息设置

2. **用户信息设置组件** (`/settings/user`)
   - 头像上传（支持 JPG、PNG，最大 5MB）
   - 用户名编辑
   - 邮箱显示（只读）

3. **路由结构**
   ```
   /settings           -> 重定向到 /settings/user
   /settings/user      -> 个人信息设置
   /settings/*         -> 可扩展其他设置页面
   ```

### 后端

1. **MinIO 存储服务** (`StorageService`)
   - 文件上传到 MinIO S3
   - 生成临时访问链接（presigned URL，有效期 7 天）
   - 文件删除（更换头像时删除旧文件）
   - 私有存储桶，确保安全性

2. **API 端点**
   - `GET /api/v1/user/info` - 获取用户信息
   - `PUT /api/v1/user/info` - 更新用户名
   - `POST /api/v1/user/avatar` - 上传头像

3. **数据存储**
   - 用户名存储在 MySQL `users` 表
   - 头像存储在 MinIO，数据库只存储对象键（object key）
   - 每次返回用户信息时动态生成临时访问链接

## 开发环境设置

### 1. 启动 MinIO 和 MySQL

```bash
docker-compose -f docker-compose.dev.yml up -d
```

这将启动：
- MinIO：http://localhost:9000 (API) 和 http://localhost:9001 (Console)
- MySQL：localhost:3306

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置 MinIO：

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=avatars
```

### 3. 访问 MinIO Console

- URL: http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin

首次使用时，`avatars` 存储桶会自动创建。

## 使用说明

### 修改用户名

1. 登录后点击左侧边栏的"设置"图标
2. 在"个人信息"页面编辑用户名
3. 点击"保存更改"按钮

### 上传头像

1. 在"个人信息"页面点击"更换头像"按钮
2. 选择图片文件（JPG 或 PNG，最大 5MB）
3. 上传成功后头像会立即更新
4. 旧头像会自动从存储中删除

## 安全特性

1. **私有存储**
   - MinIO 存储桶为私有
   - 文件不可直接访问

2. **临时链接**
   - 使用 presigned URL 提供临时访问
   - 默认有效期 7 天
   - 链接过期后自动失效

3. **文件验证**
   - 只允许上传图片文件
   - 文件大小限制 5MB
   - 服务端验证文件类型

## 扩展设置页面

要添加新的设置页面：

1. 在 `settings.tsx` 的 `menuItems` 数组中添加菜单项：
```typescript
{
  id: 'security',
  label: '安全设置',
  icon: Shield,
  path: '/settings/security',
}
```

2. 创建组件 `components/security-settings.tsx`

3. 在 `settings.tsx` 的路由中添加：
```typescript
<Route path="/security" element={<SecuritySettings />} />
```

## 注意事项

1. MinIO 必须正确配置才能使用头像上传功能
2. 如果 MinIO 未配置，用户仍可修改用户名
3. 头像链接有效期为 7 天，过期后需要重新生成
4. 数据库只存储 MinIO 对象键，不存储完整 URL
