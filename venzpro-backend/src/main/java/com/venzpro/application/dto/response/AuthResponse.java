package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.OrganizationType;
import com.venzpro.domain.enums.UserRole;

/**
 * DTO de resposta dos endpoints de autenticação.
 *
 * Retorna tudo que o frontend React precisa para:
 *  1. Armazenar o JWT no localStorage e enviar em requests
 *  2. Popular o AuthContext (user + organization)
 *  3. Redirecionar para a tela correta baseado no role
 *  4. Aplicar permissões granulares (podeAprovar, podeExportar, podeVerDashboard)
 */
public record AuthResponse(

    /** JWT — o frontend deve enviar em: Authorization: Bearer <token> */
    String token,

    /** Dados do usuário autenticado */
    UserData user,

    /** Dados da organização do usuário */
    OrganizationData organization

) {

    /**
     * Dados completos do usuário, incluindo permissões granulares.
     */
    public record UserData(
        String   id,
        String   nome,
        String   email,
        UserRole role,
        String   organizationId,
        boolean  podeAprovar,
        boolean  podeExportar,
        boolean  podeVerDashboard
    ) {
        /** Factory a partir da entidade User */
        public static UserData from(User user) {
            return new UserData(
                    user.getId().toString(),
                    user.getNome(),
                    user.getEmail(),
                    user.getRole(),
                    user.getOrganization().getId().toString(),
                    user.isPodeAprovar(),
                    user.isPodeExportar(),
                    user.isPodeVerDashboard()
            );
        }
    }

    /**
     * Dados da organização.
     */
    public record OrganizationData(
        String           id,
        String           nome,
        OrganizationType tipo
    ) {}
}
