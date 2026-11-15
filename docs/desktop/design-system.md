# NihongoQuest Desktop — Design System "Sumi"

- Phạm vi: `desktop/src/renderer/styles/**`, `components/ui/**`, `components/shell/**`
- Nguồn sự thật về token: `desktop/src/renderer/styles/tokens.css`
- Hợp đồng bắt buộc: `docs/desktop/contracts.md` §6
- Trạng thái: Phase 2 (renderer shell + primitives). Màn hình nghiệp vụ do agent gameplay dựng trên bộ này.

---

## 1. Ý tưởng thị giác

**Sumi (墨)** — mực trên giấy washi. Ba quyết định định hình toàn bộ hệ thống:

1. **Giấy, không phải kính.** Nền là giấy ấm `#f4f4ef`, bề mặt là giấy trắng ngà. Kính (blur) chỉ dùng ở
   title bar và overlay, vì đó là lớp *chức năng* nằm trên nội dung — đúng vai trò "functional layer" của
   Liquid Glass trong HIG. Không có card kính, không có gradient trang trí.
2. **Một mực nhận diện.** Teal sâu `#1f5560` là màu hành động duy nhất. Sage `#4a7350` là màu *tiến bộ*
   (đúng/sẵn sàng/đã học). Success/warning/danger/info chỉ xuất hiện khi có trạng thái nghiệp vụ thật.
3. **Đường kẻ thay cho bóng đổ.** Phân cấp đến từ 3 lớp bề mặt + hairline `--nq-border`. Bóng đổ chỉ còn
   ở 4 mức (sm/md/lg/xl) cho thứ thực sự nổi: popover, dialog, toast, palette.

Nhận diện tiếng Nhật không dùng sakura/hoa anh đào. Nó nằm ở: chữ **語** trong brand mark (font JP/Mincho),
nhãn Nhật trong bộ đề, và nhịp chữ thoáng của tiếng Nhật (`line-height: 1.7`, `palt`). Không emoji, không
clip-art.

### Vì sao khác bản Calm Study trên JavaFX (D-020)

Giữ nguyên *palette tinh thần* (giấy/teal/sage) nhưng thay cách dựng: bỏ viền dày kiểu clay, bỏ bo góc
lớn 18–24px, bỏ gradient hero. Bản desktop dùng bo góc 10–14px, viền 1px, mật độ thông tin cao hơn —
phù hợp cửa sổ ứng dụng 1024–1600px thay vì một trang web.

---

## 2. Cách áp dụng hướng dẫn HIG + UI UX Pro Max

| Hướng dẫn | Áp dụng trong bộ này | Ghi chú |
|---|---|---|
| HIG — dùng component hệ thống trước | `Select` là `<select>` native; `Checkbox` là `<input type=checkbox>` thật; `Switch` là `role="switch"` trên `<button>` | Popup của select do OS vẽ, đúng keyboard/type-ahead |
| HIG — kích thước điều khiển desktop | 30 / 38 / 46px (`--nq-control-*`), icon button 28/34/42px | Trên mức tối thiểu 20pt của macOS, đủ thoáng cho Windows |
| HIG — không dựa vào màu | Timer đổi màu **và** đổi số **và** pulse; badge luôn có chữ; avatar có `nq-sr-only` | WCAG 1.4.1 |
| HIG — chuyển động có mục đích, tôn trọng Reduce Motion | 150/200/250ms, một đường cong chuẩn; `prefers-reduced-motion` hạ toàn bộ về 0.01ms | Xem §7 |
| HIG — modality tiết chế | Dialog chỉ cho quyết định; Sheet cho ngữ cảnh; Toast cho kết quả | Escape + scrim + focus trap đầy đủ |
| HIG — phân cấp bằng layout, không bằng trang trí | `PageHeader` là `h1` duy nhất; `AppHeader` mờ hơn để không tranh chấp | Mỗi màn hình một điểm nhấn |
| UI UX Pro Max — 8pt rhythm | Thang 4→80px, mọi padding/gap lấy từ bội số 4 | `--nq-space-1..12` |
| UI UX Pro Max — token-driven theming | Không hex trong component; utility `bg-nq-*` trỏ về token | Đã audit: 0 hex ngoài `tokens.css` |
| UI UX Pro Max — state parity light/dark | Mọi trạng thái hover/active/disabled định nghĩa bằng token, không bằng `dark:` | Một khai báo chạy cả hai theme |
| UI UX Pro Max — icon vector, không emoji | Toàn bộ icon đi qua `components/ui/icons.tsx` (lucide, stroke 1.75/1.5) | Một cửa duy nhất để đổi bộ icon |
| UI UX Pro Max — tránh "12 bán kính" | 7 bậc, mỗi bậc một luật (§5) | Không có bo góc tự phát |
| UI UX Pro Max — form: lỗi inline + focus rõ | `Field` gắn `aria-describedby`/`aria-invalid`, lỗi có `role="alert"` | Không chỉ đổi viền đỏ |

