package com.meiye.live.room;

import com.meiye.live.commerce.CommerceService;
import jakarta.validation.Valid;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class PageController {
    private final RoomService rooms;
    private final CommerceService commerce;
    public PageController(RoomService rooms, CommerceService commerce) { this.rooms = rooms; this.commerce = commerce; }

    @GetMapping({"/", "/meiye", "/meiye/"})
    public String legacy(@RequestParam(required = false) String view,
                         @RequestParam(required = false) Long room,
                         Model model) {
        String effectiveView = (view != null && !view.isBlank()) ? view : "pc";
        long effectiveRoom = (room != null && room > 0) ? room : 1L;
        model.addAttribute("surface", effectiveView);
        return viewer(effectiveRoom, model);
    }

    @GetMapping("/rooms/{id}")
    public String viewer(@PathVariable long id, Model model) {
        if (!model.containsAttribute("surface")) model.addAttribute("surface", "mini");
        try {
            model.addAttribute("room", rooms.view(id));
            model.addAttribute("products", commerce.products(id));
        } catch (Exception ignored) {
            model.addAttribute("room", null);
            model.addAttribute("products", java.util.List.of());
        }
        model.addAttribute("rooms", rooms.list());
        return "viewer";
    }

    @GetMapping("/login") public String login() { return "login"; }

    @GetMapping("/admin")
    public String admin(Model model) {
        model.addAttribute("surface", "pc");
        return viewer(1L, model);
    }

    @GetMapping("/admin/orders") public String orders(Model model) { model.addAttribute("orders", commerce.orders()); return "orders"; }
    @GetMapping("/admin/rooms/new") public String create(Model model) {
        model.addAttribute("room", null); model.addAttribute("scheduledAtLocal", ""); return "room-form";
    }
    @GetMapping("/admin/rooms/{id}/edit") public String edit(@PathVariable long id, Model model) {
        RoomView room = rooms.view(id); model.addAttribute("room", room);
        model.addAttribute("scheduledAtLocal", room.scheduledAt() == null ? "" : DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm").withZone(ZoneId.of("Asia/Shanghai")).format(room.scheduledAt()));
        return "room-form";
    }
    @PostMapping("/admin/rooms") public String save(@Valid @ModelAttribute RoomForm form, BindingResult errors, RedirectAttributes redirect) {
        if (errors.hasErrors()) throw new IllegalArgumentException("场次参数不正确");
        Room room = rooms.save(form); redirect.addFlashAttribute("success", "场次已保存 · " + room.getTitle()); return "redirect:/admin";
    }
    @PostMapping("/admin/rooms/{id}/status") public String status(@PathVariable long id, @RequestParam RoomStatus status, RedirectAttributes redirect) {
        rooms.status(id, status); redirect.addFlashAttribute("success", "场次状态已更新"); return "redirect:/admin";
    }
}
