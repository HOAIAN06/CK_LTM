# Protocol (TypeScript) — Desktop client

Tài liệu này mô tả lớp TypeScript sao chép **trung thực** protocol TCP của bản Java.
Không có gì ở đây được phép "cải tiến" wire format: Java server, JavaFX client và desktop client
phải nói cùng một ngôn ngữ.

Nguồn sự thật (theo thứ tự ưu tiên):

1. `src/main/java/com/nihongoquest/common/protocol/MessageType.java`
2. `src/main/java/com/nihongoquest/common/protocol/Payloads.java`
3. `src/main/java/com/nihongoquest/common/protocol/Message.java` + `Protocol.java`
4. `src/main/java/com/nihongoquest/common/media/MediaProtocol.java` + `VisionMetadata.java`
5. `src/main/java/com/nihongoquest/client/network/GameClient.java`
6. `src/main/java/com/nihongoquest/server/network/ClientHandler.java` + `ServerRequestRouter.java`
7. `docs/protocol.md` (tài liệu luồng, không phải định nghĩa kiểu)

Code Java thắng tài liệu. Khi code Java đổi, sửa module này **và** `docs/protocol.md` trong cùng
một thay đổi.

## 1. Bản đồ file

| File TS | Sao chép từ | Ghi chú |
|---|---|---|
| `desktop/src/shared/protocol/message-types.ts` | `MessageType` | `MESSAGE_TYPES` (`as const`) + union + guard |
| `desktop/src/shared/protocol/payloads.ts` | `Payloads` (record + enum DTO) | `MessagePayloadMap`, `OutboundMessage`, `ServerMessage` |
| `desktop/src/shared/protocol/codec.ts` | `Message.toWire` / `Message.fromWire` | encode/decode một dòng JSON, `ProtocolError` |
| `desktop/src/shared/protocol/media.ts` | `MediaProtocol`, `VisionMetadata` | hằng số nhị phân + layout byte |
| `desktop/src/shared/protocol/index.ts` | — | barrel dùng chung (không import `node:*`) |
| `desktop/src/main/net/frame-reader.ts` | `BufferedReader.readLine()` | **framer duy nhất**, tách frame theo newline |
| `desktop/src/main/net/control-channel.ts` | `GameClient` (phần TCP) | `node:net`, timeout 5 s, một write path |
| `desktop/src/main/net/index.ts` | — | bề mặt transport cho tầng architecture |

Framer nằm ở `src/main/net/**` (không phải `shared/`) vì nó cần `node:buffer`/`node:util` và chỉ
main process dùng. Chỉ có **một** implementation framer trong repo.

Chỉ main process được import `src/main/net/**`. Renderer chỉ thấy `window.nq` (`src/shared/ipc.ts`).

## 2. Kiểu ↔ Java

| Java | TypeScript |
|---|---|
| `enum MessageType` (`name()` trên wire) | union string literal + `MESSAGE_TYPES` |
| `record` | `interface` cùng tên, field camelCase y nguyên |
| `int`, `long`, `double`, `float` | `number` |
| `boolean` | `boolean` |
| `Long` (boxed, có thể `null`) | `number \| null` |
| `String` (có thể `null` trên wire) | `string` (hoặc `string \| null` khi Java thực sự gửi `null`) |
| `List<T>` | `T[]` |
| enum payload (`CameraStatus`, …) | union string literal + mảng giá trị runtime |

Các field `Long` đã xác nhận nullable:

- `AnswerResult.chosenChoiceId` (timeout → `null`)
- `QuizAnswerResult.chosenChoiceId`
- `QuizChoiceEdit.id`, `QuizQuestionEdit.id`, `QuizSetEdit.id` (`null` = bản ghi mới)

Các field `String` nullable có chủ đích: `GameInviteSend.roomPin`, `GameInviteReceived.roomPin`
(`RANKED` không có PIN) và `ProctorStatusReport.detail`.

Không thêm field, không đổi tên, không "chuẩn hóa" tên enum. `Payloads.java` là hợp đồng.

### 2.1 Số lượng `MessageType`

`MessageType.java` hiện khai báo **71** giá trị, kết thúc bằng `DISCONNECT`.
Con số "78" trong brief Phase 2 là số dòng file, không phải số phần tử enum; `contracts.md` §5
đã được sửa thành 71.
`MESSAGE_TYPES` bám theo file Java; test `message-types.test.ts` đọc thẳng file Java (khi thấy
được cây repo) để so từng phần tử theo thứ tự, đồng thời khoá cứng 71 giá trị + offset của các
type quan trọng.

### 2.2 Hướng message

