# Electron Icon Generation Guide

使用本地 ImageMagick 命令行工具从 logo.png 生成 Electron 应用所需的各种 icon 格式。

## 快速开始

### 自动生成（推荐）

```bash
# 使用 npm script 生成所有 icon
pnpm generate:icons
```

### 手动生成

```bash
# 直接运行 bash 脚本
bash scripts/generate-icons.sh
```

## 生成的文件

脚本会在 `apps/client/build/` 目录生成以下文件：

### PNG 格式（多种尺寸）
- `icon_16.png` - 16×16 px
- `icon_32.png` - 32×32 px
- `icon_48.png` - 48×48 px
- `icon_64.png` - 64×64 px
- `icon_128.png` - 128×128 px
- `icon_256.png` - 256×256 px
- `icon_512.png` - 512×512 px
- `icon.png` - 512×512 px (主图标)

### 平台特定格式
- `icon.icns` - macOS 格式 (包含多尺寸)
- `icon.ico` - Windows 格式 (包含多尺寸)

## 系统要求

### macOS
```bash
# 安装 ImageMagick
brew install imagemagick
```

### Linux (Ubuntu/Debian)
```bash
# 安装 ImageMagick
sudo apt-get install imagemagick
```

### Linux (Fedora/RHEL)
```bash
# 安装 ImageMagick
sudo dnf install ImageMagick
```

## 配置说明

`electron-builder.yml` 中已配置了正确的 icon 路径：

```yaml
mac:
  icon: build/icon.icns
win:
  icon: build/icon.ico
linux:
  icon: build/icon.png
```

## 构建流程

1. **生成 Icon**
   ```bash
   pnpm generate:icons
   ```

2. **构建 Web 应用**
   ```bash
   pnpm build:web
   ```

3. **构建 Electron 应用**
   ```bash
   pnpm build:client
   ```

4. **生成安装包**
   ```bash
   # 生成所有平台
   pnpm --filter @aimo-console/client dist:all
   
   # 或指定平台
   pnpm --filter @aimo-console/client dist:mac
   pnpm --filter @aimo-console/client dist:win
   pnpm --filter @aimo-console/client dist:linux
   ```

## 故障排查

### Icon 文件未生成
- ✅ 检查 `assets/logo.png` 是否存在
- ✅ 确认 ImageMagick 已安装: `convert --version`
- ✅ 检查 `apps/client/build/` 目录的写权限

### ICNS 生成质量不佳
- 在 macOS 上，脚本会使用 `iconutil` 创建高质量的 ICNS 文件
- 确保已安装 Xcode 命令行工具: `xcode-select --install`

### Windows 上无法生成 ICO
- 脚本会自动使用 ImageMagick 的 `convert` 命令生成 ICO
- 如果需要更复杂的处理，可考虑安装 `@fiahfy/icns` 或 `png-to-ico`

## 进阶用法

### 使用本地已有的 icon 文件

如果你已有其他尺寸的 icon 文件，可以手动复制到 `apps/client/build/`：

```bash
cp path/to/custom/icon.icns apps/client/build/
cp path/to/custom/icon.ico apps/client/build/
cp path/to/custom/icon.png apps/client/build/
```

### 自定义脚本参数

编辑 `scripts/generate-icons.sh` 以修改：
- 输入图片路径
- 输出目录
- Icon 尺寸
- 背景颜色

## 相关文件

- 源 Logo: `/assets/logo.png`
- 输出目录: `/apps/client/build/`
- 脚本: `/scripts/generate-icons.sh`
- 配置: `/apps/client/electron-builder.yml`
