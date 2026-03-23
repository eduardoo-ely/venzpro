package com.venzpro.application.service;

import com.venzpro.domain.entity.Notification;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.NotificationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Notifica ADMIN e GERENTE que um cliente está sem responsável.
     * Chamado ao: aprovar cliente sem owner, remover owner de cliente.
     * @Async para não bloquear a operação principal.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notificarClienteSemOwner(UUID organizationId, String clienteNome) {
        String titulo = "Cliente sem responsável";
        String mensagem = String.format(
                "O cliente \"%s\" está sem responsável atribuído. " +
                        "Atribua um responsável para que pedidos possam ser realizados.",
                clienteNome
        );
        notificarAdminsEGerentes(organizationId, titulo, mensagem);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notificarClienteAprovadoSemOwner(
            UUID organizationId, String clienteNome) {
        String titulo = "Cliente aprovado sem responsável";
        String mensagem = String.format(
                "O cliente \"%s\" foi aprovado mas não possui responsável. " +
                        "Atribua um vendedor para que pedidos possam ser criados.",
                clienteNome
        );
        notificarAdminsEGerentes(organizationId, titulo, mensagem);
    }

    private void notificarAdminsEGerentes(
            UUID organizationId, String titulo, String mensagem) {
        try {
            List<User> destinatarios = userRepository
                    .findAllByOrganizationIdAndRoleIn(
                            organizationId,
                            List.of(UserRole.ADMIN, UserRole.GERENTE)
                    );

            List<Notification> notificacoes = destinatarios.stream()
                    .map(user -> Notification.builder()
                            .organization(user.getOrganization())
                            .user(user)
                            .titulo(titulo)
                            .mensagem(mensagem)
                            .build())
                    .toList();

            notificationRepository.saveAll(notificacoes);
            log.info("Notificações enviadas para {} destinatários na org {}",
                    destinatarios.size(), organizationId);
        } catch (Exception e) {
            log.warn("Falha ao criar notificações: {}", e.getMessage());
        }
    }
}
