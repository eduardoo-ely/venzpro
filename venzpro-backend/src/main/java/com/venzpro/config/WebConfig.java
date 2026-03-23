package com.venzpro.config;

import com.venzpro.infrastructure.security.TenantSessionInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TenantSessionInterceptor tenantSessionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantSessionInterceptor)
                .addPathPatterns("/api/**")        // aplica em todas as rotas da API
                .excludePathPatterns("/api/auth/**"); // exceto autenticação
    }
}
