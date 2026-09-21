package com.nihongoquest.server.dashboard;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerAddressResolverTest {

    @Test
    void returnsIpv4AddressOrExplicitUnavailableMessage() {
        String address = ServerAddressResolver.resolveIpv4();

        assertTrue(address.equals("Không xác định")
                        || address.matches("(?:\\d{1,3}\\.){3}\\d{1,3}"),
                () -> "Địa chỉ server không hợp lệ: " + address);
    }
}
