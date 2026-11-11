package com.meiye.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meiye.live.commerce.OrderRepository;
import com.meiye.live.commerce.Product;
import com.meiye.live.commerce.ProductRepository;
import com.meiye.live.room.Room;
import com.meiye.live.room.RoomMode;
import com.meiye.live.room.RoomRepository;
import com.meiye.live.room.RoomStatus;
import com.meiye.live.robot.RobotAutomationService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

/** Exercises real service transactions against an isolated H2 database, without a test transaction. */
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:backendAcceptance;DB_CLOSE_DELAY=-1",
    "meiye.admin-username=admin", "meiye.admin-password=test-only",
    "meiye.live-url=", "meiye.replay-url=", "meiye.pseudo-url=",
    "server.address=127.0.0.1"
})
@AutoConfigureMockMvc
@Import(InteractionClockTestConfiguration.class)
class BackendAcceptanceTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProductRepository products;
    @Autowired OrderRepository orders;
    @Autowired RoomRepository rooms;
    @Autowired RobotAutomationService robots;

    @ParameterizedTest
    @ValueSource(strings = {"/admin", "/admin/rooms/new", "/admin/rooms/1/edit", "/admin/products", "/admin/orders"})
    void signedInViewerCannotReadAdminPages(String path) throws Exception {
        mvc.perform(get(path).with(user("viewer").roles("VIEWER")))
            .andExpect(status().isForbidden());
    }

    @Test
    void cosMediaApiRequiresLoginAndReportsMissingServerCredentials() throws Exception {
        mvc.perform(get("/api/admin/media")).andExpect(status().is3xxRedirection());
        mvc.perform(get("/api/admin/media").with(user("admin").roles("ADMIN")))
            .andExpect(status().isServiceUnavailable());
    }

    @Test
    void adminCsrfEndpointProvidesTokenForTheStaticOperationsConsole() throws Exception {
        mvc.perform(get("/api/admin/csrf").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.headerName").isNotEmpty());
    }

    @Test
    void adminRobotTasksPersistAndWriteCommentsIntoTheRoomMessageTable() throws Exception {
        mvc.perform(get("/api/admin/robots").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tasks").isArray());
        mvc.perform(get("/api/admin/robots")).andExpect(status().is3xxRedirection());
        mvc.perform(put("/api/admin/robots/names").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("names", java.util.List.of("广州美业学员", "悦颜护理店")))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.robotNames[0]").value("广州美业学员"));
        var body = Map.of("roomId", 1, "templateId", 101, "startsAt", "2026-10-18T00:00:00Z");
        mvc.perform(post("/api/admin/robots/tasks").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.tasks[0].roomId").value(1));
        robots.tick();
        JsonNode messages = json.readTree(mvc.perform(get("/api/rooms/1/messages")).andReturn().getResponse().getContentAsString());
        assertThat(messages.get(messages.size() - 1).get("author").asText()).isIn("广州美业学员", "悦颜护理店");
        assertThat(mvc.perform(get("/api/admin/rooms/1/messages")).andReturn().getResponse().getStatus()).isEqualTo(302);
        JsonNode adminMessages = json.readTree(mvc.perform(get("/api/admin/rooms/1/messages").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(adminMessages.get(adminMessages.size() - 1).get("author").asText()).startsWith("机器人·");
        var taskId = robots.state().tasks.get(0).id;
        mvc.perform(patch("/api/admin/robots/tasks/{id}", taskId).with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tasks[0].active").value(false));
        mvc.perform(delete("/api/admin/robots/tasks/{id}", taskId).with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tasks").isEmpty());
    }

    @Test
    void miniProgramCanPostCommentsWithoutWebCsrfAndIsRateLimited() throws Exception {
        var body = Map.of("author", "小程序观众", "content", "小程序评论联调");
        var request = post("/api/miniprogram/rooms/1/messages")
            .header("X-Viewer-Token", "viewer_test_token_0001")
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        mvc.perform(request).andExpect(status().isCreated()).andExpect(jsonPath("$.content").value("小程序评论联调"));
        mvc.perform(post("/api/miniprogram/rooms/1/messages")
                .header("X-Viewer-Token", "viewer_test_token_0001")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
            .andExpect(status().isTooManyRequests());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/admin/share/rooms/1", "/meiye/api/admin/share/rooms/1"})
    void shareCodesRequireAdminAndMissingWechatSecretIsExplicit(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().is3xxRedirection());
        mvc.perform(get(path).with(user("viewer").roles("VIEWER"))).andExpect(status().isForbidden());
        mvc.perform(get(path).with(user("admin").roles("ADMIN"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.path").value("pages/watch-share/watch-share?id=1"));
        mvc.perform(get(path + "/miniprogram-code").with(user("admin").roles("ADMIN")))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.message").value(containsString("WECHAT_APP_SECRET")));
        mvc.perform(get(path + "/h5-code").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(content().contentType("image/png"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/admin/rooms", "/admin/rooms/1/status", "/admin/products"})
    void signedInViewerCannotChangeAdminDataEvenWithCsrf(String path) throws Exception {
        long productCount = products.count();
        long roomCount = rooms.count();
        RoomStatus statusBefore = rooms.findById(1L).orElseThrow().getStatus();
        mvc.perform(post(path).with(user("viewer").roles("VIEWER")).with(csrf())
                .param("title", "未经授权修改").param("status", "ENDED"))
            .andExpect(status().isForbidden());
        assertThat(products.count()).isEqualTo(productCount);
        assertThat(rooms.count()).isEqualTo(roomCount);
        assertThat(rooms.findById(1L).orElseThrow().getStatus()).isEqualTo(statusBefore);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/admin/rooms", "/admin/rooms/1/status", "/admin/products",
        "/api/rooms/1/messages", "/api/rooms/1/like", "/api/rooms/1/check-in",
        "/api/rooms/1/orders", "/login", "/logout"})
    void everyWriteRouteRequiresCsrfIncludingAuthenticatedAdmin(String path) throws Exception {
        mvc.perform(post(path).with(user("admin").roles("ADMIN")))
            .andExpect(status().isForbidden());
    }

    @Test
    void unsuccessfulLoginDoesNotGrantAdminAccessAndLogoutEndsAccess() throws Exception {
        MockHttpSession failed = new MockHttpSession();
        mvc.perform(post("/login").session(failed).with(csrf())
                .param("username", "admin").param("password", "wrong-test-password"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/login?error"));
        mvc.perform(get("/admin").session(failed)).andExpect(status().is3xxRedirection());

        MockHttpSession loggedIn = new MockHttpSession();
        mvc.perform(post("/login").session(loggedIn).with(csrf())
                .param("username", "admin").param("password", "test-only"))
            .andExpect(redirectedUrl("/admin"));
        mvc.perform(post("/logout").session(loggedIn).with(csrf()))
            .andExpect(redirectedUrl("/login?logout"));
        assertThat(loggedIn.isInvalid()).isTrue();
        mvc.perform(get("/admin")).andExpect(status().is3xxRedirection());
    }

    static Stream<Arguments> invalidProductFields() {
        return Stream.of(
            Arguments.of("name", "   "), Arguments.of("name", "名".repeat(121)),
            Arguments.of("price", "0"), Arguments.of("price", "1.001"),
            Arguments.of("price", "100000000.00"), Arguments.of("price", "not-money"),
            Arguments.of("originalPrice", "0"), Arguments.of("originalPrice", "0.01"),
            Arguments.of("roomId", "0"), Arguments.of("description", "字".repeat(1001)));
    }

    @ParameterizedTest
    @MethodSource("invalidProductFields")
    void invalidProductDoesNotCreatePartialData(String field, String value) throws Exception {
        long before = products.count();
        mvc.perform(productForm(field, value))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(products.count()).isEqualTo(before);
    }

    @Test
    void invalidProductEditKeepsPreviouslySavedValues() throws Exception {
        Product product = testProduct();
        mvc.perform(productForm("id", product.getId().toString(), "name", "不能保存的新名称", "originalPrice", "1.00"))
            .andExpect(status().isBadRequest());
        Product saved = products.findById(product.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("订单快照测试商品");
        assertThat(saved.getPrice()).isEqualByComparingTo("59.90");
        mvc.perform(productForm("id", product.getId().toString(), "roomId", "99999"))
            .andExpect(status().isNotFound());
        assertThat(products.findById(product.getId()).orElseThrow().getRoomId()).isEqualTo(1);
    }

    @Test
    void historicalOrdersKeepNameRoomAndExactTotalAfterProductEditAndMove() throws Exception {
        Product product = testProduct();
        JsonNode original = submitOrder(1, product.getId(), 3);
        String code = original.path("code").asText();
        assertThat(original.path("total").decimalValue()).isEqualByComparingTo("179.70");

        mvc.perform(productForm("id", product.getId().toString(), "roomId", "3", "name", "修改后的商品",
                "price", "89.90", "originalPrice", ""))
            .andExpect(status().is3xxRedirection());

        mvc.perform(get("/api/orders/{code}", code).param("phone", "13800000000"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.productName").value("订单快照测试商品"))
            .andExpect(jsonPath("$.roomId").value(1)).andExpect(jsonPath("$.quantity").value(3))
            .andExpect(jsonPath("$.total").value(179.70)).andExpect(jsonPath("$.phone").value("138****0000"))
            .andExpect(content().string(not(containsString("13800000000"))));
        mvc.perform(get("/admin/orders").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(content().string(containsString(code)))
            .andExpect(content().string(not(containsString("13800000000"))));

        long count = orders.count();
        mvc.perform(orderRequest(1, product.getId(), "测试客户", "13800000000", 1))
            .andExpect(status().isBadRequest());
        assertThat(orders.count()).isEqualTo(count);
        JsonNode subsequent = submitOrder(3, product.getId(), 3);
        assertThat(subsequent.path("total").decimalValue()).isEqualByComparingTo("269.70");
        assertThat(subsequent.path("productName").asText()).isEqualTo("修改后的商品");
    }

    @Test
    void changedCheckoutPriceRequiresReviewBeforeAnyNewOrderIsSaved() throws Exception {
        Product product = testProduct();
        JsonNode oldOrder = submitOrder(1, product.getId(), 2);
        mvc.perform(productForm("id", product.getId().toString(), "name", product.getName(),
                "price", "89.90", "originalPrice", "99.90"))
            .andExpect(status().is3xxRedirection());

        long before = orders.count();
        Map<String, Object> checkout = new LinkedHashMap<>(Map.of("productId", product.getId(),
            "buyer", "测试客户", "phone", "13800000000", "quantity", 2,
            "expectedUnitPrice", new BigDecimal("59.90")));
        mvc.perform(post("/api/rooms/1/orders").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(checkout)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(orders.count()).isEqualTo(before);

        checkout.put("expectedUnitPrice", new BigDecimal("89.90"));
        mvc.perform(post("/api/rooms/1/orders").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(checkout)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.total").value(179.80));
        assertThat(orders.count()).isEqualTo(before + 1);
        mvc.perform(get("/api/orders/{code}", oldOrder.path("code").asText()).param("phone", "13800000000"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(119.80));
    }

    static Stream<Arguments> invalidOrders() {
        return Stream.of(Arguments.of(" ", "13800000000", 1), Arguments.of("客户", "12800000000", 1),
            Arguments.of("客户", "1380000000", 1), Arguments.of("客户", "13800000000", 21),
            Arguments.of("客户", "13800000000", -1));
    }

    @ParameterizedTest
    @MethodSource("invalidOrders")
    void invalidOrderInputHasReadableErrorAndDoesNotPersist(String buyer, String phone, int quantity) throws Exception {
        long before = orders.count();
        long productId = products.findByRoomIdOrderByIdAsc(1).get(0).getId();
        mvc.perform(orderRequest(1, productId, buyer, phone, quantity))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    void rapidRepeatedOrderSubmissionDoesNotCreateDuplicateRecord() throws Exception {
        long productId = products.findByRoomIdOrderByIdAsc(1).get(0).getId();
        MockHttpSession session = new MockHttpSession();
        long before = orders.count();
        mvc.perform(orderRequest(1, productId, "测试客户", "13800000000", 1).session(session))
            .andExpect(status().isCreated());
        mvc.perform(orderRequest(1, productId, "测试客户", "13800000000", 1).session(session))
            .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(orders.count()).isEqualTo(before + 1);
    }

    @Test
    void dailyCheckInIsIdempotentWithinOneSessionAcrossRooms() throws Exception {
        MockHttpSession first = new MockHttpSession();
        mvc.perform(post("/api/rooms/1/check-in").session(first).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.points").value(10))
            .andExpect(jsonPath("$.message").value(containsString("签到成功")));
        mvc.perform(post("/api/rooms/3/check-in").session(first).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.points").value(10))
            .andExpect(jsonPath("$.message").value(containsString("今日已签到")));
        assertThat(first.getAttribute("checkInDay"))
            .isEqualTo(LocalDate.now(ZoneId.of("Asia/Shanghai")).toString());
        mvc.perform(post("/api/rooms/1/check-in").session(new MockHttpSession()).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.message").value(containsString("签到成功")));
    }

    @Test
    void nonexistentRoomCannotCreateCheckInState() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/rooms/99999/check-in").session(session).with(csrf()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("场次不存在"));
        assertThat(session.getAttribute("checkInDay")).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-a-date", "2026-02-30T14:30", "2026-11-01T25:00"})
    void malformedScheduleReturnsClientErrorAndRollsBackAllRoomChanges(String scheduledAt) throws Exception {
        Room room = rooms.findById(2L).orElseThrow();
        mvc.perform(roomForm("id", "2", "title", "失败的修改不能留下", "scheduledAt", scheduledAt))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        Room saved = rooms.findById(2L).orElseThrow();
        assertThat(saved.getTitle()).isEqualTo(room.getTitle());
        assertThat(saved.getScheduledAt()).isEqualTo(room.getScheduledAt());
        assertThat(saved.getMode()).isEqualTo(room.getMode());
    }

    @Test
    void unscheduledPseudoLiveStatusChangeFailsWithoutChangingStoredStatus() throws Exception {
        Room room = new Room();
        room.setTitle("无排期的伪直播草稿"); room.setHost("测试讲师"); room.setMode(RoomMode.PSEUDO);
        room.setStatus(RoomStatus.DRAFT); room.setDurationSeconds(60);
        long id = rooms.saveAndFlush(room).getId();
        mvc.perform(post("/admin/rooms/{id}/status", id).with(user("admin").roles("ADMIN")).with(csrf())
                .param("status", "LIVE"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(containsString("开播时间")));
        assertThat(rooms.findById(id).orElseThrow().getStatus()).isEqualTo(RoomStatus.DRAFT);
    }

    private Product testProduct() {
        Product product = new Product(); product.setRoomId(1); product.setName("订单快照测试商品");
        product.setPrice(new BigDecimal("59.90")); product.setOriginalPrice(new BigDecimal("79.90"));
        return products.saveAndFlush(product);
    }

    private JsonNode submitOrder(long roomId, long productId, int quantity) throws Exception {
        return json.readTree(mvc.perform(orderRequest(roomId, productId, "测试客户", "13800000000", quantity))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder orderRequest(long roomId, long productId, String buyer, String phone, int quantity) throws Exception {
        return post("/api/rooms/{id}/orders", roomId).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("productId", productId, "buyer", buyer, "phone", phone, "quantity", quantity)));
    }

    private MockHttpServletRequestBuilder productForm(String... overrides) {
        Map<String, String> values = new LinkedHashMap<>(Map.of("roomId", "1", "name", "验证商品", "price", "59.90", "originalPrice", "79.90", "description", "测试配置"));
        for (int i = 0; i < overrides.length; i += 2) values.put(overrides[i], overrides[i + 1]);
        MockHttpServletRequestBuilder request = post("/admin/products").with(user("admin").roles("ADMIN")).with(csrf());
        values.forEach((name, value) -> request.param(name, value));
        return request;
    }

    private MockHttpServletRequestBuilder roomForm(String... overrides) {
        Map<String, String> values = new LinkedHashMap<>(Map.ofEntries(Map.entry("title", "验证场次"),
            Map.entry("host", "测试讲师"), Map.entry("mode", "PSEUDO"), Map.entry("status", "SCHEDULED"),
            Map.entry("durationSeconds", "600"), Map.entry("scheduledAt", "2026-11-01T14:30"),
            Map.entry("streamUrl", "/media/test.mp4"), Map.entry("posterUrl", "/assets/studio-poster.svg")));
        for (int i = 0; i < overrides.length; i += 2) values.put(overrides[i], overrides[i + 1]);
        MockHttpServletRequestBuilder request = post("/admin/rooms").with(user("admin").roles("ADMIN")).with(csrf());
        values.forEach((name, value) -> request.param(name, value));
        return request;
    }
}
