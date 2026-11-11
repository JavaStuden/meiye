package com.meiye.live.room;

import com.meiye.live.commerce.ProductRepository;
import com.meiye.live.media.CosStorageService;
import com.meiye.live.media.MediaAsset;
import com.meiye.live.media.MediaAssetRepository;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.Clock;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class RoomService {
    private final RoomRepository rooms;
    private final ProductRepository products;
    private final MediaAssetRepository mediaAssets;
    private final CosStorageService cos;
    private final Clock clock;
    public RoomService(RoomRepository rooms, ProductRepository products, MediaAssetRepository mediaAssets, CosStorageService cos) {
        this(rooms, products, mediaAssets, cos, Clock.systemUTC());
    }
    @org.springframework.beans.factory.annotation.Autowired
    public RoomService(RoomRepository rooms, ProductRepository products, MediaAssetRepository mediaAssets, CosStorageService cos, Clock clock) {
        this.rooms = rooms; this.products = products; this.mediaAssets = mediaAssets; this.cos = cos; this.clock = clock;
    }
    public Room require(long id) { return rooms.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "场次不存在")); }
    public RoomView view(long id) { Room room = require(id); return RoomView.of(room, products.countByRoomId(id), posterSource(room)); }
    public List<RoomView> list() { return rooms.findAll().stream().map(r -> RoomView.of(r, products.countByRoomId(r.getId()), posterSource(r))).toList(); }
    @Transactional public Room save(RoomForm form) {
        Room room = form.getId() == null ? new Room() : require(form.getId());
        RoomStatus previousStatus = room.getStatus();
        room.setTitle(form.getTitle().trim()); room.setHost(form.getHost().trim());
        room.setMode(form.getMode()); room.setStatus(form.getStatus());
        room.setDescription(trim(form.getDescription())); room.setAnnouncement(trim(form.getAnnouncement()));
        if (form.getMediaAssetId() != null) {
            MediaAsset video = mediaAssets.findById(form.getMediaAssetId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选视频素材不存在"));
            if (!video.getContentType().startsWith("video/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选素材不是视频");
            cos.requireReady();
            room.setMediaAssetId(form.getMediaAssetId());
            room.setStreamUrl("");
        } else {
            room.setMediaAssetId(null);
            room.setStreamUrl(validateMediaUrl(form.getStreamUrl()));
        }
        if (form.getPosterAssetId() != null) {
            MediaAsset poster = mediaAssets.findById(form.getPosterAssetId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选封面不存在"));
            if (!poster.getContentType().startsWith("image/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选素材不是图片");
            cos.requireReady();
            room.setPosterAssetId(form.getPosterAssetId());
        } else {
            room.setPosterAssetId(null);
            room.setPosterUrl(validatePosterUrl(form.getPosterUrl()));
        }
        room.setScheduledAt(form.getScheduledAt() == null || form.getScheduledAt().isBlank() ? null :
            LocalDateTime.parse(form.getScheduledAt()).atZone(ZoneId.of("Asia/Shanghai")).toInstant());
        room.setDurationSeconds(form.getDurationSeconds()); room.setCommentsEnabled(form.isCommentsEnabled());
        updateLiveTimes(room, previousStatus, form.getStatus());
        validateSchedule(room);
        return rooms.save(room);
    }
    public String playbackSource(Room room) {
        if (room.getMediaAssetId() == null) return room.getStreamUrl();
        MediaAsset asset = mediaAssets.findById(room.getMediaAssetId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "场次关联的视频素材已不存在"));
        return cos.signedUrl(asset.getObjectKey());
    }
    public String posterSource(Room room) {
        if (room.getPosterAssetId() == null) return room.getPosterUrl();
        posterAsset(room);
        var attributes = RequestContextHolder.getRequestAttributes();
        String contextPath = attributes instanceof ServletRequestAttributes servletAttributes
            ? servletAttributes.getRequest().getContextPath() : "";
        return contextPath + "/api/rooms/" + room.getId() + "/poster";
    }
    public MediaAsset posterAsset(Room room) {
        if (room.getPosterAssetId() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "场次尚未配置封面图片");
        return mediaAssets.findById(room.getPosterAssetId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "场次关联的封面素材已不存在"));
    }
    @Transactional public void setPosterAsset(long roomId, long assetId) {
        Room room = require(roomId);
        MediaAsset asset = mediaAssets.findById(assetId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "封面素材不存在"));
        if (!asset.getContentType().startsWith("image/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选素材不是图片");
        cos.requireReady();
        room.setPosterAssetId(assetId);
    }
    @Transactional public void status(long id, RoomStatus status) {
        Room room = require(id);
        RoomStatus previousStatus = room.getStatus();
        updateLiveTimes(room, previousStatus, status);
        room.setStatus(status);
        validateSchedule(room);
    }
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
    private void updateLiveTimes(Room room, RoomStatus previousStatus, RoomStatus nextStatus) {
        if (nextStatus == RoomStatus.LIVE && previousStatus != RoomStatus.LIVE) {
            room.setLiveStartedAt(clock.instant());
            room.setLiveEndedAt(null);
        } else if (nextStatus == RoomStatus.ENDED && previousStatus != RoomStatus.ENDED) {
            room.setLiveEndedAt(room.getLiveStartedAt() == null ? null : clock.instant());
        } else if (nextStatus == RoomStatus.SCHEDULED || nextStatus == RoomStatus.DRAFT) {
            room.setLiveStartedAt(null);
            room.setLiveEndedAt(null);
        }
    }
    private static String trim(String s) { return s == null ? "" : s.trim(); }
}
