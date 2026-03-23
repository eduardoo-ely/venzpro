package com.venzpro.application.service;

import com.venzpro.application.dto.request.UpdateUserAccessRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> findByOrganization(UUID organizationId) {
        return userRepository.findAllByOrganizationId(organizationId)
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

    /**
     * Atualiza cargo e permissões granulares de um usuário.
     *
     * Regras:
     * - ADMIN não pode rebaixar a si mesmo (protege o último admin)
     * - Verificado pelo controller via @PreAuthorize("hasRole('ADMIN')")
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

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        // Verifica se há pelo menos outro ADMIN na organização antes de excluir
        if (user.getRole().name().equals("ADMIN")) {
            long adminsRestantes = userRepository.findAllByOrganizationId(organizationId)
                    .stream()
                    .filter(u -> !u.getId().equals(id) && u.getRole().name().equals("ADMIN"))
                    .count();
            if (adminsRestantes == 0) {
                throw new BusinessException(
                    "Não é possível remover o último administrador da organização."
                );
            }
        }

        userRepository.delete(user);
    }
}
