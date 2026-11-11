package com.meiye.live.robot;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RobotAutomationStateRepository extends JpaRepository<RobotAutomationState, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select state from RobotAutomationState state where state.id = :id")
    Optional<RobotAutomationState> findForUpdate(@Param("id") String id);
}
