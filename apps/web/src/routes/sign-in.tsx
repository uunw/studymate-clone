import { Alert, Button, Card, CardBody } from '@repo/ui'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/sign-in')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignIn,
})

function SignIn() {
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function handleSso() {
		setError(null)
		setLoading(true)
		const res = await authClient.signIn.oauth2({
			providerId: 'kmitl',
			callbackURL: '/',
			errorCallbackURL: '/sign-in',
		})
		// On success the browser is redirected to KMITL; reaching here = a problem.
		if (res?.error) {
			setError('ไม่สามารถเริ่มการเข้าสู่ระบบ KMITL SSO ได้ (ยังไม่ได้ตั้งค่า?)')
			setLoading(false)
		}
	}

	return (
		<div className="mx-auto max-w-sm py-12">
			<Card>
				<CardBody className="space-y-5 text-center">
					<div>
						<h1 className="font-bold text-xl">เข้าสู่ระบบ</h1>
						<p className="mt-1 text-slate-500 text-sm">ใช้บัญชี KMITL ของคุณเพื่อเข้าสู่ระบบ</p>
					</div>
					{error && <Alert tone="error">{error}</Alert>}
					<Button className="w-full" size="lg" loading={loading} onClick={handleSso}>
						เข้าสู่ระบบด้วย KMITL SSO
					</Button>
					<p className="text-slate-400 text-xs">บัญชีจะถูกสร้างอัตโนมัติเมื่อเข้าสู่ระบบครั้งแรก</p>
				</CardBody>
			</Card>
		</div>
	)
}
