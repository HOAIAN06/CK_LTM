# Đề xuất UI/UX overhaul — NihongoQuest

- Ngày: 2026-11-15
- Trạng thái: **đã chốt hướng B. Sakura Arcade**; Phase 1 (design foundation) và Phase 2
  (Login, Home, Quiz Room, Lobby, Battle) đã triển khai (D-017/D-018/D-019).
- Phạm vi: client JavaFX (16 màn hình) + server dashboard
- Font: bundle **Nunito + Be Vietnam Pro**; tiếng Nhật fallback Noto Sans JP/Yu Gothic UI
- Không đổi protocol, TCP framing, server authority, camera/proctoring
- **Không thêm âm thanh** theo xác nhận mới (D-015); pháo hoa/confetti chỉ là hiệu ứng hình ảnh

## 1. Mục tiêu

1. Bố cục rõ ràng hơn: shell ổn định, phân cấp thông tin, mỗi màn hình có một hành động chính.
2. Cảm giác “game học tiếng Nhật” có cá tính nhưng vẫn dễ bảo vệ đồ án.
3. Tăng phản hồi tức thì: trạng thái đúng/sai, timer, tiến độ, thành tích.
4. Giữ code JavaFX hiện tại: không đổi `fx:id`, `onAction`, controller flow; chủ yếu đổi FXML/CSS/component.
5. Không chặn JavaFX Application Thread; animation ngắn, có toggle giảm chuyển động.
6. Token hóa màu; `style.css` vẫn là nguồn sự thật.

## 2. Hiện trạng

- 16 FXML rất mỏng (21–76 dòng), chủ yếu form + `ListView`/`TableView`.
- Không có asset ảnh/icon; sidebar và header chỉ dùng chữ.
- `home.fxml` chỉ có hero + một CTA; orb đặt absolute, không responsive.
- `quiz-battle.fxml` là question card + 4 nút + danh sách, thiếu opponent HUD, combo, timer ring.
- `result.fxml` chỉ có title + score, thiếu thống kê, XP, rematch và celebration.
- `matchmaking.fxml` là form dọc + spinner, chưa có trạng thái “đang tìm” trực quan.
- `quiz-lobby.fxml` dùng `ListView`, camera preview ẩn, chưa có player card.
- Login tách 2 card kỹ thuật; cấu hình IP/port ngang hàng với đăng nhập.
- Nhiều kích thước cố định; chưa có breakpoint/layout co giãn theo 1024–1920.

## 3. Skill UI UX Pro Max đã tìm gì?

Đã cài project-local và chạy:

```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py \
  "EdTech Japanese language learning quiz game desktop" \
  --design-system -p "NihongoQuest" -f markdown
```

Kết quả chính:

- **Product type:** Language Learning App → **Claymorphism + Vibrant & Block-based**;
  phụ: micro-interactions, flat design.
- **Palette gợi ý:** primary `#4F46E5`, accent tiến độ `#16A34A`, nền `#EEF2FF`,
  foreground `#312E81`.
- **Typography gợi ý:** Baloo 2 + Comic Neue (nhóm “Kids/Education”).
- **JavaFX stack:** dùng application shell + feature workspace, thay `center` của shell
  thay vì tạo lại `Scene`; navigation theo role/quyền.
- **Landing pattern** “Hero + Testimonials + CTA” **không áp dụng** cho app desktop;
  chỉ dùng phần style/color/typography/UX.

Điều chỉnh của mình:

- Không dùng Comic Neue: không phù hợp app thi đấu cho sinh viên, thiếu glyph tiếng Việt.
- Dùng **Nunito** (heading, có Vietnamese) + **Be Vietnam Pro** (body, thiết kế cho tiếng Việt)
  hoặc **Plus Jakarta Sans** (phương án tối giản).
- Tiếng Nhật fallback: `Noto Sans JP`, `Yu Gothic UI`, `Meiryo`.
- Giữ Indigo/Cyan làm nhận diện; xanh lá chỉ cho tiến độ/đúng, không dùng cho button/sidebar.

## 4. Ba phương án thị giác

