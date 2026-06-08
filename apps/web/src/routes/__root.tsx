import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'
import { SiteHeader } from '~/components/site-header'
import { NotFound } from '~/lib/not-found'
import { getSessionFn } from '~/server/session'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'StudyMate Clone' },
			{
				name: 'description',
				content: 'KMITL subject reviews & curriculum tracker — open-source rebuild.',
			},
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	beforeLoad: async () => {
		const user = await getSessionFn()
		return { user }
	},
	loader: ({ context }) => ({ user: context.user }),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	const { user } = Route.useLoaderData()
	return (
		<html lang="th">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="flex min-h-screen flex-col">
					<SiteHeader user={user} />
					<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
					<footer className="border-slate-200 border-t py-6 text-center text-slate-400 text-xs">
						StudyMate Clone — open-source rebuild · not affiliated with KMITL ·{' '}
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
				<Scripts />
			</body>
		</html>
	)
}
