import { Button, Card, CardBody, Field, Modal } from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculaQuery } from '~/queries'
import { selectCurriculum } from '~/server/profile'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	const { user } = Route.useRouteContext()
	return (
		<div className="space-y-12">
			{user && !user.curriculumId && <CurriculumGate />}
			<section className="py-12 text-center">
				<h1 className="font-bold text-4xl text-slate-900 tracking-tight sm:text-5xl">
					รีวิวรายวิชา KMITL
					<span className="block text-brand-600">วางแผนหลักสูตรของคุณ</span>
				</h1>
				<p className="mx-auto mt-4 max-w-xl text-slate-600">
					ค้นหารายวิชา อ่านรีวิวจากรุ่นพี่ ติดตามความก้าวหน้าหลักสูตรจาก transcript ของคุณ
				</p>
				<div className="mt-6 flex justify-center gap-3">
					<Link to="/subjects">
						<Button size="lg">เริ่มค้นหารายวิชา</Button>
					</Link>
					{!user && (
						<Link to="/sign-in">
							<Button size="lg" variant="secondary">
								เข้าสู่ระบบ KMITL
							</Button>
						</Link>
					)}
				</div>
			</section>

			<section className="grid gap-4 sm:grid-cols-3">
				{[
					{ title: 'ค้นหารายวิชา', body: 'กรองตามหลักสูตร ปีการศึกษา และหมวดวิชา' },
					{ title: 'รีวิว & ให้คะแนน', body: 'แบ่งปันประสบการณ์เรียน ให้คะแนน กดถูกใจรีวิว' },
					{ title: 'ติดตามหลักสูตร', body: 'อัปโหลด transcript แล้วดูความก้าวหน้าหน่วยกิต' },
				].map((f) => (
					<Card key={f.title}>
						<CardBody>
							<h3 className="font-semibold text-brand-700">{f.title}</h3>
							<p className="mt-1 text-slate-600 text-sm">{f.body}</p>
						</CardBody>
					</Card>
				))}
			</section>
		</div>
	)
}

/** Forced curriculum picker shown to a signed-in user who hasn't chosen one. */
function CurriculumGate() {
	const router = useRouter()
	const { data: curricula } = useQuery(curriculaQuery())
	const [busy, setBusy] = useState(false)

	async function choose(value: string) {
		const curriculumId = Number(value)
		if (!curriculumId) return
		setBusy(true)
		try {
			await selectCurriculum({ data: { curriculumId } })
			await router.invalidate()
		} finally {
			setBusy(false)
		}
	}

	return (
		<Modal open dismissable={false} title="เลือกหลักสูตรของคุณ">
			<div className="space-y-3">
				<p className="text-slate-600 text-sm">
					เลือกหลักสูตรเพื่อเริ่มใช้งานการติดตามความก้าวหน้าและรีวิวตามหลักสูตรของคุณ
				</p>
				<Field label="หลักสูตร" htmlFor="gate-curriculum">
					<select
						id="gate-curriculum"
						disabled={busy}
						defaultValue=""
						onChange={(e) => choose(e.target.value)}
						className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
					>
						<option value="" disabled>
							— เลือกหลักสูตร —
						</option>
						{(curricula ?? []).map((c) => (
							<option key={c.id} value={c.id}>
								{c.nameTh} ({c.year})
							</option>
						))}
					</select>
				</Field>
			</div>
		</Modal>
	)
}