### A. Indigo Quest — Claymorphism + Block-based (khuyến nghị)

**Cảm giác:** thân thiện, nổi khối nhẹ, chunky nhưng không trẻ con; phù hợp game học tập.

| Token | Giá trị |
|---|---|
| Primary | `#4F46E5` |
| Primary dark | `#3730A3` |
| Primary soft | `#EEF2FF` |
| Accent | `#06B6D4` |
| Accent soft | `#ECFEFF` |
| Success/progress | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |
| Background | `#F5F7FB` |
| Surface | `#FFFFFF` |
| Text | `#172033` |
| Text secondary | `#64748B` |
| Border | `#E2E8F0` |

- **Typography:** Nunito ExtraBold/Black cho heading; Be Vietnam Pro cho body;
  Noto Sans JP/Yu Gothic UI cho chữ Nhật.
- **Shape:** card 16–24px, button 12px, border 2px, shadow mềm 2 lớp (không hard shadow).
- **Motion:** 180–280ms, `cubic-bezier(.34,1.56,.64,1)` cho pop; answer đúng pulse,
  sai shake, timer pulse, card hover lift nhẹ.
- **Celebration:** confetti + pháo hoa Canvas ở Result/thắng trận; không âm thanh.
- **Ưu:** gần khuyến nghị skill nhất; giữ D-013; ít rủi ro; dễ demo.
- **Nhược:** nếu lạm dụng shadow sẽ nặng; cần tiết chế ở bảng dữ liệu.

### B. Sakura Arcade — Vibrant & Block-based + motif Nhật

**Cảm giác:** năng lượng, đậm chất game Nhật, dễ nhớ khi demo.

| Token | Giá trị |
|---|---|
| Primary | `#4F46E5` |
| Sakura | `#F472B6` |
| Sakura deep | `#DB2777` |
| Coral | `#FB7185` |
| Accent | `#06B6D4` |
| Background | `#FFF7FA` |
| Surface | `#FFFFFF` |
| Text | `#1E1B4B` |
| Border | `#FBCFE8` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |

- **Typography:** Baloo 2 hoặc Nunito ExtraBold heading; Be Vietnam Pro body.
- **Shape:** block lớn, 3px border, 16–20px radius, khoảng cách section 40–48px.
- **Motif:** torii, sakura petals, speed lines, “VS” reveal, stamp/hanko.
- **Motion:** 220–360ms, mạnh hơn phương án A; cánh hoa rơi và pháo hoa.
- **Ưu:** cá tính Nhật rõ, hiệu ứng demo tốt.
- **Nhược:** dễ rối/màu mè; cần decision palette mới; nhiều asset/icon hơn.

### C. Clean Study — Minimalism & Swiss

**Cảm giác:** sạch, chuyên nghiệp, tập trung vào nội dung và số liệu.

| Token | Giá trị |
|---|---|
| Primary | `#4F46E5` |
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Text | `#0F172A` |
| Text secondary | `#64748B` |
| Border | `#E2E8F0` |
| Accent | `#06B6D4` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |

- **Typography:** Plus Jakarta Sans (heading + body) hoặc Outfit + Open Sans.
- **Shape:** radius 10–12px, border 1px, shadow tối thiểu, grid 8pt, nhiều whitespace.
- **Motion:** 150–220ms, fade/slide nhẹ; không bounce.
- **Ưu:** chuyên nghiệp, dễ bảo vệ, accessibility thấp rủi ro.
- **Nhược:** ít “game”, dễ giống dashboard hành chính.

## 5. Quyết định đã chốt (2026-11-15)

Ban đầu mình đề xuất **A + điểm nhấn B**; người dùng chọn **B. Sakura Arcade** làm hướng chính.
Quyết định:

- **Hướng:** B. Sakura Arcade — Indigo + Sakura + Coral + Cyan, Claymorphism + Vibrant & Block-based.
- **Font:** bundle Nunito (heading) + Be Vietnam Pro (body); tiếng Nhật fallback Noto Sans JP/Yu Gothic UI.
- **Scope:** client + server dashboard.
- **Âm thanh:** tiếp tục không có (D-015); pháo hoa/confetti chỉ là hình ảnh.
- **Token:** vẫn token hóa trong `style.css`; Phase 1 cập nhật palette/token và component,
  không hardcode màu trong controller/FXML.
