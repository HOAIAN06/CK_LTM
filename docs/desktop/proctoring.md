# Proctoring camera — desktop client (Electron)

Tài liệu này mô tả **đúng những gì đã hiện thực** cho camera proctoring: renderer báo gì lên
server, host xem gì, frame đi qua đâu, luật latest-frame/backpressure, và **những gì chưa thể
chứng minh** trên máy không có webcam.

Nguồn sự thật của wire format và luật phòng vẫn là Java:

- `src/main/java/com/nihongoquest/common/media/MediaProtocol.java`, `VisionMetadata.java`
- `src/main/java/com/nihongoquest/server/quizroom/QuizRoom.java` (`requireProctoredPlayer`)
- `docs/protocol.md` §7 (Quiz Room) và §8 (proctoring + media)
- Bản mirror TS: `desktop/src/shared/protocol/media.ts` (hằng số, **không** fork giá trị)

---

## 1. Bản đồ file

| File | Vai trò |
|---|---|
| `desktop/src/shared/media-ipc.ts` | Tên channel, `NqMediaApi`, `MediaInboundFrame`, validator `parseMediaPublishFrame` |
| `desktop/src/main/media/codec.ts` | Encode handshake/publisher frame, decode ACK, decoder luồng relayed frame, vision codec |
| `desktop/src/main/media/publisher.ts` | `node:net` PUBLISHER: handshake 10 s, latest-frame, metrics, không retry |
| `desktop/src/main/media/subscriber.ts` | `node:net` HOST_SUBSCRIBER: frame mới nhất mỗi user, đẩy xuống ≤ ~15 fps |
| `desktop/src/main/ipc/register-media-handlers.ts` | 6 handler IPC, validate sender/payload, forward frame |
| `desktop/src/preload/media.ts` | `window.nq.media` (fail closed) |
| `desktop/src/renderer/features/proctor/proctor-store.ts` | **Coordinator app-scoped**: session theo role, status report, event report, tile + feed |
| `…/proctor-protocol.ts` | Dựng payload, cổng gửi (`canReportStatus`, `canEmitEvent`), nhãn tiếng Việt, `eventId` |
| `…/focus-events.ts` | Debounce mất focus (thuần, không DOM) |
| `…/frame-hub.ts` | Frame mới nhất mỗi user + subscribe theo user (bounded 64 user) |
| `…/use-camera-stream.ts` | `getUserMedia` 640×480@15, `audio:false`, attempt id, retry, track mute/ended |
| `…/frame-pump.ts` | Encode canvas → JPEG, backpressure một encode in-flight |
| `…/camera-preview.tsx` | Preview + badge trạng thái + "Thu nhỏ" + nút thử lại |
| `…/proctor-lobby-panel.tsx`, `…/proctor-battle-panel.tsx` | Consent card / cảnh báo cố định / lối vào dashboard |
| `…/proctor-session-host.tsx` | Cầu nối `useQuizStore` → proctor store (mount một lần trong router) |
| `…/proctor-dashboard.tsx` | Bảng giám sát của host |
| `desktop/src/renderer/routes/proctor-dashboard-route.tsx` | Route `/proctor/:pin` + guard quyền host |

---

## 2. Luồng dữ liệu

```text
getUserMedia(640×480@15, audio:false)
   │  <video> preview (object-fit: cover)
   ▼
canvas.drawImage + toBlob('image/jpeg', .88→.68)      ← một encode in-flight (latest-frame)
   │  JPEG ≤ 512 KiB
   ▼
window.nq.media.publishFrame({meta, data})            ← preload (sandbox, contextIsolation)
   ▼  invoke 'nq:media:publish-frame'
main: parseMediaPublishFrame → publisher.publish()     ← 1 slot chờ, frame cũ bị bỏ
   ▼  TCP 0x10
Java ProctorMediaRelay (control port + 1)
   ▼  TCP 0x11 (chỉ host)
main: subscriber → map userId → frame mới nhất
   ▼  webContents.send 'nq:media:frame' ≤ ~15 fps/user
renderer frame-hub → tile của host (blob URL, thu hồi ngay khi frame đổi)
```