`payloads.ts` chia hai bản đồ có kiểu:

| Hướng | Số type | Nguồn |
|---|---|---|
| `ClientToServerPayloadMap` | 31 | `GameClient` + `ServerRequestRouter.handle` |
| `ServerToClientPayloadMap` | 45 | các `new Message(...)` trong server |

Năm type xuất hiện ở **cả hai** hướng với payload khác nhau:

| Type | Client → Server | Server → Client |
|---|---|---|
| `FRIEND_REQUEST_LIST` | `''` | `FriendRequestListData` |
| `FRIEND_REQUEST_RESPOND` | `FriendRequestReply` | `FriendRequestReply` (echo) |
| `FRIEND_LIST` | `''` | `FriendListData` |
| `QUIZ_ROOM_START` | `''` | `QuizRoomStarted` |
| `QUIZ_ROOM_CANCEL` | `''` | lý do (`HOST_CANCELLED` / `SERVER_STOPPED`) |

`MessagePayloadMap` là góc nhìn hợp nhất (union payload) của mọi type;
`OutboundMessage` / `ServerMessage` là union có discriminator `type` theo từng hướng.
Dùng hai union này trong code ứng dụng, đừng dùng `MessagePayloadMap` trực tiếp.

Quy ước payload đặc biệt (giữ nguyên Java):

- Message không có dữ liệu: client gửi `""`; server trả `null`
  (`new Message(type, "")` → `NullNode`). Decoder chấp nhận cả `""`, `null` và thiếu hẳn key.
- Lỗi nghiệp vụ là **chuỗi mã lỗi**, không phải object: `QUIZ_ERROR: "INVALID_PIN"`,
  `MATCH_ERROR`, `SOCIAL_ERROR`, `QUERY_ERROR`, `QUIZ_SET_ERROR`, `LOGIN_FAIL`, `REGISTER_FAIL`.
- `QUIZ_ROOM_CANCEL` phía server là **lý do**, không phải mã lỗi.
- `QUIZ_ROOM_FINISHED` dùng đúng payload `QuizLeaderboardData` với `finished: true`.

## 3. Framing (`src/main/net/frame-reader.ts`)

| Thuộc tính | Giá trị |
|---|---|
| Encoding | UTF-8 (strict: byte sai → `INVALID_ENCODING`, không chèn U+FFFD) |
| Đơn vị | một dòng JSON `{"type":...,"payload":...}` |
| Kết thúc frame | `\n` khi gửi; chấp nhận `\r\n` khi đọc (bỏ tối đa một `\r`) |
| Dòng rỗng | bỏ qua |
| Giới hạn frame | 8 MiB (`DEFAULT_MAX_FRAME_BYTES`), cấu hình được |
| Buffer | giữ phần dư giữa các chunk, tối đa bằng giới hạn frame |
| Kết thúc stream | `flush()` trả frame cuối nếu thiếu newline (giống `BufferedReader.readLine()`) |

Chia frame ở mức **byte** (`0x0A` không bao giờ nằm trong một ký tự UTF-8 nhiều byte), rồi mới
decode từng frame hoàn chỉnh bằng `TextDecoder('utf-8', { fatal: true })`. Vì vậy một ký tự tiếng
Nhật 3 byte bị cắt giữa hai chunk vẫn giải mã đúng, còn UTF-8 hỏng bị từ chối thay vì đi vào
`JSON.parse`.

Vượt giới hạn → `ProtocolError('FRAME_TOO_LARGE')`; UTF-8 hỏng →
`ProtocolError('INVALID_ENCODING')`. Cả hai là lỗi **không thể đồng bộ lại**: transport đóng
socket thay vì giữ bộ nhớ tăng vô hạn.

API (dùng một trong hai style, đừng trộn):

```ts
const reader = new FrameReader({ maxFrameBytes: 8 * 1024 * 1024 })
const frames = reader.push(chunk)      // pull style
const last = reader.flush()            // string | null
reader.reset()                         // khi thay kết nối

const reader2 = new FrameReader({ onFrame: (frame) => handle(frame) }) // push style
const off = reader2.onFrame(handle)    // huỷ đăng ký
```

## 4. Codec (`src/shared/protocol/codec.ts`)

```ts
encodeMessage(frame) // -> '{"type":"CONNECT","payload":""}'  (không có '\n')
decodeMessage(line)  // -> ServerMessage | throw ProtocolError
```

`encodeMessage` kiểm tra `type` có trong `MessageType` và từ chối payload không serialize được
(circular, `NaN`/`Infinity`, `BigInt`) — thông điệp lỗi **không** chứa nội dung payload.

