# NihongoQuest

## 1. Giới thiệu dự án

**NihongoQuest** là ứng dụng JavaFX học tiếng Nhật theo hình thức đối kháng **1v1**.

Hai Client kết nối tới một Game Server thông qua **TCP Socket**.

Server thực hiện **matchmaking** (xếp hàng tìm trận) và **quản lý trận đấu**: câu hỏi, đáp án đúng, điểm số và người thắng.

> Task hiện tại chỉ tạo **cấu trúc dự án ban đầu** (skeleton). Chưa triển khai TCP gameplay hoàn chỉnh.

Công nghệ sử dụng:

- Java 17
- JavaFX (FXML + CSS)
- Maven
- TCP Socket (dự kiến)
- JSON cho câu hỏi demo

---

## 2. Kiến trúc hệ thống

```text
Client A
   │
   │ TCP
   ▼
Game Server
   ▲
   │ TCP
   │
Client B
```

**Quan trọng:** Client A và Client B **không** kết nối trực tiếp với nhau.

Mỗi Client chỉ nói chuyện với Game Server. Server là trung gian:

- nhận yêu cầu tìm trận
- ghép cặp
- phát câu hỏi
- nhận đáp án
- tính điểm và kết quả
- gửi cập nhật về cả hai Client

---

## 3. Luồng hoạt động dự kiến

```text
Client khởi động
        ↓
Connect Server
        ↓
Home
        ↓
Tìm trận
        ↓
Matchmaking
        ↓
Server tìm đủ 2 người
        ↓
GameRoom
        ↓
Battle
        ↓
Question
        ↓
Answer
        ↓
Score
        ↓
Game Over
        ↓
Result
```

Giải thích ngắn:

1. Người chơi mở Client → vào màn **Home**.
2. Bấm **Tìm trận** → Client gửi `FIND_MATCH` lên Server.
3. Server đưa vào hàng chờ (**MatchmakingManager**).
4. Đủ 2 người → tạo **GameRoom**, gửi `MATCH_FOUND`.
5. Hai Client vào màn **Battle**, nhận cùng câu hỏi từ Server.
6. Client gửi `ANSWER` → Server chấm → cập nhật điểm.
7. Hết trận → `GAME_OVER` → màn **Result**.

---

## 4. Cấu trúc thư mục

```text
NihongoQuest/
│
├── pom.xml
│
├── README.md
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── nihongoquest/
│   │   │           │
│   │   │           ├── client/
│   │   │           │   ├── ClientApp.java
│   │   │           │   │
│   │   │           │   ├── controller/
│   │   │           │   │   ├── HomeController.java
│   │   │           │   │   ├── MatchmakingController.java
│   │   │           │   │   ├── BattleController.java
│   │   │           │   │   └── ResultController.java
│   │   │           │   │
│   │   │           │   ├── network/
│   │   │           │   │   ├── GameClient.java
│   │   │           │   │   └── ServerListener.java
│   │   │           │   │
│   │   │           │   └── model/
│   │   │           │       ├── Player.java
│   │   │           │       ├── Question.java
│   │   │           │       └── GameState.java
│   │   │           │
│   │   │           ├── server/
│   │   │           │   ├── GameServer.java
│   │   │           │   ├── ClientHandler.java
│   │   │           │   ├── MatchmakingManager.java
│   │   │           │   ├── GameRoom.java
│   │   │           │   └── QuestionManager.java
│   │   │           │
│   │   │           └── common/
│   │   │               ├── Message.java
│   │   │               ├── MessageType.java
│   │   │               └── Protocol.java
│   │   │
│   │   └── resources/
│   │       ├── fxml/
│   │       │   ├── home.fxml
│   │       │   ├── matchmaking.fxml
│   │       │   ├── battle.fxml
│   │       │   └── result.fxml
│   │       │
│   │       ├── css/
│   │       │   └── style.css
│   │       │
│   │       └── questions/
│   │           └── questions.json
│   │
│   └── test/
│       └── java/
```

---

## 5. Giải thích từng package

### `client`

Code chạy trên máy người dùng. Chứa entry point JavaFX (`ClientApp`), controller, network và model phía Client.

