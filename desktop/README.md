# NihongoQuest Desktop (Electron + React + TypeScript)

Client desktop hiện đại cho NihongoQuest. Đây là **client bổ sung**: Java server, PostgreSQL
và client JavaFX vẫn giữ nguyên và chạy độc lập (xem `README.md` ở gốc repo).

- Server giữ quyền quyết định đáp án, điểm, timer và trạng thái phòng.
- Renderer **không** mở socket, không đọc file, không kết nối database.
- Main process sở hữu duy nhất một kết nối TCP JSON-line giống `GameClient` của JavaFX.
- Không có âm thanh (D-015); phản hồi bằng animation và màu semantic.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ (đã kiểm chứng với Node 26).
- Java server của repo chạy ở `localhost:5000` (hoặc IP LAN của máy server).
- Windows 10/11 cho kiểm thử camera/proctoring thật.

## Chạy trên Windows

```powershell
cd desktop
npm install
npm run dev          # electron-vite dev, mở cửa sổ Electron
```

Chạy bản build:

```powershell
npm run build        # electron-vite build → out/
npm run preview      # chạy bản đã build
npm run package:win  # electron-builder NSIS → dist/
```

Kiểm chứng:

```powershell
npm run typecheck    # tsc cho main/preload (node) và renderer (web)
npm test             # vitest
```

## Chạy trên Linux hiện tại (repo nằm trên exFAT)

Volume `/run/media/...` là exFAT nên không hỗ trợ symlink; `npm install` báo
`EPERM: symlink node_modules/.bin/...`. Không sửa cấu hình dự án vì đây là giới hạn filesystem.

```bash
# một lần
mkdir -p /tmp/opencode/nq-verify
cp desktop/package.json /tmp/opencode/nq-verify/
(cd /tmp/opencode/nq-verify && npm install)

# mỗi lần kiểm chứng
bash desktop/scripts/verify-linux.sh web    npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh node   npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh tests  npx vitest run
bash desktop/scripts/verify-linux.sh build  npm run build
```

Chi tiết: `docs/desktop/contracts.md` §7.1. Máy không có display/Xvfb thì không thể xem UI;
mọi kiểm tra thị giác phải làm trên Windows.

## Cấu trúc

```text
desktop/
├── src/main/        main process: cửa sổ, bảo mật, IPC, TCP transport (node:net)
├── src/preload/     contextBridge: window.nq (typed, không leak Node)
├── src/shared/      protocol TS mirror + IPC types dùng chung
└── src/renderer/    React app: styles/tokens, components, routes
```

Quy tắc chi tiết và bảng IPC: `docs/desktop/contracts.md`.
Kiến trúc: `docs/desktop/architecture.md`. Protocol: `docs/desktop/protocol.md`.
Design system: `docs/desktop/design-system.md`.

## Trạng thái

Phase 2 (foundation) — xem `TASKS.md` mục P5. Chưa có gì được commit; JavaFX là baseline
kiểm thử (135 test) và vẫn là bản demo dự phòng.
