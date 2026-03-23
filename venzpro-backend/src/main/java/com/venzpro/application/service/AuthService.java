package com.venzpro.application.service;

import com.venzpro.application.dto.request.LoginRequest;
import com.venzpro.application.dto.request.RegisterRequest;
import com.venzpro.application.dto.response.AuthResponse;
import com.venzpro.infrastructure.security.JwtService;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.domain.entity.Organization;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;
    private final AuditService           auditService;

    // ── LOGIN ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (!passwordEncoder.matches(request.senha(), user.getSenha())) {
            log.warn("Tentativa de login com senha inválida para: {}", email);
            auditService.logError(null, null, AuditService.LOGIN_FAILED, "Email: " + email);
            throw new BadCredentialsException("Credenciais inválidas");
        }

        Organization org = organizationRepository.findById(user.getOrganization().getId())
                .orElseThrow(() -> new BadCredentialsException("Organização não encontrada"));

        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganization().getId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Login bem-sucedido para usuário: {}", user.getId());
        auditService.log(
                user.getOrganization().getId(), user.getId(),
                AuditService.LOGIN, "User", user.getId(), "Login: " + user.getEmail()
        );

        return buildAuthResponse(token, user, org);
    }

    // ── REGISTRO ──────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("Este email já está em uso.");
        }

        Organization org = Organization.builder()
                .nome(request.nomeOrganizacao() != null && !request.nomeOrganizacao().isBlank()
                        ? request.nomeOrganizacao()
                        : "Org de " + request.nome())
                .tipo(request.tipoOrganizacao())
                .build();
        org = organizationRepository.save(org);

        User user = User.builder()
                .nome(request.nome())
                .email(email)
                .senha(passwordEncoder.encode(request.senha()))
                .role(UserRole.ADMIN)
                .organization(org)
                .podeAprovar(true)
                .podeExportar(true)
                .podeVerDashboard(true)
                .build();
        user = userRepository.save(user);

        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganization().getId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Novo usuário registrado: {} na organização: {}", user.getId(), org.getId());
        auditService.log(
                org.getId(), user.getId(),
                AuditService.REGISTER, "User", user.getId(), "Registro: " + user.getEmail()
        );

        return buildAuthResponse(token, user, org);
    }

    // ── PRIVADOS ──────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(String token, User user, Organization org) {
        return new AuthResponse(
                token,
                AuthResponse.UserData.from(user),
                new AuthResponse.OrganizationData(
                        org.getId().toString(),
                        org.getNome(),
                        org.getTipo()
                )
        );
    }
}
