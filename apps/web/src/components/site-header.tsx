import { Button } from '@repo/ui'
import { Link, useRouter } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'
import type { SessionUser } from '~/server/session'

const NAV = [
	{ to: '/subjects', label: 'รายวิชา' },
	{ to: '/reviews', label: 'รีวิว' },
] as const

export function SiteHeader({ user }: { user: SessionUser | null }) {
	const router = useRouter()

	async function handleSignOut() {
		await authClient.signOut()
		await router.invalidate()
		router.navigate({ to: '/' })
	}

	return (
		<header className="border-slate-200 border-b bg-white">
			<div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
				<Link to="/" className="font-bold text-brand-600 text-lg">
					StudyMate
				</Link>
				<nav className="flex items-center gap-4 text-sm">
					{NAV.map((n) => (
						<Link
							key={n.to}
							to={n.to}
							className="text-slate-600 hover:text-brand-600 [&.active]:font-medium [&.active]:text-brand-600"
						>
							{n.label}
						</Link>
					))}
					{user && (
						<Link
							to="/my-subjects"
							className="text-slate-600 hover:text-brand-600 [&.active]:font-medium [&.active]:text-brand-600"
						>
							วิชาของฉัน
						</Link>
					)}
					{user?.isAdmin && (
						<Link
							to="/admin"
							className="text-slate-600 hover:text-brand-600 [&.active]:font-medium [&.active]:text-brand-600"
						>
							ผู้ดูแล
						</Link>
					)}
				</nav>

				<div className="ml-auto flex items-center gap-3">
					{user ? (
						<>
							<Link to="/profile" className="text-slate-700 text-sm hover:text-brand-600">
								{user.nickname || user.firstName || user.username}
							</Link>
							<Button size="sm" variant="ghost" onClick={handleSignOut}>
								ออกจากระบบ
							</Button>
						</>
					) : (
						<>
							<Link to="/sign-in">
								<Button size="sm" variant="ghost">
									เข้าสู่ระบบ
								</Button>
							</Link>
							<Link to="/sign-up">
								<Button size="sm">สมัครสมาชิก</Button>
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	)
}
