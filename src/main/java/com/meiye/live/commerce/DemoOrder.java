package com.meiye.live.commerce;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "demo_orders")
public class DemoOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    private long roomId;
    private long productId;
    @Column(nullable = false, length = 120) private String productName;
    @Column(nullable = false, length = 60) private String buyer;
    @Column(nullable = false, length = 20) private String phone;
    private int quantity;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal total;
    @Column(nullable = false, length = 30) private String status = "DEMO_PENDING";
    @Column(nullable = false) private Instant createdAt;
    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public long getRoomId() { return roomId; }
    public void setRoomId(long roomId) { this.roomId = roomId; }
    public long getProductId() { return productId; }
    public void setProductId(long productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getBuyer() { return buyer; }
    public void setBuyer(String buyer) { this.buyer = buyer; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