Điểm **không** làm theo khuyến nghị mặc định của skill: palette "vibrant indigo + sakura", font display
trẻ con, và gradient hero — vì sản phẩm là ứng dụng thi đấu cho sinh viên, cần đọc số liệu trong 30 giây
mỗi câu hỏi.

### 2.1 Cascade & layering — quy tắc bắt buộc

Tailwind v4 xuất bốn layer theo thứ tự `theme → base → components → utilities`. Hệ quả:

> **Chỉ rule nằm trong `@layer` mới thua utility. Rule unlayered thắng mọi layer.**

Sự cố thật (phát hiện bằng `getComputedStyle` trong Chromium headless, không phải cảm tính):
`base.css` từng unlayered "để thắng preflight", nên nó thắng luôn mọi utility:

| Triệu chứng | Nguyên nhân | Sau khi sửa |
|---|---|---|
| `h1.nq-display.text-nq-3xl` = **13px** thay vì 30px | `h1..h6 { font-size: inherit }` unlayered thắng `.text-nq-3xl` | **30px**, weight 700, line-height 34.5px |
| Nút primary trong suốt, không padding | `button { background:none; border:0; padding:0 }` unlayered thắng `bg-nq-primary`, `px-4`, `h-[var(--nq-control-md)]` | nền `rgb(31 85 96)`, padding 16px, cao 38px |
| Active nav mất thanh chỉ báo + nền soft | cùng nguyên nhân | thanh 3px + nền soft hiển thị |

Phân bổ hiện hành:

| Nhóm rule | Layer | Lý do |
|---|---|---|
| Reset phần tử, sizing document, scrollbar, selection, CJK, `.nq-sr-only`, drag region | `@layer base` | phải thua utility |
| `.nq-scroll`, `.nq-scroll-x`, `.nq-skip-link` | `@layer components` | màn hình còn cần `overflow-hidden`/`overflow-visible` thắng |
| `:focus-visible`, `.nq-focusable:focus-visible` | `@layer utilities` | phải thắng `shadow-*` trên cùng phần tử (ring thay bóng) |
| Token + override `prefers-reduced-motion` | **unlayered** (`tokens.css`) | token phải thắng mọi layer; đặt override trong `@layer base` sẽ **thua** chính các token unlayered |

Hai ngoại lệ `!important` có chủ ý: `[hidden] { display: none !important }` và khối
`prefers-reduced-motion` (duration về 0.01ms). Với `!important`, thứ tự layer **bị đảo**, nên
`@layer base` vẫn thắng utility thường — đúng ý đồ: thuộc tính `hidden` và quyền truy cập phải thắng
thẩm mỹ.

**Bất biến cần giữ** (đã kiểm chứng, xem §9):

1. reset phần tử **thua** utility → không viết selector phần tử ngoài `@layer base`;
2. focus ring **thắng** `shadow-*` → `.nq-focusable:focus-visible` ở `@layer utilities` (0,2,0 specificity + layer);
3. `.nq-scroll` **thua** `overflow-*` → ở `@layer components`;
4. token override reduced-motion **thắng** token gốc → phải unlayered.

---

## 3. Token

Cơ chế: mọi token **màu** khai báo hai lần — một giá trị tĩnh (fallback) và một `light-dark(sáng, tối)`.
`color-scheme` quyết định theme, nên không có khối biến nào bị lặp và light/dark không thể lệch nhau.

```css
:root { color-scheme: light; }                       /* mặc định */
:root[data-theme='dark'] { color-scheme: dark; }     /* người dùng chọn tối */
:root[data-theme='light'] { color-scheme: light; }   /* người dùng chọn sáng */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { color-scheme: dark; }    /* theo hệ điều hành */
}
```

### 3.1 Bề mặt

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--nq-bg` | `#f4f4ef` | `#0f1415` | nền ứng dụng |
| `--nq-bg-subtle` | `#eceee7` | `#0a0f10` | dải nền, vùng lõm |
| `--nq-surface` | `#fbfbf8` | `#171e1f` | card, panel, sidebar |
| `--nq-surface-raised` | `#ffffff` | `#1e2729` | popover, footer dialog |
| `--nq-surface-overlay` | `#ffffff` | `#232d2f` | dialog, sheet, toast |
| `--nq-surface-sunken` | `#e8eae2` | `#0d1213` | input nghỉ, track progress |
| `--nq-surface-hover` | `#f1f2ec` | `#202a2c` | hover hàng/nút ghost |

