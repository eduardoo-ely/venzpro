package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id, String nome, String email,
    UserRole role, UUID organizationId, LocalDateTime createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(
            u.getId(), u.getNome(), u.getEmail(),
            u.getRole(), u.getOrganization().getId(), u.getCreatedAt()
        );
    }
}
