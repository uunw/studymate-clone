import { Card, CardBody } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
	component: About,
})

function About() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<h1 className="font-bold text-2xl text-slate-900 tracking-tight">เกี่ยวกับโปรเจกต์</h1>

			<Card>
				<CardBody className="prose prose-slate max-w-none">
					<p>
						StudyMate Clone เป็นโปรเจกต์ <strong>โอเพนซอร์ส</strong> ที่สร้างขึ้นใหม่โดยอ้างอิงจาก StudyMate
						เว็บรีวิวรายวิชาของ KMITL เดิม เนื่องจากโฮสติ้งของเว็บต้นฉบับหยุดให้บริการ
						จึงรวบรวมแนวคิดเดิมมาสร้างใหม่ตั้งแต่ต้น เพื่อให้นักศึกษายังคงค้นหารายวิชา อ่านรีวิวจากรุ่นพี่
						และติดตามความก้าวหน้าของหลักสูตรได้ต่อไป
					</p>
					<p>
						โปรเจกต์นี้ <strong>ไม่มีส่วนเกี่ยวข้องกับ KMITL</strong> อย่างเป็นทางการ และจัดทำขึ้นเพื่อการศึกษาเท่านั้น
						เนื้อหารีวิวทั้งหมดมาจากผู้ใช้งาน ไม่ใช่ข้อมูลจากสถาบัน
					</p>
					<h2>เทคโนโลยีที่ใช้</h2>
					<ul>
						<li>
							<strong>TanStack Start</strong> + React 19 สำหรับ frontend และ server functions
						</li>
						<li>
							<strong>Drizzle ORM</strong> สำหรับจัดการฐานข้อมูล
						</li>
						<li>
							<strong>Better Auth</strong> สำหรับระบบสมาชิกและการยืนยันตัวตน
						</li>
					</ul>
					<p>
						ซอร์สโค้ดทั้งหมดเปิดให้ดูและร่วมพัฒนาได้ หากพบข้อผิดพลาดหรืออยากเสนอแนะ สามารถเปิด issue บน repository
						ได้เลย
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