### 3.2 Chữ & đường kẻ

| Token | Sáng | Tối | Tương phản |
|---|---|---|---|
| `--nq-text` | `#17201f` | `#edf2f0` | 14.9:1 trên surface / 13.4:1 |
| `--nq-text-secondary` | `#55636a` | `#a9b6b5` | 6.1:1 / 7.9:1 |
| `--nq-text-tertiary` | `#6b7780` | `#8c9b9b` | 4.6:1 / 6.0:1 — vẫn đạt AA cho chữ thường |
| `--nq-border` | `#dfe1d8` | `#2a3436` | đường kẻ chính |
| `--nq-border-strong` | `#c6c9be` | `#3a4648` | viền điều khiển, thumb scrollbar |

### 3.3 Nhấn

| Token | Sáng | Tối | Ghi chú |
|---|---|---|---|
| `--nq-primary` | `#1f5560` | `#74b8be` | Teal mực. Chữ trên nền: 8.5:1 (sáng) / 7.5:1 (tối, chữ `#07202a`) |
| `--nq-primary-hover` | `#17454f` | `#8ac9ce` | |
| `--nq-primary-active` | `#113840` | `#5ea6ad` | |
| `--nq-primary-soft` | `#e4edec` | `#16302f` | nền item đang chọn |
| `--nq-accent` | `#5e8b62` | `#93c49a` | Sage — chỉ trang trí/tiến độ, không làm nền chữ trắng |
| `--nq-accent-strong` | `#4a7350` | `#a8d4ae` | Bản dùng được cho chữ (5.4:1 với trắng) |

> Vì sao có `accent` **và** `accent-strong`: sage tươi `#5e8b62` chỉ đạt 3.9:1 khi làm nền chữ trắng,
> nên chỉ dùng cho thanh tiến độ/viền; mọi chỗ cần chữ hoặc nền nút dùng `accent-strong`.

### 3.4 Trạng thái

| Token | Sáng | Tối | Nền soft sáng/tối |
|---|---|---|---|
| `--nq-success` | `#2e6b4d` | `#6fc79a` | `#e3efe6` / `#14281e` |
| `--nq-warning` | `#9a6412` | `#e7b45c` | `#f6eddc` / `#2c2214` |
| `--nq-danger` | `#a83a34` | `#f08a82` | `#f7e7e4` / `#301a19` |
| `--nq-info` | `#2c5f8a` | `#83b8e4` | `#e6eef5` / `#16232e` |

Mỗi màu có bộ ba `-soft` (nền), `-border` (viền), `-contrast` (chữ trên nền đặc). Không dùng màu trạng
thái để trang trí, và không dùng hai màu trạng thái cho cùng một nghĩa.

### 3.5 Focus / scrim / glass / elevation

| Token | Giá trị | Ghi chú |
|---|---|---|
| `--nq-focus-ring` | `#2f6e78` / `#8fd3d6` | 2px, offset 2px |
| `--nq-focus-ring-soft` | teal 28% / 40% | quầng 3px cho input |
| `--nq-scrim` | `rgb(16 21 22 / .42)` / `rgb(3 6 7 / .64)` | đo trên nền thật, không dùng chung một opacity |
| `--nq-glass-bg` | trắng ngà 72% / ink 66% | chỉ title bar |
| `--nq-shadow-sm/md/lg/xl` | ghép từ 3 tint | tint đổi theo theme, công thức bóng không lặp |

### 3.6 Bố cục & điều khiển

| Nhóm | Giá trị |
|---|---|
| Spacing | `4 8 12 16 20 24 32 40 48 56 64 80` (`--nq-space-1..12`) |
| Radius | `4 / 8 / 10 / 14 / 20 / 28 / 999` (`xs…2xl, full`) |
| Control height | `30 / 38 / 46` (`sm/md/lg`) |
| Title bar | 40px · vùng điều khiển OS 138px (`--nq-titlebar-controls-width`) · Sidebar 248px / rail 72px · Content max 1120px · Rail 320px |
| Z-index | sticky 100 · sidebar 200 · overlay 300 · sheet 400 · dialog 500 · toast 600 · tooltip 700 |
| Opacity | disabled 0.46 · muted 0.72 |

---

## 4. Kiểu chữ

Hai họ chữ, không tải từ CDN (offline + CSP nghiêm):

- **UI face** `--nq-font-sans`: Be Vietnam Pro → Inter → Segoe UI Variable Text → Segoe UI → system.
  Be Vietnam Pro là font được thiết kế cho tiếng Việt (glyph dấu chồng đầy đủ); nếu máy không có thì
  Segoe UI Variable xử lý tốt tiếng Việt trên Windows 11.
