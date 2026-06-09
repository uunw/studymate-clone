import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { SiteHeader } from '~/components/site-header'
import { NotFound } from '~/lib/not-found'
import { getSessionUser } from '~/server/session'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	beforeLoad: async () => {
		const user = await getSessionUser()
		return { user }
	},
	loader: ({ context }) => ({ user: context.user }),
	notFoundComponent: NotFound,
	component: RootLayout,
})

function RootLayout() {
	const { user } = Route.useLoaderData()
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader user={user} />
			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
				<Outlet />
			</main>
			<footer className="border-slate-200 border-t py-6 text-center text-slate-400 text-xs">
				StudyMate Clone · open-source rebuild · not affiliated with KMITL ·{' '}
				<a
					href="https://github.com/uunw/studymate-clone"
					target="_blank"
					rel="noreferrer"
					className="text-slate-500 hover:text-brand-600 hover:underline"
				>
					GitHub
				</a>
			</footer>
		</div>
	)
}
