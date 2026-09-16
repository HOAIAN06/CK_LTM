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
| GAME_OVER     | Server → Client | Kết thúc trận       |
| DISCONNECT    | Hai chiều       | Ngắt kết nối        |

> Đây mới chỉ là **protocol dự kiến**, chưa cần triển khai toàn bộ ở task hiện tại (skeleton).

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

> Hiện tại Server chỉ là skeleton (in ra TODO), chưa mở `ServerSocket` thật.

---

## 12. Phạm vi task hiện tại

### Đã làm

- Cấu trúc thư mục và package
- Skeleton class Client / Server / Common
- FXML + CSS cơ bản
- `questions.json` demo
- README kiến trúc cho 2 thành viên
- `ClientApp` mở được `home.fxml`

### Chưa làm (cố ý)

- TCP gameplay hoàn chỉnh
- Login / register / database
- Rank, coin, shop, inventory, AI
- WebSocket, UDP, P2P
- Animation, sound, chat, friend system

Ưu tiên của giai đoạn này: **cấu trúc sạch, dễ hiểu, tài liệu rõ** — không over-engineer.
