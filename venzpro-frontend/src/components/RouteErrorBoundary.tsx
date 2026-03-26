import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RouteErrorFallback } from '@/components/PageLoader';

interface Props {
    children: ReactNode;
    /**
     * Componente de fallback customizado.
     * Se não fornecido, usa RouteErrorFallback padrão.
     */
    fallback?: ReactNode;
}

interface State {
    hasError:   boolean;
    error:      Error | null;
}

/**
 * RouteErrorBoundary — captura erros de carregamento de chunks lazy.
 *
 * Casos cobertos:
 * - Usuário offline quando tenta navegar para uma rota nova
 * - Deploy recente invalidou o hash do chunk (chunk not found)
 * - Erro em tempo de execução no componente filho
 *
 * Uso:
 *   <RouteErrorBoundary>
 *     <Suspense fallback={<PageLoader />}>
 *       <LazyPage />
 *     </Suspense>
 *   </RouteErrorBoundary>
 */
export class RouteErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Em produção, enviar para Sentry / Datadog / etc.
        console.error('[RouteErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? <RouteErrorFallback />;
        }
        return this.props.children;
    }
}