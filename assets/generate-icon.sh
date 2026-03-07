#!/bin/bash
set -euo pipefail

# logo1-icon 生成脚本
# 功能：
# 1. 外围白色背景变为透明（只处理与边缘连通的近白色）
# 2. 输出为带留白的正方形，保留可配置颜色圆角底（默认白色）
# 3. 外圈保留透明间隙，适合作为 app icon
# 4. 保留 logo 原始颜色

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ASSETS_DIR="$(cd "${SCRIPT_DIR}/../assets" 2>/dev/null && pwd || true)"

if [ -z "$DEFAULT_ASSETS_DIR" ]; then
  DEFAULT_ASSETS_DIR="$SCRIPT_DIR"
fi

INPUT="${1:-${DEFAULT_ASSETS_DIR}/logo1.png}"
OUTPUT="${2:-${DEFAULT_ASSETS_DIR}/logo1-icon.png}"
# 背景色优先级：第 3 个参数 > BACKGROUND_COLOR 环境变量 > white
BACKGROUND_COLOR="${3:-${BACKGROUND_COLOR:-white}}"
TMP_FOREGROUND="${OUTPUT%.*}.tmp-foreground.png"
TMP_FOREGROUND_PADDED="${OUTPUT%.*}.tmp-foreground-padded.png"
TMP_FOREGROUND_CLIPPED="${OUTPUT%.*}.tmp-foreground-clipped.png"
TMP_BACKGROUND="${OUTPUT%.*}.tmp-background.png"
TMP_OUTPUT="${OUTPUT%.*}.tmp-output.png"

# 可通过环境变量微调
FUZZ_PERCENT="${FUZZ_PERCENT:-8%}"
PADDING_RATIO="${PADDING_RATIO:-12}" # 占内容边长百分比
MIN_PADDING="${MIN_PADDING:-48}"     # 最小留白像素
RADIUS_RATIO="${RADIUS_RATIO:-18}"         # 占白底边长百分比
RADIUS_PX="${RADIUS_PX:-}"
OUTER_MARGIN_RATIO="${OUTER_MARGIN_RATIO:-6}" # 外圈透明间隙，占白底边长百分比
OUTER_MARGIN_PX="${OUTER_MARGIN_PX:-}"

if ! command -v magick >/dev/null 2>&1; then
  echo "未找到 ImageMagick（magick）命令" >&2
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "输入文件不存在: $INPUT" >&2
  exit 1
fi

cleanup() {
  rm -f "$TMP_FOREGROUND" "$TMP_FOREGROUND_PADDED" "$TMP_FOREGROUND_CLIPPED" "$TMP_BACKGROUND" "$TMP_OUTPUT"
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

if [ -n "$OUTER_MARGIN_PX" ]; then
  OUTER_MARGIN=$OUTER_MARGIN_PX
else
  OUTER_MARGIN=$((CANVAS_SIDE * OUTER_MARGIN_RATIO / 100))
fi
if [ "$OUTER_MARGIN" -lt 0 ]; then
  OUTER_MARGIN=0
fi

FINAL_SIDE=$((CANVAS_SIDE + OUTER_MARGIN * 2))

# 2) 把前景放入正方形透明画布居中，并扩展外圈透明间隙
magick -size ${CANVAS_SIDE}x${CANVAS_SIDE} xc:none \
  "$TMP_FOREGROUND" -gravity center -composite \
  -gravity center -background none -extent ${FINAL_SIDE}x${FINAL_SIDE} \
  "$TMP_FOREGROUND_PADDED"

# 3) 生成圆角正方形背景（默认白色，可用 BACKGROUND_COLOR 覆盖），并保留外圈透明间隙
magick -size ${CANVAS_SIDE}x${CANVAS_SIDE} xc:none \
  -fill "$BACKGROUND_COLOR" \
  -draw "roundrectangle 0,0 $((CANVAS_SIDE - 1)),$((CANVAS_SIDE - 1)) ${RADIUS},${RADIUS}" \
  -gravity center -background none -extent ${FINAL_SIDE}x${FINAL_SIDE} \
  "$TMP_BACKGROUND"

# 4) 用圆角背景做蒙版，确保前景不会超出圆角区域
magick "$TMP_FOREGROUND_PADDED" "$TMP_BACKGROUND" -compose DstIn -composite "$TMP_FOREGROUND_CLIPPED"

# 5) 将圆角背景铺到前景下方（以彩色前景为基准，避免被灰度背景降色）
magick "$TMP_FOREGROUND_CLIPPED" "$TMP_BACKGROUND" -compose DstOver -composite "$TMP_OUTPUT"

mv "$TMP_OUTPUT" "$OUTPUT"

echo "生成完成: $OUTPUT (size=${FINAL_SIDE}x${FINAL_SIDE}, bgSide=${CANVAS_SIDE}, fuzz=$FUZZ_PERCENT, padding=${PADDING}px, outerMargin=${OUTER_MARGIN}px, radius=${RADIUS}px, bg=$BACKGROUND_COLOR)"
