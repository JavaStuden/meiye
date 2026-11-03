package com.meiye.live.commerce;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByRoomIdOrderByIdAsc(long roomId);
    int countByRoomId(long roomId);
}
