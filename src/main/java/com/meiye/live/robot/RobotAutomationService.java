package com.meiye.live.robot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meiye.live.room.ChatMessage;
import com.meiye.live.room.MessageRepository;
import com.meiye.live.room.RoomRepository;
import com.meiye.live.room.RoomStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RobotAutomationService {
    private static final String STATE_ID = "global";
    private final RobotAutomationStateRepository states;
    private final MessageRepository messages;
    private final RoomRepository rooms;
    private final ObjectMapper json;
    private final Clock clock;

    @Autowired
    public RobotAutomationService(RobotAutomationStateRepository states, MessageRepository messages,
            RoomRepository rooms, ObjectMapper json) {
        this(states, messages, rooms, json, Clock.systemUTC());
    }

    RobotAutomationService(RobotAutomationStateRepository states, MessageRepository messages,
            RoomRepository rooms, ObjectMapper json, Clock clock) {
        this.states = states; this.messages = messages; this.rooms = rooms; this.json = json; this.clock = clock;
    }

    @Transactional
    public State state() { return load(); }

    @Transactional
    public State saveTemplate(Template input) {
        State state = load();
        validateTemplate(input);
        Template value = copy(input);
        if (value.id == null || value.id <= 0) value.id = nextId(state.templates.stream().map(item -> item.id).toList(), 100);
        int index = indexOfTemplate(state.templates, value.id);
        if (index < 0) state.templates.add(value); else state.templates.set(index, value);
        save(state);
        return state;
    }

    @Transactional
    public State deleteTemplate(long id) {
        State state = load();
        if (state.tasks.stream().anyMatch(task -> task.templateId == id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "仍有机器人任务使用该模板，请先删除或改派任务");
        }
        state.templates.removeIf(item -> item.id == id);
        if (state.templates.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "至少保留一个机器人模板");
        save(state);
        return state;
    }

    @Transactional
    public State saveScript(Script input) {
        State state = load();
        if (input.name == null || input.name.isBlank() || input.name.length() > 60 || input.lines == null || input.lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "话术名称和至少一条话术不能为空");
        }
        Script value = new Script(); value.name = input.name.trim(); value.lines = input.lines.stream()
            .filter(line -> line != null && !line.isBlank()).map(String::trim).limit(500).toList();
        if (value.lines.isEmpty() || value.lines.stream().anyMatch(line -> line.length() > 300)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "话术不能为空且每条不能超过300字");
        }
        value.id = input.id == null || input.id <= 0 ? nextId(state.scripts.stream().map(item -> item.id).toList(), 200) : input.id;
        int index = indexOfScript(state.scripts, value.id);
        if (index < 0) state.scripts.add(value); else state.scripts.set(index, value);
        save(state);
        return state;
    }

    @Transactional
    public State saveNames(NameRequest input) {
        State state = load();
        List<String> names = input == null || input.names() == null ? List.of() : input.names().stream()
            .filter(name -> name != null && !name.isBlank()).map(String::trim).distinct().toList();
        if (names.isEmpty() || names.size() > 500 || names.stream().anyMatch(name -> name.length() > 40 || name.chars().anyMatch(Character::isISOControl))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "昵称库需包含1到500个有效昵称，每个昵称不超过40字");
        }
        state.robotNames = new ArrayList<>(names);
        save(state);
        return state;
    }

    @Transactional(readOnly = true)
    public List<String> publicNames(List<String> authors) {
        if (authors.stream().noneMatch(author -> author != null && author.startsWith("机器人·"))) return authors;
        State state = states.findById(STATE_ID).map(row -> read(row.getPayload())).orElseGet(this::defaults);
        return authors.stream().map(author -> publicName(state, author)).toList();
    }

    private String publicName(State state, String author) {
        if (author == null || !author.startsWith("机器人·")) return author;
        String id = author.substring("机器人·".length());
        try {
            String name = state.robotDisplayNames == null ? null : state.robotDisplayNames.get(Integer.valueOf(id));
            if (name != null) return name;
        } catch (NumberFormatException ignored) { }
        List<String> names = state.robotNames == null || state.robotNames.isEmpty() ? defaultNames() : state.robotNames;
        return names.get(Math.floorMod(author.hashCode(), names.size()));
    }

    @Transactional
    public State deleteScript(long id) {
        State state = load();
        Script script = state.scripts.stream().filter(item -> item.id == id).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "话术模板不存在"));
        if (state.templates.stream().anyMatch(template -> template.scriptTemplate.equals(script.name))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "仍有机器人模板使用该话术，请先更换模板话术");
        }
        state.scripts.remove(script); save(state); return state;
    }

    @Transactional
    public State createTask(TaskRequest input) {
        State state = load();
        Template template = state.templates.stream().filter(item -> item.id == input.templateId).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "机器人模板不存在"));
        if (!rooms.existsById(input.roomId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "直播间不存在");
        Task task = new Task();
        task.id = nextId(state.tasks.stream().map(item -> item.id).toList(), 1000);
        task.roomId = input.roomId; task.templateId = template.id; task.name = template.name;
        task.robotCount = template.robotCount; task.intervalMin = template.intervalMin; task.intervalMax = template.intervalMax;
        task.loop = template.loop; task.active = true; task.scope = "当前直播间";
        task.intervalDesc = task.intervalMin + "~" + task.intervalMax + " 秒随机间隔";
        task.execType = input.startsAt != null && input.startsAt.isAfter(clock.instant()) ? "scheduled" : "immediate";
        task.startsAt = input.startsAt == null ? clock.instant() : input.startsAt;
        task.nextAt = task.startsAt; task.createdAt = clock.instant(); task.commentIndex = 0; task.sentCount = 0;
        assignRobotNames(state, task);
        state.tasks.add(0, task); save(state); return state;
    }

    @Transactional
    public State setTaskActive(long id, boolean active) {
        State state = load();
        Task task = state.tasks.stream().filter(item -> item.id == id).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "机器人任务不存在"));
        task.active = active;
        if (active && (task.nextAt == null || task.nextAt.isBefore(clock.instant()))) task.nextAt = clock.instant();
        save(state); return state;
    }

    @Transactional
    public State deleteTask(long id) {
        State state = load(); state.tasks.removeIf(item -> item.id == id); save(state); return state;
    }

    @Transactional
    public int tick() {
        State state = load();
        Instant now = clock.instant();
        int sent = 0;
        for (Task task : state.tasks) {
            if (!task.active || task.startsAt == null || task.startsAt.isAfter(now)
                    || task.nextAt != null && task.nextAt.isAfter(now)) continue;
            var room = rooms.findById(task.roomId).orElse(null);
            if (room == null || room.getStatus() != RoomStatus.LIVE || !room.isCommentsEnabled()) continue;
            Template template = state.templates.stream().filter(item -> item.id == task.templateId).findFirst().orElse(null);
            Script script = template == null ? null : state.scripts.stream().filter(item -> item.name.equals(template.scriptTemplate)).findFirst().orElse(null);
            if (script == null || script.lines == null || script.lines.isEmpty()) { task.active = false; continue; }
            if (task.robotIds == null || task.robotIds.size() != task.robotCount) assignRobotNames(state, task);
            int index = task.commentIndex == null ? 0 : task.commentIndex;
            if (index >= script.lines.size()) {
                if (!task.loop) { task.active = false; continue; }
                index = 0;
            }
            int robotIndex = ThreadLocalRandom.current().nextInt(Math.max(1, task.robotCount));
            String author = "机器人·" + task.robotIds.get(robotIndex);
            messages.save(new ChatMessage(task.roomId, author, script.lines.get(index)));
            task.commentIndex = index + 1; task.sentCount++;
            int low = Math.max(1, task.intervalMin); int high = Math.max(low, task.intervalMax);
            task.nextAt = now.plusSeconds(ThreadLocalRandom.current().nextInt(low, high + 1));
            sent++;
        }
        if (sent > 0 || state.tasks.stream().anyMatch(task -> !task.active)) save(state);
        return sent;
    }

    private State load() {
        return states.findForUpdate(STATE_ID).map(row -> read(row.getPayload())).orElseGet(this::initialize);
    }

    private State initialize() {
        State state = defaults(); save(state); return state;
    }

    private State defaults() {
        State state = new State();
        state.robotNames = defaultNames();
        state.scripts.add(script(201, "技术互动", "老师，这个手法适合零基础学习吗？", "敏感肌操作时需要注意什么？", "老师，门店拓客方案能再讲细一点吗？", "这节课的步骤很清楚，记下来了。"));
        state.scripts.add(script(202, "互动话术", "向老师晚上好，准时来听课。", "刚进直播间，今天讲到哪一步了？", "这个方法回店里可以练习吗？"));
        state.scripts.add(script(203, "课程提醒", "欢迎新进直播间的朋友。", "课程资料可以在评论区咨询。", "感谢大家观看本场课程。"));
        state.templates.add(template(101, "技术互动", 30, "技术互动", 20, 45, true));
        state.templates.add(template(102, "课堂气氛", 20, "互动话术", 30, 60, true));
        state.templates.add(template(103, "课程提醒", 10, "课程提醒", 60, 120, true));
        return state;
    }

    private List<String> defaultNames() {
        return new ArrayList<>(List.of("俏佳人美肤中心", "悦颜美容院", "靓姐护肤馆", "焕颜美肤中心", "美颜坊护肤",
            "俏颜美容院", "润颜美肤馆", "丽都护肤中心", "佳颜美肤中心", "靓颜美容院", "美润护肤馆",
            "俏润美肤中心", "丽颜坊美容院", "焕丽美肤中心", "佳美护肤馆", "靓润美容院", "润丽美肤中心",
            "美俏护肤馆", "颜悦美容院", "丽润美肤中心", "佳颜坊护肤", "俏丽美肤馆", "焕美美容院",
            "润俏美肤中心", "颜丽护肤馆", "靓佳美容院", "美颜坊美肤中心", "俏悦护肤馆", "焕润美容院", "丽佳美肤中心"));
    }

    private void assignRobotNames(State state, Task task) {
        if (state.robotDisplayNames == null) state.robotDisplayNames = new LinkedHashMap<>();
        if (state.nextRobotId < 1) state.nextRobotId = 1;
        List<String> names = state.robotNames == null || state.robotNames.isEmpty() ? defaultNames() : state.robotNames;
        List<String> shuffledNames = new ArrayList<>(names);
        Collections.shuffle(shuffledNames);
        task.robotIds = new ArrayList<>(Math.max(1, task.robotCount));
        for (int i = 0; i < Math.max(1, task.robotCount); i++) {
            int robotId = state.nextRobotId++;
            task.robotIds.add(robotId);
            state.robotDisplayNames.put(robotId, shuffledNames.get(i % shuffledNames.size()));
        }
    }

    private Script script(long id, String name, String... lines) { Script value = new Script(); value.id = id; value.name = name; value.lines = List.of(lines); return value; }
    private Template template(long id, String name, int count, String script, int min, int max, boolean loop) {
        Template value = new Template(); value.id = id; value.name = name; value.robotCount = count;
        value.scriptTemplate = script; value.intervalMin = min; value.intervalMax = max; value.loop = loop; value.active = true; return value;
    }
    private void save(State state) {
        try { states.save(new RobotAutomationState(STATE_ID, json.writeValueAsString(state))); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("机器人配置保存失败", exception); }
    }
    private State read(String payload) {
        try {
            State state = json.readValue(payload, State.class);
            if (state.robotNames == null || state.robotNames.isEmpty()) state.robotNames = defaultNames();
            if (state.robotDisplayNames == null) state.robotDisplayNames = new LinkedHashMap<>();
            if (state.nextRobotId < 1) state.nextRobotId = 1;
            if (!state.robotDisplayNames.isEmpty()) state.nextRobotId = Math.max(state.nextRobotId, state.robotDisplayNames.keySet().stream().mapToInt(Integer::intValue).max().orElse(0) + 1);
            return state;
        }
        catch (JsonProcessingException exception) { throw new IllegalStateException("机器人配置读取失败", exception); }
    }
    private void validateTemplate(Template value) {
        if (value.name == null || value.name.isBlank() || value.name.length() > 60
                || value.scriptTemplate == null || value.scriptTemplate.isBlank()
                || value.robotCount < 1 || value.robotCount > 10000 || value.intervalMin < 1
                || value.intervalMax < value.intervalMin || value.intervalMax > 3600) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "机器人模板参数无效");
        }
        if (load().scripts.stream().noneMatch(script -> script.name.equals(value.scriptTemplate))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请先选择有效的话术模板");
        }
    }
    private Template copy(Template input) { Template value = new Template(); value.id=input.id;value.name=input.name.trim();value.robotCount=input.robotCount;value.scriptTemplate=input.scriptTemplate;value.intervalMin=input.intervalMin;value.intervalMax=input.intervalMax;value.loop=input.loop;value.active=input.active;return value; }
    private long nextId(List<Long> ids, long start) { return ids.stream().filter(id -> id != null).mapToLong(Long::longValue).max().orElse(start) + 1; }
    private int indexOfTemplate(List<Template> values, long id) { for (int i=0;i<values.size();i++) if(values.get(i).id==id)return i; return -1; }
    private int indexOfScript(List<Script> values, long id) { for (int i=0;i<values.size();i++) if(values.get(i).id==id)return i; return -1; }

    public static class State {
        public List<Template> templates = new ArrayList<>();
        public List<Script> scripts = new ArrayList<>();
        public List<Task> tasks = new ArrayList<>();
        public List<String> robotNames = new ArrayList<>();
        public Map<Integer, String> robotDisplayNames = new LinkedHashMap<>();
        public int nextRobotId = 1;
    }
    public static class Template {
        public Long id; public String name; public int robotCount = 30; public String scriptTemplate;
        public int intervalMin = 20; public int intervalMax = 45; public boolean loop = true; public boolean active = true;
    }
    public static class Script { public Long id; public String name; public List<String> lines = new ArrayList<>(); }
    public static class Task {
        public Long id; public long roomId; public Long templateId; public String name; public int robotCount;
        public int intervalMin; public int intervalMax; public boolean loop; public boolean active;
        public String scope; public String execType; public String intervalDesc; public Integer commentIndex; public long sentCount;
        public List<Integer> robotIds = new ArrayList<>();
        public Instant startsAt; public Instant nextAt; public Instant createdAt;
    }
    public record TaskRequest(long roomId, long templateId, Instant startsAt) { }
    public record ActiveRequest(boolean active) { }
    public record NameRequest(List<String> names) { }
}