Renderer **không** mở socket. Main **không** decode JPEG. Ticket media **không** bao giờ vào DOM,
URL, log hay state công khai của store.

### 2.1 Vì sao coordinator là app-scoped

Ticket media **dùng một lần**; server chỉ cấp lại khi phòng bắt đầu, khi reconnect, hoặc khi kênh
media ngắt. Việc `lobby → battle` xảy ra đúng lúc phòng bắt đầu, nên nếu socket sống theo route
thì kênh vừa mở đã bị đóng và ticket bị đốt. Vì vậy:

- `ProctorSessionHost` mount một lần trong router (`app/App.tsx`) — cùng vai trò
  `ProctoringCoordinator` bên JavaFX.
- `startPublish`/`startSubscribe` do store gọi, không do component; đổi route **không** đóng kênh.
- Teardown thật sự chỉ khi bối cảnh phòng biến mất: rời phòng, huỷ phòng, phòng kết thúc, đăng xuất.

---

## 3. PLAYER SIDE (không phải host, phòng bật proctoring)

### 3.1 Consent (D-002/D-005)

1. Vào lobby có `proctoringEnabled` → card **"Bật camera để host giám sát"** với hai lựa chọn
   *Bật camera* / *Tiếp tục không camera*. Nêu rõ: truyền trong LAN, không thu microphone, cảnh
   báo có thể lưu trên máy host.
2. Từ chối → gửi **một** `PROCTOR_STATUS_REPORT` với `cameraStatus = DENIED`, hiện cảnh báo cố
   định (không modal) + nút *Bật lại camera*. Người chơi **vẫn vào phòng, vẫn thi, vẫn nhận điểm**;
   không nút nào của gameplay bị disable.
3. Không có nhánh nào của UI chặn join/start/navigation. Camera lỗi chỉ tạo text cảnh báo.

### 3.2 Trạng thái camera → protocol

Mỗi **thay đổi** trạng thái gửi đúng một report (so sánh với trạng thái trước, không gửi lặp):

```json
{"type":"PROCTOR_STATUS_REPORT","payload":{
  "pin":"123456","cameraStatus":"READY","calibrationStatus":"NOT_REQUIRED",
  "detail":"Camera sẵn sàng","observedAtEpochMillis":1700000000000}}
```

| Giá trị | Ghi chú |
|---|---|
| `INITIALIZING`, `READY`, `DENIED`, `NOT_FOUND`, `FAILED`, `LOST`, `BLOCKED`, `STOPPED` | 8 trạng thái camera thật |
| `NOT_REQUIRED`, `NOT_APPLICABLE` | **Không bao giờ gửi**: `QuizRoom.reportProctorStatus` ném `BAD_PROCTOR_STATUS` nếu người chơi gửi hai giá trị này. Chúng chỉ tồn tại trong `QuizLobbyData` cho host/người xem khác |
| `calibrationStatus` | Luôn `NOT_REQUIRED`: bản Electron không có model thị giác, không có gì để hiệu chuẩn. Không gửi `READY` giả |

Cổng gửi: `canReportStatus(context)` = phòng bật proctoring **và** người dùng không phải host
**và** đang chơi **và** phòng chưa kết thúc. Host/proctoring-off → trạng thái vẫn hiển thị nhưng
không gửi.

### 3.3 Media session

- `PROCTOR_MEDIA_SESSION {role:'PUBLISHER'}` → store giữ ticket (biến module) và gọi
  `start-publish` với `{host, mediaPort, ticket}` ngay khi người chơi đã đồng ý bật camera.
  Chưa đồng ý → chờ; đồng ý sau → mở bằng ticket đã giữ.
- Ticket hết hạn (`expiresAtEpochMillis <= now`) bị bỏ qua, không thử handshake để tránh ACK 4.
- Session mới (server cấp lại) → khởi động lại kênh với ticket mới.
- `role:'HOST_SUBSCRIBER'` khi người dùng là host → mở subscriber (xem §5).

### 3.4 Sự kiện chỉ báo khi phòng đang chạy

`PROCTOR_EVENT_REPORT` bị server từ chối ngoài `RUNNING` (`ROOM_NOT_RUNNING`), nên cổng
`canEmitEvent` yêu cầu `phase === 'running'`. Sau `QUIZ_ROOM_FINISHED` / `QUIZ_ROOM_CANCEL`, store
dừng publisher, subscriber, timer và **không gửi thêm** status hay event.

