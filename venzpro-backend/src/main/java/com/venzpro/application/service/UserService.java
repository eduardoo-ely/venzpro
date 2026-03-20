package com.venzpro.application.service;

import com.venzpro.application.dto.request.UpdateUserRoleRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.exception.ResourceNotFoundException;
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

    @Transactional
    public UserResponse updateRole(UUID id, UUID organizationId, UpdateUserRoleRequest req) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        user.setRole(req.role());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var user = userRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        userRepository.delete(user);
    }
}
