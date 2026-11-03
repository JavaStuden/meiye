package com.meiye.live.room;

import com.meiye.live.commerce.ProductRepository;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class RoomService {
    private final RoomRepository rooms;
    private final ProductRepository products;
    public RoomService(RoomRepository rooms, ProductRepository products) { this.rooms = rooms; this.products = products; }
    public Room require(long id) { return rooms.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "场次不存在")); }
    public RoomView view(long id) { Room room = require(id); return RoomView.of(room, products.countByRoomId(id)); }
    public List<RoomView> list() { return rooms.findAll().stream().map(r -> RoomView.of(r, products.countByRoomId(r.getId()))).toList(); }
    @Transactional public Room save(RoomForm form) {
        Room room = form.getId() == null ? new Room() : require(form.getId());
        room.setTitle(form.getTitle().trim()); room.setHost(form.getHost().trim());
        room.setMode(form.getMode()); room.setStatus(form.getStatus());
        room.setDescription(trim(form.getDescription())); room.setAnnouncement(trim(form.getAnnouncement()));
        room.setStreamUrl(validateMediaUrl(form.getStreamUrl())); room.setPosterUrl(validatePosterUrl(form.getPosterUrl()));
        room.setScheduledAt(form.getScheduledAt() == null || form.getScheduledAt().isBlank() ? null :
            LocalDateTime.parse(form.getScheduledAt()).atZone(ZoneId.of("Asia/Shanghai")).toInstant());
        room.setDurationSeconds(form.getDurationSeconds()); room.setCommentsEnabled(form.isCommentsEnabled());
        validateSchedule(room);
        return rooms.save(room);
    }
    @Transactional public void status(long id, RoomStatus status) { Room room = require(id); room.setStatus(status); validateSchedule(room); }
    @Transactional public long like(long id) { require(id); rooms.incrementLikes(id); return require(id).getLikes(); }
    public static String validateMediaUrl(String value) {
        String url = trim(value);
        if (url.isEmpty()) return url;
        if (url.startsWith("/media/") && !url.contains("..") && !url.contains("\\") && !url.contains("\r") && !url.contains("\n")) return url;
        try {
            URI uri = URI.create(url);
            if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
            return url;
        } catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "媒体地址须为 http(s) 地址或 /media/ 下的本地文件路径"); }
    }
    private static String validatePosterUrl(String value) {
        String url = trim(value);
        if (url.matches("/assets/[a-zA-Z0-9/_.-]+") && !url.contains("..")) return url;
        return validateMediaUrl(url);
    }
    private void validateSchedule(Room room) {
        if (room.getMode() == RoomMode.PSEUDO && room.getStatus() != RoomStatus.DRAFT && room.getStatus() != RoomStatus.ENDED && room.getScheduledAt() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "伪直播需要设置开播时间（北京时间）");
    }
    private static String trim(String s) { return s == null ? "" : s.trim(); }
}
