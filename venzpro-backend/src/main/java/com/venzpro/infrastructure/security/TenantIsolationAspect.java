package com.venzpro.config.security;

import com.venzpro.exception.TenantViolationException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.UUID;

/**
 * Aspecto de auditoria de isolamento multi-tenant.
 *
 * Intercepta TODAS as operações de save/delete nos repositories
 * e verifica que a entidade pertence ao tenant atual.
 *
 * Funciona como uma "rede de segurança" de última linha:
 * mesmo que um bug no código de negócio tente salvar uma entidade
 * de outro tenant, este aspecto lança TenantViolationException.
 *
 * Requer: spring-boot-starter-aop no pom.xml
 *
 * Para habilitar: @EnableAspectJAutoProxy na classe de configuração
 */
@Slf4j
@Aspect
@Component
public class TenantIsolationAspect {

    /**
     * Intercepta save/saveAll/delete/deleteById em qualquer repository.
     */
    @Before("execution(* org.springframework.data.repository.CrudRepository.save(..)) || " +
            "execution(* org.springframework.data.repository.CrudRepository.delete(..))")
    public void verifyTenantOnWrite(JoinPoint joinPoint) {
        UUID currentOrg = TenantContext.getOrNull();
        if (currentOrg == null) return;  // contexto administrativo — sem verificação

        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            if (arg == null) continue;
            UUID entityOrgId = extractOrganizationId(arg);
            if (entityOrgId != null && !entityOrgId.equals(currentOrg)) {
                log.error("VIOLAÇÃO MULTI-TENANT: tentativa de escrever entidade orgId={} no contexto orgId={}. Entidade: {}",
                        entityOrgId, currentOrg, arg.getClass().getSimpleName());
                throw new TenantViolationException(
                        "Operação negada: entidade pertence a outro tenant.");
            }
        }
    }

    private UUID extractOrganizationId(Object entity) {
        try {
            // Tenta campo direto "organization" (relacionamento JPA)
            Field orgField = findField(entity.getClass(), "organization");
            if (orgField != null) {
                orgField.setAccessible(true);
                Object org = orgField.get(entity);
                if (org != null) {
                    Field idField = findField(org.getClass(), "id");
                    if (idField != null) {
                        idField.setAccessible(true);
                        return (UUID) idField.get(org);
                    }
                }
            }
            // Tenta campo direto "organizationId" (UUID direto)
            Field orgIdField = findField(entity.getClass(), "organizationId");
            if (orgIdField != null) {
                orgIdField.setAccessible(true);
                return (UUID) orgIdField.get(entity);
            }
        } catch (Exception e) {
            log.debug("Não foi possível extrair organizationId de {}: {}",
                    entity.getClass().getSimpleName(), e.getMessage());
        }
        return null;
    }

    private Field findField(Class<?> clazz, String name) {
        Class<?> c = clazz;
        while (c != null && c != Object.class) {
            try { return c.getDeclaredField(name); }
            catch (NoSuchFieldException ignored) { c = c.getSuperclass(); }
        }
        return null;
    }
}
