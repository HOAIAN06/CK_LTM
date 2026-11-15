# Desktop QA review — foundation + authentication

- Reviewer: `qa` subagent (read-only pass; no source file was modified)
- Date: 2026-11-15
- Branch: `feature/electron-desktop`
- Scope: `desktop/src/main/**` (excluding `main/media/**`), `desktop/src/preload/**`,
  `desktop/src/shared/**`, `desktop/src/renderer/{app,routes,lib,styles,components}/**`,
  `docs/desktop/*.md`.
- Out of scope (another agent is writing them): `desktop/src/main/media/**`,
  `desktop/src/renderer/features/proctor/**`, `desktop/src/shared/media-ipc.ts`,
  `desktop/src/main/ipc/register-media-handlers.ts`.

---

## 1. Verdict per invariant

| # | Invariant | Verdict |
|---|---|---|
| 1 | Java server stays authoritative (no scoring / answer / room / timer logic in TS) | **PASS** |
| 2 | Renderer cannot open sockets / read files / touch DB; sandbox + isolation + strict CSP + deny-by-default permissions | **PASS** |
| 3 | Protocol compatibility (field names, 71 `MessageType`, JSON-line framing, string error payloads, null/empty payloads) | **PASS** |
| 4 | Credentials / PINs / media tickets never in logs, errors, persisted state or URLs | **PASS** |
| 5 | UI cannot dead-end (nav resolves, guards redirect, pending states cannot hang, errors are human-readable Vietnamese) | **FAIL (1 high, 1 medium)** — see F-01 and F-02 |
| 6 | Accessibility (labels, `aria-live`, focus, reduced motion, focus rings, keyboard-only login) | **PASS** |
| 7 | No fake data / demo path in a production build (`import.meta.env.DEV` gate) | **PASS** |

No blocker was found. The desktop work is in good shape: the transport, codec and security
layers are conservative and well tested, and the login flow correctly reproduces the Java
server's register→login protocol.

---

## 2. Evidence per invariant

### 2.1 Invariant 1 — server authority — PASS

