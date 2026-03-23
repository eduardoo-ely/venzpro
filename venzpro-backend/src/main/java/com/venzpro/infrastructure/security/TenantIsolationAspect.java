package com.venzpro.infrastructure.security;

import com.venzpro.infrastructure.exception.TenantViolationException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.UUID;

/**
 * Aspecto de segurança multi-tenant.
 *
 * Intercepta chamadas de save() e delete() nos repositórios e garante que
 * a entidade pertence à organização da sessão atual.
 *
 * Estratégia de extração (em ordem de preferência para evitar LazyInitializationException):
 *   1. Campo "organizationId" (UUID direto) — presente em Product e AuditLog
 *   2. Campo "organization.id" (relação @ManyToOne) — presente nas demais entidades
 *
 * Entidades sem organizationId (ex: User, Organization, AuditLog) são ignoradas
 * intencionalmente para não bloquear operações administrativas legítimas.
 */
@Slf4j
@Aspect
@Component
public class TenantIsolationAspect {

    // Entidades cujo organizationId não precisa validar (operações cross-tenant)
    private static final java.util.Set<String> SKIP_ENTITIES = java.util.Set.of(
            "User", "Organization", "AuditLog"
    );

    @Before("execution(* org.springframework.data.repository.CrudRepository.save(..)) || " +
            "execution(* org.springframework.data.repository.CrudRepository.delete(..))")
    public void verifyTenantOnWrite(JoinPoint joinPoint) {
        UUID currentOrgId = TenantContext.getOrNull();

        // Sem contexto de tenant (ex: threads assíncronas de import, seeds, testes)
        if (currentOrgId == null) {
            return;
        }

        Object[] args = joinPoint.getArgs();
        for (Object arg : args) {
            if (arg == null) continue;

            String entityName = arg.getClass().getSimpleName();

            // Entidades isentas de validação
            if (SKIP_ENTITIES.contains(entityName)) {
                return;
            }

            UUID entityOrgId = extractOrganizationId(arg);

            // Entidade sem campo de organização — ignora
            if (entityOrgId == null) {
                return;
            }

            if (!entityOrgId.equals(currentOrgId)) {
                log.error(
                    "VIOLAÇÃO DE SEGURANÇA: org da entidade ({}) incompatível com sessão ({}). Entidade: {}",
                    entityOrgId, currentOrgId, entityName
                );
                throw new TenantViolationException(
                    "Acesso negado: os dados pertencem a outra organização."
                );
            }
        }
    }

    /**
     * Extrai o UUID da organização da entidade de forma segura.
     *
     * Prioriza o campo "organizationId" (UUID direto) sobre o campo "organization"
     * (objeto com lazy loading) para evitar LazyInitializationException.
     */
    private UUID extractOrganizationId(Object entity) {
        try {
            // 1ª tentativa: campo "organizationId" (UUID) — sem risco de lazy load
            Field orgIdField = findFieldRecursive(entity.getClass(), "organizationId");
            if (orgIdField != null) {
                orgIdField.setAccessible(true);
                Object val = orgIdField.get(entity);
                if (val instanceof UUID) {
                    return (UUID) val;
                }
            }

            // 2ª tentativa: objeto "organization" com campo "id"
            // Só acessa se o proxy JPA já estiver inicializado para não forçar query
            Field orgField = findFieldRecursive(entity.getClass(), "organization");
            if (orgField != null) {
                orgField.setAccessible(true);
                Object org = orgField.get(entity);
                if (org != null) {
                    // Verifica se é proxy Hibernate não inicializado antes de acessar
                    if (isHibernateProxyUninitialized(org)) {
                        log.debug(
                            "Proxy não inicializado para organization em {}. Validação ignorada.",
                            entity.getClass().getSimpleName()
                        );
                        return null;
                    }
                    Field idField = findFieldRecursive(org.getClass(), "id");
                    if (idField != null) {
                        idField.setAccessible(true);
                        Object idVal = idField.get(org);
                        if (idVal instanceof UUID) {
                            return (UUID) idVal;
                        }
                    }
                }
            }

        } catch (Exception e) {
            log.warn(
                "Não foi possível validar organizationId para {}: {}",
                entity.getClass().getSimpleName(), e.getMessage()
            );
            // Não lança exceção — a validação de organização cabe ao service
        }

        return null;
    }

    /**
     * Verifica se o objeto é um proxy Hibernate não inicializado,
     * evitando forçar uma query fora de transação.
     */
    private boolean isHibernateProxyUninitialized(Object obj) {
        try {
            Class<?> hibernateLazyInitClass = Class.forName(
                "org.hibernate.proxy.HibernateProxy"
            );
            if (hibernateLazyInitClass.isInstance(obj)) {
                // Verifica se o LazyInitializer já foi inicializado
                Object lazyInitializer = hibernateLazyInitClass
                        .getMethod("getHibernateLazyInitializer")
                        .invoke(obj);
                return (boolean) lazyInitializer.getClass()
                        .getMethod("isUninitialized")
                        .invoke(lazyInitializer);
            }
        } catch (Exception ignored) {
            // Se não conseguir verificar, assume que está inicializado
        }
        return false;
    }

    private Field findFieldRecursive(Class<?> clazz, String fieldName) {
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            try {
                return current.getDeclaredField(fieldName);
            } catch (NoSuchFieldException e) {
                current = current.getSuperclass();
            }
        }
        return null;
    }
}
