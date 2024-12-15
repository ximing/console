#!/bin/bash
# Hook script to run TypeScript check after AI editing .ts/.tsx files

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

# Only run for Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only run for TypeScript files
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

# Extract package dir (apps/web or packages/xxx) from file path
if [[ "$FILE_PATH" =~ /apps/([^/]+) ]]; then
  PACKAGE_DIR="apps/${BASH_REMATCH[1]}"
elif [[ "$FILE_PATH" =~ /packages/([^/]+) ]]; then
  PACKAGE_DIR="packages/${BASH_REMATCH[1]}"
else
  PACKAGE_DIR=""
fi

LOG_FILE="/tmp/tscheck-$$.log"

if [[ -n "$PACKAGE_DIR" && -d "$PACKAGE_DIR" ]]; then
  (cd "$PACKAGE_DIR" && pnpm typecheck > "$LOG_FILE" 2>&1)
else
  pnpm turbo typecheck > "$LOG_FILE" 2>&1
fi
EXIT=$?

if [[ $EXIT -ne 0 ]]; then
  ISSUES=$(tail -30 "$LOG_FILE")
  # Use exit 2 to block and show reason to Claude
  echo "=== TypeScript Check Issues Found ===" >&2
  echo "$ISSUES" >&2
  echo "" >&2
  echo "Run 'pnpm typecheck' for details" >&2
  exit 2
fi

rm -f "$LOG_FILE"
exit 0
