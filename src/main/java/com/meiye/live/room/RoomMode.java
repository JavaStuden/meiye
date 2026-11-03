package com.meiye.live.room;

public enum RoomMode {
    LIVE("实时直播"), REPLAY("录播回放"), PSEUDO("定时伪直播");
    private final String label;
    RoomMode(String label) { this.label = label; }
    public String label() { return label; }
}
