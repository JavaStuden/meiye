package com.meiye.live.room;

public enum RoomStatus {
    DRAFT("草稿"), SCHEDULED("待开播"), LIVE("直播中"), ENDED("已结束");
    private final String label;
    RoomStatus(String label) { this.label = label; }
    public String label() { return label; }
}
