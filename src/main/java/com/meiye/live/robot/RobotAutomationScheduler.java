package com.meiye.live.robot;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RobotAutomationScheduler {
    private final RobotAutomationService robots;
    public RobotAutomationScheduler(RobotAutomationService robots) { this.robots = robots; }
    @Scheduled(fixedDelay = 1000)
    public void dispatchDueComments() { robots.tick(); }
}
