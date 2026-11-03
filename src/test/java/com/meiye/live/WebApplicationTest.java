package com.meiye.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meiye.live.room.RoomRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:integration;DB_CLOSE_DELAY=-1",
    "meiye.admin-username=admin",
    "meiye.admin-password=test-only",
    "meiye.live-url=",
    "meiye.replay-url=",
    "meiye.pseudo-url=",
    "server.address=127.0.0.1"
})
@AutoConfigureMockMvc
@Import(InteractionClockTestConfiguration.class)
@Transactional
class WebApplicationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RoomRepository rooms;

    @ParameterizedTest
    @ValueSource(longs = {1, 3, 2})
    void originalMiniRoomLinksRenderTheirConfiguredMode(long roomId) throws Exception {
        mvc.perform(get("/meiye/").param("view", "mini").param("room", Long.toString(roomId)))
            .andExpect(status().isOk())
            .andExpect(view().name("viewer"))
            .andExpect(model().attributeExists("room", "products", "rooms"));
    }

    @Test
    void originalAdminLinkLeadsToProtectedAdminArea() throws Exception {
        mvc.perform(get("/meiye/"))
            .andExpect(status().isOk()).andExpect(view().name("viewer"));
        mvc.perform(get("/admin"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrlPattern("**/login"));
        mvc.perform(get("/login")).andExpect(status().isOk()).andExpect(view().name("login"));
    }

    @Test
    void configuredAdminCredentialsCanLogIn() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/login").session(session).with(csrf())
                .param("username", "admin").param("password", "test-only"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/admin"));
        mvc.perform(get("/admin").session(session)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/admin", "/admin/rooms/new", "/admin/rooms/1/edit", "/admin/orders"})
    void authenticatedAdminPagesRender(String path) throws Exception {
        mvc.perform(get(path).with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk());
    }

    @Test
    void roomCatalogExposesThreeDistinctModesAndNoMissingMediaAsReady() throws Exception {
        mvc.perform(get("/api/rooms"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$[*].mode", hasItem("LIVE")))
            .andExpect(jsonPath("$[*].mode", hasItem("PSEUDO")))
            .andExpect(jsonPath("$[*].mode", hasItem("REPLAY")));
        mvc.perform(get("/api/rooms/999")).andExpect(status().isNotFound());
        mvc.perform(get("/api/rooms/1/playback"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.phase").value("UNCONFIGURED"));
    }

    @Test
    void anonymousViewerCanSendAndRetrieveACommentWithCsrf() throws Exception {
        mvc.perform(post("/api/rooms/1/messages").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("author", "测试观众", "content", "评论持久化测试"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.author").value("测试观众"))
            .andExpect(jsonPath("$.content").value("评论持久化测试"));
        mvc.perform(get("/api/rooms/1/messages"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].content", hasItem("评论持久化测试")));
    }

    @Test
    void commentsCannotBeSentWhenAdminHasDisabledThem() throws Exception {
        rooms.findById(1L).orElseThrow().setCommentsEnabled(false);
        mvc.perform(post("/api/rooms/1/messages").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"author\":\"观众\",\"content\":\"关闭后不可留言\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void viewerWritesRejectRequestsWithoutCsrf() throws Exception {
        mvc.perform(post("/api/rooms/1/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"author\":\"观众\",\"content\":\"未经验证的请求\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/rooms/1/like")).andExpect(status().isForbidden());
    }

    @Test
    void likeCountPersistsAndRapidRepeatedLikesAreThrottled() throws Exception {
        long before = rooms.findById(1L).orElseThrow().getLikes();
        MockHttpSession session = new MockHttpSession();
        mvc.perform(post("/api/rooms/1/like").session(session).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.likes").value(before + 1));
        mvc.perform(post("/api/rooms/1/like").session(session).with(csrf()))
            .andExpect(status().isTooManyRequests());
        mvc.perform(get("/api/rooms/1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.likes").value(before + 1));
    }

    @Test
    void demoOrderCalculatesTotalAndRequiresMatchingPhoneForLookup() throws Exception {
        JsonNode product = firstProduct(1);
        JsonNode order = createOrder(1, product.path("id").asLong(), 2);
        String code = order.path("code").asText();

        assertThat(code).startsWith("MY");
        assertThat(order.path("status").asText()).isEqualTo("DEMO_PENDING");
        assertThat(order.path("total").decimalValue()).isEqualByComparingTo(new BigDecimal("318.00"));
        assertThat(order.path("phone").asText()).isEqualTo("138****0000");
        mvc.perform(get("/api/orders/{code}", code).param("phone", "13800000000"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(code));
        mvc.perform(get("/api/orders/{code}", code).param("phone", "13900000000"))
            .andExpect(status().isNotFound());
    }

    @Test
    void orderRejectsZeroQuantityAndProductsFromAnotherRoom() throws Exception {
        long productId = firstProduct(1).path("id").asLong();
        mvc.perform(orderRequest(1, productId, 0)).andExpect(status().isBadRequest());
        mvc.perform(orderRequest(2, productId, 1)).andExpect(status().isBadRequest());
    }

    @Test
    void adminCanSaveConfigurationAndShanghaiSchedule() throws Exception {
        mvc.perform(validRoomForm("id", "2", "title", "已更新的伪直播课程", "mode", "PSEUDO",
                "status", "SCHEDULED", "scheduledAt", "2026-11-01T14:30")
                .with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/admin"));

        assertThat(rooms.findById(2L).orElseThrow().getScheduledAt())
            .isEqualTo(Instant.parse("2026-11-01T06:30:00Z"));
        mvc.perform(get("/api/rooms/2"))
            .andExpect(jsonPath("$.title").value("已更新的伪直播课程"))
            .andExpect(jsonPath("$.mode").value("PSEUDO"));
    }

    @Test
    void adminRoomFormRejectsBlankRequiredValues() throws Exception {
        mvc.perform(validRoomForm("title", "").with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"javascript:alert(1)", "//untrusted.example/video.mp4", "https://user:secret@example.test/video.mp4"})
    void adminRoomFormRejectsUnsafeMediaAddresses(String url) throws Exception {
        mvc.perform(validRoomForm("streamUrl", url).with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pseudoLiveCannotBeScheduledWithoutStartTime() throws Exception {
        mvc.perform(validRoomForm("mode", "PSEUDO", "status", "SCHEDULED", "scheduledAt", "")
                .with(user("admin").roles("ADMIN")).with(csrf()))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pseudoRoomLabelTracksItsScheduleWithoutClaimingAnAvailableStream() throws Exception {
        var room = rooms.findById(2L).orElseThrow();
        room.setDurationSeconds(120);
        room.setScheduledAt(Instant.now().minusSeconds(30));
        mvc.perform(get("/api/rooms/2"))
            .andExpect(jsonPath("$.status").value("SCHEDULED"))
            .andExpect(jsonPath("$.statusLabel").value("排期进行中"))
            .andExpect(jsonPath("$.mediaReady").value(false));
        room.setScheduledAt(Instant.now().minusSeconds(300));
        mvc.perform(get("/api/rooms/2"))
            .andExpect(jsonPath("$.statusLabel").value("已结束"));
        room.setScheduledAt(Instant.now().plusSeconds(300));
        mvc.perform(get("/api/rooms/2"))
            .andExpect(jsonPath("$.statusLabel").value("待开播"));
    }

    @Test
    void productAdminPageRequiresLoginAndCanRenderEditor() throws Exception {
        mvc.perform(get("/admin/products")).andExpect(status().is3xxRedirection());
        mvc.perform(get("/admin/products").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(view().name("products"));
        mvc.perform(get("/admin/products").param("edit", Long.toString(firstProduct(1).path("id").asLong()))
                .with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(model().attributeExists("product"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("href=\"/admin/products#product-editor\"")));
    }

    @Test
    void configuredProductAppearsInCorrectRoomAndKeepsMoneyPrecision() throws Exception {
        mvc.perform(post("/admin/products").with(user("admin").roles("ADMIN")).with(csrf())
                .param("roomId", "3").param("name", "测试课程商品").param("price", "39.90")
                .param("originalPrice", "59.00").param("description", "测试配置"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/admin/products"));
        String body = mvc.perform(get("/api/rooms/3/products")).andReturn().getResponse().getContentAsString();
        JsonNode added = json.readTree(body).get(json.readTree(body).size() - 1);
        assertThat(added.path("name").asText()).isEqualTo("测试课程商品");
        JsonNode order = createOrder(3, added.path("id").asLong(), 3);
        assertThat(order.path("total").decimalValue()).isEqualByComparingTo("119.70");
    }

    @Test
    void productAdminRejectsNegativePriceAndNonexistentRooms() throws Exception {
        mvc.perform(post("/admin/products").with(user("admin").roles("ADMIN")).with(csrf())
                .param("roomId", "1").param("name", "无效商品").param("price", "-1"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/admin/products").with(user("admin").roles("ADMIN")).with(csrf())
                .param("roomId", "99999").param("name", "无效商品").param("price", "1"))
            .andExpect(status().isNotFound());
    }

    private JsonNode firstProduct(long roomId) throws Exception {
        String body = mvc.perform(get("/api/rooms/{id}/products", roomId))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode products = json.readTree(body);
        assertThat(products.size()).isPositive();
        return products.get(0);
    }

    private JsonNode createOrder(long roomId, long productId, int quantity) throws Exception {
        return json.readTree(mvc.perform(orderRequest(roomId, productId, quantity))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder orderRequest(long roomId, long productId, int quantity) throws Exception {
        return post("/api/rooms/{id}/orders", roomId).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("productId", productId, "buyer", "测试客户", "phone", "13800000000", "quantity", quantity)));
    }

    private MockHttpServletRequestBuilder validRoomForm(String... overrides) {
        Map<String, String> values = new LinkedHashMap<>(Map.ofEntries(
            Map.entry("title", "集成测试场次"), Map.entry("host", "测试讲师"),
            Map.entry("mode", "LIVE"), Map.entry("status", "DRAFT"),
            Map.entry("description", "测试介绍"), Map.entry("announcement", "测试公告"),
            Map.entry("streamUrl", "https://media.example.test/video.mp4"),
            Map.entry("posterUrl", "https://media.example.test/poster.jpg"),
            Map.entry("durationSeconds", "3600"), Map.entry("commentsEnabled", "true")));
        for (int index = 0; index < overrides.length; index += 2) {
            values.put(overrides[index], overrides[index + 1]);
        }
        MockHttpServletRequestBuilder request = post("/admin/rooms");
        values.forEach((name, value) -> request.param(name, value));
        return request;
    }
}
