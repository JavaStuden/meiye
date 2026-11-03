package com.meiye.live.room;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.*;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InteractionService {
    private final RoomService rooms;
    private final MessageRepository messages;
    private final Clock clock;
    public InteractionService(RoomService rooms, MessageRepository messages, Clock clock) { this.rooms = rooms; this.messages = messages; this.clock = clock; }
    @Transactional(readOnly = true) public List<MessageView> list(long roomId) {
        rooms.require(roomId);
        List<MessageView> result = new ArrayList<>(messages.findTop80ByRoomIdOrderByIdDesc(roomId).stream().map(MessageView::of).toList());
        Collections.reverse(result); return result;
    }
    @Transactional public MessageView post(long roomId, MessageRequest request) {
        if (!rooms.require(roomId).isCommentsEnabled()) throw new ResponseStatusException(HttpStatus.CONFLICT, "本场评论已关闭");
        return MessageView.of(messages.save(new ChatMessage(roomId, request.author().trim(), request.content().trim())));
    }
    public Map<String, Object> checkIn(long roomId, HttpSession session) {
        rooms.require(roomId);
        synchronized (session) {
            String today = LocalDate.now(ZoneId.of("Asia/Shanghai")).toString();
            if (today.equals(session.getAttribute("checkInDay"))) return Map.of("points", 10, "message", "本会话今日已签到，已获10演示积分");
            session.setAttribute("checkInDay", today);
            return Map.of("points", 10, "message", "签到成功，获得10演示积分（仅当前会话，不可提现）");
        }
    }
    public void throttle(HttpSession session, String action, long intervalMs) {
        synchronized (session) {
            long now = clock.millis();
            Object last = session.getAttribute("rate:" + action);
            if (last instanceof Long previous && now - previous < intervalMs) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "操作过于频繁，请稍后再试");
            session.setAttribute("rate:" + action, now);
        }
    }
    public record MessageRequest(@NotBlank(message = "请填写昵称") @Size(max = 24) String author,
        @NotBlank(message = "评论不能为空") @Size(max = 300) String content) { }
    public record MessageView(Long id, String author, String content, java.time.Instant createdAt) {
        static MessageView of(ChatMessage message) { return new MessageView(message.getId(), message.getAuthor(), message.getContent(), message.getCreatedAt()); }
    }
}