### `client.controller`

Xử lý sự kiện giao diện JavaFX (bấm nút, cập nhật Label...). Controller **không** tự mở Socket.

### `client.network`

Xử lý TCP Socket phía Client:

- `GameClient`: kết nối, ngắt kết nối, gửi message
- `ServerListener`: thread lắng nghe message từ Server (không block UI)

### `client.model`

Model dữ liệu phía Client để hiển thị: người chơi, câu hỏi, trạng thái trận.

### `server`

Code chạy trên máy Server. Chịu trách nhiệm matchmaking và game logic (câu hỏi đúng, điểm, winner).

### `common`

Các class dùng chung cho cả Client và Server: `Message`, `MessageType`, `Protocol`.

Hai thành viên **phải thống nhất** trước khi sửa package này.

### `resources/fxml`

Giao diện JavaFX (Home, Matchmaking, Battle, Result).

### `resources/css`

CSS JavaFX cơ bản (`style.css`).

### `resources/questions`

Dữ liệu câu hỏi demo dạng JSON.

---

## 6. Bảng giải thích từng file

| File                       | Thuộc phía     | Chức năng                   |
| -------------------------- | -------------- | --------------------------- |
| ClientApp.java             | Client         | Khởi động JavaFX            |
| HomeController.java        | Client/UI      | Xử lý màn hình Home         |
| MatchmakingController.java | Client/UI      | Xử lý màn hình tìm trận     |
| BattleController.java      | Client/UI      | Xử lý màn hình thi đấu      |
| ResultController.java      | Client/UI      | Xử lý màn hình kết quả      |
| GameClient.java            | Client/Network | Quản lý TCP connection      |
| ServerListener.java        | Client/Network | Lắng nghe message từ Server |
| Player.java                | Client/Model   | Dữ liệu người chơi          |
| Question.java              | Client/Model   | Dữ liệu câu hỏi             |
| GameState.java             | Client/Model   | Trạng thái trận phía Client |
| GameServer.java            | Server         | Khởi động TCP Server        |
| ClientHandler.java         | Server         | Xử lý một Client connection |
| MatchmakingManager.java    | Server         | Quản lý hàng chờ tìm trận   |
| GameRoom.java              | Server         | Quản lý một trận 1v1        |
| QuestionManager.java       | Server         | Quản lý câu hỏi             |
| Message.java               | Common         | Model message mạng          |
| MessageType.java           | Common         | Các loại message            |
| Protocol.java              | Common         | Quy ước giao tiếp mạng      |
| home.fxml                  | UI             | Giao diện Home              |
| matchmaking.fxml           | UI             | Giao diện tìm trận          |
| battle.fxml                | UI             | Giao diện trận đấu          |
| result.fxml                | UI             | Giao diện kết quả           |
| style.css                  | UI             | CSS JavaFX                  |
| questions.json             | Data           | Câu hỏi demo                |

---

## 7. Quy tắc làm việc nhóm

Hai thành viên phải tuân thủ các quy tắc sau để tránh xung đột kiến trúc.

### Không viết code sai package

Ví dụ: `GameClient` luôn nằm ở:

```text
com.nihongoquest.client.network
```

Không di chuyển class lung tung giữa các package.

### Controller không xử lý TCP trực tiếp

Không viết:

```java
new Socket(...)
```

trong `HomeController`, `BattleController`, ...

Controller phải gọi `GameClient`.

### Client không tự tính kết quả trận đấu

Các dữ liệu quan trọng như:

- đáp án đúng
- score
- winner

phải do **Server** quyết định. Client chỉ hiển thị.

### UI không chứa business logic

| Thành phần   | Nhiệm vụ                          |
| ------------ | --------------------------------- |
| FXML         | Định nghĩa giao diện              |
| Controller   | Xử lý tương tác giao diện         |
| GameClient   | Xử lý network phía Client         |
| Server       | Xử lý game logic và matchmaking   |

### Không tạo class mới nếu chưa thống nhất

Nếu cần tạo class mới, hai thành viên phải thống nhất chức năng class trước khi thêm vào project.

---

