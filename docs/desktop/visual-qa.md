# Visual QA — desktop client

Mục tiêu: không tuyên bố "UI đẹp/đúng" nếu chưa có ảnh render thật. Máy Linux hiện tại không có
display nhưng vẫn chụp được bằng Chromium headless.

## Điều kiện

- Dependency desktop đã cài ngoài repo (xem `contracts.md` §7.1).
- `puppeteer` cài **không lưu vào package.json** (chỉ dùng để chụp ảnh):
  ```bash
  cd /tmp/opencode/nq-verify
  npm install --no-save puppeteer
  node node_modules/puppeteer/install.mjs   # tải Chrome for Testing
  ```
- Chrome lưu ở `~/.cache/puppeteer/`.

## Quy trình

1. Đồng bộ source sang sandbox:
   ```bash
   bash desktop/scripts/verify-linux.sh visual true
   ```
2. Build một entry renderer tuỳ ý (ví dụ `preview.html` mount `DesignPreview` hoặc một route thật)
   bằng một vite config riêng trong sandbox — **không thêm file preview vào repo**.
3. Serve tĩnh và chụp:
   ```bash
   (cd <sandbox>/preview-dist && python3 -m http.server 8779 --bind 127.0.0.1 &)
   node shot.mjs   # puppeteer: setViewport + goto + screenshot
   ```
4. Đọc ảnh, ghi phát hiện vào `docs/AI_LOG.md` nếu là lỗi thật.

## Những gì đã xác minh bằng ảnh (2026-11-15)

- `DesignPreview` + `AppShell` ở 1440×900 light/dark và 1024×700.
- Kết quả: type scale, button variants, form/validation, Kbd, switch, palette, nav active state,
  dark theme đều render đúng **sau khi** sửa lỗi cascade trong `styles/base.css`
  (`docs/AI_LOG.md` 14:05).

## Giới hạn

- Chromium trên Linux không có font Be Vietnam Pro / Noto Sans JP của Windows; ảnh chỉ dùng để
  kiểm tra bố cục, màu, tương phản và trạng thái — **không** kết luận về font/DPI cuối cùng.
- Không chụp được cửa sổ Electron thật (frameless, `titleBarOverlay`, camera permission).
  Việc đó vẫn phải làm trên Windows 10/11.