- **Rủi ro cần kiểm soát:** độ tương phản của sakura/coral trên nền sáng, mật độ hiệu ứng,
  và không để màu trang trí lấn át trạng thái đúng/sai.

## 6. Bố cục mới theo màn hình

| Màn hình | Bố cục chính |
|---|---|
| Shell | Rail trái 240px (thu gọn 72px), brand, nhóm nav “Chơi / Khám phá / Cộng đồng”, user card dưới cùng; top bar có breadcrumb, XP/streak, quick actions |
| Home | Hero + tiến độ thật (độ chính xác/thắng/tổng điểm) + 3 mode card + panel mẹo & lịch sử — **đã xong** |
| Login | 2 cột brand/auth; 3 feature row có icon; “Cấu hình server” thu gọn (host + cổng) + status pill — **đã xong** |
| Matchmaking | Card radar ở giữa; segmented 3/5 phút; elapsed time; cancel; overlay VS khi tìm thấy |
| Quiz Room | 2 action card lớn Tạo/Vào; PIN 6 số có badge; step bar 3 bước — **đã xong** |
| Lobby | PIN panel gradient + copy; player card có chip vai trò/camera; camera + info panel; action bar — **đã xong** |
| Battle | HUD + timer lớn; question card; đáp án 2×2 badge A–D; camera panel; leaderboard highlight — **đã xong** |
| Result | Hero thắng/thua; pháo hoa/confetti Canvas; stats grid; XP bar; rank change; rematch |
| Leaderboard | Podium top 3; table sticky header; filter tab; highlight “bạn” |
| Profile | Banner + avatar + level ring; stat card; accuracy chart; recent matches; achievements |
| Friends | Tab online/offline; friend card; invite room |
| History | Filter chip; match card timeline; result badge |
| Quiz sets | Card grid có cover color, số câu, độ khó; editor chia section |
| Proctor | Camera grid + status chip; focus mode; alert timeline; export evidence |
| Server dashboard | Status card, metrics, room list, log viewer; cùng token |

## 7. Lộ trình

| Phase | Nội dung | Nhánh đề xuất |
|---|---|---|
| 0 | Git workflow, skill, audit, chọn hướng | `chore/ui-phase0-tooling` |
| 1 | Design tokens, font, icon, shell, component cơ bản — **đã xong** | `feature/ui-foundation` |
| 2 | Login, Home, Quiz Room, Lobby, Battle — **đã xong** | `feature/ui-quiz-flow` |
| 3 | Ranked, Matchmaking, Result, celebration | `feature/ui-ranked-result` |
| 4 | Data/social/proctor/server dashboard | `feature/ui-data-social` |
| 5 | Responsive/DPI, accessibility, Windows QA, docs | `polish/ui-qa` |

Mỗi phase: chạy test, cập nhật `PROGRESS.md`/`TASKS.md`, đưa diff tóm tắt, **chờ OK mới commit/push**.

## 8. Câu hỏi còn mở

1. Có muốn mascot/illustration riêng không? Nếu có, cần thống nhất phong cách trước khi tạo.
2. Có cần thêm màn Settings (giảm chuyển động, font scale, reset layout) không?
3. Có cần chế độ “focus mode” cho phòng thi proctoring không?

## 9. Ghi chú kỹ thuật

- Giữ nguyên `fx:id`, `onAction`, controller flow; chỉ đổi layout/CSS/component.
- Mọi cập nhật UI từ network/camera phải qua `Platform.runLater`.
- Animation dùng JavaFX Animation API; không thêm thư viện lớn.
- Pháo hoa dùng `Canvas` + particle pool + `AnimationTimer`, chỉ chạy khi overlay visible,
  dừng khi rời màn hình, tôn trọng `UiMotion.setEnabled(false)`.
- Không thêm `javafx-media`, `AudioManager`, `SoundEvent` hoặc asset âm thanh (D-015).