- The transport is explicitly a transport, not a game client:
  `desktop/src/main/net/control-channel.ts:7-13` ("it never interprets payloads and never decides
  gameplay state").
- IPC handlers contain no gameplay branch: `desktop/src/main/ipc/register-control-handlers.ts:9-10`,
  `141-190` only validate/forward.
- The only "scoring" arithmetic in the renderer is a display-only percentage computed from two
  server-provided integers: `desktop/src/renderer/lib/format.ts:23-29` (`correctAnswers /
  questionsAnswered`). Nothing computes points, validity, timers or room state.
- `QUESTION` / `QUIZ_QUESTION` payloads carry **no** answer key
  (`desktop/src/shared/protocol/payloads.ts:212-226`, `377-386`), matching
  `Payloads.question()` in `src/main/java/com/nihongoquest/common/protocol/Payloads.java:72-86`
  ("Explicit public DTO: no server model or answer key can be serialized here").
- The username/password rules duplicated in the renderer
  (`desktop/src/renderer/lib/validation.ts:15-16`) match the server exactly
  (`ServerRequestRouter.java:25`, `334-335`); the client check is a UX shortcut, the server still
  decides (`validation.ts:9`).
- Register flow is protocol-correct: `REGISTER_OK` does **not** authenticate on the server
  (`src/main/java/com/nihongoquest/server/network/ServerRequestRouter.java:348-357` — the
  `setAuthenticatedPlayer` call is inside `if (!registering)`), and the desktop client therefore
  re-sends `LOGIN` afterwards (`desktop/src/renderer/routes/login-route.tsx:366-389`). Correct.

### 2.2 Invariant 2 — renderer boundary — PASS

- Window preferences: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`,
  `nodeIntegrationInWorker/SubFrames: false`, `webviewTag: false`, `webSecurity: true`,
  `allowRunningInsecureContent: false` — `desktop/src/main/window.ts:90-111`; plus a global
  `app.enableSandbox()` at `desktop/src/main/index.ts:37`.
- Production renderer is served from a custom standard+secure scheme, not `file://`
  (`desktop/src/main/security.ts:26-29`, `138-152`, `237-257`), which is what makes header-based
  CSP and real origin checks possible.
- CSP: `default-src 'none'`, `script-src 'self'` (no `unsafe-inline`, no `unsafe-eval` in
  production), `connect-src 'self'`, `frame-src/child-src/object-src 'none'`,
  `base-uri 'none'`, `form-action 'none'` — `desktop/src/main/security.ts:80-107`. Attached to
  every `nq-app://` response (`:215-226`) and to dev-server responses only
  (`:287-303`).
- Permissions: deny-by-default, allow only `media` + `fullscreen`, and only when the requesting
  origin is the app origin / main frame — `desktop/src/main/security.ts:266-285`.
- Navigation/`window.open`/`<webview>` are blocked for every WebContents
  (`desktop/src/main/security.ts:333-348`).
- IPC sender is checked as main-frame-of-trusted-origin for **all four** channels
  (`desktop/src/main/ipc/register-control-handlers.ts:156-166`, `237-247`, `250-252`,
  `284`, `302-304`, `325-327`).
- Preload exposes a closed set of functions only, never `ipcRenderer`/`require`/`process`, and
  throws instead of exposing anything if context isolation is off:
  `desktop/src/preload/index.ts:87-96`; surface defined once in
  `desktop/src/shared/ipc.ts:193-201`.
- Verified by grep: **no** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `require(`,
  `node:fs` or `eval` anywhere under `desktop/src/renderer` (only the dev-only `?demo=1` query
  flag). No `dangerouslySetInnerHTML` either.

### 2.3 Invariant 3 — protocol compatibility — PASS

See §5 for the full spot-check list and the automated comparison results. Summary:
71/71 message types in identical declaration order; 55/55 Java records matched field-for-field;
codec/framer semantics match `Message.toWire`/`fromWire` and `BufferedReader.readLine()`.

### 2.4 Invariant 4 — secrets — PASS

- Nothing credential-shaped is persisted: `STORAGE_KEYS` holds only `nq.theme` and `nq.server`
  (`desktop/src/renderer/lib/storage.ts:11-14`); host/port only, re-validated on read
  (`desktop/src/renderer/lib/server-config.ts:21-32`).
- Session store holds only server-sent `PlayerStats` and is not persisted
  (`desktop/src/renderer/lib/session-store.ts:1-25`).
- Password lives in component state + one `useRef` for the register→login hop, and is cleared on
  success, on mode switch and on unmount
  (`desktop/src/renderer/routes/login-route.tsx:11-12`, `187-193`, `324-333`, `354-356`,
  `215-222`).
- No frame payload is ever logged: `desktop/src/main/ipc/register-control-handlers.ts:314-315`
  logs only the error code; `desktop/src/shared/protocol/codec.ts:28-36` defines payload-free
  error strings and `:80-82` deliberately discards `JSON.stringify` messages;
  `desktop/src/main/net/control-channel.ts:397-404` collapses CR/LF and truncates to 300 chars.
- The only `console.*` calls in the shipped layers are `console.error` in
  `desktop/src/main/index.ts:27-32`, `window.ts:133-142`, `register-control-handlers.ts:289`,
  `error-boundary.tsx:31` — none interpolate a frame or a credential.
- Grep across `src/main src/preload src/shared` for
  `console.(log|debug)|password|ticket` returns only type definitions, comments and test
  fixtures (see §6). No `console.log`/`console.debug` at all in `src/main|preload|shared`.
- URLs never carry secrets: `describeOrigin()` strips query/hash before logging
  (`register-control-handlers.ts:140-147`); the renderer uses `HashRouter` so credentials never
  touch the URL.

### 2.5 Invariant 5 — no dead-end — FAIL (details in F-01, F-02)

What is correct:

- All 8 nav ids map to a real route (`home` + 7 `PLACEHOLDER_COPY` entries) —
  `desktop/src/renderer/app/nav.ts:30-94`, `110-178`; rendered at
  `desktop/src/renderer/app/App.tsx:49-58`. Unknown paths fall back to `/`
  (`App.tsx:64`), and `/` without a session bounces to `/login`
  (`desktop/src/renderer/app/authenticated-layout.tsx:43-46`); `/login` with a session bounces
  to `/` (`login-route.tsx:400-402`).
- Placeholder screens deliberately contain no fake buttons
  (`desktop/src/renderer/routes/placeholder-route.tsx:4-8`, `86-89`).
- All buttons default to `type="button"` (`components/ui/Button.tsx:62`,
  `IconButton.tsx:53`), so the password-reveal control cannot accidentally submit the form.
- Login has a hard 15 s request watchdog that re-opens the form with a readable message
  (`login-route.tsx:75-76`, `195-205`, `321`); connect has its own 5 s timeout in the transport
  (`desktop/src/main/net/control-channel.ts:28`).
- Every error code the server can emit on the auth path is mapped
  (`desktop/src/renderer/lib/error-codes.ts:42-73`) and matches
  `PlayerRepository.java:40,59,133-139` + `ServerRequestRouter.java:325,336,344,350`;
  unknown codes fall back to a generic Vietnamese sentence that still includes a sanitized code
  (`error-codes.ts:158-173`).

### 2.6 Invariant 6 — accessibility — PASS

- Label ↔ input: `Field` renders `<label htmlFor={id}>` (`components/ui/Field.tsx:52`) and both
  `Input` and `PasswordInput` spread `fieldAria()` which sets `aria-describedby` +
  `aria-invalid` (`Field.tsx:10-16`, `Input.tsx:73`, `PasswordInput.tsx:49`). Error text is
  `role="alert"` (`Field.tsx:67-74`) so it is announced on change.
- Async errors: the login form has an `aria-live="polite" aria-atomic="true"` status region
  also wired as the form's `aria-describedby` (`login-route.tsx:414`, `451-473`); the server
  config error region has its own `aria-live="polite"` (`login-route.tsx:730`); `ErrorBanner` is
  `role="alert"`/`aria-live="assertive"` for danger and `role="status"` otherwise
  (`components/ui/ErrorBanner.tsx:45-48`).
- Focus management: field-level server errors move focus to the offending input on the next
  commit (`login-route.tsx:207-213`, `224-230`, `283`); the mobile/VN validation test asserts it
  (`routes/__tests__/login-route.test.tsx:44-56`).
- Reduced motion: token override to 1 ms plus a universal `!important` kill switch
  (`styles/tokens.css:367-378`, `styles/base.css:254-273`).
- Visible focus rings: `:focus-visible` outline and `.nq-focusable` box-shadow ring, both in the
  utilities layer so they beat shadow utilities (`styles/base.css:328-345`).
- Keyboard-only completion: real `<form onSubmit>` with native Enter submit, tab order
  username → password → (confirm) → submit, `Tabs` with roving tabindex + arrow/Home/End
  (`components/ui/Tabs.tsx:57-111`), password reveal is a labelled `aria-pressed` toggle
  (`PasswordInput.tsx:60-67`), server config is `aria-expanded`/`aria-controls` and Enter
  triggers connect (`login-route.tsx:644-710`). Dialog (logout confirm) traps/restores focus and
  closes on Escape (`components/ui/Dialog.tsx:67-99`).
- A skip link to `#nq-main` exists (`components/shell/AppShell.tsx:56-58`).

### 2.7 Invariant 7 — no demo path in production — PASS

- The design-preview route is a `lazy()` that only exists when `import.meta.env.DEV`
  (`App.tsx:26-31`, `60-62`); the demo fixture is a dynamic `import()` inside the same gate
  (`src/renderer/main.tsx:19-22`); `setDemoMode(true)` is called only from
  `lib/demo/fixture.ts:144`, which nothing else imports.
- Production bundle grep (`out/renderer/assets/index-*.js`): `minhanh_02` → 0,
  `demo=1` → 0, `DesignPreview` → 0, fixture score `2480` → 0.
- Benign residue: the string `Chế độ xem thử` appears once, because `<DemoBadge />` is always
  rendered into the title bar and only returns `null` at runtime
  (`app/demo-badge.tsx:9-12`). No fixture data and no reachable demo branch ships.

---

## 3. Findings (by severity)

### F-01 — HIGH — A renderer reload with an authenticated socket permanently dead-ends `/login`

**Where**

- `desktop/src/main/window.ts:85` (`autoHideMenuBar: true`, no `Menu.setApplicationMenu`) —
  Electron's default application menu is never removed, so its `Reload` (`CmdOrCtrl+R`) and
  `Force Reload` accelerators stay live in the packaged app. Confirmed: there is no `Menu`
  import/reference anywhere under `desktop/src/main`.
- `desktop/src/renderer/app/error-boundary.tsx:34-41` offers
  `window.location.reload()` as a recovery action — a second, in-app way to trigger the same
  condition.
- `desktop/src/renderer/app/providers.tsx:18-22` restores only the *connection* status after a
  reload; the session (`PlayerStats`) is recreated and is `null`
  (`desktop/src/renderer/lib/session-store.ts:8-9` — deliberately not persisted).
- `desktop/src/renderer/app/authenticated-layout.tsx:43-46` therefore redirects to `/login`.
- `desktop/src/renderer/routes/login-route.tsx:361-364` renders `ALREADY_AUTHENTICATED` as
  "Phiên này đã đăng nhập / Ứng dụng sẽ đưa bạn về trang chủ" but the app does **not** navigate
  home — it only calls `failWithCode`.
- The login screen has no disconnect affordance: the connect button is
  `disabled={pending || status.state === 'connected'}` and relabelled "Đã kết nối"
  (`login-route.tsx:714-722`), and no other control calls
  `useConnectionStore.disconnect()`.

**Reproduction** (reasoned from code; needs a real Electron run to confirm, see §8)

1. Launch the app, connect, log in, land on `/`.
2. Press `Ctrl+R` (default menu accelerator) or use the error-boundary "Tải lại giao diện".
3. The renderer restarts with `player === null` → routed to `/login`; the pill shows
   "Đã kết nối" and the connect button is disabled.
4. Submit the same credentials → server replies `LOGIN_FAIL: ALREADY_AUTHENTICATED`
   (`ServerRequestRouter.java:324-327`), UI shows "Phiên này đã đăng nhập" + "Ứng dụng sẽ đưa
   bạn về trang chủ", and stays on `/login`.
5. There is no remaining control that clears the socket; only quitting the app recovers.

**Fix suggestion (file not edited by me)**

- `desktop/src/main/index.ts` / `window.ts`: install an explicit minimal menu
  (`Menu.setApplicationMenu(null)` or a hand-built template without `reload`/`forceReload`), so the
  default Electron accelerators (reload, zoom, external doc links) do not ship.
- `desktop/src/renderer/routes/login-route.tsx`: when `status.state === 'connected'` and there is
  no session, render a real "Ngắt kết nối" action (the store already exposes `disconnect()` /
  `signOut()`), and/or treat `ALREADY_AUTHENTICATED` as "drop the stale socket, reconnect, then
  let the user log in" instead of showing copy that promises a redirect it does not perform.
- Either fix alone removes the dead-end; doing both matches the invariant "UI cannot dead-end".

### F-02 — MEDIUM — Home screen `Skeleton` can stay forever if the server never answers

**Where** `desktop/src/renderer/routes/home-route.tsx:116-133` sends `PROFILE_GET` +
`MATCH_HISTORY_GET`; `loading` is cleared only from a `MATCH_HISTORY_DATA`/`QUERY_ERROR` event
(`:139-155`) or from a failed `send` (`:128-132`). There is no timeout — unlike the login screen,
which has the 15 s `REQUEST_TIMEOUT_MS` watchdog (`login-route.tsx:75-76`, `195-205`).

**Reproduction** A connected socket whose server accepts the request but never replies (or a
reply that omits `MATCH_HISTORY_DATA`) leaves the "Phong độ gần đây" card on `<Skeleton lines={3} />`
(`:282-285`) indefinitely, with the refresh button disabled (`:271`).

**Fix suggestion** Reuse the login watchdog pattern: start a 15 s timer in `requestData`, clear it
on `MATCH_HISTORY_DATA`/`QUERY_ERROR`, and on expiry set `errorCode` to a UI-owned
`REQUEST_TIMEOUT` so the existing `ErrorBanner` + retry path renders. Secondary: `QUERY_ERROR`
is accepted from any screen's request, not correlated to this screen's request id.

### F-03 — LOW — macOS title bar reserves the window-control strip on the wrong side

**Where** `desktop/src/renderer/components/shell/AppTitleBar.tsx:69-70` defaults
`reserveWindowControls` to `!hasWindowControls` (true, since neither caller passes window-control
callbacks), which adds `padding-inline-end: var(--nq-titlebar-controls-width)` (≈138 px) —
`AppTitleBar.tsx:81-87`. Neither caller passes `reserveWindowControls={false}` on macOS:
`login-route.tsx:483-489`, `authenticated-layout.tsx:73-83`. Meanwhile main configures macOS with
left-side traffic lights (`desktop/src/main/window.ts:87-89`) and
`docs/desktop/architecture.md:194-196` states macOS needs ~78 px reserved on the **left**.

**Effect** On macOS: ~138 px of empty space on the right and no left inset, so the traffic lights
can overlap the "NihongoQuest" label. Cosmetic, Windows is unaffected. Could not be verified on
this machine (§8).

**Fix suggestion** Pass `reserveWindowControls={false}` plus a left inset when
`window.nq.app.platform === 'darwin'` (the value is already exposed synchronously by preload), or
resolve the flag once in `AuthenticatedLayout`/`LoginRoute` from `readAppInfo().platform`.

### F-04 — LOW — Clicking login while a manual connect is still in flight silently does nothing

**Where** `desktop/src/renderer/routes/login-route.tsx:233-235` returns `false` from
`ensureConnected()` when `connectingRef.current` is already true; the caller
(`:304-308`) then just calls `finishPending()` with no message, no focus move and no error.
Reachable by pressing "Kết nối" and then "Đăng nhập" before the TCP connect resolves.

**Fix suggestion** Return a distinguishable result and surface the existing
`CONNECT_IN_PROGRESS` copy (`error-codes.ts:116-119`), or disable the submit button while
`connecting` is true.

### F-05 — LOW — Interrupted reload leaves `ALREADY_AUTHENTICATED` copy that lies

Tracked with F-01; listed separately because it is a one-line copy/behaviour mismatch:
`desktop/src/renderer/lib/error-codes.ts:57-60` promises "Ứng dụng sẽ đưa bạn về trang chủ"
while `login-route.tsx:361-364` never navigates. Fix by implementing the redirect after clearing
the stale socket, or by rewording the description.

### F-06 — LOW — Documentation drift (code wins; three small mismatches)

| Doc claims | Code says |
|---|---|
| `docs/desktop/contracts.md:92-99` — `NqBridge.app: { version, platform: NodeJS.Platform }` | `desktop/src/shared/ipc.ts:138-144` adds `packaged: boolean` and uses the literal union `NqPlatform` (deliberate, so `tsconfig.web` needs no `@types/node`) |
| `docs/desktop/contracts.md:119-136` — `ControlChannel` has **no** `getStatus()` and `onError({code,message})` | `desktop/src/main/net/control-channel.ts:63-70` has `getStatus()`, and `onError` takes the named `TransportError` type |
| `docs/desktop/protocol.md:64-65` — "`contracts.md` §5 … ghi 78" | `docs/desktop/contracts.md:143` already says 71 |

Also `payloads.ts:252` comments `GameOver.result` as `WIN | LOSE | DRAW` while
`payloads.ts:99` comments `MatchHistoryEntry.result` as `WIN | LOSS | DRAW`. Both are **correct**
(`GameRoom.java:242-243` emits `LOSE`; `MatchRepository.java:84` emits `LOSS`) — the difference is
intentional, but it is easy to misread. Worth a one-line note.

No action requested from me (read-only); these are for the doc owners.

---

## 4. Security review — IPC trust and CSP

### 4.1 IPC trust

- **Sender check is layered and correct.** `isTrustedInvokeSender`
  (`register-control-handlers.ts:156-166`) requires (a) a live `senderFrame`, (b) that it *is*
  `event.sender.mainFrame` (so iframes are rejected), and (c) a URL inside the app boundary.
  `isTrustedRendererUrl` (`security.ts:122-133`) only accepts `nq-app://nihongoquest` or — when
  **and only when** the process is unpackaged and `ELECTRON_RENDERER_URL` is a valid http(s) URL —
  that exact dev origin. `file:`, `javascript:`, `data:`, `about:` and any other host in the same
  scheme are rejected. `DEV_SERVER_ORIGIN` is forced to `null` when `app.isPackaged`
  (`security.ts:38-49`), so a packaged build can never be pointed at a remote origin via env.
- **Failure mode is a value, not a throw.** `connect`/`send` return
  `{ok:false, error:'UNTRUSTED_SENDER'}`; `status` returns an idle snapshot; `disconnect` is a
  no-op (`register-control-handlers.ts:249-329`, contract documented at `:12-20`). This keeps the
  renderer from ever being able to parse a main-process stack trace.
- **Input validation at the boundary:** host is restricted to printable ASCII with
  `/\@?#` and whitespace rejected (`:73-84`); port is integer 1..65535 (`:87-93`); outbound frames
  must at least be an object with a bounded string `type` (`:115-119`). Full payload validation is
  delegated to the codec, which validates `type` against the 71-value set
  (`src/shared/protocol/codec.ts:64-83`).
- **Defence-in-depth gap (acceptable):** `normaliseHost` in
  `desktop/src/main/net/control-channel.ts:433-440` only rejects space, `/` and `@` — it would
  accept `?`/`#`/`\`. It is unreachable from the renderer because the IPC layer rejects those
  first. Not worth changing; noted so nobody assumes the transport is the validator.
- **`getStatus()` to an untrusted sender** returns `createIdleConnectionStatus()` — no host, no
  lastError. Nothing sensitive. Considered fine (and documented at `:320-323`).
- **Asymmetry worth knowing (not a bug):** `disconnect` silently ignores an untrusted sender
  instead of returning an error, because its contract is `void`
  (`register-control-handlers.ts:282-284`). The renderer therefore always treats disconnect as
  successful — which matches the store's expectation (`connection-store.ts:104-110`).

### 4.2 CSP

- Production string (`security.ts:91-106`) is exactly what `docs/desktop/architecture.md:202-214`
  documents, and `security.test.ts:68-84` pins: no `unsafe-eval` anywhere, no `unsafe-inline` in
  `script-src`, `connect-src 'self'` only.
- **Residual risk (accepted, documented):** `style-src 'self' 'unsafe-inline'`. Required because
  React components use `style={{…}}` (e.g. `AppTitleBar.tsx:82-87`, `AppShell` grid code). CSS-only
  injection surface; cannot execute script under `script-src 'self'`.
- **Residual risk (low):** `worker-src 'self' blob:` and `media-src 'self' blob:` allow blob
  workers and blob media. Both are needed for the (future) camera preview; a blob worker can only
  run code that is already in the bundle.
- Dev CSP widening is limited to `script-src 'unsafe-inline'` (Vite React Refresh preamble) and
  `connect-src ws(s)://<same host:port>`; the ws origin is derived from
  `ELECTRON_RENDERER_URL` itself (`security.ts:54-63`, `89`), so it cannot be aimed at a third
  party. Applied only to responses whose origin is exactly the dev origin
  (`security.ts:290-302`, using a real `URL().origin` comparison, not `startsWith`).
- DevTools navigation is allowed only when unpackaged (`security.ts:318-321`), and
  `devTools: !app.isPackaged` (`window.ts:105`).
- Path traversal on the custom scheme is handled by decode-fail / NUL / backslash rejection plus a
  normalised directory-prefix check (`security.ts:178-205`), and the protocol handler checks it
  *before* touching the filesystem (`:243-247`). Tests cover plain, encoded, `%5c` and NUL cases
  (`security.test.ts:150-204`).
- **Gap found in this pass (related to F-01, not a renderer-boundary break):** the default Electron
  menu still ships `Reload`, `Force Reload`, `Zoom`, `Toggle Full Screen` and Help → external links.
  None of these widen the renderer's privileges (navigation is still blocked, `window.open` still
  denied), but `shell.openExternal` from the built-in Help menu is an outbound surface the project
  did not choose.