---

## 4. Event policy — cái gì phát hiện được, cái gì không

| Loại | Trạng thái | Nguồn thật trong Electron |
|---|---|---|
| `APP_FOCUS_LOST` | **Có** | `window.blur` + `focus`, đo bằng đồng hồ; ngưỡng 5 000 ms |
| `APP_MINIMIZED` | **Có** | `document.visibilitychange` với `visibilityState === 'hidden'`, cùng ngưỡng |
| `CAMERA_BLOCKED` | **Có** | `MediaStreamTrack` phát `mute`/`ended`, hoặc stream lỗi giữa phiên |
| `NO_FACE` | **Không** | cần model thị giác — không có trong Electron |
| `MULTIPLE_FACES` | **Không** | cần model thị giác |
| `LOOKING_AWAY` | **Không** | cần model gaze |
| `PHONE_DETECTED` | **Không** | cần model object detection |

**Không bịa bốn loại cuối.** Union `DETECTABLE_EVENT_TYPES` chỉ chứa ba loại đầu và đó là kiểu
duy nhất `emitEvent` chấp nhận. `confidence` luôn `0` = "không có model nào đo", không phải "0 %
chắc chắn"; host dashboard không hiển thị phần trăm.

### 4.1 Debounce focus (mirror `FocusEventDebouncer`, rút gọn theo yêu cầu)

```text
blur/hidden  → bắt đầu khoảng vắng (giữ mốc sớm nhất; hidden thắng blur về nhãn)
tick 1 s     → vắng ≥ 5 s  → phát **một** EVIDENCE (duration = thời gian vắng)
quay lại     → nếu chưa phát và vắng ≥ 5 s → phát một EVIDENCE; nếu đã phát → im lặng
reset        → quay lại là khoảng mới; alt-tab < 10 s sau lần báo trước bị coi là nhiễu
```

- Vắng **dưới** ngưỡng: **không** có sự kiện (mặc định `warnMs = null`). Có thể bật WARNING cho
  khoảng vắng ngắn bằng `createFocusWatcher({warnMs})`, mặc định tắt để đúng luật "chỉ khi vượt
  ngưỡng".
- `durationMillis` bị clamp 0..300 000 (server từ chối ngoài miền này).
- Cooldown theo loại sự kiện: 10 s (mirror `ProctoringCoordinator.lastEvents`), nên một chuỗi
  alt-tab liên tục không tạo hàng trăm cảnh báo.

### 4.2 `CAMERA_BLOCKED`

- track `mute` → `cameraStatus = BLOCKED` + một event `CAMERA_BLOCKED` (`EVIDENCE`, duration 0).
- track `ended` → `cameraStatus = LOST` + cùng event (protocol không có loại "camera lost"; mất
  track là bằng chứng mạnh nhất mà client quan sát được).
- `frameSequence` là sequence của frame gần nhất đã gửi; `eventId` là UUID v4
  (`crypto.randomUUID()`, fallback `getRandomValues`).

---

## 5. HOST SIDE

- `PROCTOR_MEDIA_SESSION {role:'HOST_SUBSCRIBER'}` → store gọi `start-subscribe`. Session mới →
  khởi động lại kênh.
- `PROCTOR_STATUS_UPDATE` → tile theo `userId` (trạng thái camera, kết nối, số cảnh báo).
- `PROCTOR_EVENT` → tile + feed (mới nhất đứng đầu, **tối đa 100** dòng).
- Tile được seed từ `QUIZ_LOBBY_UPDATE` nên người chơi chưa từng đổi trạng thái vẫn có ô.
- Sắp xếp: số cảnh báo giảm dần, rồi tên A→Z (`sortProctorTiles`).
- Dashboard: `/proctor/:pin` — một ô mỗi người chơi đang chơi; ảnh `object-contain` trên nền đen
  (letterbox, không crop mất bằng chứng), tên, chip trạng thái camera, số cảnh báo, cảnh báo gần
  nhất; bấm vào mở `Sheet` chi tiết.
