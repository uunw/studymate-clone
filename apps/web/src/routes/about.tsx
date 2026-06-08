import { Card, CardBody } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
	component: About,
})

const REPO_URL = 'https://github.com/uunw/studymate-clone'
const ORIGINAL_URL = 'https://github.com/kmitl-savvy-students'

const STACK = [
	['TanStack Start + React 19', 'SSR, file-based routing, server functions'],
	['TanStack Query + Form', 'data fetching / caching และฟอร์ม'],
	['Drizzle ORM + PostgreSQL', 'ฐานข้อมูล (Neon-ready)'],
	['Better Auth', 'email+password, student-id username, KMITL SSO (OIDC)'],
	['Tailwind CSS v4', 'UI'],
	['Turborepo + pnpm', 'monorepo, code split, lazy load'],
]

function About() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<h1 className="font-bold text-2xl text-slate-900 tracking-tight">เกี่ยวกับโปรเจกต์</h1>

			<Card>
				<CardBody className="space-y-4 text-slate-700 text-sm leading-relaxed">
					<p>
						<strong>StudyMate Clone</strong> เป็นโปรเจกต์ <strong>โอเพนซอร์ส</strong>{' '}
						ที่สร้างขึ้นใหม่ตั้งแต่ต้นโดยได้แรงบันดาลใจจาก StudyMate เว็บรีวิวรายวิชาของ KMITL เดิม
						เนื่องจากโฮสติ้งของเว็บต้นฉบับหยุดให้บริการ จึงรวบรวมแนวคิดเดิมมาสร้างใหม่ เพื่อให้นักศึกษายังคงค้นหารายวิชา
						อ่านรีวิวจากรุ่นพี่ และติดตามความก้าวหน้าของหลักสูตรได้ต่อไป
					</p>
					<p>
						โปรเจกต์นี้ <strong>ไม่มีส่วนเกี่ยวข้องกับ KMITL</strong> อย่างเป็นทางการ และจัดทำขึ้นเพื่อการศึกษาเท่านั้น
						เนื้อหารีวิวทั้งหมดมาจากผู้ใช้งาน ไม่ใช่ข้อมูลจากสถาบัน
					</p>
				</CardBody>
			</Card>

			<Card>
				<CardBody className="space-y-3">
					<h2 className="font-semibold text-slate-900">เทคโนโลยีที่ใช้</h2>
					<ul className="space-y-2">
						{STACK.map(([name, desc]) => (
							<li key={name} className="text-sm">
								<span className="font-medium text-slate-800">{name}</span>
								<span className="text-slate-500"> — {desc}</span>
							</li>
						))}
					</ul>
				</CardBody>
			</Card>

			<Card>
				<CardBody className="space-y-3">
					<h2 className="font-semibold text-slate-900">ลิงก์</h2>
					<ul className="space-y-2 text-sm">
						<li>
							<a
								href={REPO_URL}
								target="_blank"
								rel="noreferrer"
								className="font-medium text-brand-700 hover:underline"
							>
								ซอร์สโค้ดโปรเจกต์นี้ (GitHub) →
							</a>
							<span className="text-slate-500"> เปิด issue หรือร่วมพัฒนาได้</span>
						</li>
						<li>
							<a
								href={ORIGINAL_URL}
								target="_blank"
								rel="noreferrer"
								className="font-medium text-brand-700 hover:underline"
							>
								StudyMate ต้นฉบับ — kmitl-savvy-students →
							</a>
							<span className="text-slate-500"> เครดิตแนวคิดและฟีเจอร์เดิม</span>
						</li>
					</ul>
				</CardBody>
			</Card>
		</div>
	)
}
