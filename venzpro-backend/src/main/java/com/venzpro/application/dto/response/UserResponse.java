package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.User;
import java.util.UUID;

/**
 * DTO de resposta para usuários.
 * Inclui os campos de permissão granular para que o frontend
 * possa aplicar as regras de visibilidade sem depender apenas do role.
 */
public record UserResponse(
        UUID    id,
        String  nome,
        String  email,
        String  role,
        boolean podeAprovar,
        boolean podeExportar,
        boolean podeVerDashboard
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getNome(),
                user.getEmail(),
                user.getRole().name(),
                user.isPodeAprovar(),
                user.isPodeExportar(),
                user.isPodeVerDashboard()
        );
    }
}
