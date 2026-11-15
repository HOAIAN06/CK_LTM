#!/usr/bin/env bash
# Linux-only verification helper.
#
# Lý do tồn tại: repo nằm trên volume exFAT (/run/media/...), không hỗ trợ symlink/hardlink,
# nên `npm install` báo EPERM khi tạo node_modules/.bin. Script này đồng bộ `desktop/`
# sang /tmp (ext4) nơi đã cài dependency dùng chung, rồi chạy lệnh kiểm chứng.
#
# Trên Windows, dùng `npm install` + `npm run typecheck|test|build` bình thường.
#
# Cách dùng:
#   bash desktop/scripts/verify-linux.sh <sandbox-name> [command...]
#   bash desktop/scripts/verify-linux.sh protocol "npx vitest run src/shared/protocol src/main/net"
#   bash desktop/scripts/verify-linux.sh web npx tsc --noEmit -p tsconfig.web.json
set -euo pipefail

NAME="${1:-default}"
shift || true

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$REPO_ROOT/desktop"
SANDBOX_ROOT="${NQ_VERIFY_ROOT:-/tmp/opencode/nq-verify}"
TARGET_DIR="$SANDBOX_ROOT/$NAME"

if [[ ! -d "$SANDBOX_ROOT/node_modules" ]]; then
  echo "Chưa có dependency dùng chung tại $SANDBOX_ROOT/node_modules" >&2
  echo "Chạy trước: mkdir -p '$SANDBOX_ROOT' && cp desktop/package.json '$SANDBOX_ROOT/' && (cd '$SANDBOX_ROOT' && npm install)" >&2
  exit 2
fi

mkdir -p "$TARGET_DIR"
rsync -a --delete \
  --exclude node_modules \
  --exclude out \
  --exclude dist \
  --exclude '.git' \
  "$SOURCE_DIR"/ "$TARGET_DIR"/

cd "$TARGET_DIR"
if [[ $# -eq 0 ]]; then
  set -- npm run typecheck
fi

# Cho phép cả hai dạng:
#   verify-linux.sh name npx tsc --noEmit -p tsconfig.node.json
#   verify-linux.sh name "npx tsc --noEmit -p tsconfig.node.json"
if [[ $# -eq 1 && "$1" == *" "* ]]; then
  set -- sh -c "$1"
fi

# Test đối chiếu protocol đọc thẳng cây Java khi biến này tồn tại.
export NQ_REPO_ROOT="${NQ_REPO_ROOT:-$REPO_ROOT}"

echo "== verify sandbox: $TARGET_DIR =="
echo "== command: $* =="
exec "$@"
