package com.venzpro.application.dto.response;

import com.venzpro.domain.enums.OrganizationType;
import com.venzpro.domain.enums.UserRole;

/**
 * DTO de resposta dos endpoints de autenticação.
 *
 * Retorna tudo que o frontend React precisa para:
 *  1. Armazenar o JWT no localStorage e enviar em requests
 *  2. Popular o AuthContext (user + organization)
 *  3. Redirecionar para a tela correta baseado no role
 *
 * Estrutura espelhada no AuthContext.tsx do frontend.
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
     * Dados do usuário — espelha a interface User do types/index.ts
     */
    public record UserData(
        String id,
        String nome,
        String email,
        UserRole role,
        String organizationId
    ) {}

    /**
     * Dados da organização — espelha a interface Organization do types/index.ts
     */
    public record OrganizationData(
        String id,
        String nome,
        OrganizationType tipo
    ) {}
}
