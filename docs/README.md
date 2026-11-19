# Bản đồ tài liệu NihongoQuest

File này là mục lục trung tâm cho tài liệu, rule và skill của dự án. Tài liệu được chia thành
ba nhóm: **Frontend**, **Backend** và **Toàn bộ hệ thống**.

## 1. Cách xác định nguồn sự thật

Khi tài liệu và code khác nhau, ưu tiên theo thứ tự:

1. Code và schema đang chạy:
   - Protocol Java: `src/main/java/com/nihongoquest/common/protocol/`
   - Media protocol: `src/main/java/com/nihongoquest/common/media/`
   - Quiz Room/server: `src/main/java/com/nihongoquest/server/`
   - JavaFX client: `src/main/java/com/nihongoquest/client/` và
     `src/main/resources/client/`
   - Electron client: `desktop/src/`
   - Database: `sql/supabase_schema.sql`
2. Quyết định còn hiệu lực trong [`DECISIONS.md`](../DECISIONS.md).
3. Tài liệu kiến trúc/hợp đồng hiện hành.
4. Nhật ký, báo cáo QA và kế hoạch lịch sử.

Nhãn dùng trong mục lục:

- **Hiện hành**: nên đọc để làm việc ở thời điểm hiện tại.
- **Tham chiếu**: hữu ích nhưng code vẫn là nguồn sự thật.
- **Lịch sử**: snapshot tại một thời điểm, không dùng làm hợp đồng hiện tại.
- **Cần đồng bộ**: có phần đã lệch so với code hoặc quyết định mới hơn.
- **Lưu trữ**: không dùng để xác định hành vi.

---

## 2. Frontend

NihongoQuest có hai frontend độc lập: JavaFX fallback và Electron + React + TypeScript.

### 2.1 JavaFX UI

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`ui-design.md`](ui-design.md) | **Cần đồng bộ** | Mô tả component, token, animation, kích thước và accessibility của JavaFX. Phần Sakura Arcade đã bị quyết định Calm Study D-020 thay thế; phải kiểm tra `style.css` và `DECISIONS.md` trước khi áp dụng palette. |
| [`ui-redesign-proposal.md`](ui-redesign-proposal.md) | **Lịch sử** | Audit 16 màn hình, ba phương án giao diện và lộ trình overhaul. Dùng để hiểu lý do thiết kế, không phải trạng thái UI hiện tại. |
| [`ui-tooling.md`](ui-tooling.md) | **Hiện hành** | Hướng dẫn cài và dùng UI UX Pro Max trong `.opencode/skills/`; giải thích vì sao skill local không được commit. |

### 2.2 Electron + React + TypeScript

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`../desktop/README.md`](../desktop/README.md) | **Cần đồng bộ** | Quick start, lệnh chạy/build/test và cấu trúc `desktop/`. Mục trạng thái “Phase 2/chưa commit” là snapshot cũ. |
| [`desktop/design-system.md`](desktop/design-system.md) | **Hiện hành** | Design system Sumi: token, typography, component, shell, motion, accessibility và quy tắc CSS/Tailwind. Nguồn token thật là `desktop/src/renderer/styles/tokens.css`. |
| [`desktop/visual-qa.md`](desktop/visual-qa.md) | **Hiện hành** | Quy trình chụp và đánh giá UI bằng Chromium headless; nêu rõ phần vẫn phải kiểm tra trên Windows/Electron thật. |
| [`desktop/architecture.md`](desktop/architecture.md) | **Tham chiếu, có ghi chú cũ** | Kiến trúc Electron main/preload/renderer, security, IPC và vòng đời cửa sổ. Một số ghi chú “chưa packaging” đã cũ; đối chiếu `PROGRESS.md` và code. |
| [`desktop/proctoring.md`](desktop/proctoring.md) | **Tham chiếu** | Luồng camera Electron, consent, event có thể phát hiện, latest-frame, media IPC và checklist webcam/LAN. Java protocol và server vẫn là nguồn sự thật. |

---

## 3. Backend

