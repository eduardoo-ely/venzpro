import { motion } from 'framer-motion';

/**
 * PageLoader — tela de carregamento para Suspense durante lazy loading.
 *
 * Exibida enquanto o chunk da página está sendo baixado.
 * Leve e sem dependências externas além do framer-motion já instalado.
 */
export function PageLoader() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        >
            {/* Spinner pulsante com a cor primária do sistema */}
            <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>

            <p className="text-xs text-muted-foreground animate-pulse">
                Carregando...
            </p>
        </motion.div>
    );
}

/**
 * RouteErrorBoundary — exibido quando um lazy chunk falha ao carregar
 * (ex: usuário offline, deploy recente invalidou chunks antigos).
 *
 * Use como `errorElement` no React Router ou como componente de erro
 * dentro de um ErrorBoundary de classe.
 */
export function RouteErrorFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                </svg>
            </div>

            <div className="space-y-1">
                <h2 className="text-lg font-bold letter-tight">Falha ao carregar a página</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Pode ser que sua conexão esteja instável ou o sistema foi atualizado.
                </p>
            </div>

            <button
                onClick={() => window.location.reload()}
                className="text-sm text-primary font-medium hover:underline underline-offset-4"
            >
                Tentar novamente
            </button>
        </div>
    );
}