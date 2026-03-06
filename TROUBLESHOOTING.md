# 故障排除指南

## 常见问题

### 1. "Uncaught SyntaxError: Invalid or unexpected token"

**原因**: Vite 缓存问题或模块导入错误

**解决方案**:
```bash
# 清除 Vite 缓存
cd apps/web
rm -rf node_modules/.vite
rm -rf dist

# 重新启动开发服务器
pnpm dev
```

### 2. 头像上传失败

**可能原因**:
- MinIO 未启动
- MinIO 配置错误
- 文件类型不支持
- 文件大小超过限制

**检查步骤**:

1. 确认 MinIO 正在运行:
```bash
docker-compose -f docker-compose.dev.yml ps
```

2. 检查 MinIO 可访问性:
```bash
curl http://localhost:9000/minio/health/live
```

3. 检查环境变量:
```bash
# apps/server/.env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=avatars
```

4. 查看后端日志:
```bash
# 应该看到 "MinIO client initialized successfully"
```

### 3. 用户信息更新失败

**检查步骤**:

1. 确认已登录（检查 localStorage）:
```javascript
// 在浏览器控制台
localStorage.getItem('aimo_token')
localStorage.getItem('user')
```

2. 检查网络请求:
- 打开浏览器开发者工具 -> Network
- 查看 API 请求状态码
- 检查请求头是否包含 Authorization

3. 检查后端日志:
```bash
# 查看是否有错误日志
```

### 4. TypeScript 类型错误

**解决方案**:
```bash
# 重新构建 DTO 包
cd packages/dto
pnpm build

# 检查类型
cd apps/web
pnpm typecheck

cd apps/server
pnpm typecheck
```

### 5. 设置页面路由不工作

**检查步骤**:

1. 确认路由已注册:
```typescript
// apps/web/src/App.tsx
<Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
```

2. 确认 Layout 中的设置按钮:
```typescript
// 点击设置按钮应该导航到 /settings/user
navigate(`/settings${search}`);
```

3. 检查浏览器控制台是否有路由错误

## 开发环境设置

### 完整启动流程

1. **启动数据库和存储服务**:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **配置环境变量**:
```bash
# 复制示例配置
cp apps/server/.env.example apps/server/.env

# 编辑 .env 文件，确保 MinIO 配置正确
```

3. **安装依赖**:
```bash
pnpm install
```

4. **构建 DTO 包**:
```bash
cd packages/dto
pnpm build
cd ../..
```

5. **运行数据库迁移**:
```bash
cd apps/server
pnpm migrate
```

6. **启动开发服务器**:
```bash
# 在项目根目录
pnpm dev
```

### 验证服务状态

**检查 MinIO**:
- Web UI: http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin

**检查 MySQL**:
```bash
mysql -h localhost -u root -p
# 输入密码（默认为空或 root）
use aimo;
show tables;
```

**检查后端**:
```bash
curl http://localhost:3002/api/v1/user/info \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**检查前端**:
- 访问: http://localhost:5273
- 登录后访问: http://localhost:5273/settings/user

## 调试技巧

### 前端调试

1. **查看状态管理**:
```javascript
// 在浏览器控制台
// 查看 AuthService 状态
localStorage.getItem('user')
localStorage.getItem('aimo_token')
```

2. **查看网络请求**:
- 打开 DevTools -> Network
- 筛选 XHR/Fetch
- 查看请求/响应详情

3. **查看组件状态**:
- 安装 React DevTools
- 查看组件 props 和 state

### 后端调试

1. **查看日志**:
```bash
# 如果使用 Docker
docker-compose -f docker-compose.dev.yml logs -f

# 如果直接运行
# 日志会输出到控制台
```

2. **测试 API**:
```bash
# 注册用户
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# 登录
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 获取用户信息
curl http://localhost:3002/api/v1/user/info \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新用户名
curl -X PUT http://localhost:3002/api/v1/user/info \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname"}'
```

3. **检查数据库**:
```bash
mysql -h localhost -u root -p aimo
```
```sql
-- 查看用户表
SELECT * FROM users;

-- 查看迁移记录
SELECT * FROM __drizzle_migrations;
```

## 性能优化

### 前端

1. **清除缓存**:
```bash
rm -rf apps/web/node_modules/.vite
rm -rf apps/web/dist
```

2. **优化构建**:
```bash
cd apps/web
pnpm build
```

### 后端

1. **检查数据库连接池**:
```typescript
// apps/server/src/config/config.ts
MYSQL_CONNECTION_LIMIT=10  // 调整连接池大小
```

2. **监控 MinIO 性能**:
- 访问 MinIO Console: http://localhost:9001
- 查看 Monitoring 页面

## 获取帮助

如果以上方法都无法解决问题：

1. 检查浏览器控制台错误
2. 检查后端日志
3. 检查 Network 请求详情
4. 确认环境变量配置正确
5. 尝试重启所有服务
