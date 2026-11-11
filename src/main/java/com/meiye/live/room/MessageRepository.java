package com.meiye.live.room;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop80ByRoomIdOrderByIdDesc(long roomId);
    long deleteByRoomId(long roomId);
}
