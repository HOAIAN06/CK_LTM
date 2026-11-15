# UI/UX Tooling — UI UX Pro Max (local)

- Ngày cài: 2026-11-15
- Trạng thái: đã cài project-local, **không commit file sinh ra**
- Vị trí: `.opencode/skills/` (đã thêm vào `.gitignore`)

## Vì sao dùng

UI UX Pro Max là skill tra cứu design intelligence: style, palette, typography, UX guideline,
icon, chart và stack guideline. Skill có hỗ trợ JavaFX ở mức guideline (application shell,
navigation, scene lifecycle), nhưng không sinh code JavaFX thay mình.

Quy tắc của dự án:

- Dùng skill để **chọn hướng và kiểm tra quyết định thiết kế**, không copy code React/Tailwind.
- `src/main/resources/client/shared/style.css` vẫn là nguồn sự thật về token/màu.
- Không commit `.opencode/skills/`; mỗi máy tự cài lại bằng lệnh bên dưới.
- Không thêm âm thanh (D-015).

## Yêu cầu

- Node.js + npm (đã có `npx`)
- Python 3.x (script search dùng standard library, không cần pip)

Kiểm tra:

```bash
node --version
python3 --version
```

## Cài lần đầu

Chạy tại thư mục gốc dự án:

```bash
npx ui-ux-pro-max-cli init --ai opencode
```

Lệnh này tạo `.opencode/skills/` gồm `ui-ux-pro-max` và các skill đi kèm
(`design-system`, `ui-styling`, `brand`, `banner-design`, `design`, `slides`).
Toàn bộ thư mục đã được gitignore.

## Cập nhật

```bash
npx ui-ux-pro-max-cli update
```

Nếu lệnh update không nhận diện đúng, chạy lại `init --ai opencode`.

## Cách dùng nhanh

### 1. Design system cho một hướng

```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py \
  "EdTech Japanese language learning quiz game desktop" \
  --design-system -p "NihongoQuest" -f markdown
```

Có thể thêm dial:

```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py \
  "EdTech Japanese language learning quiz game desktop" \
  --design-system -p "NihongoQuest" -f markdown \
  --variance 5 --motion 6 --density 5
```

### 2. Tìm theo domain

```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "language learning app" --domain product
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "claymorphism" --domain style
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "education friendly modern" --domain typography
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "gaming" --domain color
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "keyboard focus modal" --domain ux
```

### 3. Guideline JavaFX

```bash
python3 .opencode/skills/ui-ux-pro-max/scripts/search.py \
  "desktop dashboard navigation" --stack javafx
```

## Lưu ý khi đọc kết quả

- Kết quả `--design-system` có thể trả về pattern landing page (hero/testimonial/CTA).
  App desktop không dùng nguyên pattern đó; chỉ lấy style, palette, typography, effect.
- Kiểm tra lại khả năng hỗ trợ tiếng Việt của font trước khi chọn. Ví dụ:
  Nunito, Baloo 2, Plus Jakarta Sans, Be Vietnam Pro, Open Sans có Vietnamese subset;
  DM Sans không có subset Vietnamese.
- Với chữ Nhật, dùng fallback `Noto Sans JP`, `Yu Gothic UI`, `Meiryo`.
- Không lưu output chưa kiểm chứng vào tài liệu chính thức; ghi rõ nguồn và ngày.

## Liên quan

- Đề xuất hướng giao diện: `docs/ui-redesign-proposal.md`
- Design system hiện hành: `docs/ui-design.md`
- Quy trình Git: `AGENTS.md`
