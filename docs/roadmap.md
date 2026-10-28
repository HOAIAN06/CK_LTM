# Lộ trình MVP

Các mốc được làm tuần tự trên nhánh riêng và phải chạy `mvnw.cmd clean test` trước
khi xin duyệt commit:

1. `refactor/mvp-foundation`: schema, protocol object, router/session và persistence gọn. ✓
2. `feature/quiz-set-management`: CRUD editor và publish bộ đề. ✓
3. `feature/timed-ranked`: chế độ 3/5 phút, tiến độ riêng và timer 30 giây/câu. ✓
4. `feature/quiz-room`: PIN, lobby, rapid quiz, live leaderboard và reconnect. ✓
5. `feature/leaderboard-history`: Top 10 và 100 trận gần nhất. ✓
6. `feature/friends-invites`: friend request, presence và lời mời Ranked/Quiz. ✓

Ngoài phạm vi: TLS/JWT, HTTP/WebSocket, Elo, lưu từng đáp án, phục hồi server crash
và tối ưu hàng nghìn kết nối.
