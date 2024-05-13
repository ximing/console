#!/bin/bash
set -euo pipefail

# logo1-icon 生成脚本
# 功能：
# 1. 外围白色背景变为透明（只处理与边缘连通的近白色）
# 2. 输出为带留白的正方形，保留白色圆角底
# 3. 保留 logo 原始颜色

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ASSETS_DIR="$(cd "${SCRIPT_DIR}/../assets" 2>/dev/null && pwd || true)"

if [ -z "$DEFAULT_ASSETS_DIR" ]; then
  DEFAULT_ASSETS_DIR="$SCRIPT_DIR"
fi

INPUT="${1:-${DEFAULT_ASSETS_DIR}/logo1.png}"
OUTPUT="${2:-${DEFAULT_ASSETS_DIR}/logo1-icon.png}"
TMP_FOREGROUND="${OUTPUT%.*}.tmp-foreground.png"
TMP_FOREGROUND_PADDED="${OUTPUT%.*}.tmp-foreground-padded.png"
TMP_BACKGROUND="${OUTPUT%.*}.tmp-background.png"
TMP_OUTPUT="${OUTPUT%.*}.tmp-output.png"

# 可通过环境变量微调
FUZZ_PERCENT="${FUZZ_PERCENT:-8%}"
PADDING_RATIO="${PADDING_RATIO:-12}" # 占内容边长百分比
MIN_PADDING="${MIN_PADDING:-48}"     # 最小留白像素
RADIUS_RATIO="${RADIUS_RATIO:-18}"   # 占画布边长百分比
RADIUS_PX="${RADIUS_PX:-}"

if ! command -v magick >/dev/null 2>&1; then
  echo "未找到 ImageMagick（magick）命令" >&2
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "输入文件不存在: $INPUT" >&2
  exit 1
fi

cleanup() {
  rm -f "$TMP_FOREGROUND" "$TMP_FOREGROUND_PADDED" "$TMP_BACKGROUND" "$TMP_OUTPUT"
}
trap cleanup EXIT

WIDTH=$(magick "$INPUT" -format "%w" info:)
HEIGHT=$(magick "$INPUT" -format "%h" info:)
MAX_X=$((WIDTH - 1))
MAX_Y=$((HEIGHT - 1))

# 1) 先抠除外围连通白底，再裁剪到内容边界（保留颜色）
magick "$INPUT" \
  -alpha set \
  -fuzz "$FUZZ_PERCENT" \
  -fill none \
  -draw "color 0,0 floodfill" \
  -draw "color ${MAX_X},0 floodfill" \
  -draw "color 0,${MAX_Y} floodfill" \
  -draw "color ${MAX_X},${MAX_Y} floodfill" \
  -trim +repage \
  "$TMP_FOREGROUND"

FG_WIDTH=$(magick "$TMP_FOREGROUND" -format "%w" info:)
FG_HEIGHT=$(magick "$TMP_FOREGROUND" -format "%h" info:)

if [ "$FG_WIDTH" -gt "$FG_HEIGHT" ]; then
  CONTENT_SIDE=$FG_WIDTH
else
  CONTENT_SIDE=$FG_HEIGHT
fi

PADDING=$((CONTENT_SIDE * PADDING_RATIO / 100))
if [ "$PADDING" -lt "$MIN_PADDING" ]; then
  PADDING=$MIN_PADDING
fi

CANVAS_SIDE=$((CONTENT_SIDE + PADDING * 2))

if [ -n "$RADIUS_PX" ]; then
  RADIUS=$RADIUS_PX
else
  RADIUS=$((CANVAS_SIDE * RADIUS_RATIO / 100))
fi
if [ "$RADIUS" -lt 24 ]; then
  RADIUS=24
fi

# 2) 把前景放入正方形透明画布居中，避免贴边
magick -size ${CANVAS_SIDE}x${CANVAS_SIDE} xc:none \
  "$TMP_FOREGROUND" -gravity center -composite \
  "$TMP_FOREGROUND_PADDED"

# 3) 生成白色圆角正方形背景
magick -size ${CANVAS_SIDE}x${CANVAS_SIDE} xc:none \
  -fill white \
  -draw "roundrectangle 0,0 $((CANVAS_SIDE - 1)),$((CANVAS_SIDE - 1)) ${RADIUS},${RADIUS}" \
  "$TMP_BACKGROUND"

# 4) 关键：用圆角背景作为蒙版，前景只保留在蒙版内的部分（颜色不丢失）
magick "$TMP_FOREGROUND_PADDED" "$TMP_BACKGROUND" -compose DstIn -composite "$TMP_OUTPUT"

mv "$TMP_OUTPUT" "$OUTPUT"

echo "生成完成: $OUTPUT (size=${CANVAS_SIDE}x${CANVAS_SIDE}, fuzz=$FUZZ_PERCENT, padding=${PADDING}px, radius=${RADIUS}px)"