- **Display** `--nq-font-display`: cùng họ, dùng cho heading với tracking −0.018em và weight 700.
- **Japanese** `--nq-font-jp`: Noto Sans JP → Hiragino Sans → Yu Gothic UI → Meiryo → Noto Sans CJK JP.
  Không bao giờ để kanji rơi vào font Latin (ô vuông tofu).
- **Brand** `--nq-font-brand`: Mincho/serif, chỉ dùng cho chữ **語** trong logo.
- **Mono** `--nq-font-mono`: PIN, mã phòng, số liệu cần căn cột.

### Thang chữ

| Token | px | Dùng cho |
|---|---|---|
| `--nq-fs-2xs` | 11 | eyebrow/caps, nhãn badge, keycap |
| `--nq-fs-xs` | 12 | hint, caption, meta |
| `--nq-fs-sm` | 13 | thân form, nhãn nút sm, mô tả |
| `--nq-fs-md` | 14 | thân mặc định của app |
| `--nq-fs-base` | 15 | đoạn văn dài, subtitle |
| `--nq-fs-lg` | 17 | tiêu đề card, `h3` |
| `--nq-fs-xl` | 20 | tiêu đề dialog, số lớn |
| `--nq-fs-2xl` | 24 | `h1` compact |
| `--nq-fs-3xl` | 30 | `h1` mặc định |
| `--nq-fs-4xl` / `5xl` | 36 / 44 | hero, điểm số khoảnh khắc |

Line-height: `tight 1.15` (display) · `snug 1.32` (heading nhỏ) · `normal 1.5` (thân) · `relaxed 1.7`
(tiếng Nhật, văn bản dài). Số liệu thay đổi (điểm, timer, PIN) luôn dùng `.nq-tabular`.

---

## 5. Bo góc & độ nổi

| Radius | Dùng cho | Không dùng cho |
|---|---|---|
| `xs` 4 | badge, keycap, checkbox | card |
| `sm` 8 | icon button, chip, menu item con | dialog |
| `md` 10 | **nút, input, select, segmented, tooltip** | card lớn |
| `lg` 14 | **card, panel, toast** | nút |
| `xl` 20 | dialog, sheet, command palette | card thường |
| `2xl` 28 | chỉ hero surface (chưa dùng ở Phase 2) | mọi thứ khác |
| `full` | avatar, pill/tag, track progress, dot | khối chữ nhật |

Độ nổi: `shadow-sm` cho nút/segmented đang chọn; `shadow-md` cho card raised và tooltip; `shadow-lg`
cho toast; `shadow-xl` cho dialog/sheet/palette. Không có bóng đổ trên card mặc định — viền 1px làm việc đó.

---

## 6. Thành phần

### Primitives (`components/ui/`)