## 8. Phân chia công việc đề xuất

### THÀNH VIÊN 1 — Client / UI

- Client
- JavaFX
- FXML
- Controller
- GameClient
- ServerListener
- client.model

### THÀNH VIÊN 2 — Server / Network protocol

- GameServer
- ClientHandler
- MatchmakingManager
- GameRoom
- QuestionManager
- Network protocol (triển khai gửi/nhận theo `common`)

### Phần chung — cả hai phải thống nhất

Package `common/`:

- `Message`
- `MessageType`
- `Protocol`

Không nên để một người tự ý thay đổi vì sẽ ảnh hưởng cả Client và Server.

---

## 9. Luồng giao tiếp mạng dự kiến

| Message       | Hướng           | Ý nghĩa             |
| ------------- | --------------- | ------------------- |
| CONNECT       | Client → Server | Client kết nối      |
| FIND_MATCH    | Client → Server | Tìm đối thủ         |
| CANCEL_MATCH  | Client → Server | Hủy tìm trận        |
| MATCH_FOUND   | Server → Client | Đã tìm thấy đối thủ |
| QUESTION      | Server → Client | Server gửi câu hỏi  |
| ANSWER        | Client → Server | Client gửi đáp án   |
| ANSWER_RESULT | Server → Client | Kết quả đáp án      |
| SCORE_UPDATE  | Server → Client | Cập nhật điểm       |
| PLAYER_FINISHED | Server → Client | Người chơi đã hoàn thành, chờ đối thủ |
| GAME_OVER     | Server → Client | Kết thúc trận       |
| DISCONNECT    | Hai chiều       | Ngắt kết nối        |

Payload gameplay dùng chung:

| Message | Payload |
| ------- | ------- |
| `QUESTION` | `round\|totalQuestions\|durationSeconds\|text\|answer0\|answer1\|answer2\|answer3` (round bắt đầu từ 0, không gửi đáp án đúng) |
| `ANSWER` | `answerIndex` (0–3) |
| `ANSWER_RESULT` | `correct\|chosenIndex\|correctIndex`; `chosenIndex = -1` khi hết giờ |
| `SCORE_UPDATE` | `myScore\|opponentScore` |
| `PLAYER_FINISHED` | Payload rỗng |
| `GAME_OVER` | `result\|myScore\|opponentScore`, với result là `WIN`, `LOSE` hoặc `DRAW` |

Mỗi người tiến qua các câu độc lập, không cần đợi đối thủ trả lời. Mỗi câu có
30 giây do Server kiểm soát bằng deadline riêng. Client chỉ hiển thị thanh thời
gian và phản hồi từ Server, không tự chấm hoặc tự chuyển câu. Hết giờ được tính
là sai; Server trả đáp án đúng rồi gửi câu tiếp sau 1,5 giây. Mỗi câu đúng được
1 điểm, không trừ điểm. `GAME_OVER` chỉ được gửi khi cả hai đã hoàn thành.

Cổng mặc định: `Protocol.DEFAULT_PORT = 5000`.

---

## 10. Quy tắc Git cho 2 người

### Branch đề xuất

```text
main
dev
feature/client-ui
feature/network-server
```

### Workflow

```text
main
  ↑
 dev
 ↑ ↑
UI SERVER
```

- Không commit trực tiếp code đang làm dở vào `main`.
- Làm feature trên branch riêng → merge vào `dev` → khi ổn định mới đưa lên `main`.

### Commit message nên rõ nghĩa

```text
feat: add matchmaking screen

feat: add game server skeleton

fix: correct battle controller package

docs: update project architecture
```

### Không dùng commit kiểu

```text
update
fix
abc
test123
```

---

## 11. Cách chạy project (skeleton)

### Yêu cầu

- JDK 17+
- Maven 3.8+

### Compile

```bash
mvn clean compile
```

### Chạy Client (JavaFX)

```bash
mvn javafx:run
```

Ứng dụng sẽ mở màn hình **Home** (`home.fxml`).

### Chạy Server (sau này)

```bash
mvn exec:java -Dexec.mainClass="com.nihongoquest.server.GameServer"
```

