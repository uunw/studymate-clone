import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { DefaultCatchBoundary } from './lib/catch-boundary'
import { NotFound } from './lib/not-found'
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000, retry: 1 },
	},
})

export function createAppRouter() {
	return createRouter({
		routeTree,
		context: { queryClient },
		defaultPreload: 'intent',
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: NotFound,
		scrollRestoration: true,
	})
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof createAppRouter>
	}
}
