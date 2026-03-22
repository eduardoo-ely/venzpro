package com.venzpro.infrastructure.security;

import com.venzpro.infrastructure.exception.TenantViolationException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.UUID;

@Slf4j
@Aspect
@Component
public class TenantIsolationAspect {

    @Before("execution(* org.springframework.data.repository.CrudRepository.save(..)) || " +
            "execution(* org.springframework.data.repository.CrudRepository.delete(..))")
    public void verifyTenantOnWrite(JoinPoint joinPoint) {
        UUID currentOrgId = TenantContext.getOrNull();
        Object[] args = joinPoint.getArgs();

        for (Object arg : args) {
            if (arg == null) continue;

            UUID entityOrgId = extractOrganizationId(arg);

            if (currentOrgId == null) {
                return;
            }

            if (entityOrgId != null && !entityOrgId.equals(currentOrgId)) {
                String entityName = arg.getClass().getSimpleName();
                if (entityName.equals("User") || entityName.equals("Organization")) {
                    return;
                }

                log.error("VIOLAÇÃO DE SEGURANÇA: orgId da entidade ({}) incompatível com a sessão ({})",
                        entityOrgId, currentOrgId);

                throw new TenantViolationException("Acesso negado: os dados pertencem a outra organização.");
            }
        }
    }

    private UUID extractOrganizationId(Object entity) {
        try {
            Field orgField = findFieldRecursive(entity.getClass(), "organization");
            if (orgField != null) {
                orgField.setAccessible(true);
                Object org = orgField.get(entity);
                if (org != null) {
                    Field idField = findFieldRecursive(org.getClass(), "id");
                    if (idField != null) {
                        idField.setAccessible(true);
                        return (UUID) idField.get(org);
                    }
                }
            }

            Field orgIdField = findFieldRecursive(entity.getClass(), "organizationId");
            if (orgIdField != null) {
                orgIdField.setAccessible(true);
                Object val = orgIdField.get(entity);
                return (val instanceof UUID) ? (UUID) val : null;
            }

        } catch (Exception e) {
            log.error("Falha ao validar isolamento da entidade {}: {}",
                    entity.getClass().getSimpleName(), e.getMessage());
            throw new TenantViolationException("Erro de integridade: impossível validar o proprietário dos dados.");
        }
        return null;
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
