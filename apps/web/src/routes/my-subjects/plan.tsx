import { Alert, Badge, Card, CardBody, EmptyState, Spinner } from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { registrationPlanQuery } from '~/queries'

export const Route = createFileRoute('/my-subjects/plan')({
	component: PlanTab,
})

function PlanTab() {
	// Student id comes straight from the signed-in account (its 8-digit username);
	// the server fn defaults to it, so no input is needed. Fetched client-side
	// (non-blocking) so a slow/down registrar doesn't stall the page.
	const { data } = useQuery(registrationPlanQuery())

	return (
		<div className="space-y-5">
			<Card>
				<CardBody>
					<h2 className="font-semibold text-slate-900">แนะนำลงทะเบียน</h2>
					<p className="mt-1 text-slate-500 text-sm">
						วิชาที่หลักสูตรแนะนำให้ลงในเทอมถัดไป ดึงจากระบบ pre-registration ของ KMITL registrar
						{data?.studentId ? ` · รหัสนักศึกษา ${data.studentId}` : ''}
					</p>
				</CardBody>
			</Card>

			{!data ? (
				<div className="flex justify-center py-10">
					<Spinner />
				</div>
			) : data.error === 'INVALID_ID' ? (
				<Alert tone="error">บัญชีนี้ไม่มีรหัสนักศึกษา 8 หลัก จึงดึงแผนแนะนำลงทะเบียนไม่ได้</Alert>
			) : data.error === 'FETCH_FAILED' ? (
				<Alert tone="error">ดึงข้อมูลจาก registrar ไม่สำเร็จ ลองใหม่อีกครั้ง</Alert>
			) : data.items.length === 0 ? (
				<EmptyState
					title="ยังไม่มีแผนแนะนำ"
					description="ยังไม่มีวิชาแนะนำสำหรับเทอมนี้ (อาจยังไม่เปิดช่วง pre-registration หรือรหัสนักศึกษาไม่อยู่ในระบบ registrar)"
				/>
			) : (
				<>
					<Card>
						<CardBody className="flex items-center justify-between">
							<div>
								<p className="text-slate-500 text-sm">หน่วยกิตแนะนำ (ยังไม่ได้ลง)</p>
								<p className="font-bold text-3xl text-brand-700">{data.totalCredit}</p>
							</div>
							<p className="max-w-[14rem] text-right text-slate-500 text-xs">
								{data.items.length} วิชาแนะนำ · เพดานลงทะเบียนปกติ ~22–27 นก./เทอม
							</p>
						</CardBody>
					</Card>

					<div className="space-y-2">
						{data.items.map((it) => (
							<Card key={it.subjectId}>
								<CardBody className="flex items-center gap-3 py-3">
									<span className="text-brand-500">↑</span>
									<div className="min-w-0 flex-1">
										<Link
											to="/subjects/$subjectId"
											params={{ subjectId: it.subjectId }}
											className="font-medium text-slate-800 text-sm hover:text-brand-700 hover:underline"
										>
											{it.subjectId} {it.nameTh ?? it.nameEn ?? ''}
										</Link>
										<div className="mt-0.5 flex flex-wrap items-center gap-2 text-slate-500 text-xs">
											{it.section && <span>sec {it.section}</span>}
											{it.groupName && (
												<>
													<span>·</span>
													<span>{it.groupName}</span>
												</>
											)}
										</div>
									</div>
									<span className="shrink-0 text-slate-500 text-sm">
										{it.credit != null ? `${it.credit} นก.` : '-'}
									</span>
									{it.taken && <Badge tone="green">ลงแล้ว</Badge>}
								</CardBody>
							</Card>
						))}
					</div>

					{data.items.every((i) => i.taken) && <Alert tone="success">ลงครบตามแผนเทอมนี้แล้ว 🎉</Alert>}
				</>
			)}
		</div>
	)
}
