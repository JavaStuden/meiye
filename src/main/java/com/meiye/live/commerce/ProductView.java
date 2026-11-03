package com.meiye.live.commerce;

import java.math.BigDecimal;

public record ProductView(Long id, String name, BigDecimal price, BigDecimal originalPrice, String description) {
    public static ProductView of(Product product) { return new ProductView(product.getId(), product.getName(), product.getPrice(), product.getOriginalPrice(), product.getDescription()); }
}
