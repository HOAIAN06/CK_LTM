package com.nihongoquest.client.layout;

/** Cho phép màn hình hiện tại xác nhận và dọn trạng thái trước khi sidebar điều hướng đi. */
public interface NavigationGuard {
    boolean requestNavigationAway();
}
