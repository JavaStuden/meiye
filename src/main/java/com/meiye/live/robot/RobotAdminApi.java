package com.meiye.live.robot;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/admin/robots", "/meiye/api/admin/robots"})
public class RobotAdminApi {
    private final RobotAutomationService robots;
    public RobotAdminApi(RobotAutomationService robots) { this.robots = robots; }

    @GetMapping public RobotAutomationService.State state() { return robots.state(); }
    @PutMapping("/names") public RobotAutomationService.State names(@RequestBody RobotAutomationService.NameRequest value) { return robots.saveNames(value); }
    @PutMapping("/templates") public RobotAutomationService.State template(@RequestBody RobotAutomationService.Template value) { return robots.saveTemplate(value); }
    @DeleteMapping("/templates/{id}") public RobotAutomationService.State deleteTemplate(@PathVariable long id) { return robots.deleteTemplate(id); }
    @PutMapping("/scripts") public RobotAutomationService.State script(@RequestBody RobotAutomationService.Script value) { return robots.saveScript(value); }
    @DeleteMapping("/scripts/{id}") public RobotAutomationService.State deleteScript(@PathVariable long id) { return robots.deleteScript(id); }
    @PostMapping("/tasks") @ResponseStatus(HttpStatus.CREATED)
    public RobotAutomationService.State createTask(@Valid @RequestBody RobotAutomationService.TaskRequest value) { return robots.createTask(value); }
    @PatchMapping("/tasks/{id}") public RobotAutomationService.State setActive(@PathVariable long id, @RequestBody RobotAutomationService.ActiveRequest value) { return robots.setTaskActive(id, value.active()); }
    @DeleteMapping("/tasks/{id}") public RobotAutomationService.State deleteTask(@PathVariable long id) { return robots.deleteTask(id); }
}
