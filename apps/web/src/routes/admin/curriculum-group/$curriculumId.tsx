import {
	Alert,
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	EmptyState,
	Field,
	Input,
	Textarea,
} from '@repo/ui'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculumGroupTreeQuery } from '~/queries'
import type { AdminGroupNode } from '~/server/curriculum-group'
import {
	assignSubjectsToGroup,
	createCurriculumGroup,
	deleteCurriculumGroup,
	removeSubjectFromGroup,
	updateCurriculumGroup,
} from '~/server/curriculum-group'

export const Route = createFileRoute('/admin/curriculum-group/$curriculumId')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
		if (!context.user.isAdmin) throw redirect({ to: '/' })
	},
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(curriculumGroupTreeQuery(Number(params.curriculumId)))
	},
	component: CurriculumGroupManager,
})

const GROUP_TYPE_VALUES = [
	'COLLECTIVE',
	'REQUIRED_ALL',
	'REQUIRED_CREDIT',
	'REQUIRED_BRANCH',
	'FREE',
] as const
type GroupType = (typeof GROUP_TYPE_VALUES)[number]
const TYPE_LABELS: Record<GroupType, string> = {
	COLLECTIVE: 'กลุ่มรวม',
	REQUIRED_ALL: 'บังคับทุกวิชา',
	REQUIRED_CREDIT: 'บังคับตามหน่วยกิต',
	REQUIRED_BRANCH: 'บังคับเลือกแขนง',
	FREE: 'วิชาเลือกเสรี',
}

type Editor = { mode: 'create'; parentId: number } | { mode: 'edit'; node: AdminGroupNode }

function CurriculumGroupManager() {
	const { curriculumId } = Route.useParams()
	const cid = Number(curriculumId)
	const qc = useQueryClient()
	const { data } = useSuspenseQuery(curriculumGroupTreeQuery(cid))
	const [editor, setEditor] = useState<Editor | null>(null)
	const [subjectsFor, setSubjectsFor] = useState<AdminGroupNode | null>(null)
	const [error, setError] = useState<string | null>(null)

	const refresh = () => qc.invalidateQueries({ queryKey: ['curriculum-group-tree', cid] })

	async function onDelete(node: AdminGroupNode) {
		setError(null)
		try {
			await deleteCurriculumGroup({ data: node.id })
			if (subjectsFor?.id === node.id) setSubjectsFor(null)
			if (editor && editor.mode === 'edit' && editor.node.id === node.id) setEditor(null)
			await refresh()
		} catch {
			setError('ลบกลุ่มไม่สำเร็จ')
		}
	}

	if (!data) {
		return <Alert tone="error">ไม่พบหลักสูตร</Alert>
	}

	return (
		<div className="space-y-6">
			<div>
				<Link to="/admin/curricula" className="text-brand-700 text-sm hover:underline">
					← กลับไปหน้าหลักสูตร
				</Link>
				<h1 className="mt-1 font-bold text-2xl text-slate-900">โครงสร้างกลุ่มวิชา</h1>
				<p className="text-slate-500 text-sm">{data.curriculum.nameTh ?? data.curriculum.nameEn}</p>
			</div>

			{error && <Alert tone="error">{error}</Alert>}

			{editor && (
				<NodeEditor
					key={editor.mode === 'edit' ? `edit-${editor.node.id}` : `create-${editor.parentId}`}
					editor={editor}
					onClose={() => setEditor(null)}
					onSaved={async () => {
						setEditor(null)
						await refresh()
					}}
				/>
			)}

			{subjectsFor && (
				<SubjectPanel
					key={`subj-${subjectsFor.id}`}
					group={subjectsFor}
					onClose={() => setSubjectsFor(null)}
					onChanged={refresh}
				/>
			)}

			<Card>
				<CardHeader className="flex items-center justify-between">
					<h2 className="font-semibold text-slate-900">โครงสร้าง</h2>
					{!data.root && (
						<Button size="sm" onClick={() => setEditor({ mode: 'create', parentId: 0 })}>
							สร้างกลุ่มราก
						</Button>
					)}
				</CardHeader>
				<CardBody>
					{data.root ? (
						<GroupRow
							node={data.root}
							depth={0}
							onAddChild={(p) => setEditor({ mode: 'create', parentId: p })}
							onEdit={(n) => setEditor({ mode: 'edit', node: n })}
							onDelete={onDelete}
							onSubjects={(n) => setSubjectsFor(n)}
						/>
					) : (
						<EmptyState
							title="ยังไม่มีโครงสร้างกลุ่ม"
							description="สร้างกลุ่มรากเพื่อเริ่มกำหนดโครงสร้างหลักสูตร"
						/>
					)}
				</CardBody>
			</Card>
		</div>
	)
}

