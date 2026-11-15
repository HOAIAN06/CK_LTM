# NihongoQuest Desktop — Integration Contracts (Phase 2)

Tài liệu này là hợp đồng tích hợp giữa các agent. **Không agent nào được sửa file ngoài
danh sách sở hữu của mình.** Nếu cần thay đổi hợp đồng, báo lại orchestrator.

## 1. Bất biến bắt buộc

- Java server giữ toàn bộ quyền quyết định: đáp án, điểm, attempt, deadline, trạng thái phòng.
- PostgreSQL chỉ được truy cập bởi Java server. Renderer **không** có DB client.
- Renderer **không** mở TCP socket. Mọi kết nối đi qua main process.
- Không sửa `src/main/java/**`, `src/main/resources/**`, `pom.xml`, `sql/**` trong phase này.
- Không đổi protocol: giữ nguyên tên `MessageType` và tên field JSON như `Payloads.java`.
- Không log username/password/ticket/PIN đầy đủ. `db.properties` và credentials không vào log.
- Client JavaFX phải tiếp tục chạy độc lập bằng Maven.

Bằng chứng baseline (orchestrator, 2026-11-15): `/tmp/opencode/mvnw -o clean test` →
**135 test pass**, BUILD SUCCESS, JDK 21.

## 2. Cấu trúc và chủ sở hữu file

```text
desktop/
├── package.json                     orchestrator (không agent nào sửa)
├── tsconfig*.json, vite/vitest cfg  orchestrator
├── electron-builder.yml             orchestrator
├── src/
│   ├── main/
│   │   ├── index.ts, window.ts,
│   │   │   security.ts, ipc/        architecture
│   │   ├── net/                     protocol
│   │   └── media/                   camera
│   ├── preload/index.ts, api.d.ts   architecture
│   ├── shared/
│   │   ├── ipc.ts                   architecture
│   │   └── protocol/                protocol
│   └── renderer/
│       ├── index.html               orchestrator
│       ├── main.tsx                 gameplay
│       ├── styles/                  ui-designer
│       ├── components/ui/           ui-designer
│       ├── components/shell/        ui-designer
│       ├── app/                     gameplay
│       ├── routes/                  gameplay
│       ├── lib/                     gameplay
│       └── features/proctor/        camera
└── docs (ở repo): docs/desktop/*.md
```

Quy tắc: mỗi file chỉ một chủ. Khi cần file của agent khác, tạo PR-style note trong báo cáo
cuối, không tự sửa.

## 3. Kênh TCP (giữ nguyên Java)

| Thuộc tính | Giá trị |
|---|---|
| Cổng mặc định | `5000` (`Protocol.DEFAULT_PORT`) |
| Media | TCP nhị phân riêng, `5001` (cổng control + 1) |
| Encoding | UTF-8 |
| Framing | Mỗi message là **một dòng JSON** kết thúc `\n`; chấp nhận `\r\n` khi đọc |
| Envelope | `{ "type": "<MessageType>", "payload": <object|string|null> }` |

- Đọc bằng buffer + split `\n`, trim `\r`; giữ phần dư cho lần đọc sau.
- Payload rỗng gửi là `""` (Java dùng `NullNode`/`TextNode`).
- Message lỗi nghiệp vụ là **string** (mã lỗi), không phải object.
- Timeout kết nối: 5000 ms. Timeout/khôi phục do tầng transport báo trạng thái, không tự retry
  vô hạn; renderer quyết định UI.
- Không dùng thư viện TCP của Node ngoài `node:net`.

## 4. IPC contract (architecture định nghĩa, protocol/camera tuân theo)

Renderer chỉ thấy `window.nq` do preload tạo bằng `contextBridge`. Không `nodeIntegration`,
có `contextIsolation: true`, `sandbox: true`.

```ts
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

interface ConnectionStatus {
  state: ConnectionState
  host: string | null
  port: number | null
  lastError: string | null
  connectedAt: number | null
}

interface NqEvent {
  kind: 'message' | 'status' | 'transport-error'
  message?: ServerMessage      // kind === 'message'
  status?: ConnectionStatus    // kind === 'status'
  error?: { code: string; message: string } // kind === 'transport-error'
}

interface NqResult {
  ok: boolean
  error?: string   // NQ_ERROR.* | 'UNTRUSTED_SENDER' | 'CONNECT_IN_PROGRESS' | 'NOT_IMPLEMENTED'
}

interface NqBridge {
  connect(options: { host: string; port: number }): Promise<NqResult>
  disconnect(): Promise<void>
  send(frame: OutboundMessage): Promise<NqResult>
  getStatus(): Promise<ConnectionStatus>
  onEvent(listener: (event: NqEvent) => void): () => void
  /** `version` từ app.getVersion(); `platform` là union NqPlatform (không phải NodeJS.Platform). */
  app: { version: string; platform: NqPlatform; packaged: boolean }
}
```

IPC **không bao giờ ném lỗi** cho các lỗi dự kiến: handler luôn trả `NqResult`. Sender không
tin cậy nhận `UNTRUSTED_SENDER` (và `nq:status` trả trạng thái idle) thay vì một promise bị
reject. Mã lỗi chuẩn: `NQ_ERROR` trong `src/shared/ipc.ts`
(`INVALID_HOST`, `INVALID_PORT`, `INVALID_FRAME`, `UNTRUSTED_SENDER`, `NOT_CONNECTED`,
`CONNECT_IN_PROGRESS`, `CONNECT_FAILED`, `CONNECT_TIMEOUT`, `SEND_FAILED`, `INVALID_FRAME_DATA`).

