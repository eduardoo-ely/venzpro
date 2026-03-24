package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.OrganizationType;
import com.venzpro.domain.enums.UserRole;

/**
 * DTO de resposta dos endpoints de autenticação (/login e /register).
 *
 * Retorna tudo que o frontend precisa para popular o AuthContext:
 * token JWT, dados do usuário (com permissões e onboarding) e da organização.
 */
public record AuthResponse(
    String         token,
    UserData       user,
    OrganizationData organization
) {

    /**
     * Dados completos do usuário, incluindo permissões granulares
     * e flag de onboarding obrigatório.
     */
    public record UserData(
        String   id,
        String   nome,
        String   email,
        UserRole role,
        String   organizationId,
        boolean  podeAprovar,
        boolean  podeExportar,
        boolean  podeVerDashboard,
        /** Flag de onboarding obrigatório — Regra 5. */
        boolean  onboardingCompleted
    ) {
        /** Cria o DTO a partir da entidade User. */
        public static UserData from(User user) {
            return new UserData(
                user.getId().toString(),
                user.getNome(),
                user.getEmail(),
                user.getRole(),
                user.getOrganizationId().toString(),
                user.isPodeAprovar(),
                user.isPodeExportar(),
                user.isPodeVerDashboard(),
                user.isOnboardingCompleted()
            );
        }
    }

    public record OrganizationData(
        String           id,
        String           nome,
        OrganizationType tipo
    ) {}
}
