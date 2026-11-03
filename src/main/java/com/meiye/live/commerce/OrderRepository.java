package com.meiye.live.commerce;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<DemoOrder, Long> {
    Optional<DemoOrder> findByCodeAndPhone(String code, String phone);
    List<DemoOrder> findTop200ByOrderByCreatedAtDesc();
}