Backend gồm Java 21 server, PostgreSQL, gameplay authoritative, TCP control và media relay.

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`architecture.md`](architecture.md) | **Hiện hành** | Bản đồ module Java, ranh giới client/server, thread, Ranked, Quiz Room, media relay, persistence, port và quy tắc mở rộng. |
| [`protocol.md`](protocol.md) | **Hiện hành / hợp đồng đọc cho con người** | JSON-line control protocol, payload, lỗi, timeout và binary media protocol. Code trong `common/protocol` và `common/media` thắng nếu có khác biệt. |
| [`database.md`](database.md) | **Hiện hành nhưng còn ngắn** | Chỉ ra schema chuẩn, ranh giới JDBC/repository và quy tắc sửa persistence. Chi tiết thật nằm trong `sql/supabase_schema.sql`. |
| [`ranked.md`](ranked.md) | **Hiện hành** | Luật Ranked 1v1, matchmaking, deadline, scoring, disconnect, transaction lưu kết quả và giới hạn hiện tại. |
| [`proctoring.md`](proctoring.md) | **Hiện hành** | Chính sách camera không chặn quiz, trạng thái, retry, metrics, độ tin cậy phát hiện và benchmark cần làm. |
| [`testing.md`](testing.md) | **Hiện hành, có baseline lịch sử** | Lệnh Maven, test camera/LAN, đo pipeline và checklist UI. Các tổng số test là snapshot theo từng phiên. |
| [`troubleshooting.md`](troubleshooting.md) | **Hiện hành nhưng tối giản** | Dữ liệu cần ghi khi có lỗi và thứ tự kiểm tra khi lobby/camera bị kẹt. |

### 3.1 Electron giao tiếp với backend

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`desktop/contracts.md`](desktop/contracts.md) | **Hiện hành cho ranh giới tích hợp** | Bất biến server authority, quyền sở hữu TCP ở Electron main, IPC contract, protocol mirror và token contract. Phần ownership theo agent là quy trình của phase trước. |
| [`desktop/protocol.md`](desktop/protocol.md) | **Hiện hành cho TypeScript mirror** | Cách TypeScript mirror 71 `MessageType`, payload, framing, codec, transport và media constants. Không thay thế protocol Java. |
| [`desktop/qa-report.md`](desktop/qa-report.md) | **Lịch sử** | Báo cáo QA/security/protocol tại thời điểm review. Nhiều finding đã được sửa hoặc thay đổi sau đó; dùng làm bằng chứng audit, không làm trạng thái hiện tại. |

---

## 4. Toàn bộ hệ thống

### 4.1 Điểm bắt đầu và quản trị dự án

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`../README.md`](../README.md) | **Hiện hành, có snapshot cũ** | Tổng quan dự án, cách chạy Java/desktop, port, log và liên kết tài liệu chính. Một số dòng trạng thái UI/desktop phản ánh phase cũ. |
| [`../AGENTS.md`](../AGENTS.md) | **Rule bắt buộc** | Quy tắc làm việc, nguồn sự thật, bất biến kiến trúc, quy trình task/test và Git workflow. Phải đọc trước khi sửa dự án. |
| [`../DESIGN.md`](../DESIGN.md) | **Tham chiếu, UI cần đồng bộ** | Mục tiêu sản phẩm, luồng người dùng, policy camera và mục tiêu hiệu năng. Dòng UI xanh/Duolingo là lịch sử so với D-020. |
| [`../DECISIONS.md`](../DECISIONS.md) | **Nhật ký quyết định** | Ghi quyết định kiến trúc và lý do. Phải đọc trạng thái từng mục vì một số quyết định đã bị thay thế hoặc mở rộng. |
| [`../TASKS.md`](../TASKS.md) | **Hiện hành** | Backlog, task đã xong/chưa xong và tiêu chí nghiệm thu. Không phải đặc tả hành vi runtime. |
| [`../PROGRESS.md`](../PROGRESS.md) | **Lịch sử theo phiên** | Nhật ký tiến độ và kết quả test. Có nhiều snapshot/tổng test khác nhau; không dùng làm hợp đồng hiện tại. |
| [`README.md`](README.md) | **Hiện hành** | Chính file này: mục lục và trạng thái của toàn bộ tài liệu dự án. |

### 4.2 Kế hoạch, kiểm thử và vận hành

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`execution-plan.md`](execution-plan.md) | **Lịch sử một phần** | Kế hoạch xử lý observability, correctness, performance, detection và UI. Nhiều phase đã xong; benchmark webcam thật vẫn còn mở. |
| [`AI_LOG.md`](AI_LOG.md) | **Nhật ký bằng chứng** | Lỗi, bước tái hiện, chẩn đoán, thay đổi và kết quả test. Dùng để điều tra lịch sử, không coi mọi entry cũ là trạng thái hiện tại. |
| [`testing.md`](testing.md) | **Hiện hành** | Chiến lược kiểm thử dùng chung cho Java, camera, hiệu năng và UI. |
| [`troubleshooting.md`](troubleshooting.md) | **Hiện hành** | Điểm bắt đầu khi chẩn đoán lỗi runtime. |

