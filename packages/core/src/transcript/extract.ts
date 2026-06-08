import { getDocumentProxy } from 'unpdf'

const PDF_MAGIC = '%PDF-'
export const MAX_TRANSCRIPT_BYTES = 15 * 1024 * 1024 // 15 MB, matches original

type Item = { str?: string; transform?: number[] }

/**
 * Extract text from a transcript PDF, COLUMN-AWARE. KMITL's official transcript
 * is a two-column page where a semester's courses can spill into the right
 * column under a "Continue next column" marker. A naive (reading-order) extract
 * interleaves the columns, so the spilled courses lose their semester. Here we
 * split items by x into left/right columns, read each column fully top→bottom,
 * and emit left-then-right — so spilled courses keep following their header.
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
	if (data.byteLength > MAX_TRANSCRIPT_BYTES) {
		throw new Error('ไฟล์มีขนาดใหญ่เกิน 15 MB')
	}
	if (new TextDecoder().decode(data.slice(0, 5)) !== PDF_MAGIC) {
		throw new Error('ไฟล์ไม่ใช่ PDF ที่ถูกต้อง')
	}

	const pdf = await getDocumentProxy(data)
	const lines: string[] = []

	for (let p = 1; p <= pdf.numPages; p++) {
		const page = await pdf.getPage(p)
		const viewport = page.getViewport({ scale: 1 })
		const midX = viewport.width / 2
		const content = await page.getTextContent()
		const items = (content.items as Item[]).filter(
			(it): it is { str: string; transform: number[] } =>
				typeof it.str === 'string' && it.str.trim() !== '' && Array.isArray(it.transform),
		)

		// Split into two columns by the x of each text run.
		const columns: { x: number; y: number; str: string }[][] = [[], []]
		for (const it of items) {
			const x = it.transform[4] ?? 0
			const y = it.transform[5] ?? 0
			columns[x < midX ? 0 : 1]!.push({ x, y, str: it.str })
		}

		for (const col of columns) {
			lines.push(...columnToLines(col))
		}
	}

	return lines.join('\n')
}

/** Group a column's runs into visual lines (by y), top→bottom, left→right. */
function columnToLines(runs: { x: number; y: number; str: string }[]): string[] {
	if (!runs.length) return []
	const Y_TOL = 3 // runs within 3px of y are the same line
	const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x)
	const lines: string[] = []
	let bucket: { x: number; str: string }[] = []
	let lineY = sorted[0]!.y
	for (const r of sorted) {
		if (Math.abs(r.y - lineY) > Y_TOL) {
			lines.push(flushLine(bucket))
			bucket = []
			lineY = r.y
		}
		bucket.push(r)
	}
	if (bucket.length) lines.push(flushLine(bucket))
	return lines
}

function flushLine(bucket: { x: number; str: string }[]): string {
	return bucket
		.sort((a, b) => a.x - b.x)
		.map((r) => r.str)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()
}
