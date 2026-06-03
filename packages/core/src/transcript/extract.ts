import { extractText, getDocumentProxy } from 'unpdf'

const PDF_MAGIC = '%PDF-'
export const MAX_TRANSCRIPT_BYTES = 15 * 1024 * 1024 // 15 MB, matches original

/** Extracts plain text from a transcript PDF buffer using unpdf (serverless-safe). */
export async function extractPdfText(data: Uint8Array): Promise<string> {
	if (data.byteLength > MAX_TRANSCRIPT_BYTES) {
		throw new Error('ไฟล์มีขนาดใหญ่เกิน 15 MB')
	}
	const head = new TextDecoder().decode(data.slice(0, 5))
	if (head !== PDF_MAGIC) {
		throw new Error('ไฟล์ไม่ใช่ PDF ที่ถูกต้อง')
	}
	const pdf = await getDocumentProxy(data)
	const { text } = await extractText(pdf, { mergePages: true })
	return Array.isArray(text) ? text.join('\n') : text
}
