# Database

`sql/supabase_schema.sql` là schema chuẩn. Client không kết nối database; server dùng JDBC qua `Database` và repository.

Khi sửa schema:

1. cập nhật SQL;
2. cập nhật repository/service;
3. cập nhật seed/verify;
4. cập nhật test và tài liệu;
5. không ghi secret vào Git.

Trạng thái phòng realtime và trạng thái camera hiện là runtime state; cần xác nhận lại trước khi thay đổi persistence.