`decodeMessage` chỉ kiểm tra **envelope**, không kiểm tra nghiệp vụ (không validate
`durationSeconds`, không đòi field bắt buộc của từng record). Lý do: server là nơi quyết định;
client không được từ chối một message hợp lệ về cú pháp.

Mã lỗi ổn định (`ProtocolError.code`, message **không bao giờ** chứa nội dung payload):

| Code | Khi nào |
|---|---|
| `EMPTY_LINE` | dòng rỗng/toàn khoảng trắng |
| `INVALID_JSON` | JSON hỏng, hoặc root không phải object |
| `MISSING_TYPE` | thiếu `type` hoặc `type: null` |
| `UNKNOWN_TYPE` | `type` không nằm trong `MessageType` |
| `INVALID_PAYLOAD` | payload là number/boolean/array, hoặc encode thất bại |
| `INVALID_ENCODING` | frame không phải UTF-8 hợp lệ (framer) |
| `FRAME_TOO_LARGE` | frame vượt giới hạn byte (framer) |

Bảo mật: `ProtocolError` chỉ chứa câu mô tả cố định. Không log frame, không log payload,
không log ticket/PIN/mật khẩu. Test `codec.test.ts` khẳng định điều này bằng chuỗi bí mật.

## 5. Transport (`createControlChannel`)

```ts
const channel = createControlChannel({ onMessage, onStatus, onError })
await channel.connect(host, port)            // reject nếu lỗi/timeout
channel.send({ type: 'CONNECT', payload: '' })
await channel.disconnect()
channel.isConnected()
channel.getStatus()                          // ConnectionStatus snapshot
```

- Timeout dial = **5000 ms** (`CONTROL_CONNECT_TIMEOUT_MS`), giống `GameClient`.
- Trạng thái công bố: `connecting → connected → disconnected | error`. Lỗi kết nối phát
  `state: 'error'` + `onError({ code, message })`; `lastError` là mô tả của Node (đã cắt
  newline, tối đa 300 ký tự).
- `connect()` gọi khi đang kết nối/đã kết nối → reject `CONNECT_IN_PROGRESS` / `ALREADY_CONNECTED`
  (tầng IPC phải `disconnect()` trước, như `register-control-handlers.ts` đang làm).
- Host/cổng được validate trước khi mở socket (`INVALID_OPTIONS`).
- `disconnect()` gửi frame `DISCONNECT` (giống `GameClient`), `end()` để flush, chờ FIN tối đa
  2 s rồi `destroy()`.
- Một write path duy nhất: mỗi frame được encode trọn vẹn và `socket.write()` một lần, nên hai
  `send()` liên tiếp không thể chen byte vào nhau (test 100 frame liên tiếp).
- `send()` khi chưa kết nối ném `TransportFailure` (`code: 'NOT_CONNECTED'`); caller (IPC handler)
  phải bắt và trả `{ ok: false }`, không được nuốt im lặng.
- **Lỗi decode không làm đứt kết nối.** Một dòng hoàn chỉnh nhưng JSON sai/không rõ type chỉ
  phát `onError({ code: 'PROTOCOL_ERROR' })` rồi đọc tiếp, vì ranh giới frame vẫn còn đúng.
  Chỉ lỗi framing (`FRAME_TOO_LARGE`/`INVALID_ENCODING`) mới là `error` và đóng socket.
- Không auto gửi `CONNECT`: tầng ứng dụng chủ động gửi sau khi `connect()` resolve.
- Không in log bất kỳ nội dung frame nào trong module này.

### 5.1 Ghi chú tích hợp với `src/shared/ipc.ts`

`src/shared/ipc.ts` (architecture sở hữu) khai báo envelope lỏng:

```ts
interface OutboundMessage { type: MessageType; payload?: unknown }
```

Transport dùng union chặt `OutboundMessage` của `payloads.ts`. Adapter IPC validate rồi mới
chuyển kiểu (`channel.send(raw as TransportFrame)` trong `register-control-handlers.ts`).
Đây là điểm duy nhất hai module chạm nhau.

## 6. Media binary protocol

`media.ts` chứa hằng số + layout byte chi tiết trong comment đầu file. Tóm tắt:

| Hằng | Giá trị |
|---|---|
| `MEDIA_MAGIC` | `0x4E514D50` ("NQMP") |
| `MEDIA_VERSION` | `2` |
| Role byte | `PUBLISHER = 1`, `HOST_SUBSCRIBER = 2` |
| `MEDIA_FRAME_PUBLISH` | `0x10` (publisher → server) |
| `MEDIA_FRAME_SUBSCRIBE` | `0x11` (server → host, frame relay) |
| ACK | `0` OK, `1` magic, `2` version, `3` ticket/role, `4` hết hạn, `5` phòng đóng |
| `MEDIA_MAX_JPEG_BYTES` | `524288` |
| `MEDIA_MAX_TICKET_BYTES` | `512` |
| `MEDIA_TICKET_TTL_MILLIS` | `60000` |
| `MEDIA_HANDSHAKE_TIMEOUT_MILLIS` | `10000` |
| `MEDIA_MAX_FACES` | `6` |
| Attention ordinal | `LOOKING_AT_SCREEN, LOOKING_AWAY, NO_FACE, MULTIPLE_FACES, PHONE, UNKNOWN` |

Byte order: mọi số nhiều byte là **big-endian** (Java `DataOutputStream`), `float`/`double` là
IEEE-754. Kích thước header: handshake 8 byte, publisher frame 21 byte, relayed frame 29 byte,
VisionMetadata 38 byte + 32 byte/face.

Cổng media **không** tự suy ra ở client: dùng `PROCTOR_MEDIA_SESSION.mediaPort` server gửi.
Ticket là bí mật dùng một lần — không log, không lưu, không gửi xuống renderer.

## 7. Kiểm chứng

Repo nằm trên exFAT nên `npm install` cần sandbox `/tmp` (xem `desktop/scripts/verify-linux.sh`).
Truyền lệnh dưới dạng **nhiều tham số** (script `exec "$@"`):

```bash
bash desktop/scripts/verify-linux.sh protocol npx vitest run src/shared/protocol src/main/net
bash desktop/scripts/verify-linux.sh protocol npx tsc --noEmit -p tsconfig.node.json
```

Test tự đối chiếu với code Java (đọc thẳng file `.java`):

- `message-types.test.ts`: từng phần tử của `MESSAGE_TYPES` so với `MessageType.java`.
- `media.test.ts`: `MAGIC`, `VERSION`, giới hạn, frame code, ACK, role byte, thứ tự attention.
- `payloads.test.ts`: phủ đủ 71 type, chia đúng 31/45, 5 type hai chiều.
- `frame-reader.test.ts`: LF/CRLF, nhiều frame một chunk, frame cắt giữa chunk, UTF-8 cắt giữa
  chunk, UTF-8 hỏng, dòng rỗng, giới hạn byte, `flush()`.
- `control-channel.test.ts`: `net.Server` trong process, frame chia nhỏ/CRLF, JSON lạ không làm
  đứt kết nối, lỗi kết nối nhanh (`state: 'error'`, không chờ 5 s), `DISCONNECT` khi đóng,
  100 lần `send()` không xen kẽ.

Lưu ý sandbox: script chỉ copy `desktop/`, nên các test đọc file Java **tự bỏ qua** khi không
thấy cây repo. Đặt `NQ_REPO_ROOT=/path/to/CK_LTM` để ép chạy phần đối chiếu đó ở bất kỳ đâu.

Checklist khi Java đổi protocol:

1. `MessageType.java` thêm/bớt/đổi tên → cập nhật `MESSAGE_TYPES` + `docs/protocol.md`.
2. `Payloads.java` đổi field → cập nhật interface + bản đồ hướng tương ứng.
3. `MediaProtocol` đổi layout → tăng `VERSION` (phía Java) rồi cập nhật `media.ts`.
4. Chạy lại hai lệnh trên; test đối chiếu Java sẽ chỉ ra chỗ lệch.

## 8. Khác biệt/điểm mơ hồ đã phát hiện

1. **Số lượng message type**: tài liệu Phase 2 ghi 78, `MessageType.java` có 71. Bám theo Java.
2. **Payload rỗng**: `docs/desktop/contracts.md` nói "payload rỗng gửi là `""`", nhưng Java
   `new Message(type, "")` biến chuỗi rỗng thành `NullNode`, nên server thực tế gửi `null`.
   Client TS gửi `""` (server chấp nhận cả hai); decoder chấp nhận cả hai.
3. **`QUIZ_ROOM_CANCEL` hai chiều**: client gửi `""`, server gửi lý do dạng chuỗi.
4. **`FRIEND_LIST` / `FRIEND_REQUEST_LIST`**: cùng một type cho request (rỗng) và response
   (object). Không thể dùng một kiểu payload duy nhất cho cả hai chiều.
5. **`ipc.ts` envelope lỏng**: xem §5.1.
6. **Framer**: chỉ có một implementation, đặt tại `src/main/net/frame-reader.ts`; barrel
   `shared/protocol` không export framer để renderer bundle không kéo `node:buffer` vào.
