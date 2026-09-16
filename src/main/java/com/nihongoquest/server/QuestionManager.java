package com.nihongoquest.server;

/**
 * QuestionManager quản lý ngân hàng câu hỏi phía Server.
 * Sau này đọc questions.json, lưu danh sách câu hỏi và cung cấp câu hỏi cho GameRoom.
 * Task hiện tại chưa cần parser JSON phức tạp.
 */
public class QuestionManager {

    /**
     * Tải câu hỏi từ file resources/questions/questions.json.
     * TODO: Đọc file và parse JSON thành danh sách câu hỏi.
     */
    public void loadQuestions() {
        System.out.println("TODO: Đọc questions.json");
    }

    /**
     * Lấy câu hỏi tiếp theo cho một GameRoom.
     * TODO: Trả về câu hỏi từ ngân hàng đã load.
     *
     * @return null ở giai đoạn skeleton
     */
    public Object getNextQuestion() {
        // TODO: trả về model câu hỏi phù hợp khi đã thống nhất format với Client
        return null;
    }

    /**
     * Số lượng câu hỏi đang có trong ngân hàng.
     * TODO: Trả về kích thước danh sách sau khi load.
     */
    public int getQuestionCount() {
        return 0;
    }
}