### 4.3 Tài liệu lưu trữ

| File | Trạng thái | Dùng để làm gì |
|---|---|---|
| [`../srccode.md`](../srccode.md) | **Lưu trữ — không dùng làm nguồn sự thật** | Bản dump source cũ rất lớn. Chỉ giữ theo D-001 để tham khảo lịch sử; không cập nhật tự động và không dùng để giải quyết mâu thuẫn. |

---

## 5. Rule, agent và skill

### 5.1 Rule

- [`AGENTS.md`](../AGENTS.md) là rule Markdown bắt buộc và bản đồ nguồn sự thật của dự án.
- `.cursor/rules/` hiện không chứa file rule.
- `opencode.json` không phải Markdown nhưng là policy máy đọc được cho OpenCode: chứa system
  prompt, permission, ownership và cấu hình orchestrator/các agent `architecture`, `camera`,
  `gameplay`, `protocol`, `qa`, `ui-designer`.
- Chỉ dẫn người dùng hiện tại, `AGENTS.md` và policy agent áp dụng cho cách AI làm việc;
  chúng không thay thế code/schema khi xác định hành vi ứng dụng.
- Chỉ code/schema và các đường dẫn nguồn sự thật trong `AGENTS.md` quyết định hành vi runtime.

### 5.2 Skill local

`.opencode/skills/` đang có các skill:

| Skill | Mục đích |
|---|---|
| `apple-hig` | Tra cứu Apple Human Interface Guidelines và accessibility/native desktop patterns. |
| `ui-ux-pro-max` | Tra cứu style, palette, typography, UX guideline, icon và stack guideline. |
| `ui-styling` | Hướng dẫn UI accessible, Tailwind và component styling. |
| `design-system` | Token architecture và component specification. |
| `design` | Điều phối các tác vụ thiết kế tổng hợp. |
| `brand` | Brand voice, visual identity và consistency. |
| `banner-design` | Thiết kế banner/hero/social asset. |
| `slides` | Thiết kế presentation HTML và data visualization. |

Lưu ý:

- Toàn bộ `.opencode/skills/` bị Git ignore; đây là tooling sinh cục bộ, không phải source của
  NihongoQuest.
- Không cần liệt kê hàng trăm file `references/*.md` của skill như tài liệu dự án.
- Cách cài lại UI UX Pro Max và các companion skill của nó nằm trong
  [`ui-tooling.md`](ui-tooling.md). Skill `apple-hig` được cài riêng; tài liệu này không xác nhận
  nguồn/lệnh cài lại của package đó.
- Skill chỉ hỗ trợ ra quyết định; không được ghi đè rule dự án, backend contract hoặc server
  authority.

---

## 6. Lộ trình đọc nhanh

### Làm Frontend JavaFX

1. [`../AGENTS.md`](../AGENTS.md)
2. [`architecture.md`](architecture.md)
3. [`ui-design.md`](ui-design.md), sau đó kiểm tra D-020 và CSS thật
4. [`protocol.md`](protocol.md) nếu màn hình có network/gameplay
5. [`testing.md`](testing.md)

### Làm Frontend Electron

1. [`../AGENTS.md`](../AGENTS.md)
2. [`../desktop/README.md`](../desktop/README.md)
3. [`desktop/contracts.md`](desktop/contracts.md)
4. [`desktop/architecture.md`](desktop/architecture.md)
5. [`desktop/protocol.md`](desktop/protocol.md)
6. [`desktop/design-system.md`](desktop/design-system.md)
7. [`desktop/proctoring.md`](desktop/proctoring.md) nếu có camera

### Làm Backend Java/PostgreSQL

1. [`../AGENTS.md`](../AGENTS.md)
2. [`architecture.md`](architecture.md)
3. [`protocol.md`](protocol.md)
4. [`database.md`](database.md)
5. [`ranked.md`](ranked.md) hoặc [`proctoring.md`](proctoring.md) theo tính năng
6. [`testing.md`](testing.md)

### Điều tra lỗi toàn hệ thống

1. [`troubleshooting.md`](troubleshooting.md)
2. Runtime log mới nhất trong `logs/client.log*` và `logs/server.log*`
3. [`AI_LOG.md`](AI_LOG.md)
4. [`DECISIONS.md`](../DECISIONS.md)
5. Code và test gần module bị lỗi

Runtime log gần nhất đã kiểm tra là `logs/client.log.0` và `logs/server.log.0`. Đây là log
runtime bị Git ignore, không phải tài liệu dự án; nội dung có thể thay đổi sau mỗi lần chạy.
