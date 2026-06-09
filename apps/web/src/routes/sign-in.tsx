import { Alert, Button, Card, CardBody } from '@repo/ui'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '~/lib/auth'

export const Route = createFileRoute('/sign-in')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignIn,
})

function SignIn() {
	const router = useRouter()
	const { signIn } = useAuth()
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function handleGoogle() {
		setError(null)
		setLoading(true)
		try {
			await signIn()
			await router.invalidate()
			router.navigate({ to: '/' })
		} catch (e) {
			setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ')
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto max-w-sm py-10">
			<Card>
				<CardBody className="space-y-5 text-center">
					<h1 className="font-bold text-xl">เข้าสู่ระบบ</h1>
					<p className="text-slate-600 text-sm">
						ใช้บัญชี KMITL (Google) ของคุณ — รหัสนักศึกษามาจากอีเมล @kmitl.ac.th
					</p>
					{error && <Alert tone="error">{error}</Alert>}
					<Button className="w-full" loading={loading} onClick={handleGoogle}>
						เข้าสู่ระบบด้วยบัญชี KMITL
					</Button>
				</CardBody>
			</Card>
		</div>
	)
}