function GroupRow({
	node,
	depth,
	onAddChild,
	onEdit,
	onDelete,
	onSubjects,
}: {
	node: AdminGroupNode
	depth: number
	onAddChild: (parentId: number) => void
	onEdit: (node: AdminGroupNode) => void
	onDelete: (node: AdminGroupNode) => void
	onSubjects: (node: AdminGroupNode) => void
}) {
	return (
		<div
			style={{ marginLeft: depth > 0 ? 16 : 0 }}
			className={depth > 0 ? 'mt-2 border-slate-100 border-l pl-3' : ''}
		>
			<div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
				{node.color && (
					<span className="h-3 w-3 shrink-0 rounded-full" style={{ background: node.color }} />
				)}
				<span className="font-medium text-slate-800 text-sm">{node.name}</span>
				<Badge tone="brand">{TYPE_LABELS[node.type as GroupType] ?? node.type}</Badge>
				{node.credit != null && <span className="text-slate-400 text-xs">{node.credit} นก.</span>}
				{node.subjects.length > 0 && (
					<span className="text-slate-400 text-xs">· {node.subjects.length} วิชา</span>
				)}
				<div className="ml-auto flex gap-1">
					<Button size="sm" variant="ghost" onClick={() => onAddChild(node.id)}>
						+ กลุ่มย่อย
					</Button>
					<Button size="sm" variant="ghost" onClick={() => onSubjects(node)}>
						วิชา
					</Button>
					<Button size="sm" variant="secondary" onClick={() => onEdit(node)}>
						แก้ไข
					</Button>
					<Button size="sm" variant="danger" onClick={() => onDelete(node)}>
						ลบ
					</Button>
				</div>
			</div>
			{node.children.map((c) => (
				<GroupRow
					key={c.id}
					node={c}
					depth={depth + 1}
					onAddChild={onAddChild}
					onEdit={onEdit}
					onDelete={onDelete}
					onSubjects={onSubjects}
				/>
			))}
		</div>
	)
}

function NodeEditor({
	editor,
	onClose,
	onSaved,
}: {
	editor: Editor
	onClose: () => void
	onSaved: () => void
}) {
	const isEdit = editor.mode === 'edit'
	const node = isEdit ? editor.node : null
	const [type, setType] = useState<GroupType>((node?.type as GroupType) ?? 'REQUIRED_CREDIT')
	const [name, setName] = useState(node?.name ?? '')
	const [credit, setCredit] = useState<string>(node?.credit != null ? String(node.credit) : '')
	const [color, setColor] = useState(node?.color ?? '#2563eb')
	const [acceptPrefix, setAcceptPrefix] = useState(node?.acceptPrefix ?? '')
	const [saving, setSaving] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!name.trim()) {
			setErr('กรุณากรอกชื่อกลุ่ม')
			return
		}
		setSaving(true)
		setErr(null)
		const payload = {
			type,
			name: name.trim(),
			credit: credit === '' ? null : Number(credit),
			color: color || null,
			acceptPrefix: acceptPrefix.trim() || null,
		}
		try {
			if (isEdit && node) {
				await updateCurriculumGroup({ data: { ...payload, id: node.id } })
			} else if (editor.mode === 'create') {
				await createCurriculumGroup({ data: { ...payload, parentId: editor.parentId } })
			}
			onSaved()
		} catch {
			setErr('บันทึกไม่สำเร็จ')
			setSaving(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<h2 className="font-semibold text-slate-900">{isEdit ? 'แก้ไขกลุ่ม' : 'เพิ่มกลุ่ม'}</h2>
			</CardHeader>
			<CardBody>
				{err && <Alert tone="error">{err}</Alert>}
				<form className="space-y-4" onSubmit={onSubmit}>
					<Field label="ประเภทกลุ่ม" htmlFor="group-type">
						<select
							id="group-type"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
							value={type}
							onChange={(e) => setType(e.target.value as GroupType)}
						>
							{GROUP_TYPE_VALUES.map((t) => (
								<option key={t} value={t}>
									{TYPE_LABELS[t]} ({t})
								</option>
							))}
						</select>
					</Field>
					<Field label="ชื่อกลุ่ม" htmlFor="group-name">
						<Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} />
					</Field>
					<div className="flex gap-4">
						<div className="flex-1">
							<Field label="หน่วยกิต" htmlFor="group-credit">
								<Input
									id="group-credit"
									type="number"
									inputMode="numeric"
									value={credit}
									onChange={(e) => setCredit(e.target.value)}
								/>
							</Field>
						</div>
						<Field label="สี" htmlFor="group-color">
							<input
								id="group-color"
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="h-10 w-16 rounded-lg border border-slate-300"
							/>
						</Field>
					</div>
					<Field
						label="รับรหัสขึ้นต้นด้วย (ไม่บังคับ)"
						htmlFor="group-prefix"
						hint="เช่น 90 = นับวิชา gen-ed ทุกตัวเข้ากลุ่มนี้ (นอกเหนือจากวิชาที่ผูกไว้) จนเต็มหน่วยกิต"
					>
						<Input
							id="group-prefix"
							value={acceptPrefix}
							onChange={(e) => setAcceptPrefix(e.target.value)}
							placeholder="90"
						/>
					</Field>
					<div className="flex gap-2">
						<Button type="submit" loading={saving}>
							{isEdit ? 'บันทึก' : 'เพิ่ม'}
						</Button>
						<Button type="button" variant="ghost" onClick={onClose}>
							ยกเลิก
						</Button>
					</div>
				</form>
			</CardBody>
		</Card>
	)
}

