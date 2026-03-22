package com.venzpro.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.Optional;

/**
 * Configuração central de JPA para o VenzPro.
 *
 * @EnableJpaAuditing — activa o preenchimento automático de:
 *   - {@literal @}CreatedDate   → BaseTenantEntity.createdAt
 *   - {@literal @}LastModifiedDate → BaseTenantEntity.updatedAt
 *
 * Nota: se precisar de @CreatedBy / @LastModifiedBy (quem fez a alteração),
 * implemente AuditorAware<UUID> e adicione-o como @Bean aqui.
 */
@Configuration
@EnableJpaAuditing
@EnableTransactionManagement
@EnableAsync                     // necessário para @Async no ProductImportService
public class JpaConfig {

    /*
     * Exemplo de AuditorAware para @CreatedBy / @LastModifiedBy
     * (descomente se necessário):

    @Bean
    public AuditorAware<UUID> auditorAware() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .filter(auth -> auth.getPrincipal() instanceof VenzproPrincipal)
            .map(auth -> ((VenzproPrincipal) auth.getPrincipal()).userId());
    }
    */
}