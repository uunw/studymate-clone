import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '~/lib/auth'
import { createAppRouter, queryClient } from './router'
import './styles/app.css'

const router = createAppRouter()
const rootEl = document.getElementById('app')
if (rootEl) {
	createRoot(rootEl).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<RouterProvider router={router} />
				</AuthProvider>
			</QueryClientProvider>
		</StrictMode>,
	)
}
