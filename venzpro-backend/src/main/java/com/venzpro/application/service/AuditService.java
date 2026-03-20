package com.venzpro.application.service;

import com.venzpro.domain.entity.AuditLog;
import com.venzpro.domain.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Registra ações dos usuários de forma assíncrona.
 * @Async garante que o audit log nunca atrasa a operação principal.
 * Propagation.REQUIRES_NEW garante que falhas no log não revertam a operação.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(UUID organizationId, UUID userId,
                    String action, String entityType, UUID entityId, String details) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .organizationId(organizationId)
                    .userId(userId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .details(details)
                    .level("INFO")
                    .build());
        } catch (Exception e) {
            // Nunca deixar o log quebrar a operação principal
            log.warn("Falha ao registrar audit log: {}", e.getMessage());
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logError(UUID organizationId, UUID userId, String action, String details) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .organizationId(organizationId)
                    .userId(userId)
                    .action(action)
                    .details(details)
                    .level("ERROR")
                    .build());
        } catch (Exception e) {
            log.warn("Falha ao registrar audit log de erro: {}", e.getMessage());
        }
    }

    // Ações predefinidas para consistência
    public static final String LOGIN            = "LOGIN";
    public static final String REGISTER         = "REGISTER";
    public static final String CREATE_CUSTOMER  = "CREATE_CUSTOMER";
    public static final String UPDATE_CUSTOMER  = "UPDATE_CUSTOMER";
    public static final String DELETE_CUSTOMER  = "DELETE_CUSTOMER";
    public static final String CREATE_ORDER     = "CREATE_ORDER";
    public static final String UPDATE_ORDER     = "UPDATE_ORDER";
    public static final String DELETE_ORDER     = "DELETE_ORDER";
    public static final String UPDATE_STATUS    = "UPDATE_ORDER_STATUS";
    public static final String CREATE_EVENT     = "CREATE_EVENT";
    public static final String LOGIN_FAILED     = "LOGIN_FAILED";
}