---

## 5. Protocol compatibility spot-checks

Automated comparisons run against the real Java tree (`NQ_REPO_ROOT` is set by
`desktop/scripts/verify-linux.sh`, so nothing skipped):

1. **`MessageType` — 71 values, identical order.** Parsed
   `src/main/java/com/nihongoquest/common/protocol/MessageType.java` and
   `desktop/src/shared/protocol/message-types.ts`: `java=71`, `ts=71`, order equal, sets equal,
   no extras on either side. The repo's own `protocol-compat.test.ts:99-118` asserted the same and
   passed with `NQ_REPO_ROOT` active (its guard test asserts `71` only when the env var is set).
2. **Java records vs TS interfaces — 55 records, 0 mismatches.** Script-parsed every
   `public record …` in `Payloads.java` and every `export interface …` in `payloads.ts`, comparing
   name, field names and field order. Result: `records compared: 55, mismatches: 0`. Manually
   re-read the security-relevant ones: `Credentials`, `PlayerStats`, `LeaderboardEntry`,
   `MatchHistoryEntry`, `GameInviteSend/Received`, `QuestionData`, `AnswerResult`, `GameOver`,
   `QuizLobbyData`, `QuizQuestionData`, `QuizAnswerResult`, `QuizRejoinData`, `ProctorMediaSession`.
