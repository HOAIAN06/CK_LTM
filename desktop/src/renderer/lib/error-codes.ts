/**
 * Ánh xạ mã lỗi → câu tiếng Việt cho người dùng.
 *
 * Hai nguồn mã:
 * - Protocol (`docs/protocol.md` §10): `INVALID_CREDENTIALS`, `USERNAME_TAKEN`, …
 * - Tầng transport/IPC (`docs/desktop/contracts.md` §7.4): `CONNECT_TIMEOUT`, `NOT_CONNECTED`, …
 *
 * Nguyên tắc: mỗi câu phải nói được **chuyện gì xảy ra** và **làm gì tiếp**; mã lạ
 * không bao giờ làm UI trống — nó rơi vào câu mặc định kèm mã đã được làm sạch.
 */

/** Trường của form cần được focus khi lỗi đến từ server. */
export type FormField = 'username' | 'password' | 'confirm' | 'host' | 'port'

export interface ErrorCopy {
  /** Câu ngắn, in đậm. */
  title: string
  /** Bước tiếp theo; có thể bỏ trống. */
  description?: string
  /** Trường nên focus (nếu lỗi gắn với một input). */
  field?: FormField
}

/**
 * Mã do UI sinh ra (không có trên wire) để báo lỗi mà protocol không có mã riêng.
 * `REQUEST_TIMEOUT`: server không trả lời trong 15 giây → UI không được treo.
 */
export const UI_ERROR = {
  requestTimeout: 'REQUEST_TIMEOUT'
} as const

/** Mã chỉ hợp lệ khi là chữ hoa/số/gạch dưới và không quá dài. */
export function sanitizeErrorCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9_]{1,64}$/.test(normalized)) return null
  return normalized
}

