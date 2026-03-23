package com.venzpro.application.service;

import com.venzpro.application.dto.request.UpdateUserRoleRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.domain.entity.User;
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
                .stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(UUID id, UUID organizationId) {
        return userRepository.findByIdAndOrganizationId(id, organizationId)
                .map(UserResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    @org.springframework.transaction.annotation.Transactional
    public com.venzpro.application.dto.response.UserResponse updateAccess(
            java.util.UUID id,
            java.util.UUID organizationId,
            com.venzpro.application.dto.request.UpdateUserAccessRequest req) {

        com.venzpro.domain.entity.User user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new com.venzpro.infrastructure.exception.ResourceNotFoundException("Usuário", id));

        user.setRole(req.role());
        user.setPodeAprovar(req.podeAprovar());
        user.setPodeExportar(req.podeExportar());
        user.setPodeVerDashboard(req.podeVerDashboard());

        return com.venzpro.application.dto.response.UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        userRepository.delete(user);
    }
}