3. **Direction maps — complete and disjoint.** 71 types = 31 client→server + 45 server→client − 5
   dual. Dual set computed: `FRIEND_REQUEST_LIST`, `FRIEND_REQUEST_RESPOND`, `FRIEND_LIST`,
   `QUIZ_ROOM_START`, `QUIZ_ROOM_CANCEL`. No unmapped type, no duplicate, no type that does not
   exist in `MESSAGE_TYPES`. (31/45/5 also matches `docs/desktop/protocol.md:72-90`.)
4. **Enum payload mirrors.** `CAMERA_STATUSES`, `CALIBRATION_STATUSES`, `PROCTOR_EVENT_TYPES`,
   `PROCTOR_SEVERITIES`, `MEDIA_ROLES` (`payloads.ts:19-57`) vs the Java `enum` blocks at
   `Payloads.java:272-282` — same names, same order. `MEDIA_ROLE_CODES`, `MEDIA_MAGIC`,
   `MEDIA_VERSION`, `MAX_TICKET_BYTES`, `MAX_JPEG_BYTES`, `MAX_FACES`, `HANDSHAKE_TIMEOUT_MILLIS`
   and all `ACK_*` codes are asserted against `MediaProtocol.java` by
   `protocol-compat.test.ts:120-159`, which passed.
5. **Envelope / framing.** `encodeMessage` emits `{"type":…,"payload":…}` with no newline
   (`codec.ts:64-83`) and the transport appends `\n` (`control-channel.ts:186`, `217`) — same as
   `Message.toWire()` + `BufferedWriter`. `decodeMessage` accepts payload as object, string, `null`
   or a missing key (`codec.ts:122-139`), which covers the three shapes Java produces:
   `NullNode`, `TextNode("")` and a code string (`Message.java:24-32`, `40-42`).
   `FrameReader` splits on `0x0A` at byte level, strips one `\r`, drops empty lines, keeps the
   remainder, caps a frame at 8 MiB and rejects invalid UTF-8
   (`frame-reader.ts:85-185`) — matches `BufferedReader.readLine()` plus the project's stated
   limits.
6. **String error payloads.** All business failures the desktop decodes are modelled as `string`:
   `LOGIN_FAIL`, `REGISTER_FAIL`, `QUERY_ERROR`, `SOCIAL_ERROR`, `MATCH_ERROR`, `QUIZ_SET_ERROR`,
   `QUIZ_ERROR` (`payloads.ts:539-588`). Spot-checked actual producers:
   `ServerRequestRouter.java:325/336/344/350` (`ALREADY_AUTHENTICATED`, `BAD_REQUEST`,
   `ALREADY_ONLINE`, `DATABASE_ERROR`) and `PlayerRepository.java:40/59`
   (`USERNAME_TAKEN`, `INVALID_CREDENTIALS`) — all present in
   `desktop/src/renderer/lib/error-codes.ts:42-73`.
7. **Null / empty conventions.** `WAITING` and `MATCH_CANCELLED` are typed `null`
   (`payloads.ts:558-559`) because Java builds them with `new Message(type, "")` →
   `NullNode`; every client→server message with no data is sent as `''`
   (`payloads.ts:498-527`) and Java's `payloadText()` returns `""` for both (verified
   `Message.java:40-42`). `QUIZ_ROOM_FINISHED` correctly reuses `QuizLeaderboardData` with
   `finished: true`. `QUIZ_ROOM_CANCEL` server→client is a reason string, not an error code —
   modelled that way (`payloads.ts:582-583`).
8. **Result-code strings are correct and intentionally different per feature.**
   `GameOver.result` = `WIN|LOSE|DRAW` (`GameRoom.java:242-243`) vs
   `MatchHistoryEntry.result` = `WIN|LOSS|DRAW` (`MatchRepository.java:84`). The TS comments match
   each source. No mismatch — but see F-06 for the confusing comment pair.

**Mismatches found: none.**

---

## 6. Commands and numbers actually observed

All runs used the exFAT-safe sandbox helper; `NQ_REPO_ROOT` was set automatically by
`desktop/scripts/verify-linux.sh`, so the Java cross-checks executed.

```bash
bash desktop/scripts/verify-linux.sh qa-node  npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh qa-web   npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh qa-test  npx vitest run
bash desktop/scripts/verify-linux.sh qa-build npm run build
bash desktop/scripts/verify-linux.sh qa-grep  "grep -rniE 'console\.(log|debug)|password|ticket' src/main src/preload src/shared --include=*.ts | head -50"
```

| Command | Result |
|---|---|
| `tsc --noEmit -p tsconfig.node.json` | **0 errors**, exit 0 |
| `tsc --noEmit -p tsconfig.web.json` | **0 errors**, exit 0 |
| `vitest run` | **15 files / 183 tests passed**, 7.03 s, exit 0 |
| `npm run build` | **success** — `out/main/index.js` 40.63 kB, `out/preload/index.js` 1.78 kB, `out/renderer/index.html` 0.45 kB, CSS 66.00 kB, JS 879.72 kB (2170 modules) |
| grep (logs/secrets) | only type definitions, comments and test fixtures — **no `console.log`/`console.debug`**, no credential interpolation (§2.4) |

Per-file test counts as reported by vitest: `frame-reader` 18, `media` 11, `codec` 17,
`payloads` 9, `protocol-compat` 6, `security` 16, `connection-store` 11,
`register-control-handlers` 29, `error-codes` 7, `validation` 11, `control-channel` 14,
`message-types` 5, `ui primitives` 12, `shell` 12, `login-route` 5.

Production-bundle fixture check (build output, not the source tree):

| String | Occurrences in `out/renderer/assets/*.js` |
|---|---|
| `minhanh_02` | 0 |
| `demo=1` | 0 |
| `DesignPreview` | 0 |
| `2480` (fixture score) | 0 |
| `Chế độ xem thử` | 1 (always-rendered `DemoBadge` label; the flag can never be set in production — §2.7) |

### Baseline integrity

`git status --short src/main/java src/main/resources pom.xml` lists **only** the pre-existing
JavaFX UI redesign edits (9 files under `client/…` and `ui/Icons.java`; 12 FXML/CSS resources) and
**no** file under `component/protocol`, `server/`, `common/`, `sql/`, and no change to `pom.xml`.
Nothing in this desktop work touched the Java baseline. (`git diff --stat src/main/java` →
`9 files changed, 330 insertions(+), 49 deletions(-)`, all JavaFX client UI.)

---

## 7. Notes that are not defects (checked, then dropped)

- Deliberate double `status` event on a failed connect (`error` from the transport, then from the
  handler): documented at `docs/desktop/architecture.md:313`, and
  `connection-store.ts:135-155` is idempotent.
