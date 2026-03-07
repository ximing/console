#!/bin/bash

# Generate Electron icons from logo.png using ImageMagick
# This script generates all required icon sizes for different platforms

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGO_SOURCE="$PROJECT_ROOT/assets/logo.png"
BUILD_DIR="$PROJECT_ROOT/apps/client/build"

echo "🎨 Generating Electron icons..."
echo "Source: $LOGO_SOURCE"
echo "Output: $BUILD_DIR"

# Check if logo exists
if [ ! -f "$LOGO_SOURCE" ]; then
    echo "❌ Error: Logo file not found at $LOGO_SOURCE"
    exit 1
fi

# Check if ImageMagick is available (v7 `magick` command)
if ! command -v magick &> /dev/null; then
    echo "❌ Error: ImageMagick (magick) is not installed"
    echo "Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

echo ""
echo "📦 Generating PNG icons..."

# Generate PNG icons for all sizes
for size in 16 32 48 64 128 256 512; do
    output_file="$BUILD_DIR/icon_${size}.png"
    magick "$LOGO_SOURCE" -resize "${size}x${size}" -background white -gravity center -extent "${size}x${size}" "$output_file"
    file_size=$(du -h "$output_file" | cut -f1)
    echo "  ✓ Generated icon_${size}.png (${size}x${size}) - $file_size"
done

# Generate main icon.png (512x512)
echo "  Generating icon.png (512x512)..."
magick "$LOGO_SOURCE" -resize 512x512 -background white -gravity center -extent 512x512 "$BUILD_DIR/icon.png"
echo "  ✓ Generated icon.png"

echo ""
echo "🪟 Generating Windows ICO..."
# Generate Windows ICO (256x256 as source, auto-resized by ImageMagick)
magick "$LOGO_SOURCE" -define icon:auto-resize=256,128,96,64,48,32,16 "$BUILD_DIR/icon.ico"
file_size=$(du -h "$BUILD_DIR/icon.ico" | cut -f1)
echo "  ✓ Generated icon.ico - $file_size"

echo ""
echo "🍎 Generating macOS ICNS..."
# Create ICNS file (requires sips on macOS or separate tool)
if command -v sips &> /dev/null; then
    # Use macOS native sips command
    temp_icns_dir=$(mktemp -d)
    trap "rm -rf $temp_icns_dir" EXIT
    
    iconset_dir="$temp_icns_dir/icon.iconset"
    mkdir -p "$iconset_dir"
    
    # Generate all required sizes for ICNS
    for size in 16 32 64 128 256 512 1024; do
        # Regular and 2x versions
        magick "$LOGO_SOURCE" -resize "${size}x${size}" -background white -gravity center -extent "${size}x${size}" "$iconset_dir/icon_${size}x${size}.png"
        
        if [ $size -le 512 ]; then
            magick "$LOGO_SOURCE" -resize "$((size*2))x$((size*2))" -background white -gravity center -extent "$((size*2))x$((size*2))" "$iconset_dir/icon_${size}x${size}@2x.png"
        fi
    done
    
    # Convert iconset to ICNS
    iconutil -c icns -o "$BUILD_DIR/icon.icns" "$iconset_dir"
    file_size=$(du -h "$BUILD_DIR/icon.icns" | cut -f1)
    echo "  ✓ Generated icon.icns - $file_size"
else
    # Fallback: Create a basic ICNS using ImageMagick
    # Note: This creates a minimal ICNS file
    magick "$LOGO_SOURCE" -resize 512x512 "$BUILD_DIR/icon.icns"
    echo "  ⚠ Generated basic icon.icns (install Xcode tools for full support: xcode-select --install)"
fi

echo ""
echo "📄 Generating SVG..."
# SVG format (for scalability)
magick "$LOGO_SOURCE" -quality 100 "$BUILD_DIR/icon.svg" 2>/dev/null || {
    echo "  ⚠ SVG generation skipped (use vector source for better results)"
}

if [ -f "$BUILD_DIR/icon.svg" ]; then
    echo "  ✓ Generated icon.svg"
fi

echo ""
echo "📋 Generated files:"
ls -lh "$BUILD_DIR"/icon* | awk '{print "  ✓", $9, "(" $5 ")"}'

echo ""
echo "✅ Icon generation completed!"
echo ""
echo "📝 Next steps:"
echo "  1. Review generated icons in: apps/client/build/"
echo "  2. Update electron-builder.yml if needed"
echo "  3. Run: pnpm build:all to build the Electron app"
