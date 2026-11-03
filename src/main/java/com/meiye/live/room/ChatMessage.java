package com.meiye.live.room;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = @Index(name = "chat_room_index", columnList = "roomId,id"))
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private long roomId;
    @Column(nullable = false, length = 24) private String author;
    @Column(nullable = false, length = 300) private String content;
    @Column(nullable = false) private Instant createdAt;
    protected ChatMessage() { }
    public ChatMessage(long roomId, String author, String content) { this.roomId = roomId; this.author = author; this.content = content; this.createdAt = Instant.now(); }
    public Long getId() { return id; }
    public String getAuthor() { return author; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