- `src/shared/media-ipc.ts` is currently imported by **nothing** (grep for `media-ipc` returns only
  itself) and `NqBridge` has no `media` member (`src/shared/ipc.ts:173-185`,
  `src/preload/index.ts:8-12`). So the "expose only what main implements" rule is honoured. Not
  reviewed further: camera scope.
- `AppTitleBar` *can* render custom window buttons, but only when `onMinimize/onMaximize/onClose`
  are passed (`AppTitleBar.tsx:69`, `144-177`) and neither caller passes them — so no dead window
  chrome in the shipped UI. (The macOS inset issue is F-03.)
- No `<meta http-equiv="Content-Security-Policy">` in `src/renderer/index.html`; intentional —
  CSP is delivered as a response header by the `nq-app://` handler and by the dev-server
  `webRequest` hook, which is strictly better than a meta tag.
- `electron-builder.yml` packages `out/**` + `package.json` with `asar: true`; no source or fixture
  path is included.

---

## 8. What I could NOT verify here

- **No real Electron run.** This machine has no display, so nothing in this report was observed in
  a live window: not the CSP actually being enforced, not `net.fetch('file://…')` inside an asar,
  not the `titleBarOverlay` at 125 %/150 % DPI, not F-01 end-to-end (it is derived from code paths:
  default-menu accelerator → `webContents.reload()` → `syncStatus()` restores `connected` while
  `session-store` is empty → `ALREADY_AUTHENTICATED`).
- **No Windows.** All Windows-specific behaviour (NSIS packaging, overlay colour sync, path
  separators in `resolveRendererFilePath`, `process.argv` injection in a sandboxed preload) is
  unverified. `process.contextIsolated` and `webPreferences.additionalArguments` are used per
  Electron 45's documented API (`electron.d.ts:28526`, `:20322`) but were not executed.
- **No webcam / media.** `getUserMedia`, the `media` permission grant, the binary relay and
  `PROCTOR_*` messages were out of scope and untested.
- **No database and no server process.** No live TCP session to the Java server; protocol checks
  are static comparisons against the Java sources plus the repo's own unit tests.
- **No visual/contrast audit, no screen reader, no keyboard-only walkthrough on a real window.**
  Accessibility verdicts are from code structure (labels, `aria-*`, focus code, CSS), not from an
  assistive-technology run.
- **Not run:** `npm install`, `electron-builder`, any lint job (none is configured), and anything
  that would write into the exFAT repo.

---
---

# Final pass — merged desktop client

- Reviewer: `qa` subagent (second read-only pass; no source file modified, earlier findings kept)
- Date: 2026-11-15, branch `feature/electron-desktop`
- Scope now: all of `desktop/src/main/**` (control **and** media IPC, security, menu policy),
  `desktop/src/preload/**`, `desktop/src/shared/**`, all of `desktop/src/renderer/**`
  (16 route files, stores/reducers, proctoring feature, demo fixture), `docs/desktop/**`.
- Prior findings F-01…F-06 (sections 3 above) are re-checked in §9.1 below and are **not**
  renumbered; new findings are F-07…F-11.

## 9. Final verdict table

| # | Invariant / priority | Verdict |
|---|---|---|
| — | 1. Server remains authoritative (scores, answers, timers, room state, warnings) | **PASS** |
| — | 2. Renderer boundary (no socket / fs / db; sandbox, CSP, permissions) | **PASS** |
| — | 3. Protocol compatibility (71 types, 55 records, framing, string errors, null/`""`) | **PASS** |
| — | 4. Secrets (password, PIN, media ticket) never in log/DOM/URL/persisted state | **PASS** |
| — | 5. No dead-end UI (nav, guards, bounded waits, Vietnamese copy) | **PASS with one MEDIUM UX defect** (F-07) |
| — | 6. Accessibility | **PASS** |
| — | 7. No demo/fixture path in a production build | **PASS** |
| — | 8. **F-01 re-verification** (reload with authenticated socket is recoverable) | **PASS** |
| — | 9. **Swallowed-message audit** (every channel subscriber) | **PASS** — 12/12 subscriptions safe (5 stores + 7 routes); one hidden-failure risk (F-09) |
| — | 10. Proctoring correctness vs `docs/protocol.md` §8.1 + `QuizRoom` | **PASS** |
| — | 11. Data screens (watchdogs, error copy, no dead buttons, no fabricated data) | **PASS** (one LOW cross-talk, F-08) |
| — | 12. Demo fixture safety | **PASS** |
| — | 13. Protocol spot-checks on the newly used payloads | **PASS** — 0 mismatches |
| — | 14. Java baseline untouched | **PASS** — exactly 21 modified files |

