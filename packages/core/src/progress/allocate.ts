/**
 * Curriculum-progress allocation — port of the original StudyMate
 * `progress-tracker` algorithm. Greedy, grade-first, depth-first placement of a
 * student's completed courses into the curriculum-group tree, then a bottom-up
 * credit roll-up and per-type completion check.
 *
 * Simplifications vs the Angular original (same results, less machinery):
 *  - Candidates are placed best-grade-first, so a slot is always claimed by the
 *    best available grade — this removes the original's mid-stream "swap a worse
 *    grade out" passes.
 *  - The REQUIRED_BRANCH over-allocation trim is dropped; credit-used is already
 *    capped at the requirement per group, so totals and completion are correct.
 */

export type GroupType =
	| 'REQUIRED_ALL'
	| 'REQUIRED_CREDIT'
	| 'FREE'
	| 'REQUIRED_BRANCH'
	| 'COLLECTIVE'

export type GroupSubject = {
	id: string
	credit: number
	// optional display fields (ignored by allocation; used by the progress UI to
	// list every subject in a group with a "completed" check)
	nameTh?: string | null
	nameEn?: string | null
}

export type ProgressGroupInput = {
	id: number
	name: string
	type: string | null
	credit: number | null
	color: string | null
	/** Subject-code prefix this group accepts beyond its explicit subjects
	 *  (e.g. '90' = any gen-ed subject counts toward this group). */
	acceptPrefix?: string | null
	subjects: GroupSubject[]
	children: ProgressGroupInput[]
}

export type CompletedCourse = { subjectId: string; credit: number; grade: string }

export type ProgressGroupResult = {
	id: number
	name: string
	type: string
	color: string | null
	required: number
	used: number
	complete: boolean
	matched: string[]
	children: ProgressGroupResult[]
}

export type ProgressResult = {
	root: ProgressGroupResult
	totalRequired: number
	totalUsed: number
	remaining: number
	percent: number
	complete: boolean
	unplaced: string[]
}

// Best → worst. Drives both de-duplication (keep best grade per subject) and the
// order subjects claim group slots. F/U/W never place; X only with includeX.
const GRADE_ORDER = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'T', 'X']
const rank = (g: string) => {
	const i = GRADE_ORDER.indexOf(g)
	return i === -1 ? GRADE_ORDER.length : i
}
const EXCLUDED = new Set(['F', 'U', 'W'])

/** Allocate completed courses to the group tree and compute progress. */
export function allocateProgress(
	root: ProgressGroupInput,
	completed: readonly CompletedCourse[],
	opts: { includeX?: boolean } = {},
): ProgressResult {
	// 1. Keep the best grade per subject; drop fails / (optionally) X.
	const best = new Map<string, CompletedCourse>()
	for (const c of completed) {
		const grade = c.grade.toUpperCase().trim()
		if (EXCLUDED.has(grade)) continue
		if (grade === 'X' && !opts.includeX) continue
		const prev = best.get(c.subjectId)
		if (!prev || rank(grade) < rank(prev.grade)) best.set(c.subjectId, { ...c, grade })
	}
	const items = [...best.values()].sort((a, b) => rank(a.grade) - rank(b.grade))

	const required = new Map<number, number>()
	const used = new Map<number, number>()
	const matched = new Map<number, string[]>()
	const rolled = new Map<number, number>()
	const complete = new Map<number, boolean>()

	computeRequired(root, required)
	const unplaced: string[] = []
	for (const item of items) {
		if (!place(item, root, required, used, matched)) unplaced.push(item.subjectId)
	}
	rollup(root, required, used, rolled)
	computeComplete(root, required, rolled, matched, complete)

	const tree = build(root, required, rolled, matched, complete)
	const totalRequired = required.get(root.id) ?? 0
	const totalUsed = rolled.get(root.id) ?? 0
	return {
		root: tree,
		totalRequired,
		totalUsed,
		remaining: Math.max(0, totalRequired - totalUsed),
		percent: totalRequired === 0 ? 0 : Math.min(100, Math.round((totalUsed / totalRequired) * 100)),
		complete: complete.get(root.id) ?? false,
		unplaced,
	}
}

const subjectCredit = (g: ProgressGroupInput) => g.subjects.reduce((s, x) => s + (x.credit || 0), 0)

/** Required credits per group (ported from the original computeRequiredCredits,
 *  in the same branch order):
 *   1. REQUIRED_ALL, or any credit-less leaf bucket with subjects → sum subjects.
 *   2. credit-typed groups (RC/RB/FREE/COLLECTIVE) → their own credit (falling
 *      back to the children sum when unset, so credit-less containers still total).
 *   3. otherwise → children sum + own credit.
 *  Branch 1 MUST precede branch 2 — a COLLECTIVE elective bucket has credit 0 but
 *  needs the subject-sum, or it gets required 0 and can place nothing. */