- **Chưa có frame** → ô nói rõ "Chưa nhận được hình ảnh" (không phải hộp đen).
- Lỗi kênh xem (ACK ≠ 0, socket error) → `ErrorBanner` + nút *Thử lại*; phòng vẫn chạy bình thường.
- Route yêu cầu quyền host: người chơi gõ URL thấy thông báo và quay lại, không lộ dữ liệu.
- **Không có ticket trong URL/DOM**: URL chỉ chứa PIN (PIN vốn đã công khai trong phòng).

### 5.1 Lối vào dashboard

| Vị trí | Điều kiện hiện nút |
|---|---|
| Lobby | `proctoringEnabled && !hostPlays` (host không chơi) |
| `/quiz/battle` | host (`started.host`) và không `playing` |

Host vừa chơi vừa giám sát là cấu hình server không cho phép; khi gặp, UI giải thích thay vì hiện
nút hỏng.

### 5.2 Hiệu năng hiển thị

Frame đi qua `frame-hub`, mỗi tile subscribe theo `userId`, nên một frame mới chỉ re-render đúng ô
đó. Main process đã chặn ~15 fps/người; hub bỏ frame có `sequence` không mới hơn và giới hạn 64
user. Blob URL cũ được `revokeObjectURL` ngay khi frame đổi.

---

## 6. Wire format (đã kiểm bằng golden vector)

Big-endian, đúng `java.io.DataOutputStream`.

```text
Handshake client → server                    8 byte header + ticket UTF-8
 0  int32  MAGIC = 0x4E514D50 ("NQMP")
 4  uint8  VERSION = 2
 5  uint8  ROLE (1 PUBLISHER, 2 HOST_SUBSCRIBER)
 6  uint16 TICKET_LENGTH (1..512)
 8  byte[] TICKET

Server → client: đúng 1 byte ACK
 0 OK · 1 MAGIC sai · 2 VERSION · 3 ticket/role sai · 4 ticket hết hạn · 5 phòng đóng

Publisher frame 0x10                          21 byte header + jpeg + vision
 0 uint8 type · 1 int64 sequence · 9 int64 captureEpochMillis
 17 int32 jpegLength (1..524288) · 21 byte[] jpeg · .. VisionMetadata

Relayed frame 0x11                            29 byte header + jpeg + vision
 0 uint8 type · 1 int64 userId · 9 int64 sequence
 17 int64 serverReceivedEpochMillis · 25 int32 jpegLength · 29 byte[] jpeg · .. VisionMetadata

VisionMetadata                                38 byte cố định + 32 byte/face (≤ 6)
 0 int64 frameSequence · 8 int64 analysedAtEpochMillis · 16 uint8 attention ordinal
 17 double gazeX · 25 double gazeY · 33 float confidence · 37 uint8 faceCount · 38 per face 8×float
```

`MEDIA_MAX_RELAY_FRAME_BYTES = 29 + 524288 + 38 + 6×32 = 524547`. Mọi offset và cả 6 mã ACK được
khoá trong `src/main/media/codec.test.ts`.

---

## 7. IPC surface

| Channel | Hướng | Kiểu | Ghi chú |
|---|---|---|---|
| `nq:media:publish-frame` | renderer → main | `invoke` | `{ meta, data }`; `data` là JPEG đã encode |
| `nq:media:start-publish` | renderer → main | `invoke` | `{ host, mediaPort, ticket }` → `MediaCommandResult` |
| `nq:media:stop-publish` | renderer → main | `invoke` | → `void` |
| `nq:media:start-subscribe` | renderer → main | `invoke` | `{ host, mediaPort, ticket }` → `MediaCommandResult` |
| `nq:media:stop-subscribe` | renderer → main | `invoke` | → `void` |
| `nq:media:status` | renderer → main | `invoke` | → `MediaStatusSnapshot` |
| `nq:media:status` | main → renderer | `webContents.send` | push khi trạng thái đổi |
| `nq:media:frame` | main → renderer | `webContents.send` | `MediaInboundFrame` (ArrayBuffer JPEG) |

Quy ước giống control handler: **không handler nào ném lỗi qua IPC**; mọi thất bại trả
`{ ok:false, error }`. Ticket không được log, không echo, không nằm trong status.

