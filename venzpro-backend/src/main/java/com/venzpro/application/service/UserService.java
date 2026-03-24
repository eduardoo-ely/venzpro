package com.venzpro.application.service;

import com.venzpro.application.dto.request.UpdateUserAccessRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // ── Listagem ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserResponse> findByOrganization(UUID organizationId) {
        return userRepository.findAllByOrganizationIdAndDeletedAtIsNull(organizationId)
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(UUID id, UUID organizationId) {
        return userRepository.findByIdAndOrganizationId(id, organizationId)
                .map(UserResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    // ── Atualização de acesso ─────────────────────────────────────────────────

    /**
     * Atualiza cargo e permissões granulares de um usuário.
     * Apenas ADMIN pode executar — validado pelo controller via @PreAuthorize.
     */
    @Transactional
    public UserResponse updateAccess(UUID id, UUID organizationId, UpdateUserAccessRequest req) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        user.setRole(req.role());
        user.setPodeAprovar(req.podeAprovar());
        user.setPodeExportar(req.podeExportar());
        user.setPodeVerDashboard(req.podeVerDashboard());

        return UserResponse.from(userRepository.save(user));
    }

    // ── Onboarding ────────────────────────────────────────────────────────────

    /**
     * Marca o onboarding do usuário como concluído (Regra 5).
     *
     * Idempotente: chamar múltiplas vezes é seguro.
     * O frontend deve chamar {@code refreshUser()} após este endpoint.
     *
     * @param userId         ID do usuário autenticado (vem do JWT)
     * @param organizationId ID da organização (vem do JWT)
     */
    @Transactional
    public void completeOnboarding(UUID userId, UUID organizationId) {
        var user = userRepository.findByIdAndOrganizationId(userId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));

        if (!user.isOnboardingCompleted()) {
            user.setOnboardingCompleted(true);
            userRepository.save(user);
            log.info("Onboarding concluído para usuário {} na org {}", userId, organizationId);
        }
    }

    // ── Exclusão (soft-delete) ────────────────────────────────────────────────

    /**
     * Exclui um usuário via soft-delete.
     * Protege o último administrador da organização de ser removido.
     */
    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        if (user.getRole().name().equals("ADMIN")) {
            long adminsRestantes = userRepository
                    .findAllByOrganizationIdAndDeletedAtIsNull(organizationId)
                    .stream()
                    .filter(u -> !u.getId().equals(id) && u.getRole().name().equals("ADMIN"))
                    .count();

            if (adminsRestantes == 0) {
                throw new BusinessException(
                    "Não é possível remover o último administrador da organização.");
            }
        }

        user.softDelete();
        userRepository.save(user);

        log.info("Usuário {} removido (soft-delete) da org {}", id, organizationId);
    }
}
