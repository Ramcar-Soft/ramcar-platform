#!/bin/bash
# Hook: After Write/Edit on tasks.md, remind to sync to Linear.
# Receives tool input via stdin as JSON.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

if [[ "$FILE_PATH" == *"/tasks.md" ]]; then
  echo "tasks.md was modified. Run /speckit.taskstolinear to sync changes to Linear."
fi
