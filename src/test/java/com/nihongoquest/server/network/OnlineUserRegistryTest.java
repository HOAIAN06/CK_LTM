package com.nihongoquest.server.network;

import org.junit.jupiter.api.Test;

import java.net.Socket;

import static org.junit.jupiter.api.Assertions.*;

class OnlineUserRegistryTest {
    @Test
    void allowsOnlyOneConnectionPerAccountAndRemovesExactSession() {
        OnlineUserRegistry registry = new OnlineUserRegistry();
        StubClient first = new StubClient(7);
        StubClient second = new StubClient(7);

        assertTrue(registry.login(7, first));
        assertFalse(registry.login(7, second));
        assertSame(first, registry.find(7));
        registry.logout(second);
        assertSame(first, registry.find(7));
        registry.logout(first);
        assertNull(registry.find(7));
    }

    private static final class StubClient extends ClientHandler {
        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return true; }
    }
}
