import { termGpa } from '@repo/core/progress'
import { Button, Card, CardBody, CardHeader, Select } from '@repo/ui'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Detail } from '~/components/my-subjects-types'
import { myTranscriptQuery } from '~/queries'

export const Route = createFileRoute('/my-subjects/grades')({
	component: GradesTab,
})

function GradesTab() {
	const { data } = useSuspenseQuery(myTranscriptQuery())
	if (!data) return null
	return <GradeTracker details={data.details} />
}

const GRADE_OPTIONS = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'S', 'U', 'T', 'W']

function GradeTracker({ details }: { details: Detail[] }) {
	const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

	const effective = useMemo(
		() => details.map((d) => ({ ...d, grade: overrides.get(d.id) ?? d.grade })),
		[details, overrides],
	)
	const { terms, finalGpa } = useMemo(
		() =>
			termGpa(
				effective.map((d) => ({
					grade: d.grade ?? '',
					credit: d.credit ?? 0,
					year: d.year,
					term: d.term,
				})),
			),
		[effective],
	)
	const dirty = overrides.size > 0

	function setGrade(id: number, grade: string) {
		setOverrides((prev) => {
			const next = new Map(prev)
			next.set(id, grade)
			return next
		})
	}

	const byTerm = useMemo(() => {
		const m = new Map<string, Detail[]>()
		for (const d of effective) {
			const key = d.year != null && d.term != null ? `${d.year}-${d.term}` : 'transfer'
			const list = m.get(key) ?? []
			list.push(d)
			m.set(key, list)
		}
		return m
	}, [effective])

	return (
		<div className="space-y-5">
			<Card>
				<CardBody className="flex items-center justify-between gap-4">
					<div>
						<p className="text-slate-500 text-sm">GPAX ที่คำนวณ {dirty && '(จำลอง)'}</p>
						<p className="font-bold text-3xl text-brand-700">{finalGpa.toFixed(2)}</p>
					</div>
					{dirty && (
						<Button variant="ghost" size="sm" onClick={() => setOverrides(new Map())}>
							รีเซ็ตเกรด
						</Button>
					)}
				</CardBody>
			</Card>

			{terms.map((t) => (
				<Card key={t.key}>
					<CardHeader className="flex items-center justify-between">
						<h2 className="font-semibold text-slate-900 text-sm">
							{t.year == null ? 'หน่วยกิตเทียบโอน' : `ปีการศึกษา ${t.year} · ภาคเรียนที่ ${t.term}`}
						</h2>
						{t.year != null && (
							<span className="text-slate-500 text-xs">
								GPS {t.gps.toFixed(2)} · GPA {t.gpa.toFixed(2)}
							</span>
						)}
					</CardHeader>
					<CardBody className="divide-y divide-slate-50 p-0">
						{(byTerm.get(t.key) ?? []).map((d) => (
							<div key={d.id} className="flex items-center gap-3 px-5 py-2.5">
								<div className="min-w-0 flex-1">
									<p className="truncate text-slate-700 text-sm">
										{d.subjectId} {d.nameTh ?? d.nameEn ?? ''}
									</p>
								</div>
								<span className="shrink-0 text-slate-500 text-xs">{d.credit ?? '-'} นก.</span>
								<Select
									aria-label={`แก้ไขเกรด ${d.subjectId}`}
									className="h-9 shrink-0"
									value={d.grade ?? ''}
									onChange={(e) => setGrade(d.id, e.target.value)}
								>
									{!d.grade && <option value="">-</option>}
									{GRADE_OPTIONS.map((g) => (
										<option key={g} value={g}>
											{g}
										</option>
									))}
								</Select>
							</div>
						))}
					</CardBody>
				</Card>
			))}
		</div>
	)
}
