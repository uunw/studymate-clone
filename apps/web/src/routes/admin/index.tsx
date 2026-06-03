import { Card, CardBody, CardHeader } from '@repo/ui'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
		if (!context.user.isAdmin) throw redirect({ to: '/' })
	},
	component: AdminDashboard,
})

const MANAGERS = [
	{ to: '/admin/faculties', title: 'คณะ', desc: 'จัดการรายการคณะ' },
	{ to: '/admin/departments', title: 'ภาควิชา', desc: 'จัดการรายการภาควิชา' },
	{ to: '/admin/programs', title: 'หลักสูตร (สาขา)', desc: 'จัดการรายการสาขาวิชา' },
	{ to: '/admin/curricula', title: 'หลักสูตรปีการศึกษา', desc: 'จัดการรายการหลักสูตรตามปี' },
] as const

function AdminDashboard() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl text-slate-900">ผู้ดูแลระบบ</h1>
				<p className="mt-1 text-slate-600 text-sm">จัดการข้อมูลโครงสร้างวิชาการ</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{MANAGERS.map((m) => (
					<Link key={m.to} to={m.to} className="block transition-transform hover:-translate-y-0.5">
						<Card className="h-full">
							<CardHeader>
								<h2 className="font-semibold text-slate-900">{m.title}</h2>
							</CardHeader>
							<CardBody>
								<p className="text-slate-500 text-sm">{m.desc}</p>
							</CardBody>
						</Card>
					</Link>
				))}
			</div>
		</div>
	)
}
