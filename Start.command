#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8765
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/Zhuge-AI-OS-${PORT}.log"

mkdir -p "$LOG_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display dialog "此 Mac 沒有 Python 3，請改用 GitHub Pages 版本。" buttons {"確定"} default button "確定"'
  exit 1
fi

if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  open "http://127.0.0.1:${PORT}/"
  exit 0
fi

cd "$SCRIPT_DIR"
nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
sleep 1
open "http://127.0.0.1:${PORT}/"