**Bottom line: no blocker, no high.** The desktop client is ready for a Windows demo, with the
residual risks listed in §17 (none of which break a happy-path demo, but two of which a reviewer
could notice: F-07's false warning and the unverified webcam path).

## 10. Findings (final pass), ordered by severity

### F-07 — MEDIUM — `/login` shows a false "old session" warning after a *fresh* manual connect

**Where**

- `desktop/src/renderer/routes/login-route.tsx:676-695` renders a warning banner whenever
  `status.state === 'connected'`, with the text "Máy chủ vẫn đang giữ phiên đăng nhập cũ … nên
  đăng nhập sẽ bị từ chối" plus a "Ngắt kết nối" button.
- But a *fresh, unauthenticated* socket is also `connected`. The screen itself documents and
  encourages that state 140 lines later: `login-route.tsx:836` — "Kết nối trước, sau đó đăng nhập."
  and the "Kết nối" button at `:800-808` connects without logging in.

**Reproduction** (code path, no display needed): open `/login` → expand "Cấu hình server" →
press "Kết nối" → socket opens, `status.state` becomes `connected`, `player` is still `null`
(so `/login` stays mounted) → the banner claims login will be refused, which is false; `LOGIN`
would succeed on that socket.

**Why it matters** This is the first screen a demo audience sees, and the warning contradicts the
instruction directly below it. It is not a dead end (the form still works), which is why it is
MEDIUM, not HIGH.

**Fix suggestion** Gate the banner on a *known stale session*, not on `connected`:
add `const [staleSession, setStaleSession] = useState(false)`, set it in `handleStaleSession()`
(`login-route.tsx:267-274`) and on `connectionLost`, clear it in `closeStaleSession()`/on
`LOGIN_OK`, and use `{staleSession ? …banner… : null}`. Alternatively expose "is the socket
authenticated" from main via a new `ConnectionStatus` field — but the local flag needs no
protocol change.

### F-08 — LOW — `QUIZ_SET_LIST` is consumed by two independent subscribers (state cross-talk)

**Where** `desktop/src/renderer/routes/quiz-route.tsx:104` sends `QUIZ_SET_LIST {scope:'PUBLISHED'}`
and handles the reply locally in its own `useServerMessage` handler (`:124-138`). Meanwhile
`desktop/src/renderer/lib/sets/sets-store.ts:217-228` has a **module-level** subscriber that also
consumes every `QUIZ_SET_LIST_RESULT` and writes it into `items[pendingListScope]`
(`pendingListScope` defaults to `'OWN'`, `sets-store.ts:67`).

**Effect** Opening `/quiz` writes the published list into the sets store's cached `OWN` bucket
(and clears its `listLoading`). Because `sets-route` re-requests on mount
(`sets-store.ts:108-126`), the visible consequence is a possible brief flash of published sets
under "Bộ đề của tôi", plus a `listLoading` flag being cleared by an unrelated request. No data is
lost and no message is dropped.

**Fix suggestion** Either give the sets store its own request-scoped correlation (ignore
`QUIZ_SET_LIST_RESULT` when `listLoading === false`), or have `/quiz` reuse
`useSetsStore.requestList('PUBLISHED')` instead of sending the frame directly.

### F-09 — LOW — The per-listener `try/catch` still hides future regressions silently

**Where** `desktop/src/renderer/lib/connection-store.ts:173-179` — `catch { /* im lặng */ }`. This
is exactly the mechanism that hid the previously fixed `sets-store` hook bug: a throwing listener
produces no log, no counter, and the screen just spins until its watchdog fires.

**Why keep it** The behaviour itself is correct and deliberate: one broken screen must not stop
other screens from receiving messages.

**Fix suggestion** Keep the isolation but make failures observable in dev builds only, without ever
logging a payload:
`catch { if (import.meta.env.DEV) console.error('[nq] listener lỗi cho', message.type) }`
(`message.type` is an enum name, never data). A one-line change that turns a silent 15-minute
debug into a 10-second one.

### F-10 — LOW — Publishing a quiz set is only validated by the client

**Where**

- Editor: `desktop/src/renderer/routes/set-editor-route.tsx:205` disables "Xuất bản" until
  `publishChecklist(draft).ready` (`lib/sets/validation.ts`, `MIN_PUBLISH_QUESTIONS = 3`, matching
  `QuizSetService.java:82` `publishing && source.size() < 3 → INVALID_QUIZ`).
- List: `desktop/src/renderer/routes/sets-route.tsx:200-203` toggles publish with **no** local
  check, and the server's publish path (`QuizSetService.java:46-54`) only checks ownership — it
  does **not** re-validate the question count.

**Effect** A user can publish a 1-question set from the list screen; the server accepts it; a room
created from it later fails with `QUESTIONS_UNAVAILABLE`, which the UI does explain
(`error-codes.ts`). So the outcome is a server-owned, explained error — not fabricated data — but
"publish validity" is enforced only in one of the two UI paths.

**Fix suggestion** Let the server own it (add the 3-question check to `publish()`), or apply the
same `publishChecklist` gate to the list-screen toggle. Client-side only is the weaker option.

### F-11 — LOW — macOS title bar still reserves the Windows control strip (carried over, unfixed)

`components/shell/AppTitleBar.tsx:69-70` still defaults `reserveWindowControls` to
`!hasWindowControls`, and no caller passes it (`login-route.tsx`, `authenticated-layout.tsx`), so
macOS gets ~138 px of dead space on the right and no left inset for the traffic lights that
`main/window.ts:87-89` positions on the left. Cosmetic, Windows unaffected, irrelevant to the
demo target. Fix: pass `reserveWindowControls={false}` + a left inset when
`window.nq.app.platform === 'darwin'`.

### Informational (not defects)

- `routes/quiz-lobby-route.tsx:75` registers `useServerMessage(() => undefined)` — a no-op
  subscription with no effect. Dead code; harmless, but it will confuse the next reader who uses
  it as the model for a real handler.
- `duplicate` `isTrustedInvokeSender` in `main/ipc/register-control-handlers.ts:156-166` and
  `main/ipc/register-media-handlers.ts:107-116` — intentional per the comment at `:103-106`
  (files stay independent), identical logic today. Keep them in sync if one changes.
- Renderer bundle grew to **1,208.53 kB** (was 879.72 kB). No gzip report and no per-chunk
  splitting configured; irrelevant for a local desktop app, worth a glance if packaging size
  matters.

## 11. F-01 re-verification (end-to-end, in code)

**Requirement:** a renderer reload with an authenticated socket must be recoverable, in both ways
the app can trigger one; production must not expose Reload.

| Check | Result | Evidence |
|---|---|---|
| Production menu has no Reload/Force Reload | **PASS** | `main/index.ts:69-75` → `if (app.isPackaged) Menu.setApplicationMenu(null)`; called at `:142` **before** `createMainWindow()` (`:146`) so no window ever exists under the default menu. No other `Menu`/`shell.openExternal` reference in `src/main` (grep). |
| Dev menu is explicit and minimal (no Help/external links) | **PASS** | `main/index.ts:34-50` — exactly Reload, Toggle DevTools, Quit. |
| The previous default-menu accelerator path is documented | **PASS** | `main/index.ts:52-68` and `docs/desktop/architecture.md:201-220` (§5.2). |
| Reload recovery is still reachable in dev / via the error boundary | **PASS** | `app/error-boundary.tsx:34-41` still calls `window.location.reload()`; therefore dev keeps `CmdOrCtrl+R` — and the recovery below must (and does) work regardless of how the reload happened. |
| `/login` offers an explicit way out when the socket is connected without a session | **PASS** | `login-route.tsx:676-695` banner + "Ngắt kết nối"; `handleDisconnectClick` `:259-265` → `closeStaleSession` `:244-257` → `disconnect()` + `syncStatus()`. |
| `ALREADY_AUTHENTICATED` triggers the same recovery automatically | **PASS** | `login-route.tsx:420-423` (LOGIN_FAIL) and `:453-456` (REGISTER_FAIL) → `handleStaleSession()` `:267-274`. |
| Recovery is idempotent / cannot double-send | **PASS** | `disconnectRef` guard at `:245`, `:260`, `:269`, `:331`; submit and tabs are blocked while disconnecting (`:331`, `:540`). |
| Recovery actually frees the server session | **PASS** | `connection-store.ts:104-110` → `nq:disconnect` → `control-channel.ts:153-200` writes a `DISCONNECT` frame then closes; `QuizRoom`/session teardown happens on socket close. Re-login then opens a fresh unauthenticated socket (`ensureConnected` → `connect`). |
| Covered by tests | **PASS** | `routes/__tests__/login-route.test.tsx:132` ("offers an explicit way out … (F-01)") and `:151` ("recovers automatically when LOGIN returns `ALREADY_AUTHENTICATED`"). |
| Related F-04 (silent no-op while a connect is in flight) | **FIXED** | `login-route.tsx:178-179, 277-290` — a second `ensureConnected` now awaits the in-flight promise instead of returning `false`. |
| Related F-02 (home screen could hang on a skeleton) | **FIXED** | `routes/home-route.tsx` now arms a watchdog (`RESPONSE_TIMEOUT_MS`, `lib/watchdog.ts:11`) and clears it on `MATCH_HISTORY_DATA`/`QUERY_ERROR`. |
| Related F-06 (doc drift) | **FIXED** | `docs/desktop/contracts.md:96-102` now documents `packaged` + `NqPlatform`; `:146` documents `ControlChannel.getStatus()`. |
| Related F-03 (macOS reserve) | **NOT FIXED** | see F-11. |

The earlier F-01 dead end is gone. The only residue is the *over-eager* banner described in F-07.

## 12. Swallowed-message audit — every subscriber

Mechanism: `connection-store.ts:173-179` invokes each listener inside `try/catch` and ignores
throws. A subscriber that (a) calls a React hook, (b) closes over stale state it mutates directly,
or (c) subscribes after the reply has already arrived will silently lose data.

### 12.1 Channel-level subscribers (5 stores, all identical safe shape)

| Subscriber | Registration | Callback body | Hook misuse | Subscribe-before-request | Verdict |
|---|---|---|---|---|---|
| `lib/ranked/ranked-store.ts:54-56` | module scope, `ensureChannel()` called at `:221` | `useRankedStore.getState().applyServerMessage(message, Date.now())` | none (`getState`) | yes — import-time, before any request can be sent | **SAFE** |
| `lib/quiz/quiz-store.ts:108-110` | module scope, `:446` | `useQuizStore.getState().applyServerMessage(...)` | none | yes | **SAFE** |
| `lib/sets/sets-store.ts:83-85` | module scope, `:326` | `useQuizStoreSets.getState().applyServerMessage(message)` | none — **this is the fixed bug** | yes | **SAFE (fixed)** |
| `lib/social/friends-store.ts:97-99` | module scope, `:454` | `useFriendsStore.getState().applyServerMessage(...)` | none | yes | **SAFE** |
| `features/proctor/proctor-store.ts:733-735` | module scope, `ensureProctorChannel()` at `:745`; also reachable via the `features/proctor` barrel imported by `app/App.tsx:26` | `useProctorStore.getState().applyServerMessage(...)` | none | yes | **SAFE** |

Cross-check: grepping all `.ts` store/feature files for a hook-style `use*Store(` call **without**
`getState()` returns **zero** hits — the failure mode from the `sets-store` bug does not exist
anywhere else. All React hook usage lives in `.tsx` components.

Because all five subscribe at *module evaluation*, they exist before the first request of the app
and survive route changes; none of them is mounted/unmounted with a screen.

### 12.2 Route-level subscribers (`lib/hooks.ts:19`)

`useServerMessage` stores the handler in a ref (`hooks.ts:13-17`) and subscribes once
(`:19`), unsubscribing on unmount. Registration happens in a passive effect of the same commit
that fires the request, and IPC replies can only be delivered in later tasks, so there is no
"subscribed after the reply" window in practice.

| Route | Handler | Body uses only | Verdict |
|---|---|---|---|
| `routes/home-route.tsx:153-171` | MATCH_HISTORY_DATA / PROFILE_DATA / QUERY_ERROR | `setState` + watchdog | **SAFE** |
| `routes/matchmaking-route.tsx:91-105` | WAITING / MATCH_CANCELLED / MATCH_ERROR | `dispatch` | **SAFE** |
| `routes/quiz-route.tsx:124-138` | QUIZ_SET_LIST_RESULT / QUIZ_SET_ERROR | `setState` (functional update at `:130`) | **SAFE** (see F-08 for cross-talk) |
| `routes/leaderboard-route.tsx:59-71` | LEADERBOARD_DATA / QUERY_ERROR | `setState` + watchdog | **SAFE** |
| `routes/profile-route.tsx:64-75` | PROFILE_DATA / QUERY_ERROR | `setState` + watchdog | **SAFE** |
| `routes/history-route.tsx:77-89` | MATCH_HISTORY_DATA / QUERY_ERROR | `setState` + watchdog | **SAFE** |
| `routes/quiz-lobby-route.tsx:75` | no-op | nothing | **SAFE** (dead code, see informational) |

Routes with no `useServerMessage` (`battle`, `result`, `quiz-battle`, `proctor-dashboard`,
`sets`, `set-editor`, `friends`) read store state only — they inherit the channel subscribers
above, so they cannot swallow anything themselves.

### 12.3 Remaining structural risk

Only F-09: the bare `catch` hides *future* mistakes. Nothing in the current tree is hidden by it.

## 13. Proctoring correctness vs `docs/protocol.md` §8.1 and `QuizRoom`

| Requirement | Java source of truth | Client implementation | Verdict |
|---|---|---|---|
| Only a non-host player in a proctoring room may report | `QuizRoom.requireProctoredPlayer` (`QuizRoom.java:280-291`): proctoring enabled, exact PIN, member, not left, `playing`, not `host`, same client → else `NOT_PROCTORED_PLAYER` | `canReportStatus` (`proctor-protocol.ts:87-93`) requires `proctoringEnabled && !host && playing`, and `canEmitEvent` (`:96-98`) additionally requires `phase === 'running'`; both re-checked at send time in `proctor-store.ts:563` and `:595` | **PASS** |
| `cameraStatus` never `NOT_REQUIRED` / `NOT_APPLICABLE` when reporting | `QuizRoom.java:236-239` throws `BAD_PROCTOR_STATUS` for both | `isReportableCameraStatus` (`proctor-protocol.ts:82-84`) + `buildStatusReport` returns `null` (`:108-117`), and every caller goes through `reportCamera` which bails on `null` (`proctor-store.ts:564-572`). The two camera producers (`use-camera-stream.ts` → `camera-status.ts`) cannot emit those values at all (`camera-status.ts:15`) | **PASS** (double-guarded) |
| Status reports while running (and, per server, also in lobby) | `reportProctorStatus` has **no** state check and explicitly pushes the lobby to the host when `State.LOBBY` (`QuizRoom.java:243-247`) | `canReportStatus` allows lobby and running, blocks only `ended` (`:92`) — matches the server, so the stricter "running only" phrasing in the brief would actually be *wrong* | **PASS** (matches the Java, not the brief's shorthand) |
| Event reports only while RUNNING | `QuizRoom.java:251` `state != State.RUNNING → ROOM_NOT_RUNNING` | `canEmitEvent` requires `phase === 'running'`; `phase` is derived from server payloads only (`proctor-session-host.tsx:25-54`) | **PASS** |
| `eventId` unique | Server dedupes per player, keeps 256 (`QuizRoom.java:258-266`) and requires a parseable `UUID` (`:252-257`) | Fresh `crypto.randomUUID()` per emission (`proctor-protocol.ts:155-171`, used at `proctor-store.ts:601`), plus a per-type cooldown (`EVENT_COOLDOWN_MS`, `:596-598`) so no duplicate ids and no floods | **PASS** |
| `durationMillis` / `confidence` inside the server's bounds | `0..300_000` and `0..1` (`QuizRoom.java:253-255`) | clamped in `buildEventReport` (`proctor-protocol.ts:131-149`); `confidence` is always `0` and the UI shows **no** percentage (`grep confidence` in `.tsx` → 0 hits) | **PASS** |
| Ticket never in DOM / URL / logs / persisted state | — | tickets live only in module variables (`proctor-store.ts:170-173`) and go straight to `nq:media:start*` (`:280`, `:303`, `:326`, `:341`); no `ticket` in any `.tsx` (grep: only comments); `main/media/text.ts:25-28` masks it; media IPC never logs or echoes it (`register-media-handlers.ts:15`, grep for `console.*` shows only error codes) | **PASS** |
| Camera failure cannot block join / start / answer (D-002 / D-005) | — | `canHostStart` depends only on connected players + host + `startPending` (`lib/quiz/lobby.ts:31-35`) — no camera term; `choose()` (`quiz-store.ts:238-258`) checks only phase/answered; declining consent reports `DENIED` and returns (`proctor-store.ts:546-550`) | **PASS** |
| Server still owns warnings and results | `warningCount` incremented server-side (`QuizRoom.java:266`), re-sent in every update | `applyStatusUpdate`/`applyEvent` copy `warningCount` verbatim (`proctor-store.ts:427`, `:450`); `totalWarnings` only sums server values for the header (`:232-234`); no client verdict, no "cheating" conclusion, dashboard says so (`proctor-dashboard.tsx:392`) | **PASS** |
| Media channel role gating | host may not publish (`PROCTORING_HOST_CANNOT_PLAY`), only the host subscribes | `handleSession` returns early for a host `PUBLISHER` session and for a non-host `HOST_SUBSCRIBER` session (`proctor-store.ts:320-337`) | **PASS** |

Also verified: all six media IPC channels check the same sender trust as the control channels
(`register-media-handlers.ts:213-214`, `239`, `258`, `267`, `290`, `312`, `322`), frame size and
ticket length are validated before touching a socket (`:71-91`, `parseMediaPublishFrame`), and
errors cross the boundary as codes only (`MEDIA_ERROR.*`).

## 14. Other re-checks

### 14.1 Data screens — bounded waits, copy, no fabricated data

- Every request that awaits a reply is covered by a watchdog: `lib/watchdog.ts` (10 s) is armed by
  `home`, `history`, `leaderboard`, `profile`, `quiz` (`QUIZ_SET_LIST`) and by `sets-store`
  (5 watchdogs), `friends-store` (4), `quiz-store` (3), `ranked-store`/login (`REQUEST_TIMEOUT_MS`
  15 s). The only unbounded wait left is `matchmaking`'s `cancelling` phase
  (`lib/ranked/matchmaking.ts:56-58`) — but the screen is escapable (sidebar navigation is never
  blocked for matchmaking; `navigation-guard` only gates the dirty quiz-set editor), so it is not
  a dead end.
- Error copy: all **57** Vietnamese entries in `lib/error-codes.ts` cover **every** error code the
  server can emit — a script diff of the 57 quoted code strings in `src/main/java/com/nihongoquest/server`
  (minus status literals `QUIZ/RANKED/ACCEPTED/REJECTED/CANCELLED/EXPIRED/SENT/DRAW/LOSE/LOSS/PUBLISHED/HOST_CANCELLED/SERVER_STOPPED`)
  against the `COPY` keys reported **`missing from COPY: []`**. The 13 extra keys are the
  transport/IPC codes, as designed.
- No fabricated data: `leaderboard-route.tsx` renders `message.payload.players` as sent — the only
  `.sort()` calls in the renderer are question-position ordering (`lib/sets/validation.ts:131`,
  which preserves the server's `position`), proctor tile display order by the server's
  `warningCount` then username (`features/proctor/proctor-store.ts:225`), and the dev-only command
  palette's fuzzy score. No leaderboard/history/friend ordering or value is computed locally;
  `history`/`result` map the server's `result` string (`lib/format.ts` handles both `LOSS` and
  `LOSE`, matching `MatchRepository.java:84` vs `GameRoom.java:242-243`); friend presence is only
  ever assigned from `PRESENCE_UPDATE` / `FRIEND_LIST` payloads (`friends-store.ts:337-394`).
- No dead buttons: zero `onClick={() => {}}`, zero `href="#"`; `Button`/`IconButton` default to
  `type="button"`; every disabled state is tied to a pending flag or a documented checklist.
- Minor: `friends-store.ts:432-446` clears `friendsLoading` on `SOCIAL_ERROR` but leaves
  `friendsError` null, so a failed `FRIEND_LIST` renders the empty state *and* an error notice.
  Acceptable (the notice carries the error), listed for completeness.

### 14.2 Demo fixture safety

- Gated twice: `main.tsx:19-22` (`import.meta.env.DEV`) and `app/App.tsx:38-43` for the design
  preview route; `flag.ts:10-12` can only be enabled by `lib/demo/fixture.ts:144`.
- Production build greps (`out/renderer/assets/index-DmlSGyK-.js`, 1,208.53 kB):

  | String | Occurrences |
  |---|---|
  | `minhanh_02` | **0** |
  | `demo.local` | **0** |
  | `screen=` | **0** |
  | `DesignPreview` | **0** |
  | `demo=1` | **0** |
  | `246810` (fixture room PIN) | **0** |

### 14.3 Protocol spot-checks (newly used payloads)

Automated re-run against the live Java sources:

- **55 / 55** `Payloads.java` records match the `payloads.ts` interfaces — same name, same field
  names, same order, **0 mismatches**, **0 missing interfaces**.
- **71 / 71** `MessageType` values; **31** client→server, **45** server→client, **5** dual
  (`FRIEND_REQUEST_LIST`, `FRIEND_REQUEST_RESPOND`, `FRIEND_LIST`, `QUIZ_ROOM_START`,
  `QUIZ_ROOM_CANCEL`); **0** unmapped.
- Individually re-read against Java for the payloads this phase newly uses:
  `QUIZ_SET_EDIT`/`QuizSetEdit` (nullable `id`), `QuizSetSummary`, `QuizSetListData.items`,
  `QuizSetSaved.quizSetId`, `QuizSetPublishRequest{quizSetId,published}`,
  `LeaderboardData.players[]{rank,userId,username,wins,losses,draws,totalScore}`,
  `MatchHistoryData.matches[]{matchId,opponentUsername,myScore,opponentScore,result,durationSeconds,endReason,playedAt}`,
  `UserSearch*`, `FriendTarget/Reply/Item/ListData`, `FriendRequest*`, `PresenceData`,
  `GameInviteSend/Received/Respond/Status`, `ProctorStatusReport` (with `detail` nullable in TS,
  plain `String` in Java — accepts `null`), `ProctorStatusUpdate`, `ProctorEventReport`,
  `ProctorEventData`, `ProctorMediaSession`, the four proctor enums and `MediaRole`.
  **No field-name mismatch, no missing field, no invented field.**

### 14.4 Java baseline

`git status --short src/main/java src/main/resources pom.xml sql` → exactly the **21** pre-existing
modified UI files (9 under `client/…` + `ui/Icons.java`, 12 FXML/CSS resources) and **nothing**
under `sql/`, `common/protocol`, `server/`, or `pom.xml`. No new or untracked file inside
`src/`, `sql/` or the Maven config.

## 15. Commands and numbers observed (final pass)

```bash
bash desktop/scripts/verify-linux.sh qa2-node  npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh qa2-web   npx tsc --noEmit -p tsconfig.web.json
bash desktop/scripts/verify-linux.sh qa2-test  npx vitest run
bash desktop/scripts/verify-linux.sh qa2-build npm run build
# then, inside the qa2-build sandbox:
grep -c -- 'minhanh_02|demo.local|screen=|DesignPreview|demo=1|246810' out/renderer/assets/*.js
```

| Command | Result |
|---|---|
| `tsc --noEmit -p tsconfig.node.json` | **0 errors**, exit 0 |
| `tsc --noEmit -p tsconfig.web.json` | **0 errors**, exit 0 |
| `vitest run` | **48 files / 558 tests passed**, 9.38 s, exit 0 |
| `npm run build` | success — `out/main/index.js` 82.52 kB, `out/preload/index.js` 6.12 kB, renderer 0.45 kB html + 69.43 kB CSS + 1,208.53 kB JS (2223 modules) |
| fixture grep | 0 hits for all six strings (see §14.2) |

Test files now include the proctoring suite (`proctor-protocol` 12, `proctor-store`, `focus-events`
9, `frame-pump` 7, `proctor-panels` 7, `proctor-session-host` 4, `camera-preview` 4,
`proctor-dashboard`), the route suites (`quiz-battle` 7, `quiz-route` 6, `quiz-lobby`,
`matchmaking` 6, `data-screens` 6, `home-route` 4, `login-route` 7) and the new lib suites
(`history` 8, `format` 6, `invite` 7, `matchmaking` 9, `sets`/`friends`/`quiz` stores and reducers).

## 16. What I could NOT verify in this pass

- **No display / no real Electron.** Every verdict here is from source, unit tests and a static
  build. Not executed: the menu actually being absent in a packaged app, the CSP as enforced by
  Chromium, `net.fetch('file://…')` inside asar, `titleBarOverlay` at 125 %/150 % DPI,
  `process.contextIsolated` inside a sandboxed preload, and F-07/F-01 in a real window.
- **No webcam.** The whole proctoring path is verified structurally only: `getUserMedia` grant,
  the `media` permission prompt, the canvas→JPEG pump, real frame relay over TCP 5001, ACK
  handling, and the 10 s media handshake timeout were never exercised with hardware. The
  "camera failure is non-blocking" claim is verified in code (start/answer paths have no camera
  term), not by actually denying the permission on a live client.
- **No Windows machine.** NSIS packaging, `electron-builder` output, path separators and the
  traffic-light/overlay differences are unverified.
- **No Java server, no database, no second client.** No live TCP session, no real
  `PROCTOR_MEDIA_SESSION`, no real lobby traffic; protocol checks are static vs the Java sources.
- **No screen reader / keyboard walkthrough** on a real window; accessibility is structural.
- **Not run:** `npm install`, `electron-builder`, lint (none configured), anything writing to the
  exFAT repo.

## 17. Ready for a Windows demo?

**Yes — with the caveats below.** The desktop client is functionally complete for the demo path
(login → home → ranked match → result → quiz room create/join/lobby/battle → leaderboard/profile/
sets/friends/history), typechecks clean, has 558 passing tests, builds without warnings, ships no
fixture data, keeps the Java server untouchable and authoritative, and the one dead-end found in
the first pass (F-01) is fixed and covered by two regression tests.

Residual risks, in the order I would pre-check them on the demo machine:

1. **No real Electron run has ever happened on this machine** — the single largest unknown. Do one
   `npm run dev` and one packaged build on Windows before the demo (image loading, fonts
   `Nunito`/`Noto Sans JP`, window chrome, `nq-app://` under asar).
2. **Webcam/proctoring is untested with hardware.** If the demo includes proctoring, rehearse it:
   grant/deny the camera, unplug the camera, and confirm the quiz still starts and answers still
   go through (the code says it does).
3. **F-07** — on `/login`, after pressing "Kết nối" the screen shows a scary but false "old
   session" warning. Either fix it (local `staleSession` flag) or simply never press the manual
   connect button during the demo (login auto-connects).
4. Two clients on one LAN: media port = control port + 1 (5001) must be reachable through the
   Windows firewall for the host to see camera tiles.
5. **F-08/F-10** are cosmetic/edge; the published-set flash and the "publish a 1-question set"
   path are unlikely to appear in a scripted demo.

Nothing in the current tree blocks the demo, and nothing I found justifies changing the Java
server or the protocol.
