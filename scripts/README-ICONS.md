# 🎨 Icon 生成工具 - 快速参考

## 🚀 一行命令生成所有 Icon

```bash
pnpm generate:icons
```

## 📦 生成的文件

| 文件                           | 用途              | 大小          |
| ------------------------------ | ----------------- | ------------- |
| `icon.icns`                    | macOS 应用 icon   | 1.6 MB        |
| `icon.ico`                     | Windows 应用 icon | 188 KB        |
| `icon.png`                     | Linux/通用        | 195 KB        |
| `icon_16.png` - `icon_512.png` | 各种尺寸          | 792B - 195 KB |

所有文件位置：`apps/client/build/`

## 🔧 工具要求

- ✅ ImageMagick (已检查安装: `/opt/homebrew/bin/convert`)
- ✅ macOS 时需要 Xcode 命令行工具（用于 ICNS 高质量生成）

## 📋 完整构建流程

```bash
# 1. 生成 Icon（从 assets/logo.png）
pnpm generate:icons

# 2. 构建 Web
pnpm build:web

# 3. 构建 Electron 主进程
pnpm build:client

# 4. 打包安装程序
pnpm --filter @x-console/client dist:mac   # macOS
pnpm --filter @x-console/client dist:win   # Windows
pnpm --filter @x-console/client dist:linux # Linux
```

## 🎯 核心命令解析

### 脚本文件

- `scripts/generate-icons.sh` - 核心生成脚本（bash）
- 使用 ImageMagick `convert` 命令处理图像
- 自动创建多个尺寸和格式

### 配置文件

- `apps/client/electron-builder.yml` - 已预配置正确的 icon 路径
- `package.json` - 添加了 `generate:icons` npm script

## 💡 常见任务

### 重新生成所有 Icon

```bash
# 如果 logo.png 有更新，重新生成
rm -rf apps/client/build/icon*
pnpm generate:icons
```

### 仅查看生成的文件

```bash
ls -lh apps/client/build/icon*
```

### 验证文件格式

```bash
file apps/client/build/icon.icns
file apps/client/build/icon.ico
file apps/client/build/icon.png
```

## ✨ 特点

- ✅ 自动生成所有平台所需的 icon 格式
- ✅ 支持 macOS (.icns)、Windows (.ico)、Linux (.png)
- ✅ 多尺寸生成 (16×16 到 512×512)
- ✅ 基于本地命令行工具（无额外 Node 依赖）
- ✅ 集成到 npm scripts，易于集成 CI/CD

---

详细文档: `scripts/ICON_GENERATION.md`
