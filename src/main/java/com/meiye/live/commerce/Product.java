package com.meiye.live.commerce;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "room_products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private long roomId;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    @Column(precision = 12, scale = 2) private BigDecimal originalPrice;
    @Column(length = 1000) private String description;
    public Long getId() { return id; }
    public long getRoomId() { return roomId; }
    public void setRoomId(long roomId) { this.roomId = roomId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
