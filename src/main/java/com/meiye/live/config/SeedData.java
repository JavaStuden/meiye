package com.meiye.live.config;

import com.meiye.live.room.*;
import com.meiye.live.commerce.*;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SeedData implements CommandLineRunner {
    private final RoomRepository rooms;
    private final ProductRepository products;
    private final MeiyeProperties properties;
    public SeedData(RoomRepository rooms, ProductRepository products, MeiyeProperties properties) { this.rooms = rooms; this.products = products; this.properties = properties; }
    @Override @Transactional public void run(String... args) {
        if (rooms.count() != 0) return;
        Room live = room("美业经营课堂 · 门店盈利方案", RoomMode.LIVE, RoomStatus.LIVE, 5400, properties.liveUrl());
        Room pseudo = room("美业门店经营 · 客户复购课程", RoomMode.PSEUDO, RoomStatus.SCHEDULED, 2538, properties.pseudoUrl());
        pseudo.setScheduledAt(Instant.now().plusSeconds(3600));
        Room replay = room("肩颈护理实操 · 精品回放", RoomMode.REPLAY, RoomStatus.ENDED, 1685, properties.replayUrl());
        rooms.save(live); rooms.save(pseudo); rooms.save(replay);
        product(live.getId(), "舒缓修护精华液 30ml", "159.00", "239.00", "护肤产品 · 直播专享，演示商品");
        product(live.getId(), "水润保湿面膜 5片装", "69.00", "99.00", "日常水润护理 · 演示商品");
        product(live.getId(), "肩颈舒缓护理体验 60分钟", "99.00", "198.00", "到店服务体验 · 未接入预约与核销");
        product(pseudo.getId(), "美业门店经营课 · 3节精品课程", "199.00", "399.00", "美业课程 · 未接入付费内容授权");
        product(replay.getId(), "肩颈舒缓护理体验 60分钟", "99.00", "198.00", "到店服务体验 · 演示商品");
    }
    private Room room(String title, RoomMode mode, RoomStatus status, int duration, String url) {
        Room room = new Room(); room.setTitle(title); room.setHost("美业经营课堂"); room.setMode(mode); room.setStatus(status);
        room.setDurationSeconds(duration); room.setStreamUrl(RoomService.validateMediaUrl(url));
        room.setPosterUrl("/assets/studio-poster.svg");
        room.setDescription("专注美业门店经营与护理实操。商品和订单仅供流程演示，不会发起真实支付。");
        room.setAnnouncement("欢迎来到美业课堂，请文明交流、理性消费。媒体源尚未配置时显示占位画面，不代表正在推流。");
        room.setCommentsEnabled(true); return room;
    }
    private void product(long roomId, String name, String price, String original, String description) {
        Product product = new Product(); product.setRoomId(roomId); product.setName(name); product.setPrice(new BigDecimal(price));
        product.setOriginalPrice(new BigDecimal(original)); product.setDescription(description); products.save(product);
    }
}
