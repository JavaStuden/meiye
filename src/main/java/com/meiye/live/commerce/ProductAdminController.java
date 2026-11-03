package com.meiye.live.commerce;

import com.meiye.live.room.RoomService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class ProductAdminController {
    private final ProductRepository products;
    private final RoomService rooms;
    public ProductAdminController(ProductRepository products, RoomService rooms) { this.products = products; this.rooms = rooms; }
    @GetMapping("/admin/products") @Transactional(readOnly = true)
    public String list(@RequestParam(required = false) Long edit, Model model) {
        model.addAttribute("rooms", rooms.list()); model.addAttribute("products", products.findAll());
        model.addAttribute("product", edit == null ? null : require(edit)); return "products";
    }
    @PostMapping("/admin/products") @Transactional
    public String save(@Valid @ModelAttribute ProductForm form, RedirectAttributes redirect) {
        rooms.require(form.roomId());
        if (form.originalPrice() != null && form.originalPrice().compareTo(form.price()) < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "划线价不能低于售价");
        Product product = form.id() == null ? new Product() : require(form.id());
        product.setRoomId(form.roomId()); product.setName(form.name().trim()); product.setPrice(form.price());
        product.setOriginalPrice(form.originalPrice()); product.setDescription(form.description()); products.save(product);
        redirect.addFlashAttribute("success", "商品配置已保存"); return "redirect:/admin/products";
    }
    private Product require(long id) { return products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "商品不存在")); }
    public record ProductForm(Long id, @NotNull @Positive Long roomId, @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin("0.01") @DecimalMax("99999999.99") @Digits(integer = 8, fraction = 2) BigDecimal price,
        @DecimalMin("0.01") @DecimalMax("99999999.99") @Digits(integer = 8, fraction = 2) BigDecimal originalPrice,
        @Size(max = 1000) String description) { }
}