`window.nq.media` khai kiểu trong `shared/media-ipc.ts`; renderer đọc qua `readMediaBridge()` vì
`NqBridge` (`shared/ipc.ts`, architecture sở hữu) chưa có field `media`.

### 7.1 Wiring đã có

Architecture đã gọi `registerMediaHandlers()` trong `desktop/src/main/index.ts` (cạnh
`registerControlHandlers()`, có dispose trong `dispose()` và đăng ký lại ở `activate`), và
`preload/index.ts` expose `media`. Vì vậy `window.nq.media` hoạt động thật ở runtime; nếu một bản
build nào thiếu handler, preload vẫn fail closed bằng `MEDIA_UNAVAILABLE` và UI chỉ hiện cảnh báo.

---

## 8. Latest-frame và backpressure

Ba tầng, mỗi tầng bounded:

1. **Renderer pump**: đúng một encode in-flight; tick khi encode trước chưa xong bị **bỏ**;
   JPEG vượt 512 KiB ở mọi mức chất lượng (`.88 → .82 → .75 → .68`) bị bỏ; tab ẩn → pause.
2. **Main publisher**: một slot chờ, frame mới thay frame cũ (không hàng đợi) → bộ nhớ ≤ 2 ảnh.
3. **Main subscriber**: `Map<userId, frame>`, flush tối đa mỗi 66 ms (~15 fps), tối đa một
   frame/user/lượt, sequence cũ bị bỏ, trần 32 user.

Metrics (offered/completed/dropped/bytes/fps) phát qua `nq:media:status`.

---

## 9. Chính sách lỗi

| Tình huống | Hành vi |
|---|---|
| Từ chối quyền | `DENIED` + cảnh báo cố định + nút bật lại. Thi bình thường |
| Không có camera | `NOT_FOUND`, tự retry 3 lần cách 5 s, sau đó chỉ còn nút thủ công |
| Camera bị app khác chiếm | `FAILED` + gợi ý; vẫn thi bình thường |
| Track mute/ended | `BLOCKED`/`LOST` + `CAMERA_BLOCKED` (có cooldown) |
| ACK ≠ 0 | Banner + `Thử lại`; nói rõ nếu vẫn lỗi thì cần vào lại phòng để nhận phiên mới |
| Socket media đóng | Status `error`, không retry vô hạn; server cấp phiên mới khi kênh ngắt |
| Preload/main chưa nối handler | `MEDIA_UNAVAILABLE`, chỉ là cảnh báo |
| Phòng kết thúc/huỷ | Dừng camera, publisher, subscriber, timer; không gửi gì thêm |

Bất biến khác:

- **Không audio**: `audio: false`; media protocol không có track âm thanh.
- Mọi track bị `stop()` khi unmount/stop/retry; mỗi lần mở là một `attemptId` mới.
- Ticket không vào log/DOM/URL; `eventId` là UUID.
- Không log nội dung frame.

---

## 10. Kiểm chứng đã chạy (Linux, không webcam)

```bash
bash desktop/scripts/verify-linux.sh cam2 npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh cam2 npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh cam2 npx vitest run
bash desktop/scripts/verify-linux.sh cam2 npm run build
```

| Lệnh | Kết quả |
|---|---|
| `tsc -p tsconfig.web.json` | 0 lỗi |
| `tsc -p tsconfig.node.json` | 0 lỗi |
| `vitest run` | **558 test pass / 48 file** (trong đó **160 test** thuộc phạm vi camera) |
| `npm run build` | thành công |

Test của camera (sau khi nối end-to-end):

