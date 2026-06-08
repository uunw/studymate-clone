import { termGpa } from '@repo/core/progress'
import { formatThaiDate, isPassing } from '@repo/core/utils'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from '@repo/ui'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Detail } from '~/components/my-subjects-types'
import { myTranscriptQuery } from '~/queries'
import { deleteTranscript } from '~/server/transcript'

export const Route = createFileRoute('/my-subjects/transcript')({
	component: TranscriptTab,
})

function TranscriptTab() {
	const qc = useQueryClient()
	const { data } = useSuspenseQuery(myTranscriptQuery())
	const [deleting, setDeleting] = useState(false)
	if (!data) return null

	async function onDelete() {
		setDeleting(true)
		try {
			await deleteTranscript()
			await qc.invalidateQueries({ queryKey: ['my-transcript'] })
		} finally {
			setDeleting(false)
		}
	}

	return (
		<TranscriptView
			details={data.details}
			createdAt={data.transcript.createdAt}
			onDelete={onDelete}
			deleting={deleting}
		/>
	)
}

type TermGroup = { key: string; year: number | null; term: number | null; items: Detail[] }

function groupByTerm(details: Detail[]): TermGroup[] {
	const groups = new Map<string, TermGroup>()
	for (const d of details) {
		const key = d.year != null && d.term != null ? `${d.year}-${d.term}` : 'transfer'
		const g = groups.get(key)
		if (g) g.items.push(d)
		else groups.set(key, { key, year: d.year, term: d.term, items: [d] })
	}
	return [...groups.values()].sort((a, b) => {
		const rank = (g: TermGroup) => (g.year == null ? -1 : g.year * 10 + (g.term ?? 0))
		return rank(a) - rank(b)
	})
}

function TranscriptView({
	details,
	createdAt,
	onDelete,
	deleting,
}: {
	details: Detail[]
	createdAt: string | Date
	onDelete: () => void
	deleting: boolean
}) {
	const { finalGpa } = termGpa(
		details.map((d) => ({
			grade: d.grade ?? '',
			credit: d.credit ?? 0,
			year: d.year,
			term: d.term,
		})),
	)
	const totalCredit = details.reduce(
		(s, d) => s + (isPassing(d.grade ?? '') ? (d.credit ?? 0) : 0),
		0,
	)
	const uploadedAt = formatThaiDate(new Date(createdAt))
	const groups = groupByTerm(details)

	return (
		<div className="space-y-6">
			<Card>
				<CardBody className="flex items-center justify-between gap-4">
					<div>
						<p className="text-slate-500 text-sm">เกรดเฉลี่ยสะสม (GPAX)</p>
						<p className="font-bold text-3xl text-brand-700">{finalGpa.toFixed(2)}</p>
					</div>
					<div className="text-right text-slate-400 text-xs">
						<p>
							{details.length} รายวิชา · {totalCredit} หน่วยกิตสะสม
						</p>
						<p>นำเข้าเมื่อ {uploadedAt}</p>
						<Button
							variant="danger"
							size="sm"
							loading={deleting}
							onClick={onDelete}
							className="mt-2"
						>
							ลบ transcript
						</Button>
					</div>
				</CardBody>
			</Card>

			{groups.length === 0 ? (
				<EmptyState title="ไม่พบรายวิชาใน transcript" />
			) : (
				groups.map((g) => (
					<Card key={g.key}>
						<CardHeader>
							<h2 className="font-semibold text-slate-900">
								{g.year == null ? 'หน่วยกิตเทียบโอน' : `ปีการศึกษา ${g.year} · ภาคเรียนที่ ${g.term}`}
							</h2>
							{g.year == null && <p className="text-slate-400 text-xs">Transfer Credit</p>}
						</CardHeader>
						<CardBody className="divide-y divide-slate-50 p-0">
							{g.items.map((d) => (
								<div key={d.id} className="flex items-center gap-3 px-5 py-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-slate-800 text-sm">
											{d.subjectId} {d.nameTh ?? d.nameEn ?? ''}
										</p>
										{d.nameTh && d.nameEn && (
											<p className="truncate text-slate-400 text-xs">{d.nameEn}</p>
										)}
									</div>
									<span className="shrink-0 text-slate-500 text-sm">{d.credit ?? '-'} นก.</span>
									{d.grade && (
										<Badge tone={isPassing(d.grade) ? 'green' : d.grade === 'T' ? 'slate' : 'red'}>
											{d.grade}
										</Badge>
									)}
								</div>
							))}
						</CardBody>
					</Card>
				))
			)}
		</div>
	)
}