function computeRequired(g: ProgressGroupInput, required: Map<number, number>): number {
	let childReq = 0
	for (const c of g.children) childReq += computeRequired(c, required)

	const credit = g.credit ?? 0
	let req: number
	if ((g.type === 'REQUIRED_ALL' || credit === 0) && g.subjects.length > 0) {
		req = childReq + subjectCredit(g)
	} else if (
		g.type === 'REQUIRED_CREDIT' ||
		g.type === 'REQUIRED_BRANCH' ||
		g.type === 'FREE' ||
		g.type === 'COLLECTIVE'
	) {
		req = credit > 0 ? credit : childReq
	} else {
		req = childReq + credit
	}
	required.set(g.id, req)
	return req
}

/** Depth-first: try children first, then place into this group if it accepts. */
function place(
	item: CompletedCourse,
	g: ProgressGroupInput,
	required: Map<number, number>,
	used: Map<number, number>,
	matched: Map<number, string[]>,
): boolean {
	const req = required.get(g.id) ?? 0
	const u = used.get(g.id) ?? 0
	if (g.type === 'REQUIRED_BRANCH' && u >= req) return false

	for (const child of g.children) {
		if (place(item, child, required, used, matched)) return true
	}

	const c = item.credit
	const isMember =
		g.subjects.some((s) => s.id === item.subjectId) ||
		(!!g.acceptPrefix && item.subjectId.startsWith(g.acceptPrefix))
	const add = () => {
		used.set(g.id, Math.min(u + c, req))
		const list = matched.get(g.id) ?? []
		list.push(item.subjectId)
		matched.set(g.id, list)
	}

	switch (g.type) {
		case 'REQUIRED_ALL':
			if (isMember && u + c <= req) {
				add()
				return true
			}
			return false
		case 'REQUIRED_CREDIT':
		case 'COLLECTIVE':
		case 'REQUIRED_BRANCH':
			if (isMember && u < req) {
				add()
				return true
			}
			return false
		case 'FREE':
			if (u < req) {
				add()
				return true
			}
			return false
		default:
			return false
	}
}

/** Bottom-up usage: a parent rolls up its children (FREE / subject-less parents
 *  count children only), capped at the requirement. */
function rollup(
	g: ProgressGroupInput,
	required: Map<number, number>,
	used: Map<number, number>,
	rolled: Map<number, number>,
): number {
	const own = used.get(g.id) ?? 0
	let child = 0
	for (const c of g.children) child += rollup(c, required, used, rolled)

	let usage = own
	if (g.children.length > 0) {
		usage = g.subjects.length === 0 || g.type === 'FREE' ? child : own + child
	}
	const req = required.get(g.id) ?? 0
	if (usage > req) usage = req
	rolled.set(g.id, usage)
	return usage
}

function computeComplete(
	g: ProgressGroupInput,
	required: Map<number, number>,
	rolled: Map<number, number>,
	matched: Map<number, string[]>,
	complete: Map<number, boolean>,
): boolean {
	const req = required.get(g.id) ?? 0
	const u = rolled.get(g.id) ?? 0
	let childOK = true
	for (const c of g.children) {
		if (!computeComplete(c, required, rolled, matched, complete)) childOK = false
	}

	let done: boolean
	switch (g.type) {
		case 'REQUIRED_ALL':
			done = g.children.length
				? childOK
				: g.subjects.length
					? (matched.get(g.id)?.length ?? 0) === g.subjects.length
					: true
			break
		case 'REQUIRED_CREDIT':
		case 'FREE':
			done = u >= req
			break
		case 'REQUIRED_BRANCH':
			done = g.children.length > 0 && u >= req && g.children.some((c) => complete.get(c.id))
			break
		default:
			done = g.children.length ? childOK : u >= req && req > 0
	}
	complete.set(g.id, done)
	return done
}

function build(
	g: ProgressGroupInput,
	required: Map<number, number>,
	rolled: Map<number, number>,
	matched: Map<number, string[]>,
	complete: Map<number, boolean>,
): ProgressGroupResult {
	return {
		id: g.id,
		name: g.name,
		type: g.type ?? 'COLLECTIVE',
		color: g.color,
		required: required.get(g.id) ?? 0,
		used: rolled.get(g.id) ?? 0,
		complete: complete.get(g.id) ?? false,
		matched: matched.get(g.id) ?? [],
		children: g.children.map((c) => build(c, required, rolled, matched, complete)),
	}
}