Channel names cố định:

| Channel | Hướng | Kiểu |
|---|---|---|
| `nq:connect` | renderer → main | `invoke` |
| `nq:disconnect` | renderer → main | `invoke` |
| `nq:send` | renderer → main | `invoke` |
| `nq:status` | renderer → main | `invoke` |
| `nq:event` | main → renderer | `webContents.send` |

Kênh media (`nq:media:*`) được khai báo trong `src/shared/media-ipc.ts` và mô tả ở
`docs/desktop/proctoring.md` — không lặp lại ở đây để tránh lệch tài liệu.

Quy tắc: main là nguồn sự thật về trạng thái kết nối. Renderer không giữ socket, không giữ
`net`, không đọc file hệ thống.

### 4.1 Transport surface (protocol sở hữu, architecture tiêu thụ)

`src/main/net/index.ts` export:

```ts
export interface ControlChannelOptions {
  onMessage: (message: ServerMessage) => void
  onStatus: (status: ConnectionStatus) => void
  onError: (error: TransportError) => void
}

export interface ControlChannel {
  connect(host: string, port: number): Promise<void>
  disconnect(): Promise<void>
  send(frame: OutboundMessage): void
  isConnected(): boolean
  getStatus(): ConnectionStatus
}

export function createControlChannel(options: ControlChannelOptions): ControlChannel
```

`TransportError` là `{ code: TransportErrorCode; message: string }` với các mã
`CONNECT_TIMEOUT|CONNECT_FAILED|NOT_CONNECTED|SEND_FAILED|INVALID_FRAME|CONNECTION_LOST|
PROTOCOL_ERROR|FRAME_TOO_LARGE|HANDLER_FAILED`. Thông điệp lỗi không bao giờ chứa payload.

`ConnectionStatus` và `NqEvent` nằm trong `src/shared/ipc.ts`. Architecture import từ đó;
protocol import type từ đó (một chiều, không vòng lặp import runtime).

## 5. Kiểu protocol

- `src/shared/protocol/message-types.ts`: union string literal **đúng** 71 giá trị trong
  `MessageType.java` + mảng hằng để test đối chiếu (test đọc thẳng file Java khi có
  `NQ_REPO_ROOT`).
- `src/shared/protocol/payloads.ts`: interface mirror record trong `Payloads.java`
  (camelCase, `Long` → `number | null`, enum → union string).
- `src/shared/protocol/codec.ts`: `encodeMessage`, `decodeMessage`, kiểm tra envelope.
- `src/shared/protocol/media.ts`: hằng số media protocol (MAGIC, VERSION, role, frame type).

Không tự đổi tên field. Không đổi giá trị enum. Không thêm type chưa có trong Java.

## 6. Design token contract

ui-designer khai báo trong `src/renderer/styles/tokens.css` các biến CSS **bắt buộc** sau
(gameplay dùng ngay, không chờ):

```css
--nq-bg, --nq-bg-subtle, --nq-surface, --nq-surface-raised, --nq-surface-overlay,
--nq-text, --nq-text-secondary, --nq-text-tertiary, --nq-border, --nq-border-strong,
--nq-primary, --nq-primary-hover, --nq-primary-contrast, --nq-accent,
--nq-success, --nq-warning, --nq-danger, --nq-info,
--nq-radius-sm, --nq-radius-md, --nq-radius-lg, --nq-radius-xl, --nq-radius-full,
--nq-space-1 ... --nq-space-8,
--nq-shadow-sm, --nq-shadow-md, --nq-shadow-lg,
--nq-font-sans, --nq-font-display, --nq-font-jp,
--nq-motion-fast, --nq-motion-base, --nq-motion-slow
```

- Dark theme qua `[data-theme='dark']` trên `<html>`, hỗ trợ `prefers-color-scheme`.
- `prefers-reduced-motion: reduce` phải tắt animation chuyển động.
- Không hardcode màu trong route/component của gameplay; dùng token hoặc class tiện ích.

## 7. Kiểm chứng tối thiểu

```bash
cd desktop
npm install           # Windows/Linux trên ext4/APFS/NTFS
npm run typecheck     # node + web
npm test              # vitest
npm run build         # electron-vite build
```

### 7.1 Hạn chế của volume hiện tại (quan trọng)

Repo này nằm trên **exFAT** (`/run/media/...`), không hỗ trợ symlink/hardlink. Vì vậy
`npm install` trong `desktop/` thất bại với `EPERM: symlink ... node_modules/.bin/...`.
Đây là giới hạn filesystem, **không phải lỗi cấu hình dự án**.

Cách kiểm chứng trên máy Linux này:

```bash
# 1 lần duy nhất: cài dependency dùng chung ngoài repo
mkdir -p /tmp/opencode/nq-verify
cp desktop/package.json /tmp/opencode/nq-verify/
(cd /tmp/opencode/nq-verify && npm install)

# mỗi lần kiểm chứng (tự rsync desktop/ sang /tmp, truyền được lệnh bất kỳ)
bash desktop/scripts/verify-linux.sh protocol "npx vitest run src/shared/protocol src/main/net"
bash desktop/scripts/verify-linux.sh node     npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh web      npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh build    npm run build
```

Trên Windows (môi trường bảo vệ đồ án) `npm install` chạy bình thường; không commit
`node_modules/`, `out/`, `dist/`.

Agent chỉ chạy phần liên quan file mình sở hữu khi các agent khác đang ghi file; báo lại
orchestrator nếu typecheck đỏ do file ngoài phạm vi.
