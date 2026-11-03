package com.meiye.live.commerce;

import com.meiye.live.room.RoomService;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CommerceService {
    private final RoomService rooms;
    private final ProductRepository products;
    private final OrderRepository orders;
    public CommerceService(RoomService rooms, ProductRepository products, OrderRepository orders) {
        this.rooms = rooms; this.products = products; this.orders = orders;
    }
    public List<ProductView> products(long roomId) { rooms.require(roomId); return products.findByRoomIdOrderByIdAsc(roomId).stream().map(ProductView::of).toList(); }
    @Transactional public OrderView create(long roomId, OrderRequest request) {
        rooms.require(roomId);
        Product product = products.findById(request.productId()).filter(p -> p.getRoomId() == roomId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "该商品未关联此场次"));
        if (request.expectedUnitPrice() != null && request.expectedUnitPrice().compareTo(product.getPrice()) != 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "商品价格已更新，请重新选择商品并确认金额");
        DemoOrder order = new DemoOrder();
        order.setCode("MY" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
        order.setRoomId(roomId); order.setProductId(product.getId()); order.setProductName(product.getName());
        order.setBuyer(request.buyer().trim()); order.setPhone(request.phone()); order.setQuantity(request.quantity());
        order.setTotal(product.getPrice().multiply(BigDecimal.valueOf(request.quantity()))); order.setCreatedAt(Instant.now());
        return OrderView.of(orders.save(order));
    }
    public OrderView lookup(String code, String phone) {
        return OrderView.of(orders.findByCodeAndPhone(code, phone).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "订单号或手机号不匹配")));
    }
    public List<OrderView> orders() { return orders.findTop200ByOrderByCreatedAtDesc().stream().map(OrderView::of).toList(); }
    public record OrderRequest(@NotNull @Positive Long productId, @NotBlank @Size(max = 60) String buyer,
        @NotBlank @Pattern(regexp = "1[3-9][0-9]{9}", message = "请输入有效的11位手机号") String phone,
        @Min(1) @Max(20) int quantity,
        @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal expectedUnitPrice) { }
}
