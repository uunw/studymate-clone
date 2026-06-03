import { Card, CardBody } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy-policy')({
	component: PrivacyPolicy,
})

function PrivacyPolicy() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<h1 className="font-bold text-2xl text-slate-900 tracking-tight">นโยบายความเป็นส่วนตัว</h1>

			<Card>
				<CardBody className="prose prose-slate max-w-none">
					<p>
						StudyMate Clone เป็นโปรเจกต์เพื่อการศึกษาและสาธิต (student project / demo)
						นโยบายฉบับนี้เป็นเพียงตัวอย่างเบื้องต้น และอาจมีการปรับปรุงได้ตลอดเวลา
					</p>
					<h2>ข้อมูลที่เราเก็บ</h2>
					<p>
						เมื่อคุณสมัครสมาชิก เราจะเก็บข้อมูลพื้นฐาน เช่น ชื่อผู้ใช้ อีเมล และชื่อเล่น
						เพื่อใช้ในการเข้าสู่ระบบและแสดงผลรีวิวของคุณ หากคุณอัปโหลด transcript
						ข้อมูลดังกล่าวจะถูกใช้เพื่อแสดงความก้าวหน้าของหลักสูตรให้คุณเท่านั้น
					</p>
					<h2>การใช้ข้อมูล</h2>
					<p>
						เราใช้ข้อมูลของคุณเพื่อให้บริการฟีเจอร์ต่าง ๆ ของเว็บไซต์เท่านั้น
						เราไม่ขายหรือเปิดเผยข้อมูลส่วนบุคคลของคุณให้บุคคลภายนอกเพื่อวัตถุประสงค์ทางการค้า
					</p>
					<h2>การลบข้อมูล</h2>
					<p>
						คุณสามารถขอลบบัญชีและข้อมูลที่เกี่ยวข้องได้ เนื่องจากเป็นโปรเจกต์สาธิต
						โปรดอย่าใส่ข้อมูลที่ละเอียดอ่อนหรือเป็นความลับลงในระบบ
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