| Thành phần | Trạng thái / biến thể | Ghi chú a11y |
|---|---|---|
| `Button` | `primary · secondary · ghost · danger` × `sm/md/lg` × hover/active/focus/disabled/loading, `leftIcon`, `rightIcon`, `fullWidth` | `aria-busy` khi loading, focus được giữ, click bị chặn |
| `IconButton` | 4 biến thể × 3 cỡ, `pressed`, `loading` | **bắt buộc** prop `label` → `aria-label` |
| `Card` + `CardHeader/Body/Footer` | `tone: default/sunken/raised/plain`, `padding`, `accent`, `interactive` | `h3` trong header; header tự wrap khi card hẹp; footer dính đáy card |
| `Field` (`fieldAria`) | label + hint + error, `labelAction` | `aria-describedby`, `aria-invalid`, lỗi `role="alert"` |
| `Input` | `sm/md/lg`, `leftIcon`, `rightSlot`, `mono`, lỗi | viền đỏ **và** chữ lỗi |
| `PasswordInput` | ẩn/hiện bằng `aria-pressed` | cho phép paste + password manager |
| `Textarea` | resize dọc, `minRows` | |
| `Select` | `<select>` native + chevron token | popup do OS vẽ (keyboard/type-ahead chuẩn) |
| `Checkbox` | checked / indeterminate / disabled | `<input>` thật, `indeterminate` đặt qua ref |
| `Switch` | `role="switch"`, `sm/md`, `label`+`description` | `aria-checked`, Space/Enter |
| `Badge` | `soft/solid/outline` × 7 tone × `sm/md`, `dot` | luôn có text, dot chỉ phụ |
| `Tag` / `Pill` | 7 tone, `onRemove`, `icon` | nút xoá có `aria-label` |
| `Avatar` | `xs…xl`, initials + `src`, `status`, `ring` | tên đầy đủ trong `nq-sr-only` |
| `ProgressBar` | `xs/sm/md`, 6 tone, `indeterminate`, `showValue` | `role="progressbar"` + `aria-valuetext` %, % in ra chữ |
| `CircularTimer` | `seconds/clock`, ngưỡng `warningAt`/`criticalAt`, `paused` | `role="progressbar"`, `aria-valuetext` "N giây còn lại" |
| `Spinner` | `sm/md/lg`, `current/primary/secondary` | trang trí, `aria-hidden` |
| `Skeleton` | `rounded`, `lines`, `width/height` | `aria-hidden`; giữ đúng layout cuối |
| `Dialog` | `sm/md/lg/xl`, footer slot, `hideCloseButton`, `closeOnScrimClick` | `aria-modal`, focus trap, Escape, trả focus, khoá scroll |
| `Sheet` | `side: right/left`, `sm/md/lg` | cùng hợp đồng bàn phím với Dialog |
| `Tooltip` | 4 hướng, hiện cả khi focus, Escape để ẩn | `role="tooltip"` + `aria-describedby` |
| `Toast` / `ToastHost` / `useToasts` | `info/success/warning/danger`, `duration`, `action`, pause on hover | `role="status"`, `aria-live="polite"` |
| `Tabs` / `TabPanel` | `underline/pill`, roving tabindex | `tablist/tab/tabpanel`, mũi tên + Home/End |
| `SegmentedControl` | `sm/md`, `fullWidth` | `radiogroup` + `radio`, mũi tên đổi lựa chọn |
| `EmptyState` | `sm/md`, icon + title + mô tả + 1 action | nói rõ *vì sao trống* và *làm gì tiếp* |
| `ErrorBanner` | `danger/warning/info/success`, retry, dismiss | `role="alert"` cho lỗi, `role="status"` cho phần còn lại |
| `Kbd` / `KbdCombo` | `sm/md` | luôn đi kèm nhãn chữ |
| `Portal` | portal ra `document.body` | overlay thoát khỏi overflow/stacking của app |
| `icons` | một cửa duy nhất cho lucide | icon-only luôn có `aria-label` |

### Hợp đồng ghép `Card` (bắt buộc)

`Card` **mặc định `padding="none"`** vì các section tự lo phần đệm của chúng. Chọn một trong hai kiểu,
không trộn:

```tsx
/* A. Có section — Card không padding, section tự đệm (khuyến nghị) */
<Card>
  <CardHeader title="Tìm trận 1v1" eyebrow="Đấu hạng" icon={<Swords />} action={<Badge>Trực tuyến</Badge>} />
  <CardBody>Điểm của bạn: 1 240.</CardBody>
  <CardFooter><Button size="sm">Tìm trận</Button></CardFooter>
</Card>

/* B. Nội dung thô — Card tự đệm, không dùng section */
<Card padding="md">
  <div className="flex items-center gap-3">…</div>
</Card>
```

Số đo thực tế (Chromium, `getComputedStyle`):

| Trường hợp | Kết quả |
|---|---|
| `<Card><CardBody className="p-4">` | `padding: 16px` đều — **không** cộng dồn 20 + 16 |
| `<Card><CardHeader/><CardBody/><CardFooter/>` | header `px-5 pt-5`, body `px-5 pt-4 pb-4`, footer `px-5 pt-4 pb-5` |
| `<Card><CardBody/></Card>` (body duy nhất) | `px-5 py-5` — cân quang học |
| `<Card padding="md">` | `padding: 20px` |

Vì sao trước đây sai: `Card` mặc định `p-5` **và** `CardBody` có `mt-4` riêng → `<Card><CardBody className="p-4">`
cho ~52px khoảng trống chết, không thể đoán trước. Ngoài ra khi ghép `Card` với grid stretch, footer
giờ có `mt-auto` nên dính đáy card thay vì để khoảng trắng dưới hành động; `CardHeader` dùng `flex-wrap` +
`min-w-[9rem]` cho tiêu đề nên trong card hẹp (rail, tile lưới) action xuống dòng thay vì bóp tiêu đề
thành một từ mỗi dòng.

### Shell (`components/shell/`)

Bố cục duy nhất:

```
AppShell
├── AppTitleBar   (drag region, connection pill, theme toggle, window controls tuỳ chọn)
└── grid: [AppSidebar] [ AppHeader? + <main> + rightRail? ]
                                  └── PageHeader (h1 + subtitle + meta + actions)
```