const COPY: Record<string, ErrorCopy> = {
  // --- Auth (protocol §10) ---------------------------------------------------
  INVALID_CREDENTIALS: {
    title: 'Sai username hoặc mật khẩu',
    description: 'Kiểm tra lại chữ hoa/thường và dấu gạch dưới trong username.',
    field: 'password'
  },
  USERNAME_TAKEN: {
    title: 'Username đã được sử dụng',
    description: 'Chọn username khác, hoặc chuyển sang tab Đăng nhập nếu đó là tài khoản của bạn.',
    field: 'username'
  },
  ALREADY_ONLINE: {
    title: 'Tài khoản đang đăng nhập ở nơi khác',
    description: 'Mỗi tài khoản chỉ có một kết nối. Đăng xuất ở thiết bị kia rồi thử lại.',
    field: 'username'
  },
  ALREADY_AUTHENTICATED: {
    title: 'Máy chủ vẫn đang giữ phiên đăng nhập cũ',
    description:
      'Kết nối TCP hiện tại đã có phiên trên máy chủ. Nhấn "Ngắt kết nối" rồi đăng nhập lại để tạo phiên mới.',
  },
  BAD_REQUEST: {
    title: 'Thông tin đăng nhập không hợp lệ',
    description: 'Username 3–20 ký tự (chữ, số, dấu gạch dưới); mật khẩu tối thiểu 4 ký tự.',
    field: 'username'
  },
  DATABASE_ERROR: {
    title: 'Máy chủ không truy cập được database',
    description: 'Đây là lỗi phía máy chủ. Thử lại sau, hoặc báo giảng viên phụ trách.'
  },
  NOT_AUTHENTICATED: {
    title: 'Bạn chưa đăng nhập',
    description: 'Đăng nhập lại rồi thực hiện lại thao tác vừa rồi.'
  },

  // --- Ranked / matchmaking (docs/protocol.md §10) --------------------------
  ALREADY_WAITING: {
    title: 'Bạn đang ở trong hàng chờ',
    description: 'Máy chủ đã giữ một yêu cầu tìm trận của bạn. Hãy hủy trước khi gửi lại.'
  },
  ALREADY_MATCHED: {
    title: 'Bạn đang ở trong một trận khác',
    description: 'Hoàn thành hoặc rời trận hiện tại rồi mới tìm trận mới.'
  },
  INVALID_DURATION: {
    title: 'Thời lượng không hợp lệ',
    description: 'Đấu hạng chỉ có 3 phút hoặc 5 phút; các chế độ khác có giới hạn riêng.'
  },
  QUESTIONS_UNAVAILABLE: {
    title: 'Chưa thể tạo trận',
    description: 'Máy chủ không có đủ bộ câu hỏi đã xuất bản (cần ít nhất 3 câu hợp lệ). Thử lại sau.'
  },
  SAME_USER: {
    title: 'Không thể ghép hai tài khoản giống nhau',
    description: 'Hai người trong một trận phải là hai tài khoản khác nhau.'
  },
  OPPONENT_DISCONNECTED: {
    title: 'Đối thủ đã ngắt kết nối',
    description: 'Trận đấu kết thúc theo luật Ranked: mất kết nối là xử thua.'
  },

  // --- Quiz Set (docs/protocol.md §6) --------------------------------------
  NOT_FOUND: {
    title: 'Không tìm thấy dữ liệu',
    description: 'Bản ghi có thể đã bị xoá hoặc không còn tồn tại trên máy chủ.'
  },
  NOT_OWNER: {
    title: 'Bạn không phải chủ sở hữu',
    description: 'Chỉ người tạo bộ đề mới sửa, xuất bản hoặc xoá được.'
  },
  INVALID_QUIZ: {
    title: 'Bộ đề chưa hợp lệ',
    description:
      'Mỗi câu cần 4 lựa chọn và đúng một đáp án; xuất bản cần ít nhất 3 câu hợp lệ và tiêu đề 1–100 ký tự.'
  },
  QUIZ_NOT_PUBLISHED: {
    title: 'Bộ đề chưa được xuất bản',
    description: 'Chỉ bộ đề đã xuất bản mới dùng được để tạo phòng Quiz.'
  },

  // --- Social / lời mời (docs/protocol.md §4) ------------------------------
  INVALID_QUERY: {
    title: 'Từ khoá tìm kiếm không hợp lệ',
    description: 'Nhập 1–20 ký tự username.'
  },
  INVALID_USER: {
    title: 'Người chơi không hợp lệ',
    description: 'Tài khoản này không thể dùng cho thao tác vừa rồi.'
  },
  REQUEST_EXISTS: {
    title: 'Đã có lời mời kết bạn',
    description: 'Hai tài khoản đã là bạn bè hoặc đang chờ phản hồi một lời mời.'
  },
  REQUEST_NOT_FOUND: {
    title: 'Lời mời kết bạn không còn tồn tại',
    description: 'Người kia có thể đã huỷ lời mời. Danh sách sẽ được tải lại.'
  },
  FRIEND_NOT_FOUND: {
    title: 'Không còn trong danh sách bạn bè',
    description: 'Người này có thể đã xoá bạn trước đó.'
  },
  NOT_FRIENDS: {
    title: 'Hai tài khoản không còn là bạn bè',
    description: 'Kết bạn lại trước khi mời chơi.'
  },
  TARGET_OFFLINE: {
    title: 'Người bạn này đang ngoại tuyến',
    description: 'Chờ họ đăng nhập rồi gửi lời mời lại.'
  },
  TARGET_BUSY: {
    title: 'Người bạn này đang bận',
    description: 'Họ đang trong một trận hoặc phòng khác — hoặc đã có lời mời đang chờ.'
  },
  SENDER_BUSY: {
    title: 'Bạn đang bận',
    description: 'Hoàn thành trận hoặc rời phòng hiện tại trước khi mời người khác.'
  },
  INVALID_INVITE_TYPE: {
    title: 'Loại lời mời không hợp lệ',
    description: 'Bản desktop chỉ hỗ trợ lời mời Ranked và Quiz.'
  },
  INVITE_EXPIRED: {
    title: 'Lời mời đã hết hạn',
    description: 'Lời mời chỉ có hiệu lực 60 giây.'
  },
  SENDER_OFFLINE: {
    title: 'Người mời đã mất kết nối',
    description: 'Không thể vào trận vì bên mời không còn online.'
  },
  NOT_QUIZ_HOST: {
    title: 'Bạn không phải host của phòng',
    description: 'Chỉ host của lobby đang chờ mới mời được vào phòng Quiz.'
  },

  // --- Quiz Room (docs/protocol.md §7) -------------------------------------
  BUSY: {
    title: 'Bạn đang ở trong một phòng khác',
    description: 'Hoàn thành hoặc rời phòng hiện tại trước khi thực hiện thao tác này.'
  },
  INVALID_PIN: {
    title: 'Mã PIN không hợp lệ',
    description: 'PIN phải gồm đúng 6 chữ số.'
  },
  ROOM_NOT_FOUND: {
    title: 'Không tìm thấy phòng',
    description: 'PIN có thể sai hoặc phòng đã bị đóng.'
  },
  ROOM_STARTED: {
    title: 'Phòng đã bắt đầu',
    description: 'Phòng đang thi không nhận người vào mới.'
  },
  ROOM_FULL: {
    title: 'Phòng đã đủ người',
    description: 'Phòng giám sát tối đa 6 người chơi, phòng thường tối đa 20.'
  },
  NOT_ENOUGH_PLAYERS: {
    title: 'Chưa đủ người chơi để bắt đầu',
    description: 'Cần ít nhất 2 người chơi đang kết nối.'
  },
  NOT_HOST: {
    title: 'Chỉ host mới làm được',
    description: 'Thao tác này dành cho người tạo phòng.'
  },
  NOT_IN_ROOM: {
    title: 'Bạn không còn ở trong phòng',
    description: 'Phòng có thể đã kết thúc hoặc bạn đã rời trước đó.'
  },
  PROCTORING_HOST_CANNOT_PLAY: {
    title: 'Host không chơi được khi bật giám sát',
    description: 'Bỏ "Host cũng chơi" hoặc tắt giám sát camera rồi tạo lại phòng.'
  },
  PROCTORING_NOT_ENABLED: {
    title: 'Phòng này không bật giám sát',
    description: 'Không có báo cáo camera nào được nhận.'
  },
  NOT_PROCTORED_PLAYER: {
    title: 'Bạn không thuộc diện bị giám sát',
    description: 'Chỉ người chơi không phải host trong phòng bật giám sát mới báo cáo được.'
  },
  ROOM_NOT_RUNNING: {
    title: 'Phòng chưa chạy',
    description: 'Thao tác này chỉ hợp lệ khi phòng đang thi.'
  },
  BAD_PROCTOR_STATUS: {
    title: 'Trạng thái camera không hợp lệ',
    description: 'Bản ghi trạng thái thiếu trường hoặc dùng trạng thái không gửi được.'
  },
  BAD_PROCTOR_EVENT: {
    title: 'Sự kiện giám sát không hợp lệ',
    description: 'Sự kiện thiếu trường bắt buộc hoặc quá thời lượng cho phép.'
  },
  PIN_UNAVAILABLE: {
    title: 'Không cấp được PIN',
    description: 'Máy chủ đang hết PIN trống. Thử tạo lại phòng.'
  },

  // --- Transport / IPC (contracts §7.4) -------------------------------------
  INVALID_HOST: {
    title: 'Địa chỉ máy chủ không hợp lệ',
    description: 'Dùng tên máy hoặc IP trong mạng LAN, không có khoảng trắng hay ký tự / \\ @ ? #.',
    field: 'host'
  },
  INVALID_PORT: {
    title: 'Cổng phải từ 1 đến 65535',
    description: 'Cổng mặc định của NihongoQuest là 5000.',
    field: 'port'
  },
  NOT_CONNECTED: {
    title: 'Chưa kết nối tới máy chủ',
    description: 'Mở "Cấu hình server", bấm Kết nối rồi đăng nhập lại.'
  },
  CONNECT_IN_PROGRESS: {
    title: 'Đang kết nối, vui lòng chờ',
    description: 'Một lần kết nối khác đang chạy.'
  },
  CONNECT_FAILED: {
    title: 'Không kết nối được tới máy chủ',
    description: 'Kiểm tra địa chỉ, cổng và chắc chắn server NihongoQuest đang chạy.'
  },
  CONNECT_TIMEOUT: {
    title: 'Máy chủ không phản hồi',
    description: 'Không kết nối được trong 5 giây. Kiểm tra mạng LAN rồi thử lại.'
  },
  SEND_FAILED: {
    title: 'Không gửi được dữ liệu',
    description: 'Kết nối tới máy chủ đã mất. Kết nối lại rồi thử tiếp.'
  },
  INVALID_FRAME: {
    title: 'Dữ liệu gửi đi không hợp lệ',
    description: 'Lỗi nội bộ của ứng dụng. Thử lại; nếu vẫn lỗi, hãy báo lại nhóm phát triển.'
  },
  INVALID_FRAME_DATA: {
    title: 'Dữ liệu gửi đi không hợp lệ',
    description: 'Lỗi nội bộ của ứng dụng. Thử lại; nếu vẫn lỗi, hãy báo lại nhóm phát triển.'
  },
  UNTRUSTED_SENDER: {
    title: 'Yêu cầu bị từ chối vì lý do bảo mật',
    description: 'Chỉ cửa sổ chính của NihongoQuest được gửi dữ liệu tới máy chủ.'
  },
  CONNECTION_LOST: {
    title: 'Mất kết nối tới máy chủ',
    description: 'Phiên đăng nhập đã kết thúc. Kết nối lại và đăng nhập để tiếp tục.'
  },
  BRIDGE_UNAVAILABLE: {
    title: 'Không có cầu nối tới tiến trình desktop',
    description: 'Hãy mở ứng dụng bằng NihongoQuest Desktop thay vì trình duyệt.'
  },
  [UI_ERROR.requestTimeout]: {
    title: 'Máy chủ chưa trả lời',
    description:
      'Yêu cầu đã gửi nhưng không có phản hồi trong thời gian chờ. Kiểm tra kết nối rồi thử lại.'
  }
}

const FALLBACK: ErrorCopy = {
  title: 'Đã xảy ra lỗi không xác định',
  description: 'Thử lại thao tác vừa rồi. Nếu lỗi lặp lại, gửi mã lỗi cho nhóm phát triển.'
}

/**
 * Dịch một mã lỗi (có thể `null`, viết thường, hoặc rác) thành copy hiển thị được.
 * Không bao giờ trả `null`.
 */
export function describeErrorCode(code: string | null | undefined): ErrorCopy {
  const normalized = sanitizeErrorCode(code)
  if (normalized === null) return FALLBACK
  const copy = COPY[normalized]
  if (copy) return copy
  return { ...FALLBACK, description: `Thử lại thao tác vừa rồi. Mã lỗi: ${normalized}.` }
}

/** Mã đã làm sạch để hiển thị nhỏ bên cạnh thông điệp (hoặc `null`). */
export function errorCodeLabel(code: string | null | undefined): string | null {
  return sanitizeErrorCode(code)
}