Hoặc chạy `GameServer.main` từ IDE.

Server hiện đã mở TCP Socket thật và xử lý đăng ký/đăng nhập qua Supabase.
Trước khi chạy, sao chép `src/main/resources/db.properties.example` thành
`db.properties` và điền cấu hình database.

---

## 12. Phạm vi task hiện tại

### Đã làm

- Cấu trúc thư mục và package
- Skeleton class Client / Server / Common
- FXML + CSS cơ bản
- `questions.json` demo
- README kiến trúc cho 2 thành viên
- TCP Server/Client cơ bản
- Đăng ký, đăng nhập và đọc hồ sơ từ Supabase
- `ClientApp` mở màn đăng nhập trước khi vào Home
- Matchmaking TCP 1v1, hủy hàng chờ và chuyển sang Battle
- Gameplay 1v1 gồm gửi câu hỏi, Server chấm đáp án, cập nhật điểm và kết thúc trận
- Feedback đáp án xanh/đỏ và màn Result thắng, thua hoặc hòa

### Chưa làm (cố ý)

- Rank, coin, shop, inventory, AI
- WebSocket, UDP, P2P
- Sound, chat, friend system

Ưu tiên của giai đoạn này: **cấu trúc sạch, dễ hiểu, tài liệu rõ** — không over-engineer.

---

## 13. Cách kiểm tra hai người chơi đã ghép trận

Matchmaking đã hoạt động qua TCP. Kiểm thử bằng quy trình sau:

1. Chạy một `GameServer`.
2. Mở hai terminal và chạy `mvn javafx:run` ở mỗi terminal để có hai cửa sổ Client.
3. Đăng nhập bằng hai tài khoản khác nhau, ví dụ `player_a` và `player_b`.
4. Ở cả hai cửa sổ, bấm **TÌM TRẬN**.
5. Kiểm tra log Server phải lần lượt cho biết:
   - `player_a đã vào hàng chờ`;
   - `player_b đã vào hàng chờ`;
   - `Đã tạo room <roomId>: player_a vs player_b`.
6. Kiểm tra cả hai Client đều nhận `MATCH_FOUND`, hiển thị đúng tên đối thủ
   và chuyển sang màn Battle. `roomId` chỉ dùng nội bộ, không hiển thị cho người chơi.

Khi chỉ có một người tìm trận, màn hình hiển thị vòng tròn đang tải. Bấm
**HỦY TÌM TRẬN** phải quay về Home; log Server phải cho biết người đó đã
rời hàng chờ. Đóng Client trong lúc chờ cũng phải xóa người chơi khỏi queue.

Chỉ xem hai tài khoản tồn tại trong database **không chứng minh đã ghép trận**.
Ghép trận chỉ thành công khi Server đã tạo room và cả hai kết nối TCP nhận
`MATCH_FOUND` có cùng `roomId`.

---

## 14. Cách kiểm tra trận đấu câu hỏi

1. Ghép hai Client vào cùng một trận theo mục 13.
2. Kiểm tra hai bên cùng nhận 3 câu hỏi từ `questions.json`.
3. Mỗi bên chọn một đáp án. Nút đáp án đúng phải chuyển xanh; nếu chọn sai,
   nút đã chọn chuyển đỏ đồng thời đáp án đúng chuyển xanh.
4. Một người trả lời trước phải nhận câu tiếp theo sau 1,5 giây mà không cần
   đợi người còn lại; hai Client có thể đang ở hai câu khác nhau.
5. Mỗi đáp án đúng cộng 1 điểm, đáp án sai không trừ điểm.
6. Để một Client không chọn đáp án: thanh thời gian phải giảm từ 30 giây về 0,
   các nút bị khóa và Server trả timeout cùng đáp án đúng.
7. Người hoàn thành trước phải thấy “Đang chờ đối thủ hoàn thành”.
8. Sau khi cả hai hoàn thành, hai Client chuyển sang Result với kết quả tương ứng
   `CHIẾN THẮNG`, `THẤT BẠI` hoặc `HÒA` và điểm theo góc nhìn của từng người.
9. Bấm **VỀ TRANG CHỦ** phải quay lại Home.
