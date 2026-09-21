package com.nihongoquest.server.dashboard;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.DatagramSocket;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.Comparator;

/** Tìm địa chỉ IPv4 phù hợp để các client khác trong mạng LAN kết nối tới server. */
final class ServerAddressResolver {

    private ServerAddressResolver() {
    }

    static String resolveIpv4() {
        String routedAddress = defaultRouteAddress();
        if (routedAddress != null) {
            return routedAddress;
        }
        try {
            return NetworkInterface.networkInterfaces()
                    .filter(ServerAddressResolver::isUsable)
                    .flatMap(NetworkInterface::inetAddresses)
                    .filter(Inet4Address.class::isInstance)
                    .map(Inet4Address.class::cast)
                    .filter(address -> !address.isLoopbackAddress())
                    .sorted(Comparator.comparing(address -> !address.isSiteLocalAddress()))
                    .map(InetAddress::getHostAddress)
                    .findFirst()
                    .orElseGet(ServerAddressResolver::localHostAddress);
        } catch (SocketException e) {
            return localHostAddress();
        }
    }

    private static String defaultRouteAddress() {
        try (DatagramSocket socket = new DatagramSocket()) {
            // connect() chỉ chọn route/interface cục bộ, không gửi dữ liệu ra Internet.
            socket.connect(InetAddress.getByName("8.8.8.8"), 53);
            InetAddress address = socket.getLocalAddress();
            if (address instanceof Inet4Address
                    && !address.isAnyLocalAddress()
                    && !address.isLoopbackAddress()) {
                return address.getHostAddress();
            }
        } catch (Exception ignored) {
            // Mạng cô lập không có default route sẽ dùng danh sách interface bên dưới.
        }
        return null;
    }

    private static boolean isUsable(NetworkInterface networkInterface) {
        try {
            return networkInterface.isUp()
                    && !networkInterface.isLoopback()
                    && !networkInterface.isVirtual();
        } catch (SocketException e) {
            return false;
        }
    }

    private static String localHostAddress() {
        try {
            InetAddress address = InetAddress.getLocalHost();
            if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                return address.getHostAddress();
            }
        } catch (UnknownHostException ignored) {
            // Dashboard vẫn hoạt động nếu máy không có địa chỉ mạng khả dụng.
        }
        return "Không xác định";
    }
}