function SubjectPanel({
	group,
	onClose,
	onChanged,
}: {
	group: AdminGroupNode
	onClose: () => void
	onChanged: () => void
}) {
	const [codes, setCodes] = useState('')
	const [busy, setBusy] = useState(false)
	const [result, setResult] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

	async function onAdd(e: React.FormEvent) {
		e.preventDefault()
		setBusy(true)
		setResult(null)
		try {
			const res = await assignSubjectsToGroup({ data: { groupId: group.id, codes } })
			setCodes('')
			onChanged()
			setResult({
				tone: 'success',
				message:
					`เพิ่ม ${res.added} วิชา` +
					(res.skipped.length
						? ` · ข้าม ${res.skipped.length} (ไม่พบในระบบ: ${res.skipped.join(', ')})`
						: ''),
			})
		} catch {
			setResult({ tone: 'error', message: 'เพิ่มวิชาไม่สำเร็จ' })
		} finally {
			setBusy(false)
		}
	}

	async function onRemove(subjectId: string) {
		await removeSubjectFromGroup({ data: { groupId: group.id, subjectId } })
		onChanged()
	}

	return (
		<Card>
			<CardHeader className="flex items-center justify-between">
				<h2 className="font-semibold text-slate-900">วิชาในกลุ่ม: {group.name}</h2>
				<Button size="sm" variant="ghost" onClick={onClose}>
					ปิด
				</Button>
			</CardHeader>
			<CardBody className="space-y-4">
				{result && <Alert tone={result.tone}>{result.message}</Alert>}

				{group.subjects.length === 0 ? (
					<p className="text-slate-400 text-sm">ยังไม่มีวิชาในกลุ่มนี้</p>
				) : (
					<ul className="divide-y divide-slate-50">
						{group.subjects.map((s) => (
							<li key={s.id} className="flex items-center gap-3 py-2">
								<div className="min-w-0 flex-1">
									<p className="truncate text-slate-700 text-sm">
										{s.id} {s.nameTh ?? s.nameEn ?? ''}
									</p>
								</div>
								<span className="shrink-0 text-slate-400 text-xs">{s.credit ?? '-'} นก.</span>
								<Button size="sm" variant="ghost" onClick={() => onRemove(s.id)}>
									ลบ
								</Button>
							</li>
						))}
					</ul>
				)}

				<form className="space-y-2" onSubmit={onAdd}>
					<Field label="เพิ่มรหัสวิชา (คั่นด้วยเว้นวรรค/จุลภาค)" htmlFor="codes">
						<Textarea
							id="codes"
							rows={2}
							value={codes}
							onChange={(e) => setCodes(e.target.value)}
							placeholder="01076011 01076031 ..."
						/>
					</Field>
					<Button type="submit" size="sm" loading={busy} disabled={!codes.trim()}>
						เพิ่มวิชา
					</Button>
				</form>
			</CardBody>
		</Card>
	)
}
