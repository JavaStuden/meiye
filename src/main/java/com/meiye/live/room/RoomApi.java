package com.meiye.live.room;

import com.meiye.live.commerce.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class RoomApi {
    private final RoomService rooms;
    private final PlaybackService playback;
    private final InteractionService interactions;
    private final CommerceService commerce;
    public RoomApi(RoomService rooms, PlaybackService playback, InteractionService interactions, CommerceService commerce) {
        this.rooms = rooms; this.playback = playback; this.interactions = interactions; this.commerce = commerce;
    }
    @GetMapping("/api/rooms") public List<RoomView> rooms() { return rooms.list(); }
    @GetMapping("/api/rooms/{id}") public RoomView room(@PathVariable long id) { return rooms.view(id); }
    @GetMapping("/api/rooms/{id}/playback") public PlaybackService.PlaybackState playback(@PathVariable long id) { return playback.state(rooms.require(id)); }
    @GetMapping("/api/rooms/{id}/messages") public List<InteractionService.MessageView> messages(@PathVariable long id) { return interactions.list(id); }
    @PostMapping("/api/rooms/{id}/messages") @ResponseStatus(HttpStatus.CREATED)
    public InteractionService.MessageView post(@PathVariable long id, @Valid @RequestBody InteractionService.MessageRequest request, HttpSession session) {
        interactions.throttle(session, "message", 1000); return interactions.post(id, request);
    }
    @PostMapping("/api/rooms/{id}/like") public Map<String, Long> like(@PathVariable long id, HttpSession session) {
        interactions.throttle(session, "like", 500); return Map.of("likes", rooms.like(id));
    }
    @PostMapping("/api/rooms/{id}/check-in") public Map<String, Object> checkIn(@PathVariable long id, HttpSession session) { return interactions.checkIn(id, session); }
    @GetMapping("/api/rooms/{id}/products") public List<ProductView> products(@PathVariable long id) { return commerce.products(id); }
    @PostMapping("/api/rooms/{id}/orders") @ResponseStatus(HttpStatus.CREATED)
    public OrderView order(@PathVariable long id, @Valid @RequestBody CommerceService.OrderRequest request, HttpSession session) {
        interactions.throttle(session, "order", 3000); return commerce.create(id, request);
    }
    @PostMapping("/api/rooms/{id}/status")
    public Map<String, Object> updateStatus(@PathVariable long id, @RequestBody(required = false) Map<String, String> body) {
        String statusStr = (body != null && body.containsKey("status")) ? body.get("status") : "ENDED";
        RoomStatus targetStatus;
        if ("直播中".equals(statusStr) || "LIVE".equalsIgnoreCase(statusStr)) {
            targetStatus = RoomStatus.LIVE;
        } else if ("待开播".equals(statusStr) || "SCHEDULED".equalsIgnoreCase(statusStr)) {
            targetStatus = RoomStatus.SCHEDULED;
        } else if ("草稿".equals(statusStr) || "DRAFT".equalsIgnoreCase(statusStr)) {
            targetStatus = RoomStatus.DRAFT;
        } else {
            targetStatus = RoomStatus.ENDED;
        }
        try {
            rooms.status(id, targetStatus);
        } catch (Exception ignored) {}
        return Map.of("id", id, "status", targetStatus.label(), "code", 200);
    }
    @GetMapping("/api/orders/{code}") public OrderView lookup(@PathVariable String code, @RequestParam String phone) { return commerce.lookup(code, phone); }
}
