package com.meiye.live.room;

import com.meiye.live.commerce.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import com.meiye.live.media.CosStorageService;
import java.time.Duration;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

@RestController
public class RoomApi {
    private final RoomService rooms;
    private final PlaybackService playback;
    private final InteractionService interactions;
    private final CommerceService commerce;
    private final CosStorageService cos;
    public RoomApi(RoomService rooms, PlaybackService playback, InteractionService interactions, CommerceService commerce, CosStorageService cos) {
        this.rooms = rooms; this.playback = playback; this.interactions = interactions; this.commerce = commerce; this.cos = cos;
    }
    @GetMapping("/api/admin/csrf") public CsrfToken csrf(CsrfToken token) { return token; }
    @GetMapping("/api/rooms") public List<RoomView> rooms() { return rooms.list(); }
    @GetMapping("/api/rooms/{id}") public RoomView room(@PathVariable long id) { return rooms.view(id); }
    @GetMapping("/api/rooms/{id}/poster")
    public ResponseEntity<InputStreamResource> poster(@PathVariable long id) {
        var asset = rooms.posterAsset(rooms.require(id));
        var object = cos.getObject(asset.getObjectKey());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(asset.getContentType()))
            .contentLength(asset.getSizeBytes())
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
            .body(new InputStreamResource(object.getObjectContent()));
    }
    @PostMapping("/api/admin/rooms/{id}/poster") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void poster(@PathVariable long id, @RequestBody PosterRequest request) {
        rooms.setPosterAsset(id, request.mediaAssetId());
    }
    @PostMapping("/api/admin/rooms/{id}/status")
    public RoomView updateAdminStatus(@PathVariable long id, @RequestBody StatusRequest request) {
        rooms.status(id, request.status());
        return rooms.view(id);
    }
    @GetMapping("/api/rooms/{id}/playback") public PlaybackService.PlaybackState playback(@PathVariable long id) {
        Room room = rooms.require(id);
        return playback.state(room, rooms.playbackSource(room));
    }
    @GetMapping("/api/rooms/{id}/messages") public List<InteractionService.MessageView> messages(@PathVariable long id) { return interactions.list(id); }
    @GetMapping({"/api/admin/rooms/{id}/messages", "/meiye/api/admin/rooms/{id}/messages"})
    public List<InteractionService.MessageView> adminMessages(@PathVariable long id) { return interactions.listForAdmin(id); }
    @DeleteMapping({"/api/admin/rooms/{id}/messages", "/meiye/api/admin/rooms/{id}/messages"})
    public Map<String, Long> clearMessages(@PathVariable long id) { return Map.of("deleted", interactions.clear(id)); }
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
    @GetMapping("/api/orders/{code}") public OrderView lookup(@PathVariable String code, @RequestParam String phone) { return commerce.lookup(code, phone); }
    public record PosterRequest(long mediaAssetId) { }
    public record StatusRequest(RoomStatus status) { }
}
