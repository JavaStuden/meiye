package com.meiye.live.commerce;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderView(String code, long roomId, String productName, String buyer, String phone, int quantity,
    BigDecimal total, String status, Instant createdAt) {
    public static OrderView of(DemoOrder order) {
        String phone = order.getPhone();
        String masked = phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
        return new OrderView(order.getCode(), order.getRoomId(), order.getProductName(), order.getBuyer(), masked,
            order.getQuantity(), order.getTotal(), order.getStatus(), order.getCreatedAt());
    }
}