| File | Số test | Nội dung |
|---|---|---|
| `main/media/codec.test.ts` | 25 | golden byte vector, ACK 0..5, decoder theo từng byte |
| `main/media/publisher.test.ts` | 11 | handshake TCP loopback, latest-frame, từ chối gửi sau lỗi socket |
| `main/media/subscriber.test.ts` | 9 | dedupe theo sequence, trần fps, phiên mới, không retry |
| `main/ipc/register-media-handlers.test.ts` | 27 | validator buffer/host/port/ticket, sender, không echo ticket |
| `features/proctor/__tests__/focus-events.test.ts` | 9 | ngưỡng 5 s, một EVIDENCE/khoảng vắng, reset, cooldown |
| `…/proctor-protocol.test.ts` | 12 | cổng gửi, chặn NOT_REQUIRED, clamp payload, UUID |
| `…/proctor-store.test.ts` | 28 | status một lần/1 thay đổi, session theo role, tile/feed 100, lỗi ACK + retry, teardown |
| `…/proctor-session-host.test.tsx` | 4 | lobby/running/ended, rời phòng → teardown, seed tile |
| `…/proctor-dashboard.test.tsx` | 9 | tile, "chưa có hình", feed, Sheet, banner retry, sắp xếp |
| `…/proctor-panels.test.tsx` | 7 | consent/decline, lối vào dashboard của host, hostPlays |
| `…/use-camera-stream.test.tsx` | 8 | granted/denied/not-found/disabled, stop track |
| `…/camera-preview.test.tsx` | 4 | badge, cảnh báo không chặn, thu nhỏ |
| `…/frame-pump.test.ts` | 7 | backpressure, trần 512 KiB, tab ẩn |

**Chưa** chạy: Electron thật, webcam thật, relay Java thật, hai máy trong LAN.

---

## 11. Những gì KHÔNG thể xác minh nếu không có webcam thật

1. `getUserMedia` thật có mở được 640×480@15 không (nhiều webcam chỉ trả 1280×720).
2. Chất lượng/kích thước JPEG thực và việc hạ chất lượng có đủ dưới 512 KiB không.
3. Preview có hiển thị đúng (jsdom không decode video).
4. Quyền camera của OS/Chromium: hộp thoại, nhớ lựa chọn, `DENIED` có cần khởi động lại app.
5. FPS/CPU thực khi encode 15 fps (đọc `metrics()` thật).
6. Relay nhiều publisher (2 → 6 người) qua LAN thật, và dashboard 6 tile cùng lúc.
7. Hành vi khi sleep/rút USB/đổi thiết bị (`LOST`), và khi thu nhỏ cửa sổ (sự kiện `APP_MINIMIZED`).
8. Windows `MJPG`/driver quirks — Electron dùng Chromium MediaFoundation, khác OpenCV bên JavaFX.
9. Sự khác nhau giữa `window.blur` và mất focus của cả cửa sổ trên Windows (alt-tab vs click app khác).

---

## 12. Các bước kiểm thử trên Windows (có webcam, 2 máy nếu được)

1. `cd desktop && npm install && npm run dev`.
2. DevTools Console: không lỗi CSP `media-src`, không exception preload.
3. **Player**: tạo/join phòng bật proctoring → card consent → *Bật camera* → badge
   `Đang mở camera` → `Camera sẵn sàng`, preview chuyển động.
4. **Player từ chối**: chọn *Tiếp tục không camera* → cảnh báo cố định + vẫn bấm Start/Answer bình
   thường; host thấy `Từ chối camera` trong lobby.
5. **Player**: alt-tab sang app khác **dưới 5 giây** → không có cảnh báo. Alt-tab **trên 5 giây**
   → host nhận đúng **một** `APP_FOCUS_LOST` (EVIDENCE), feed hiện thời gian + "N giây".
6. Thu nhỏ cửa sổ trình duyệt/app → `APP_MINIMIZED`; mở lại → không phát lặp.
7. Rút USB camera khi đang thi → `LOST` + `CAMERA_BLOCKED`; quiz vẫn tiếp tục.
8. **Host**: lobby có `proctoringEnabled` và không chơi → *Mở bảng giám sát* → `/proctor/:pin`;
   mỗi người chơi một ô, ảnh cập nhật, chưa bật camera thì thấy "Chưa nhận được hình ảnh".
9. Bấm một ô → Sheet chi tiết; kiểm tra không có chuỗi ticket nào trong DOM/URL.
10. Giết kênh media (rút mạng ngắn) → banner lỗi + *Thử lại*; phòng không sập, điểm vẫn cập nhật.
11. Kết thúc phòng → cả hai phía dừng camera/kênh; không có log `uncaughtException`.
12. Log main process: không có ticket, không có nội dung frame.
