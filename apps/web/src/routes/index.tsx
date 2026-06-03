import { Button, Card, CardBody } from '@repo/ui'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	const { user } = Route.useRouteContext()
	return (
		<div className="space-y-12">
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
