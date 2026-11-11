package com.meiye.live.robot;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "robot_automation_state")
public class RobotAutomationState {
    @Id private String id;
    @Lob @Column(nullable = false) private String payload;
    protected RobotAutomationState() { }
    public RobotAutomationState(String id, String payload) { this.id = id; this.payload = payload; }
    public String getId() { return id; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
}