| Thành phần | API chính | Hành vi |
|---|---|---|
| `AppShell` | `titleBar`, `sidebar`, `header?`, `rightRail?`, `contentWidth`, `bleed` | Chỉ `<main>` cuộn; rail ẩn dưới 1280px; skip-link tới `#nq-main`. **Row track của body grid bắt buộc `grid-rows-[minmax(0,1fr)]`** — xem §"Bố cục shell" bên dưới |
| `AppTitleBar` | `context`, `connection`, `theme`+`onThemeChange`, `centerSlot`, `leftSlot`, `rightSlot`, window callbacks, `reserveWindowControls?` | Toàn thanh là `-webkit-app-region: drag`; mọi nút tự `no-drag` nên không nuốt click; trạng thái kết nối có chữ + dot; tự chừa chỗ cho nút cửa sổ native |
| `AppSidebar` | `items`, `activeId`, `onNavigate`, `collapsed`, `user`, `onLogout` | 248→72px, `aria-current="page"`, một tab stop + mũi tên, nhãn thành tooltip khi thu gọn, ←/→ thu gọn/mở |
| `AppHeader` | `left`, `center`, `right`, `sticky`, `material` | Thanh lọc/hành động phụ, mờ hơn `PageHeader` |
| `PageHeader` | `eyebrow`, `title`, `subtitle`, `meta`, `actions`, `size` | `h1` duy nhất của màn hình |
| `CommandPalette` | `open`, `onOpenChange`, `commands`, `triggerShortcut` | Dialog + `combobox`/`listbox`/`option` (`aria-activedescendant`), fuzzy **bỏ dấu tiếng Việt** ("bxh" → Bảng xếp hạng), ↑↓ Home End Enter Esc |

#### Bố cục shell — hai bất biến đã từng bị vi phạm

**1. Grid body phải khai báo row track.**

```tsx
/* sai: chỉ có grid-cols → row ngầm định `auto` cao bằng nội dung */
<div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)]">

/* đúng */
<div className="grid h-full min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)]">
```

Đo được trước/sau (Chromium, nội dung 3000px):

| Viewport | Chiều cao `<aside>` trước | Sau | `body.scrollHeight` trước → sau | Footer “Đăng xuất” |
|---|---|---|---|---|
| 1440×900 | 3183px | **860px** (= 900 − title bar 40) | 3223 → **900** | ngoài màn hình → **trong màn hình** (top 856, bottom 884) |
| 1280×860 | 3183px | **820px** | 3223 → **860** | ngoài → **trong** |
| 1024×700 | 3175px | **660px** | 3215 → **700** | ngoài → **trong** |

Kèm theo: `<nav>` là vùng cuộn (`overflow-y: auto`); với 30 mục, `scrollHeight 1268 > clientHeight 703` và footer vẫn ghim đáy. Test `AppShell layout contract` giữ bất biến này (jsdom không có layout nên test khoá *nguyên nhân*: row track + `nq-scroll` trên `<main>`).

**2. Title bar phải chừa vùng nút cửa sổ native.**

`window.ts` dùng `titleBarStyle: 'hidden'` + `titleBarOverlay`, nên OS vẽ nút thu nhỏ/phóng to/đóng vào một dải ~138px ở mép phải. `AppTitleBar` chừa dải đó bằng `padding-inline-end: var(--nq-titlebar-controls-width)` (token, không hardcode px trong component) khi app **không** tự vẽ nút:

- mặc định: chừa chỗ khi không truyền `onMinimize/onMaximize/onClose`;
- `reserveWindowControls={false}` để tắt (macOS — traffic light nằm bên trái);
- khi app tự vẽ nút thì không chừa.

Đo được: khoảng cách từ `rightSlot` tới mép phải **12px → 138px** ở cả 1440/1280/1024.
| `DesignPreview` | `theme?`, `onThemeChange?` | Thư viện tự chứa: mọi primitive + shell, mở dialog/sheet/palette/toast. **Không** import `app/` hay `routes/`. Controlled khi truyền `theme` (không tự ghi `data-theme`); uncontrolled thì chỉ ghi sau thao tác của người dùng |

Điều hướng mặc định (nhãn tiếng Việt, đúng hợp đồng sản phẩm): Trang chủ · **Chơi** (Đấu hạng 1v1,
Phòng Quiz, Bộ đề) · **Cộng đồng** (Bảng xếp hạng, Bạn bè, Lịch sử) · **Tài khoản** (Hồ sơ).

---

## 7. Chuyển động

| Token | ms | Dùng cho |
|---|---|---|
| `--nq-motion-fast` | 150 | hover, đổi màu, đổi trạng thái nút, tooltip |
| `--nq-motion-base` | 200 | mở scrim, hover card nâng, đổi width sidebar |
| `--nq-motion-slow` | 250 | dialog/sheet/toast vào, đổi progress, pulse đáp án |
| `--nq-motion-page` | 280 | vào trang (`nq-page-enter`) |

