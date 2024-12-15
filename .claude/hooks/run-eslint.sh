#!/bin/bash
# Hook script to run eslint after AI editing .js/.jsx/.ts/.tsx files

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

# Only run for Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only run for JS/TS files
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx)$ ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

LOG_FILE="/tmp/eslint-$$.log"
pnpm lint > "$LOG_FILE" 2>&1
EXIT=$?

if [[ $EXIT -ne 0 ]]; then
  ISSUES=$(tail -30 "$LOG_FILE")
  # Use exit 2 to block and show reason to Claude
  echo "=== ESLint Issues Found ===" >&2
  echo "$ISSUES" >&2
  echo "" >&2
  echo "Run 'pnpm lint' for details" >&2
  exit 2
fi

rm -f "$LOG_FILE"
exit 0
