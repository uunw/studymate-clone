import type { Transcript } from '@repo/db'
import type { Detail } from '~/components/my-subjects-types'
import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): Firestore users/{uid}/transcript; parse the PDF client-side.
export const getMyTranscript = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ transcript: Transcript; details: Detail[] } | null> => null,
)

export const uploadTranscript = createServerFn({ method: 'POST' })
	.inputValidator((d: FormData) => d)
	.handler(async (): Promise<{ imported: number; parsed: number }> => ({ imported: 0, parsed: 0 }))

export const deleteTranscript = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ ok: true }> => ({ ok: true }),
)
