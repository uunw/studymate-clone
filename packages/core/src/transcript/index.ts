import { extractPdfText } from './extract'
import { type ParsedRow, parseTranscriptText } from './parser'

export { extractPdfText, MAX_TRANSCRIPT_BYTES } from './extract'
export { type ParsedRow, parseTranscriptText } from './parser'

/** End-to-end: PDF bytes → parsed transcript rows. */
export async function parseTranscriptPdf(data: Uint8Array): Promise<ParsedRow[]> {
	const text = await extractPdfText(data)
	return parseTranscriptText(text)
}