Đường cong: `standard cubic-bezier(.2,0,0,1)` (mặc định), `out(.16,1,.3,1)` (phần tử vào),
`in-out(.4,0,.2,1)` (rung sai), `emphasis(.34,1.16,.64,1)` **chỉ** cho điểm số bật lên.

Bộ keyframe công bố để gameplay dùng lại: `nq-page-enter`, `nq-pop-enter`, `nq-scrim-enter`,
`nq-dialog-enter`, `nq-sheet-enter-left/right`, `nq-toast-enter`, `nq-skeleton` (shimmer),
`nq-feedback-correct` (pop), `nq-feedback-wrong` (shake), `nq-score-updated`, `nq-timer-critical`.
Mọi keyframe kết thúc ở trạng thái nghỉ nên khi giảm chuyển động chúng "nhảy" tới kết quả đúng,
không để phần tử kẹt ở opacity 0.

**Reduce motion**: `base.css` đặt `--nq-motion-*: 1ms` và ép `animation-duration/transition-duration:
0.01ms` cho mọi phần tử; hiệu ứng chuyển vị bị bỏ, chỉ còn thay đổi tức thời. Không animation nào chặn
thao tác: mọi chuyển động đều là CSS trên compositor, không có JS timer chặn input.

**Không âm thanh** (D-015): không có thành phần nào phát tiếng; phản hồi đúng/sai dựa vào màu + chữ +
chuyển động.

---

## 8. Accessibility checklist

- [x] Tương phản chữ ≥ 4.5:1 ở cả hai theme (tertiary 4.6:1 là mức thấp nhất, dùng cho meta ngắn).
- [x] Viền/đường kẻ và trạng thái tương tác đạt ≥ 3:1 và khác biệt ở cả hai theme.
- [x] Focus ring 2px + offset 2px; `.nq-focusable` vẽ quầng hai lớp trên nền màu để không chìm.
- [x] Không có thông tin chỉ bằng màu: badge có chữ, timer có số, camera/connection có nhãn.
- [x] Dialog/Sheet: `role="dialog"`, `aria-modal`, focus trap, Escape, trả focus, khoá cuộn nền.
- [x] Danh sách/menu: `combobox`+`listbox`+`option`, `aria-activedescendant`, roving tabindex cho
      nav/tab/segmented.
- [x] Form: label thật, `aria-describedby`, `aria-invalid`, lỗi `role="alert"`, cho phép paste.
- [x] Icon-only control luôn có `aria-label` (bắt buộc qua prop `label`).
- [x] Toast/Skeleton/Spinner có live region hoặc `aria-hidden` đúng vai.
- [x] `prefers-reduced-motion: reduce` tắt toàn bộ chuyển vị.
- [x] `user-select: none` cho chrome, `text` cho nội dung người dùng cần copy (PIN, đáp án).
- [x] Skip-link tới `#nq-main`.
- [ ] Kiểm tra bằng trình đọc màn hình thật (NVDA trên Windows) — **chưa làm được** trong môi trường Linux không display.

---

## 9. Kiểm chứng

```bash
bash desktop/scripts/verify-linux.sh ui2 npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh ui2 npx vitest run src/renderer/components
```

- `tsc`: **0 lỗi** trong `styles/**`, `components/ui/**`, `components/shell/**`.
  (Lỗi duy nhất của toàn `tsconfig.web` tại thời điểm kiểm: `src/renderer/lib/session-store.ts` — file của
  agent gameplay, không thuộc phạm vi này.)
- `vitest`: `ui/__tests__/primitives.test.tsx` (12) + `shell/__tests__/shell.test.tsx` (12) — **24/24 pass**.
- Tailwind: `vite build` trong sandbox thành công (≈50 kB CSS); audit:
  **0 biến `--nq-*` dùng mà chưa khai báo**, **0 mã màu hardcode** ngoài `tokens.css`.
- **Kiểm chứng bằng Chromium headless thật** (puppeteer, viewport 1280×860, cả light và dark), đọc
  `getComputedStyle` — đây là bằng chứng cho các bất biến ở §2.1:

| Kiểm tra | Kết quả đo được |
|---|---|
| `h1.nq-display.text-nq-3xl` | `font-size: 30px`, `font-weight: 700`, `line-height: 34.5px` |
| `h1` không class (reset còn hiệu lực) | `font-size: 14px` (kế thừa body) |
| Button primary | `background: rgb(31 85 96)`, `padding-left: 16px`, `height: 38px`, chữ trắng |
| Button secondary | `border: 1px solid rgb(198 201 190)` — `border` utility thắng reset `button { border: 0 }` |
| `Card` + `CardBody.p-4` | `padding: 16px` đều, `margin-top: 0` (không còn 52px chết) |
| `Card` + section mặc định | body `pt/pb 16px`, `pl 20px`; footer `pt 16 / pb 20 / mt 0` |
| `.nq-scroll` + `overflow-hidden` | `overflow-y: hidden` — utility thắng component layer |
| Focus ring trên nút có `shadow-nq-sm` | `box-shadow: 0 0 0 2px rgb(244 244 239), 0 0 0 4px rgb(47 110 120)` (ring thay bóng) |
| Dark theme | body `rgb(15 20 21)`, chữ `rgb(237 242 240)`, card `rgb(23 30 31)`, `color-scheme: dark` |
| Reduced motion | `--nq-motion-fast: 1ms` (token override unlayered hoạt động) + transition `1e-05s` |
| `DesignPreview` controlled | `data-theme` **không bị ghi** sau 500ms; uncontrolled không ghi khi mount, chỉ ghi sau click |
| Shell 1440×900, nội dung 3000px | `<aside>` **860px**, `body.scrollHeight` **900**, footer “Đăng xuất” trong màn hình |
| Shell 1024×700 | `<aside>` **660px**, `body.scrollHeight` **700** |
| Nav 30 mục | `overflow-y: auto`, `scrollHeight 1268 > clientHeight 703`, footer vẫn ghim |
| Title bar `rightSlot` cách mép phải | **138px** (trước: 12px), `padding-right: 138px` |

Ảnh render (light + dark) của gallery và của cụm `Card` đã được đối chiếu: không còn tiêu đề bị bóp
thành một từ mỗi dòng, không còn khoảng trắng chết dưới footer.


---

## 10. Việc con người phải kiểm tra trên Windows

Chromium headless đã xác nhận cascade, kích thước và cả hai theme (xem §9). Những gì headless **không**
chứng minh được:

1. **Font thật**: cài/không cài Be Vietnam Pro — dấu tiếng Việt ở 11–13px có bị cắt mũ/chấm không, và
   kanji trong bộ đề có rơi về tofu không (Yu Gothic UI / Meiryo). Headless dùng font fallback của Linux.
2. **Title bar**: kéo cửa sổ thật, click nút trên thanh không bị nuốt, double-click maximize, snap layout.
3. **Backdrop-filter** của title bar trên GPU/DPI khác nhau: có nhấp nháy khi cuộn không.
4. **DPI 125%/150%**: control 30/38/46px và hairline 1px có còn sắc nét.
5. **Bàn phím thật**: Tab qua nav → mũi tên, Ctrl/Cmd+K, Escape trong dialog/sheet, và ring hiển thị
   đúng khi dùng phím (headless đã xác nhận `box-shadow`, chưa xác nhận cảm giác).
6. **Cửa sổ hẹp 1024px** và **1920px**: rail ẩn/hiện, lề 20/32/40px, không có thanh cuộn ngang.
7. **`DesignPreview`**: mount trong app để rà mọi primitive ở cả hai theme trước khi chốt màn hình thật.

---

## 11. Biên bản hợp nhất (sự cố hai agent trùng phạm vi)

Trong phiên này, một agent trùng phạm vi đã ghi song song vào cùng thư mục. Bản chuẩn hoá giữ **một**
hệ thống (Sumi) và đã xoá các file trùng:

| Đã xoá | Lý do |
|---|---|
| `styles/utilities.css`, `styles/animations.css`, `styles/components.css` | CSS tách 3 file của bản trùng; bản chuẩn dùng `index.css` + utility Tailwind |
| `components/ui/Progress.tsx`, `ProgressRing.tsx` | Trùng vai với `ProgressBar` và `CircularTimer` |
| `components/shell/Sidebar.tsx` | Trùng vai với `AppSidebar` |
| `components/shell/TopBar.tsx` | Trùng vai với `AppTitleBar` |
| `components/shell/PageHeader.tsx` | Đã gộp vào `shell/AppHeader.tsx` (export `AppHeader` + `PageHeader`) |
| `components/shell/ConnectionBadge.tsx` | Đã gộp vào `AppTitleBar` (prop `connection`) |
| `components/shell/ThemeToggle.tsx` | Đã gộp vào `AppTitleBar` (prop `theme`/`onThemeChange`) |

Các file bị bản trùng ghi đè đã được phục hồi theo API chuẩn: `ui/Button`, `Card`, `Field`, `Badge`,
`Avatar`, `Kbd`, `Skeleton`, `Switch`, `SegmentedControl`, `EmptyState`, `Dialog`, `Toast`, `Spinner`,
`ui/index.ts`, `shell/AppShell.tsx`, `shell/index.ts`, và bộ `styles/*`.
