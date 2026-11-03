package com.meiye.live.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RoomRepository extends JpaRepository<Room, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Room r set r.likes = r.likes + 1 where r.id = :id")
    int incrementLikes(long id);
}
