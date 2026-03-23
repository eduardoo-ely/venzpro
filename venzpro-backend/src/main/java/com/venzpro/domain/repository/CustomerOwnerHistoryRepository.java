package com.venzpro.domain.repository;

import com.venzpro.domain.entity.CustomerOwnerHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomerOwnerHistoryRepository extends JpaRepository<CustomerOwnerHistory, UUID> {

    List<CustomerOwnerHistory> findByCustomerIdOrderByChangedAtDesc(UUID customerId);
}